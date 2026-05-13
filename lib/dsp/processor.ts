/**
 * KIRA — DSP Processor (browser-only)
 * Pipeline: TWF → FFT → PSD (Welch) → Peak Detection → AEA → Kurtosis → RMS → Spectrogram
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DspConfig {
  bandpass?: { low: number; high: number } | null
  whiteNoiseReduction?: boolean
}

export interface PeakFrequency {
  frequency: number
  magnitudeDb: number
}

export interface AudioMetrics {
  sampleRate: number
  duration: number
  nSamples: number

  // Time-domain metrics
  rms: number
  kurtosis: number
  crestFactor: number
  peak: number

  // Frequency-domain
  dominantFrequency: number
  peakFrequencies: PeakFrequency[]

  // AEA — Acoustic Emission Analysis (>2000Hz)
  aeaRms: number
  aeaPercentage: number

  // Chart data (downsampled for display)
  twf: { times: number[]; amplitudes: number[] }
  fftSpectrum: { frequencies: number[]; magnitudesDb: number[] }
  psd: { frequencies: number[]; powerDb: number[] }
  aeaEnvelope: { times: number[]; levels: number[] }
  spectrogram: { times: number[]; frequencies: number[]; magnitudes: number[][] }
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  }
  return w
}

/** In-place Cooley-Tukey FFT (forward, -j convention) */
function fftInPlace(re: Float64Array, im: Float64Array): void {
  const n = re.length
  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -(2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0
      for (let k = 0; k < len >> 1; k++) {
        const tRe = curRe * re[i + k + len / 2] - curIm * im[i + k + len / 2]
        const tIm = curRe * im[i + k + len / 2] + curIm * re[i + k + len / 2]
        re[i + k + len / 2] = re[i + k] - tRe
        im[i + k + len / 2] = im[i + k] - tIm
        re[i + k] += tRe
        im[i + k] += tIm
        const nwr = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nwr
      }
    }
  }
}

/** Compute one-sided magnitude spectrum in dB */
function computeMagnitudeDb(samples: Float64Array, nfft: number): Float64Array {
  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  const win = hannWindow(Math.min(samples.length, nfft))
  for (let i = 0; i < Math.min(samples.length, nfft); i++) re[i] = samples[i] * win[i]
  fftInPlace(re, im)
  const n = nfft / 2 + 1
  const mag = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const m = Math.sqrt(re[i] ** 2 + im[i] ** 2) / nfft
    mag[i] = 20 * Math.log10(Math.max(m, 1e-12))
  }
  return mag
}

// ─── Individual metrics ───────────────────────────────────────────────────────

function computeRms(samples: Float32Array | Float64Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] ** 2
  return Math.sqrt(sum / samples.length)
}

function computeKurtosis(samples: Float32Array | Float64Array): number {
  const n = samples.length
  let mean = 0
  for (let i = 0; i < n; i++) mean += samples[i]
  mean /= n
  let m2 = 0, m4 = 0
  for (let i = 0; i < n; i++) {
    const d = samples[i] - mean
    m2 += d ** 2
    m4 += d ** 4
  }
  m2 /= n; m4 /= n
  if (m2 === 0) return 0
  return m4 / m2 ** 2
}

function computePeak(samples: Float32Array | Float64Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  return peak
}

/** Welch PSD estimator */
function computeWelchPsd(
  samples: Float32Array,
  sampleRate: number,
  nperseg = 1024
): { frequencies: number[]; powerDb: number[] } {
  const nfft = nextPow2(nperseg)
  const step = Math.floor(nperseg * 0.5)
  const win = hannWindow(nperseg)
  const winPower = win.reduce((s, v) => s + v ** 2, 0)

  const psd = new Float64Array(nfft / 2 + 1)
  let count = 0

  for (let start = 0; start + nperseg <= samples.length; start += step) {
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    for (let i = 0; i < nperseg; i++) re[i] = samples[start + i] * win[i]
    fftInPlace(re, im)
    for (let i = 0; i < nfft / 2 + 1; i++) {
      const m = (re[i] ** 2 + im[i] ** 2) / (sampleRate * winPower)
      psd[i] += i === 0 || i === nfft / 2 ? m : 2 * m
    }
    count++
  }

  if (count === 0) return { frequencies: [], powerDb: [] }

  const freqRes = sampleRate / nfft
  const frequencies: number[] = []
  const powerDb: number[] = []

  for (let i = 0; i < nfft / 2 + 1; i++) {
    frequencies.push(i * freqRes)
    const p = psd[i] / count
    powerDb.push(10 * Math.log10(Math.max(p, 1e-20)))
  }

  return { frequencies, powerDb }
}

