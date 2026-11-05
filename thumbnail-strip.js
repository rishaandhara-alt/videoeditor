// js/thumbnail-strip.js - Filmstrip thumbnails along video clips on the timeline

import { state } from "./state.js";

class ThumbnailStripGenerator {
  constructor() {
    this.cache = new Map(); // assetId:timeOffset -> canvas
    this.videoElements = new Map(); // assetId -> HTMLVideoElement
  }

  getVideoElement(asset) {
    if (!this.videoElements.has(asset.id)) {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.preload = "auto";
      v.src = asset.url;
      this.videoElements.set(asset.id, v);
    }
    return this.videoElements.get(asset.id);
  }

  async getFrame(asset, timeSeconds) {
    const key = `${asset.id}:${Math.round(timeSeconds * 2) / 2}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const video = this.getVideoElement(asset);

    return new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = 120;
        thumbCanvas.height = 68;
        const ctx = thumbCanvas.getContext("2d");
        try {
          ctx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
          this.cache.set(key, thumbCanvas);
          resolve(thumbCanvas);
        } catch (_) {
          resolve(null);
        }
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      const targetTime = Math.max(0, Math.min(timeSeconds, (asset.duration || 10) - 0.1));
      video.currentTime = targetTime;

      // Timeout fallback in case seek hangs
      setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        resolve(this.cache.get(key) || null);
      }, 350);
    });
  }

  renderFilmstrip(canvas, clip, asset) {
    if (!canvas || !asset) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // If still image, draw image stretched or tiled
    if (asset.type === "image" && asset.thumbnail) {
      const img = new Image();
      img.onload = () => {
        const pattern = ctx.createPattern(img, "repeat-x");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }
      };
      img.src = asset.thumbnail;
      return;
    }

    if (asset.type !== "video") return;

    // Video filmstrip: divide canvas width into frames of ~80px wide
    const thumbWidth = 80;
    const frameCount = Math.ceil(width / thumbWidth);
    const sourceDurationInClip = clip.duration * clip.speed;

    for (let i = 0; i < frameCount; i++) {
      const x = i * thumbWidth;
      const progress = i / Math.max(1, frameCount);
      const sampleTime = clip.trimIn + (progress * sourceDurationInClip);

      const cachedKey = `${asset.id}:${Math.round(sampleTime * 2) / 2}`;
      const cached = this.cache.get(cachedKey);

      if (cached) {
        ctx.drawImage(cached, x, 0, thumbWidth, height);
        // Vertical divider line between frames
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + thumbWidth, 0);
        ctx.lineTo(x + thumbWidth, height);
        ctx.stroke();
      } else {
        // Asynchronously fetch frame and re-draw
        this.getFrame(asset, sampleTime).then(frameCanvas => {
          if (frameCanvas && canvas) {
            ctx.drawImage(frameCanvas, x, 0, thumbWidth, height);
          }
        });
      }
    }
  }
}

export const thumbnailGenerator = new ThumbnailStripGenerator();
