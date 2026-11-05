// js/waveform.js - Real-time Audio Waveform Visualizer on Timeline Clips

export class WaveformRenderer {
  static renderWaveform(canvas, audioBuffer, clip) {
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;

    // Calculate source sample window based on clip's trimIn and duration
    const startSample = Math.floor(clip.trimIn * sampleRate);
    const durationSamples = Math.floor(clip.duration * clip.speed * sampleRate);
    const endSample = Math.min(totalSamples, startSample + durationSamples);

    const windowLength = Math.max(1, endSample - startSample);
    const samplesPerPixel = Math.max(1, Math.floor(windowLength / width));

    const midY = height / 2;
    const volumeMultiplier = clip.audio ? clip.audio.volume : 1.0;

    // Gradient styling for CapCut / DaVinci Resolve emerald/cyan audio peaks
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#34d399"); // bright emerald top
    grad.addColorStop(0.5, "#059669"); // deep emerald center
    grad.addColorStop(1, "#10b981"); // bright emerald bottom

    ctx.fillStyle = grad;

    for (let x = 0; x < width; x++) {
      const offset = startSample + (x * samplesPerPixel);
      if (offset >= totalSamples) break;

      let min = 1.0;
      let max = -1.0;

      for (let s = 0; s < samplesPerPixel; s += 2) {
        const val = channelData[offset + s] || 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }

      // Apply clip volume scaling
      min = Math.max(-1, min * volumeMultiplier);
      max = Math.min(1, max * volumeMultiplier);

      const topY = midY - (Math.abs(min) * (midY - 2));
      const bottomY = midY + (Math.abs(max) * (midY - 2));
      const barHeight = Math.max(2, bottomY - topY);

      ctx.fillRect(x, topY, 1, barHeight);
    }

    // Center zero baseline
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
  }
}