/** AEA: RMS of signal filtered above aeaHz (applied in freq domain) */
function computeAea(
  samples: Float32Array,
  sampleRate: number,
  aeaHz = 2000
): { aeaRms: number; aeaPercentage: number; envelope: { times: number[]; levels: number[] } } {
  const nfft = nextPow2(Math.min(samples.length, 8192))
  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  for (let i = 0; i < Math.min(samples.length, nfft); i++) re[i] = samples[i]
  fftInPlace(re, im)

  // Zero out bins below aeaHz
  const binAea = Math.ceil(aeaHz / (sampleRate / nfft))
  for (let i = 0; i < binAea && i < nfft / 2; i++) {
    re[i] = 0; im[i] = 0
    if (i > 0) { re[nfft - i] = 0; im[nfft - i] = 0 }
  }

  // IFFT (inverse = conjugate, then forward, then divide by N)
  for (let i = 0; i < nfft; i++) im[i] = -im[i]
  fftInPlace(re, im)
  const filtered = new Float32Array(Math.min(samples.length, nfft))
  for (let i = 0; i < filtered.length; i++) filtered[i] = re[i] / nfft

  const aeaRms = computeRms(filtered)
  const totalRms = computeRms(samples)
  const aeaPercentage = totalRms > 0 ? (aeaRms / totalRms) * 100 : 0

  // Envelope: RMS in windows of 0.01s
  const winSize = Math.round(sampleRate * 0.01)
  const times: number[] = []
  const levels: number[] = []
  for (let i = 0; i + winSize <= filtered.length; i += winSize) {
    const slice = filtered.slice(i, i + winSize)
    times.push(i / sampleRate)
    levels.push(computeRms(slice))
  }

  return { aeaRms, aeaPercentage, envelope: { times, levels } }
}

/** Peak detection on FFT magnitude spectrum */
function detectPeaks(
  frequencies: number[],
  magnitudesDb: number[],
  nPeaks = 5,
  minProminence = 3
): PeakFrequency[] {
  const peaks: PeakFrequency[] = []
  for (let i = 2; i < magnitudesDb.length - 2; i++) {
    const v = magnitudesDb[i]
    if (
      v > magnitudesDb[i - 1] &&
      v > magnitudesDb[i - 2] &&
      v > magnitudesDb[i + 1] &&
      v > magnitudesDb[i + 2] &&
      v > -80
    ) {
      const localMin = Math.min(
        ...magnitudesDb.slice(Math.max(0, i - 20), i),
        ...magnitudesDb.slice(i + 1, Math.min(magnitudesDb.length, i + 20))
      )
      if (v - localMin > minProminence) {
        peaks.push({ frequency: frequencies[i], magnitudeDb: v })
      }
    }
  }
  return peaks
    .sort((a, b) => b.magnitudeDb - a.magnitudeDb)
    .slice(0, nPeaks)
}

/** Apply band-pass filter in frequency domain */
function applyBandpass(samples: Float32Array, sampleRate: number, low: number, high: number): Float32Array {
  const nfft = nextPow2(samples.length)
  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  for (let i = 0; i < samples.length; i++) re[i] = samples[i]
  fftInPlace(re, im)

  const freqRes = sampleRate / nfft
  for (let i = 0; i < nfft / 2 + 1; i++) {
    const f = i * freqRes
    if (f < low || f > high) {
      re[i] = 0; im[i] = 0
      if (i > 0 && i < nfft / 2) { re[nfft - i] = 0; im[nfft - i] = 0 }
    }
  }

  for (let i = 0; i < nfft; i++) im[i] = -im[i]
  fftInPlace(re, im)
  const out = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = re[i] / nfft
  return out
}

/** Spectral subtraction (simple white noise reduction) */
function applyWhiteNoiseReduction(samples: Float32Array, sampleRate: number): Float32Array {
  const nfft = nextPow2(Math.min(4096, samples.length))
  const noiseLen = Math.min(Math.round(sampleRate * 0.1), samples.length / 4)

  // Estimate noise from first 100ms
  const noiseRe = new Float64Array(nfft)
  const noiseIm = new Float64Array(nfft)
  for (let i = 0; i < Math.min(noiseLen, nfft); i++) noiseRe[i] = samples[i]
  fftInPlace(noiseRe, noiseIm)
  const noiseMag = new Float64Array(nfft / 2 + 1)
  for (let i = 0; i < nfft / 2 + 1; i++) {
    noiseMag[i] = Math.sqrt(noiseRe[i] ** 2 + noiseIm[i] ** 2) * 1.5 // factor 1.5
  }

  // Process in segments
  const out = new Float32Array(samples.length)
  const step = nfft / 2
  for (let start = 0; start + nfft <= samples.length; start += step) {
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    const win = hannWindow(nfft)
    for (let i = 0; i < nfft; i++) re[i] = samples[start + i] * win[i]
    fftInPlace(re, im)

    for (let i = 0; i < nfft / 2 + 1; i++) {
      const mag = Math.sqrt(re[i] ** 2 + im[i] ** 2)
      const phase = Math.atan2(im[i], re[i])
      const cleanMag = Math.max(0, mag - noiseMag[i])
      re[i] = cleanMag * Math.cos(phase)
      im[i] = cleanMag * Math.sin(phase)
    }

    for (let i = 0; i < nfft; i++) im[i] = -im[i]
    fftInPlace(re, im)
    for (let i = 0; i < nfft; i++) {
      if (start + i < out.length) out[start + i] += (re[i] / nfft) * win[i]
    }
  }
  return out
}

