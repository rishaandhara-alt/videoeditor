// js/sample-assets.js - Generates rich procedural video, audio, and demo assets inside the browser

// Helper: Synthesizes a high-quality WAV audio buffer and returns a Blob and AudioBuffer
export async function createSynthAudio(type, durationSeconds = 8, sampleRate = 44100) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
  const numFrames = sampleRate * durationSeconds;
  const audioBuffer = audioCtx.createBuffer(2, numFrames, sampleRate);
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.getChannelData(1);

  if (type === "synthwave") {
    // 120 BPM Synthwave Groove with Kick, Snare, Bass & Lead
    const bpm = 120;
    const beatSec = 60 / bpm;
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const beat = (t % beatSec) / beatSec;
      const bar = (t / (beatSec * 4)) % 4;

      // Kick drum on beats 0 and 2
      let kick = 0;
      const kickT = (t % (beatSec * 2));
      if (kickT < 0.25) {
        const freq = 120 * Math.exp(-kickT * 18);
        kick = Math.sin(2 * Math.PI * freq * kickT) * Math.exp(-kickT * 12) * 0.7;
      }

      // Snare on beats 1 and 3
      let snare = 0;
      const snareT = ((t + beatSec) % (beatSec * 2));
      if (snareT < 0.2) {
        const noise = (Math.random() * 2 - 1) * Math.exp(-snareT * 20);
        const tone = Math.sin(2 * Math.PI * 180 * snareT) * Math.exp(-snareT * 25);
        snare = (noise * 0.6 + tone * 0.4) * 0.5;
      }

      // 80s Rolling Bassline (16th notes)
      const sixteenth = (t % (beatSec / 4)) / (beatSec / 4);
      const rootNotes = [110, 110, 82.4, 98]; // A2, A2, E2, G2
      const root = rootNotes[Math.floor(bar) % 4];
      const bassEnv = Math.exp(-sixteenth * 8);
      const bass = (Math.sin(2 * Math.PI * root * t) + 0.5 * Math.sin(2 * Math.PI * root * 2 * t)) * bassEnv * 0.35;

      // Arpeggiated Synth Lead
      const arpFreqs = [root * 2, root * 2.5, root * 3, root * 4];
      const arpIdx = Math.floor((t / (beatSec / 4)) % 4);
      const leadT = (t % (beatSec / 4));
      const lead = Math.sin(2 * Math.PI * arpFreqs[arpIdx] * t) * Math.exp(-leadT * 6) * 0.2;

      const sample = Math.max(-1, Math.min(1, kick + snare + bass + lead));
      left[i] = sample;
      right[i] = sample;
    }
  } else if (type === "cinematic-boom") {
    // Cinematic Sub-Bass Impact & Ambient Swell
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      let val = 0;

      // Swell build up (0s - 2s)
      if (t < 2.0) {
        const swellFreq = 50 + t * 40;
        val += Math.sin(2 * Math.PI * swellFreq * t) * (t / 2.0) * 0.3;
      } else {
        // Boom Impact at 2s
        const impactT = t - 2.0;
        const subFreq = 80 * Math.exp(-impactT * 2.5);
        const impact = Math.sin(2 * Math.PI * subFreq * impactT) * Math.exp(-impactT * 0.8) * 0.9;
        const rumble = (Math.random() * 2 - 1) * Math.exp(-impactT * 1.5) * 0.15;
        val += impact + rumble;
      }

      left[i] = Math.max(-1, Math.min(1, val));
      right[i] = left[i];
    }
  } else {
    // Upbeat Ambient Melody (Acoustic Chime)
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C Major Pentatonic
    for (let i = 0; i < numFrames; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.floor(t * 3) % scale.length;
      const noteT = (t % (1 / 3));
      const freq = scale[noteIdx];
      const env = Math.exp(-noteT * 7);
      const harmonic1 = Math.sin(2 * Math.PI * freq * t);
      const harmonic2 = 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
      const sample = (harmonic1 + harmonic2) * env * 0.4;
      left[i] = sample;
      right[i] = sample * (0.8 + 0.2 * Math.sin(t * 2));
    }
  }

  // Convert AudioBuffer to WAV Blob
  const wavBlob = audioBufferToWavBlob(audioBuffer);
  return { audioBuffer, wavBlob };
}

// Convert AudioBuffer to standard WAV Blob
function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  function setUint16(data) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  writeString("RIFF");
  setUint32(length - 8);
  writeString("WAVE");
  writeString("fmt ");
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  writeString("data");
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: "audio/wav" });
}

