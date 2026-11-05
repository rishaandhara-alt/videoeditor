// js/exporter.js - Real Frame-Accurate Video Timeline Rendering & Export Engine

import { state } from "./state.js";
import { Icons } from "./icons.js";

export class VideoExporter {
  constructor(modalEl) {
    this.modal = modalEl;
    this.isRendering = false;
    this.abortController = null;
    this.init();
  }

  init() {
    this.renderModal();
    this.bindEvents();
  }

  renderModal() {
    this.modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">
            ${Icons.download}
            <span>EXPORT TIMELINE VIDEO</span>
          </div>
          <button class="btn btn-sm btn-icon-only" id="btn-close-export" style="background:transparent; border:none;">
            ${Icons.close}
          </button>
        </div>

        <div class="modal-body" id="export-modal-body">
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5;">
            FrameStudio will render all video layers, transitions, text overlays, color grading, and mixed audio tracks into a real downloadable video file.
          </div>

          <div style="display:flex; flex-direction:column; gap:12px; background:var(--bg-card); padding:14px; border-radius:8px; border:1px solid var(--border-default);">
            <div class="prop-row">
              <span class="prop-label">Export Preset</span>
              <select class="select-control" id="export-preset">
                <option value="1920x1080@30">Full HD 1080p (1920x1080, 30fps) - Recommended</option>
                <option value="1280x720@30">HD 720p (1280x720, 30fps) - Fast Export</option>
                <option value="1080x1920@30">Vertical Shorts / Reels / TikTok (1080x1920)</option>
                <option value="1080x1080@30">Square 1:1 Social (1080x1080)</option>
              </select>
            </div>

            <div class="prop-row">
              <span class="prop-label">Timeline Duration</span>
              <span class="number-badge" id="export-duration-badge">${state.getProjectDuration().toFixed(1)}s</span>
            </div>

            <div class="prop-row">
              <span class="prop-label">Video Format</span>
              <span class="number-badge" id="export-format-badge">WebM (VP9/VP8 + Opus)</span>
            </div>
          </div>

          <!-- Progress Section (hidden by default) -->
          <div id="export-progress-section" style="display:none; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:600; color:var(--text-secondary);">
              <span id="export-status-label">Rendering frames...</span>
              <span id="export-percent-label">0%</span>
            </div>
            <div class="progress-container">
              <div class="progress-bar-fill" id="export-progress-bar"></div>
              <div class="progress-text" id="export-progress-text">0 / 0 frames</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">
              <span id="export-elapsed-label">Elapsed: 00:00</span>
              <span id="export-eta-label">ETA: --:--</span>
            </div>
          </div>

          <!-- Download result (hidden until complete) -->
          <div id="export-result-section" style="display:none; flex-direction:column; align-items:center; gap:10px; background:#064e3b; padding:14px; border-radius:8px; border:1px solid #10b981;">
            <div style="font-weight:700; color:#34d399; font-size:13px;">🎉 Video Render Complete!</div>
            <div style="font-size:11px; color:#d1fae5;" id="export-result-size">File ready for download</div>
            <a id="export-download-link" class="btn btn-primary btn-success" style="padding:8px 16px; font-weight:700; text-decoration:none;" download="FrameStudio_Export.webm">
              ${Icons.download} Download Rendered Video
            </a>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" id="btn-cancel-export">Cancel</button>
          <button class="btn btn-primary" id="btn-start-export">
            ${Icons.download} Start Export
          </button>
        </div>
      </div>
    `;

    // Detect format support
    const formatBadge = this.modal.querySelector("#export-format-badge");
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      formatBadge.textContent = "WebM (VP9 + Opus audio)";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      formatBadge.textContent = "MP4 (H.264 + AAC)";
    } else {
      formatBadge.textContent = "WebM (Standard VP8)";
    }
  }

  bindEvents() {
    this.modal.addEventListener("click", e => {
      if (e.target.closest("#btn-close-export") || (e.target.closest("#btn-cancel-export") && !this.isRendering)) {
        this.close();
      }

      if (e.target.closest("#btn-cancel-export") && this.isRendering) {
        this.abort();
      }

      if (e.target.closest("#btn-start-export") && !this.isRendering) {
        this.startExport();
      }
    });
  }

  open() {
    this.modal.classList.add("open");
    const durBadge = this.modal.querySelector("#export-duration-badge");
    if (durBadge) {
      durBadge.textContent = `${state.getProjectDuration().toFixed(1)}s`;
    }
    this.modal.querySelector("#export-progress-section").style.display = "none";
    this.modal.querySelector("#export-result-section").style.display = "none";
    this.modal.querySelector("#btn-start-export").style.display = "inline-flex";
    this.modal.querySelector("#btn-cancel-export").textContent = "Cancel";
  }

  close() {
    if (this.isRendering) {
      if (!confirm("Video export is currently in progress. Cancel render?")) return;
      this.abort();
    }
    this.modal.classList.remove("open");
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRendering = false;
    state.emit("toast", { message: "Video render canceled", type: "warning" });
    this.modal.querySelector("#export-status-label").textContent = "Render canceled";
    this.modal.querySelector("#btn-start-export").style.display = "inline-flex";
    this.modal.querySelector("#btn-cancel-export").textContent = "Close";
  }

  async startExport() {
    const preset = this.modal.querySelector("#export-preset").value;
    const [resPart, fpsPart] = preset.split("@");
    const [width, height] = resPart.split("x").map(Number);
    const fps = Number(fpsPart) || 30;
    const duration = state.getProjectDuration();

    if (duration <= 0.1) {
      state.emit("toast", { message: "Timeline is empty. Add clips to export.", type: "error" });
      return;
    }

    this.isRendering = true;
    this.abortController = new AbortController();

    const progressSection = this.modal.querySelector("#export-progress-section");
    const resultSection = this.modal.querySelector("#export-result-section");
    const startBtn = this.modal.querySelector("#btn-start-export");
    const cancelBtn = this.modal.querySelector("#btn-cancel-export");
    const progressBar = this.modal.querySelector("#export-progress-bar");
    const progressText = this.modal.querySelector("#export-progress-text");
    const percentLabel = this.modal.querySelector("#export-percent-label");
    const statusLabel = this.modal.querySelector("#export-status-label");
    const elapsedLabel = this.modal.querySelector("#export-elapsed-label");
    const etaLabel = this.modal.querySelector("#export-eta-label");

    progressSection.style.display = "flex";
    resultSection.style.display = "none";
    startBtn.style.display = "none";
    cancelBtn.textContent = "Cancel Render";
    statusLabel.textContent = "Initializing render pipeline...";
    progressBar.style.width = "0%";

    // Prepare offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Audio setup: build audio stream
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioDest = audioCtx.createMediaStreamDestination();
    const masterGain = audioCtx.createGain();
    masterGain.connect(audioDest);

    // Prepare audio sources
    const scheduledSources = [];
    for (const track of state.tracks) {
      if (track.muted) continue;
      for (const clip of track.clips) {
        if (clip.audio?.muted) continue;
        const asset = state.assets.get(clip.assetId);
        if (asset && asset.audioBuffer) {
          const src = audioCtx.createBufferSource();
          src.buffer = asset.audioBuffer;
          src.playbackRate.value = clip.speed || 1.0;

          const gain = audioCtx.createGain();
          gain.gain.value = (clip.audio ? clip.audio.volume : 1.0) * (track.volume ?? 1.0);
          src.connect(gain);
          gain.connect(masterGain);

          scheduledSources.push({
            src,
            startTime: clip.startTime,
            trimIn: clip.trimIn,
            duration: clip.duration * (clip.speed || 1.0)
          });
        }
      }
    }

    // Determine mimeType
    let mimeType = "video/webm;codecs=vp9,opus";
    let fileExt = "webm";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
        mimeType = "video/webm;codecs=vp8,opus";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
        fileExt = "mp4";
      } else {
        mimeType = "video/webm";
      }
    }

    // Combine canvas video stream + audio stream
    const videoStream = canvas.captureStream(fps);
    const audioTrack = audioDest.stream.getAudioTracks()[0];
    if (audioTrack) {
      videoStream.addTrack(audioTrack);
    }

    const recorder = new MediaRecorder(videoStream, {
      mimeType,
      videoBitsPerSecond: width >= 1920 ? 8000000 : 4000000
    });

    const recordedChunks = [];
    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    recorder.start(100);

    // Start all audio sources scheduled according to timeline
    const audioStartTime = audioCtx.currentTime + 0.1;
    scheduledSources.forEach(item => {
      try {
        item.src.start(audioStartTime + item.startTime, item.trimIn, item.duration);
      } catch (e) {
        console.warn("Audio export source error:", e);
      }
    });

    // Pre-cache video elements for frame seeking
    const videoElements = new Map();
    for (const track of state.tracks) {
      for (const clip of track.clips) {
        if (clip.type === "video") {
          const asset = state.assets.get(clip.assetId);
          if (asset && !videoElements.has(asset.id)) {
            const v = document.createElement("video");
            v.crossOrigin = "anonymous";
            v.muted = true;
            v.src = asset.url;
            await new Promise(r => {
              v.onloadeddata = r;
              v.onerror = r;
              setTimeout(r, 800);
            });
            videoElements.set(asset.id, v);
          }
        }
      }
    }

    const totalFrames = Math.ceil(duration * fps);
    const frameIntervalSec = 1 / fps;
    const renderStartTime = performance.now();

    try {
      statusLabel.textContent = `Rendering ${totalFrames} frames...`;

      for (let f = 0; f < totalFrames; f++) {
        if (this.abortController.signal.aborted) {
          recorder.stop();
          audioCtx.close();
          return;
        }

        const t = f * frameIntervalSec;

        // 1. Clear background
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // 2. Render all tracks from bottom to top
        const reversedTracks = [...state.tracks].reverse();
        for (const track of reversedTracks) {
          if (track.hidden) continue;

          for (const clip of track.clips) {
            if (t >= clip.startTime && t < (clip.startTime + clip.duration)) {
              await this.renderExportClip(ctx, clip, t, width, height, videoElements);
            }
          }
        }

        ctx.restore();

        // 3. Update Progress UI
        const percent = Math.min(100, Math.round(((f + 1) / totalFrames) * 100));
        progressBar.style.width = `${percent}%`;
        percentLabel.textContent = `${percent}%`;
        progressText.textContent = `${f + 1} / ${totalFrames} frames`;

        const elapsedMs = performance.now() - renderStartTime;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const etaSec = Math.max(0, Math.floor((elapsedMs / (f + 1)) * (totalFrames - f - 1) / 1000));

        elapsedLabel.textContent = `Elapsed: ${Math.floor(elapsedSec/60)}:${(elapsedSec%60).toString().padStart(2,'0')}`;
        etaLabel.textContent = `ETA: ${Math.floor(etaSec/60)}:${(etaSec%60).toString().padStart(2,'0')}`;

        // Yield to browser execution
        if (f % 2 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      statusLabel.textContent = "Finalizing video file...";

      // Stop recording
      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(finalBlob);
        const sizeMB = (finalBlob.size / (1024 * 1024)).toFixed(2);

        this.isRendering = false;
        progressSection.style.display = "none";
        resultSection.style.display = "flex";
        cancelBtn.textContent = "Close";

        const sizeLabel = this.modal.querySelector("#export-result-size");
        const downloadLink = this.modal.querySelector("#export-download-link");

        sizeLabel.textContent = `Resolution: ${width}x${height} • Size: ${sizeMB} MB • Duration: ${duration.toFixed(1)}s`;
        downloadLink.href = downloadUrl;
        downloadLink.download = `${(state.project.name || 'FrameStudio_Edit').replace(/\s+/g, '_')}.${fileExt}`;

        state.emit("toast", { message: `Video export complete (${sizeMB} MB)! Click to download.`, type: "success" });
        audioCtx.close();
      };

      recorder.stop();

    } catch (err) {
      console.error("Export error:", err);
      this.isRendering = false;
      state.emit("toast", { message: `Export failed: ${err.message}`, type: "error" });
      statusLabel.textContent = `Error: ${err.message}`;
      cancelBtn.textContent = "Close";
      audioCtx.close();
    }
  }

  async renderExportClip(ctx, clip, t, w, h, videoElements) {
    ctx.save();

    // Transition calculations
    let transitionAlpha = 1.0;
    let wipeProgress = 1.0;
    let zoomTransitionScale = 1.0;
    const timeSinceClipStart = t - clip.startTime;
    const trans = clip.transition;

    if (trans && trans.type !== "none" && trans.duration > 0 && timeSinceClipStart < trans.duration) {
      const progress = Math.min(1.0, timeSinceClipStart / trans.duration);
      if (trans.type === "crossfade" || trans.type === "fade-black") {
        transitionAlpha = progress;
      } else if (trans.type === "wipe-left") {
        wipeProgress = progress;
        ctx.beginPath();
        ctx.rect(0, 0, w * wipeProgress, h);
        ctx.clip();
      } else if (trans.type === "wipe-right") {
        wipeProgress = progress;
        ctx.beginPath();
        ctx.rect(w * (1 - wipeProgress), 0, w * wipeProgress, h);
        ctx.clip();
      } else if (trans.type === "zoom") {
        zoomTransitionScale = 0.6 + (0.4 * progress);
        transitionAlpha = progress;
      }
    }

    const clipOpacity = (clip.transform?.opacity ?? 1.0) * transitionAlpha;
    ctx.globalAlpha = Math.max(0, Math.min(1, clipOpacity));

    // Center pivot transform
    const centerX = w / 2 + (clip.transform?.x || 0);
    const centerY = h / 2 + (clip.transform?.y || 0);

    ctx.translate(centerX, centerY);

    if (clip.transform?.rotation) {
      ctx.rotate((clip.transform.rotation * Math.PI) / 180);
    }

    const totalScale = (clip.transform?.scale || 1.0) * zoomTransitionScale;
    ctx.scale(totalScale, totalScale);

    // Color grading filters
    const f = clip.filters || {};
    const b = 1 + (f.brightness || 0) / 100;
    const c = 1 + (f.contrast || 0) / 100;
    const s = (f.saturation ?? 100) / 100;
    const hue = f.hueRotate || 0;
    const blur = f.blur || 0;
    ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hue}deg) blur(${blur}px)`;

    if (clip.type === "video") {
      const asset = state.assets.get(clip.assetId);
      if (asset) {
        const v = videoElements.get(asset.id);
        if (v) {
          const sourceTime = clip.trimIn + ((t - clip.startTime) * clip.speed);
          v.currentTime = Math.max(0, Math.min(sourceTime, (asset.duration || 10) - 0.05));
          // Wait seeked
          await new Promise(r => {
            const onSeek = () => {
              v.removeEventListener("seeked", onSeek);
              r();
            };
            v.addEventListener("seeked", onSeek, { once: true });
            setTimeout(r, 60);
          });
          try {
            ctx.drawImage(v, -w / 2, -h / 2, w, h);
          } catch (_) {}
        }
      }
    } else if (clip.type === "image") {
      const asset = state.assets.get(clip.assetId);
      if (asset && asset.thumbnail) {
        const img = new Image();
        img.src = asset.thumbnail;
        if (img.complete) {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      }
    } else if (clip.type === "text") {
      this.renderExportText(ctx, clip, t, w, h);
    }

    ctx.restore();
  }

  renderExportText(ctx, clip, t, w, h) {
    const textData = clip.text;
    if (!textData || !textData.content) return;

    const timeSinceStart = t - clip.startTime;
    let animAlpha = 1.0;
    let animOffsetY = 0;
    let animScale = 1.0;
    let displayContent = textData.content;

    if (textData.animation === "fade") {
      animAlpha = Math.min(1.0, timeSinceStart / 0.4);
    } else if (textData.animation === "pop") {
      const p = Math.min(1.0, timeSinceStart / 0.35);
      animScale = 0.5 + 0.5 * Math.sin(p * Math.PI / 2);
    } else if (textData.animation === "slide-up") {
      const p = Math.min(1.0, timeSinceStart / 0.4);
      animOffsetY = (1 - p) * 50;
      animAlpha = p;
    } else if (textData.animation === "typewriter") {
      const charProgress = Math.min(1.0, timeSinceStart / (textData.content.length * 0.08));
      const chars = Math.floor(charProgress * textData.content.length);
      displayContent = textData.content.substring(0, chars);
    }

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * animAlpha;
    ctx.scale(animScale, animScale);
    ctx.translate(0, animOffsetY);

    const fontStyle = textData.fontStyle === "italic" ? "italic" : "normal";
    const fontWeight = textData.fontWeight === "bold" ? "bold" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${textData.fontSize || 48}px ${textData.fontFamily || 'Inter, sans-serif'}`;
    ctx.textAlign = textData.align || "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(displayContent);
    const textWidth = metrics.width;
    const textHeight = (textData.fontSize || 48) * 1.2;
    const padding = textData.backgroundPadding ?? 12;

    if (textData.backgroundColor && textData.backgroundColor !== "transparent") {
      ctx.save();
      ctx.fillStyle = textData.backgroundColor;
      let boxX = -textWidth / 2 - padding;
      if (textData.align === "left") boxX = -padding;
      if (textData.align === "right") boxX = -textWidth - padding;
      const boxY = -textHeight / 2 - padding;
      const boxW = textWidth + padding * 2;
      const boxH = textHeight + padding * 2;
      const rad = textData.borderRadius ?? 6;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, rad);
      ctx.fill();
      ctx.restore();
    }

    if (textData.strokeWidth > 0 && textData.strokeColor) {
      ctx.strokeStyle = textData.strokeColor;
      ctx.lineWidth = textData.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(displayContent, 0, 0);
    }

    ctx.fillStyle = textData.color || "#ffffff";
    ctx.fillText(displayContent, 0, 0);

    ctx.restore();
  }
}