/** STFT for spectrogram */
function computeSpectrogram(
  samples: Float32Array,
  sampleRate: number,
  nperseg = 512,
  maxFreqHz = 10000,
  maxTimePoints = 100
): { times: number[]; frequencies: number[]; magnitudes: number[][] } {
  const nfft = nextPow2(nperseg)
  const step = Math.max(1, Math.floor((samples.length - nperseg) / maxTimePoints))
  const win = hannWindow(nperseg)
  const freqRes = sampleRate / nfft
  const maxBin = Math.min(nfft / 2 + 1, Math.ceil(maxFreqHz / freqRes) + 1)

  const times: number[] = []
  const magnitudes: number[][] = []

  for (let start = 0; start + nperseg <= samples.length; start += step) {
    if (times.length >= maxTimePoints) break
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    for (let i = 0; i < nperseg; i++) re[i] = samples[start + i] * win[i]
    fftInPlace(re, im)

    const row: number[] = []
    for (let i = 0; i < maxBin; i++) {
      const m = Math.sqrt(re[i] ** 2 + im[i] ** 2) / nfft
      row.push(20 * Math.log10(Math.max(m, 1e-12)))
    }
    times.push(start / sampleRate)
    magnitudes.push(row)
  }

  const frequencies: number[] = []
  for (let i = 0; i < maxBin; i++) frequencies.push(i * freqRes)

  return { times, frequencies, magnitudes }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function processAudio(
  file: File,
  config: DspConfig = {}
): Promise<AudioMetrics> {
  // Decode audio
  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  let samples = audioBuffer.getChannelData(0) as unknown as Float32Array // Mono (first channel)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  // Apply filters
  if (config.whiteNoiseReduction) {
    samples = applyWhiteNoiseReduction(samples, sampleRate)
  }
  if (config.bandpass) {
    samples = applyBandpass(samples, sampleRate, config.bandpass.low, config.bandpass.high)
  }

  // ── Time domain metrics ────────────────────────────────────────────────────
  const rms = computeRms(samples)
  const kurtosis = computeKurtosis(samples)
  const peak = computePeak(samples)
  const crestFactor = rms > 0 ? peak / rms : 0

  // ── TWF (downsampled for display) ─────────────────────────────────────────
  const maxTwfPoints = 2000
  const twfStep = Math.max(1, Math.ceil(samples.length / maxTwfPoints))
  const twfTimes: number[] = []
  const twfAmplitudes: number[] = []
  for (let i = 0; i < samples.length; i += twfStep) {
    twfTimes.push(i / sampleRate)
    twfAmplitudes.push(samples[i])
  }

  // ── FFT Spectrum ──────────────────────────────────────────────────────────
  const nfft = 4096
  const fftSamples = new Float64Array(Math.min(samples.length, nfft))
  for (let i = 0; i < fftSamples.length; i++) fftSamples[i] = samples[i]
  const fftMagDb = computeMagnitudeDb(fftSamples, nfft)
  const freqRes = sampleRate / nfft
  const maxDisplayFreq = Math.min(sampleRate / 2, 10000)
  const maxBin = Math.ceil(maxDisplayFreq / freqRes)
  const fftFrequencies: number[] = []
  const fftMagnitudesDb: number[] = []
  for (let i = 0; i < Math.min(fftMagDb.length, maxBin); i++) {
    fftFrequencies.push(i * freqRes)
    fftMagnitudesDb.push(fftMagDb[i])
  }

  // ── PSD (Welch) ───────────────────────────────────────────────────────────
  const { frequencies: psdFreqs, powerDb } = computeWelchPsd(samples, sampleRate, 1024)
  const psdMaxBin = psdFreqs.findIndex((f) => f > maxDisplayFreq)
  const psdSlice = psdMaxBin > 0 ? psdMaxBin : psdFreqs.length
  const psd = {
    frequencies: psdFreqs.slice(0, psdSlice),
    powerDb: powerDb.slice(0, psdSlice),
  }

  // ── Peak detection ────────────────────────────────────────────────────────
  const peakFrequencies = detectPeaks(fftFrequencies, fftMagnitudesDb)
  const dominantFrequency = peakFrequencies[0]?.frequency ?? 0

  // ── AEA ──────────────────────────────────────────────────────────────────
  const { aeaRms, aeaPercentage, envelope } = computeAea(samples, sampleRate, 2000)

  // ── Spectrogram ───────────────────────────────────────────────────────────
  const spectrogram = computeSpectrogram(samples, sampleRate, 512, maxDisplayFreq, 80)

  return {
    sampleRate,
    duration,
    nSamples: samples.length,
    rms,
    kurtosis,
    crestFactor,
    peak,
    dominantFrequency,
    peakFrequencies,
    aeaRms,
    aeaPercentage,
    twf: { times: twfTimes, amplitudes: twfAmplitudes },
    fftSpectrum: { frequencies: fftFrequencies, magnitudesDb: fftMagnitudesDb },
    psd,
    aeaEnvelope: envelope,
    spectrogram,
  }
}