// Helper: Procedural Video Canvas Generator (produces a downloadable/playable WebM/MP4 video blob)
export async function createProceduralVideo(theme, durationSeconds = 6, width = 1280, height = 720, fps = 30) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Check MediaRecorder codec support
  let mimeType = "video/webm";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    mimeType = "video/webm;codecs=vp8";
  } else if (MediaRecorder.isTypeSupported("video/mp4")) {
    mimeType = "video/mp4";
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 });
  const chunks = [];

  recorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = durationSeconds * fps;
  let currentFrame = 0;

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url, duration: durationSeconds, width, height });
    };

    recorder.start();

    const interval = 1000 / fps;
    const timer = setInterval(() => {
      if (currentFrame >= totalFrames) {
        clearInterval(timer);
        recorder.stop();
        return;
      }

      const t = currentFrame / fps;
      renderFrame(ctx, theme, t, durationSeconds, width, height);
      currentFrame++;
    }, interval);
  });
}

function renderFrame(ctx, theme, t, duration, w, h) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (theme === "cyberpunk") {
    // Cyberpunk Neon Grid & Sun
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, "#0b001a");
    skyGrad.addColorStop(0.5, "#2b0a3d");
    skyGrad.addColorStop(0.55, "#f43f5e");
    skyGrad.addColorStop(1, "#180026");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing Retro Sun
    const sunRadius = 130;
    const sunX = w / 2;
    const sunY = h * 0.45;
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, "#fbbf24");
    sunGrad.addColorStop(0.6, "#f43f5e");
    sunGrad.addColorStop(1, "#be185d");

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 40;
    ctx.fill();

    // Horizontal blind stripes in sun
    ctx.fillStyle = "#180026";
    for (let y = sunY - 20; y < sunY + sunRadius; y += 18) {
      const stripeHeight = Math.max(3, (y - sunY) * 0.08);
      ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, stripeHeight);
    }
    ctx.restore();

    // 3D Perspective Neon Grid Floor
    ctx.save();
    const horizon = h * 0.55;
    ctx.fillStyle = "#0c0414";
    ctx.fillRect(0, horizon, w, h - horizon);

    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;

    // Moving horizontal grid lines (scrolling towards viewer)
    const speed = 2.5;
    const offset = (t * speed) % 1;
    for (let i = 0; i < 18; i++) {
      const p = Math.pow((i + offset) / 18, 2.5);
      const lineY = horizon + p * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();
    }

    // Converging perspective lines
    for (let x = -w * 0.5; x <= w * 1.5; x += w / 12) {
      ctx.beginPath();
      ctx.moveTo(w / 2, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();

    // Foreground typography
    ctx.save();
    ctx.font = "bold 44px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 20;
    ctx.fillText("NEON OVERDRIVE", w / 2, h * 0.22);
    ctx.restore();

  } else if (theme === "nature") {
    // Majestic Mountain Sunrise
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    const sunProgress = t / duration;
    sky.addColorStop(0, "#1e3a8a");
    sky.addColorStop(0.4, "#d97706");
    sky.addColorStop(0.7, "#f59e0b");
    sky.addColorStop(1, "#fef3c7");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Rising Sun
    const sunY = h * 0.65 - sunProgress * 150;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#fffbeb";
    ctx.shadowColor = "#fde68a";
    ctx.shadowBlur = 60;
    ctx.fill();

    // Distant Mountain Layer
    ctx.save();
    ctx.fillStyle = "#312e81";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.25, h * 0.4);
    ctx.lineTo(w * 0.5, h * 0.52);
    ctx.lineTo(w * 0.75, h * 0.38);
    ctx.lineTo(w, h * 0.5);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Foreground Mountain Layer
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.lineTo(w * 0.35, h * 0.48);
    ctx.lineTo(w * 0.65, h * 0.62);
    ctx.lineTo(w * 0.9, h * 0.45);
    ctx.lineTo(w, h * 0.58);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Water Reflection
    const waterGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
    waterGrad.addColorStop(0, "#1e293b");
    waterGrad.addColorStop(1, "#020617");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    ctx.restore();

    ctx.save();
    ctx.font = "600 36px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("GOLDEN HOUR CINEMATIC", w / 2, h * 0.15);
    ctx.restore();

  } else {
    // Film Countdown Leader (5, 4, 3, 2, 1)
    ctx.fillStyle = "#1c1917";
    ctx.fillRect(0, 0, w, h);

    // Target Crosshairs
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Clockwise Radar Sweep Hand
    const sweepAngle = (t % 1) * Math.PI * 2;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.arc(w / 2, h / 2, 220, -Math.PI / 2, sweepAngle - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Big Countdown Number
    const countNumber = Math.max(1, 5 - Math.floor(t));
    ctx.font = "bold 130px -apple-system, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f5f5f4";
    ctx.fillText(countNumber.toString(), w / 2, h / 2);

    ctx.font = "700 24px -apple-system, monospace";
    ctx.fillStyle = "#a8a29e";
    ctx.fillText("FRAMESTUDIO LEADER", w / 2, h * 0.85);
  }

  ctx.restore();
}
