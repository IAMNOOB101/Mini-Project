/**
 * Voice confidence tracker.
 *
 * Instead of taking a single snapshot (which is always ~0),
 * this creates a tracker that continuously samples audio levels
 * during the recording session and computes a meaningful average.
 */

/**
 * Create a voice confidence tracker that monitors audio levels over time.
 * Call start() when recording begins, stop() when recording ends.
 * @param {MediaStream} mediaStream - active media stream with audio tracks
 * @returns {{ start: () => void, stop: () => number }} tracker with start/stop
 */
export const createVoiceTracker = (mediaStream) => {
  if (!mediaStream || !mediaStream.getAudioTracks().length) {
    return {
      start: () => {},
      stop: () => 0.5, // default mid-confidence if no stream
    };
  }

  let audioContext = null;
  let analyser = null;
  let animFrame = null;
  let samples = [];
  let running = false;

  const start = () => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      samples = [];
      running = true;

      const sample = () => {
        if (!running) return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        samples.push(avg);
        animFrame = requestAnimationFrame(sample);
      };
      sample();
    } catch (e) {
      console.warn("Voice tracker setup failed:", e);
    }
  };

  const stop = () => {
    running = false;
    if (animFrame) cancelAnimationFrame(animFrame);
    if (audioContext) audioContext.close().catch(() => {});

    if (samples.length === 0) return 0.5;

    // Compute stats from collected samples
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const max = Math.max(...samples);

    // Calculate variance to detect consistency of speech
    const variance = samples.reduce((s, v) => s + (v - avg) ** 2, 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // Confidence signals:
    // - Higher average volume = more confident (not mumbling)
    // - Some variation = natural speech patterns (not monotone or silent)
    // - Very high variance might mean inconsistent / nervous
    const volumeScore = Math.min(1, avg / 60);          // avg volume normalized
    const peakScore = Math.min(1, max / 100);            // peak volume shows projection
    const consistencyScore = stdDev > 5 && stdDev < 40   // moderate variation is good
      ? 1.0
      : stdDev <= 5 ? 0.4 : 0.6;                         // too flat or too erratic

    // Weighted combination
    const raw = (volumeScore * 0.4) + (peakScore * 0.3) + (consistencyScore * 0.3);
    const normalized = Math.min(1, Math.max(0, raw));

    console.log(`🎤 Voice confidence: avg=${avg.toFixed(1)}, max=${max}, stdDev=${stdDev.toFixed(1)}, score=${normalized.toFixed(2)}, samples=${samples.length}`);
    return normalized;
  };

  return { start, stop };
};

/**
 * Legacy single-snapshot function (kept for backwards compat but improved).
 * Prefer createVoiceTracker() for real-time tracking.
 */
export const getVoiceConfidence = async (mediaStream) => {
  if (!mediaStream || !mediaStream.getAudioTracks().length) return 0.5;

  return new Promise((resolve) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      // Sample multiple times over 500ms for a better reading
      const samples = [];
      let count = 0;
      const interval = setInterval(() => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        samples.push(avg);
        count++;
        if (count >= 10) {
          clearInterval(interval);
          audioContext.close().catch(() => {});
          const total = samples.reduce((a, b) => a + b, 0) / samples.length;
          resolve(Math.min(1, Math.max(0, total / 80)));
        }
      }, 50);

      // Timeout safety
      setTimeout(() => {
        clearInterval(interval);
        audioContext.close().catch(() => {});
        if (samples.length > 0) {
          const total = samples.reduce((a, b) => a + b, 0) / samples.length;
          resolve(Math.min(1, Math.max(0, total / 80)));
        } else {
          resolve(0.5);
        }
      }, 1000);
    } catch (e) {
      console.warn("getVoiceConfidence failed:", e);
      resolve(0.5);
    }
  });
};