// js/renderer.js - Real-Time Video Preview Compositor & Rendering Pipeline

import { state } from "./state.js";
import { audioEngine } from "./audio-engine.js";

export class VideoRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.videoElements = new Map(); // assetId -> HTMLVideoElement
    this.imageElements = new Map(); // assetId -> HTMLImageElement
    this.lastFrameTime = 0;
    this.animId = null;

    // Aspect ratio & resolution settings
    this.internalWidth = 1920;
    this.internalHeight = 1080;
    this.canvas.width = this.internalWidth;
    this.canvas.height = this.internalHeight;

    this.init();
  }

  init() {
    this.bindEvents();
    this.startLoop();
  }

  bindEvents() {
    state.on("playbackState", ({ isPlaying }) => {
      if (isPlaying) {
        this.lastFrameTime = performance.now();
        audioEngine.startPlayback(state.playhead);
      } else {
        audioEngine.stopPlayback();
        this.pauseAllVideos();
      }
    });

    state.on("timeUpdate", ({ time, isUserScrub }) => {
      if (!state.isPlaying) {
        this.syncVideosForScrub(time);
        this.renderFrame(time);
      }
    });

    state.on("tracksUpdated", () => {
      if (!state.isPlaying) {
        this.renderFrame(state.playhead);
      }
    });

    state.on("clipUpdated", () => {
      if (!state.isPlaying) {
        this.renderFrame(state.playhead);
      }
    });
  }

  setResolution(width, height) {
    this.internalWidth = width;
    this.internalHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderFrame(state.playhead);
  }

  getVideoElement(asset) {
    if (!this.videoElements.has(asset.id)) {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true; // Preview canvas renders video visually; Web Audio handles mixed audio
      v.playsInline = true;
      v.preload = "auto";
      v.src = asset.url;
      this.videoElements.set(asset.id, v);
    }
    return this.videoElements.get(asset.id);
  }

  getImageElement(asset) {
    if (!this.imageElements.has(asset.id)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = asset.url;
      this.imageElements.set(asset.id, img);
    }
    return this.imageElements.get(asset.id);
  }

  pauseAllVideos() {
    for (const v of this.videoElements.values()) {
      v.pause();
    }
  }

  syncVideosForScrub(time) {
    for (const track of state.tracks) {
      if (track.hidden) continue;
      for (const clip of track.clips) {
        if (clip.type !== "video") continue;
        const asset = state.assets.get(clip.assetId);
        if (!asset) continue;

        if (time >= clip.startTime && time < (clip.startTime + clip.duration)) {
          const v = this.getVideoElement(asset);
          const targetTime = clip.trimIn + ((time - clip.startTime) * clip.speed);
          v.pause();
          if (Math.abs(v.currentTime - targetTime) > 0.04) {
            v.currentTime = Math.max(0, Math.min(targetTime, (asset.duration || 10) - 0.05));
          }
        }
      }
    }
  }

  startLoop() {
    const loop = (timestamp) => {
      this.animId = requestAnimationFrame(loop);

      if (state.isPlaying) {
        const delta = (timestamp - this.lastFrameTime) / 1000;
        this.lastFrameTime = timestamp;

        const newTime = state.playhead + delta;
        const totalDuration = state.getProjectDuration();

        if (newTime >= totalDuration) {
          state.setPlayhead(0);
          state.setPlaying(false);
          return;
        } else {
          state.playhead = newTime;
          state.emit("timeUpdate", { time: newTime, isUserScrub: false });
        }
      }

      this.renderFrame(state.playhead);
    };

    this.animId = requestAnimationFrame(loop);
  }

  renderFrame(time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear background
    ctx.save();
    ctx.filter = "none";
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // Render tracks in reverse order (bottom track first, top tracks overlay)
    const reversedTracks = [...state.tracks].reverse();

    for (const track of reversedTracks) {
      if (track.hidden) continue;

      for (const clip of track.clips) {
        if (time >= clip.startTime && time < (clip.startTime + clip.duration)) {
          this.renderClip(ctx, clip, time, w, h);
        }
      }
    }

    ctx.restore();
  }

  renderClip(ctx, clip, time, w, h) {
    ctx.save();

    // 1. Calculate Transition Progress (if applicable)
    let transitionAlpha = 1.0;
    let wipeProgress = 1.0;
    let zoomTransitionScale = 1.0;

    const timeSinceClipStart = time - clip.startTime;
    const trans = clip.transition;

    if (trans && trans.type !== "none" && trans.duration > 0 && timeSinceClipStart < trans.duration) {
      const progress = Math.min(1.0, timeSinceClipStart / trans.duration);

      if (trans.type === "crossfade") {
        transitionAlpha = progress;
      } else if (trans.type === "fade-black") {
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

    // 2. Global Opacity & Transform
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

    // 3. Color Grading Filters
    const f = clip.filters || {};
    const b = 1 + (f.brightness || 0) / 100;
    const c = 1 + (f.contrast || 0) / 100;
    const s = (f.saturation ?? 100) / 100;
    const hue = f.hueRotate || 0;
    const blur = f.blur || 0;

    ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hue}deg) blur(${blur}px)`;

    // 4. Render Media Type
    if (clip.type === "video") {
      const asset = state.assets.get(clip.assetId);
      if (asset) {
        const video = this.getVideoElement(asset);
        const sourceTime = clip.trimIn + ((time - clip.startTime) * clip.speed);

        if (state.isPlaying) {
          if (video.paused) {
            video.playbackRate = clip.speed || 1.0;
            video.currentTime = Math.max(0, sourceTime);
            video.play().catch(() => {});
          }
        }

        try {
          // Draw video centered
          ctx.drawImage(video, -w / 2, -h / 2, w, h);
        } catch (_) {}
      }
    } else if (clip.type === "image") {
      const asset = state.assets.get(clip.assetId);
      if (asset) {
        const img = this.getImageElement(asset);
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      }
    } else if (clip.type === "text") {
      this.renderTextClip(ctx, clip, time, w, h);
    }

    ctx.restore();
  }

  renderTextClip(ctx, clip, time, w, h) {
    const t = clip.text;
    if (!t || !t.content) return;

    const timeSinceStart = time - clip.startTime;

    // Text animation effects
    let animAlpha = 1.0;
    let animOffsetY = 0;
    let animScale = 1.0;
    let displayContent = t.content;

    if (t.animation === "fade") {
      animAlpha = Math.min(1.0, timeSinceStart / 0.4);
    } else if (t.animation === "pop") {
      const p = Math.min(1.0, timeSinceStart / 0.35);
      animScale = 0.5 + 0.5 * Math.sin(p * Math.PI / 2);
    } else if (t.animation === "slide-up") {
      const p = Math.min(1.0, timeSinceStart / 0.4);
      animOffsetY = (1 - p) * 50;
      animAlpha = p;
    } else if (t.animation === "typewriter") {
      const charProgress = Math.min(1.0, timeSinceStart / (t.content.length * 0.08));
      const chars = Math.floor(charProgress * t.content.length);
      displayContent = t.content.substring(0, chars);
    }

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * animAlpha;
    ctx.scale(animScale, animScale);
    ctx.translate(0, animOffsetY);

    const fontStyle = t.fontStyle === "italic" ? "italic" : "normal";
    const fontWeight = t.fontWeight === "bold" ? "bold" : "normal";
    ctx.font = `${fontStyle} ${fontWeight} ${t.fontSize || 48}px ${t.fontFamily || 'Inter, sans-serif'}`;
    ctx.textAlign = t.align || "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(displayContent);
    const textWidth = metrics.width;
    const textHeight = (t.fontSize || 48) * 1.2;
    const padding = t.backgroundPadding ?? 12;

    // Draw background banner box if configured
    if (t.backgroundColor && t.backgroundColor !== "transparent") {
      ctx.save();
      ctx.fillStyle = t.backgroundColor;
      let boxX = -textWidth / 2 - padding;
      if (t.align === "left") boxX = -padding;
      if (t.align === "right") boxX = -textWidth - padding;
      const boxY = -textHeight / 2 - padding;
      const boxW = textWidth + padding * 2;
      const boxH = textHeight + padding * 2;
      const rad = t.borderRadius ?? 6;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, rad);
      ctx.fill();
      ctx.restore();
    }

    // Stroke / outline
    if (t.strokeWidth > 0 && t.strokeColor) {
      ctx.strokeStyle = t.strokeColor;
      ctx.lineWidth = t.strokeWidth;
      ctx.lineJoin = "round";
      ctx.strokeText(displayContent, 0, 0);
    }

    // Fill
    ctx.fillStyle = t.color || "#ffffff";
    ctx.fillText(displayContent, 0, 0);

    ctx.restore();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.pauseAllVideos();
  }
}
