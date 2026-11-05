// js/timeline.js - Interactive Multi-Track Timeline, Scrubbing, Trimming, and Snapping

import { state } from "./state.js";
import { Icons } from "./icons.js";
import { thumbnailGenerator } from "./thumbnail-strip.js";
import { WaveformRenderer } from "./waveform.js";

export class Timeline {
  constructor(containerEl) {
    this.container = containerEl;
    this.rulerCanvas = null;
    this.playheadEl = null;
    this.snapGuideEl = null;
    this.lanesContainer = null;
    this.isDraggingPlayhead = false;
    this.activeDrag = null; // { type: 'move'|'trim-start'|'trim-end', clipId, startX, origStartTime, origDuration, origTrimIn }
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.renderRuler();
    this.updatePlayheadPosition();
  }

  render() {
    this.container.innerHTML = `
      <!-- Time Ruler -->
      <div class="timeline-ruler-wrapper">
        <div class="ruler-header-spacer">TRACKS</div>
        <div class="ruler-canvas-container" id="ruler-container">
          <canvas id="ruler-canvas"></canvas>
          <div class="snap-guide-line" id="snap-guide-line"></div>
          <div class="timeline-playhead" id="timeline-playhead">
            <div class="playhead-head"></div>
          </div>
        </div>
      </div>

      <!-- Timeline Body (Headers & Track Lanes) -->
      <div class="timeline-body" id="timeline-body">
        <div class="track-headers" id="track-headers">
          <!-- Populated from state.tracks -->
        </div>

        <div class="track-lanes-scroll" id="track-lanes-scroll">
          <div class="track-lanes" id="track-lanes">
            <!-- Track lanes rendered dynamically -->
          </div>
        </div>
      </div>
    `;

    this.rulerCanvas = this.container.querySelector("#ruler-canvas");
    this.playheadEl = this.container.querySelector("#timeline-playhead");
    this.snapGuideEl = this.container.querySelector("#snap-guide-line");
    this.lanesContainer = this.container.querySelector("#track-lanes");
    this.scrollContainer = this.container.querySelector("#track-lanes-scroll");

    this.renderTracks();
  }

  bindEvents() {
    // Window resize
    window.addEventListener("resize", () => {
      this.renderRuler();
      this.renderTracks();
      this.updatePlayheadPosition();
    });

    // State events
    state.on("tracksUpdated", () => {
      this.renderTracks();
    });

    state.on("timeUpdate", () => {
      this.updatePlayheadPosition();
    });

    state.on("selectionChanged", ({ clip }) => {
      this.container.querySelectorAll(".timeline-clip").forEach(el => {
        el.classList.toggle("selected", el.dataset.clipId === (clip ? clip.id : null));
      });
    });

    // Ruler Playhead scrubbing
    const rulerContainer = this.container.querySelector("#ruler-container");
    rulerContainer.addEventListener("mousedown", e => {
      this.isDraggingPlayhead = true;
      this.seekFromMouseEvent(e);
      window.addEventListener("mousemove", this.onPlayheadMouseMove);
      window.addEventListener("mouseup", this.onPlayheadMouseUp);
    });

    // Global drag / trim mouse handlers
    window.addEventListener("mousemove", e => {
      if (this.activeDrag) {
        this.handleClipDragMove(e);
      }
    });

    window.addEventListener("mouseup", () => {
      if (this.activeDrag) {
        state.pushHistory(this.activeDrag.type === "move" ? "Move Clip" : "Trim Clip");
        this.activeDrag = null;
        this.hideSnapGuide();
      }
    });

    // Drag-over from Media Library
    const scrollPane = this.scrollContainer;
    scrollPane.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    scrollPane.addEventListener("drop", e => {
      e.preventDefault();
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data && data.assetId) {
          const rect = this.lanesContainer.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const dropTime = Math.max(0, dropX / state.zoom);

          // Find track lane under cursor
          const laneEls = Array.from(this.lanesContainer.querySelectorAll(".track-lane"));
          let targetTrackId = null;
          for (const lane of laneEls) {
            const laneRect = lane.getBoundingClientRect();
            if (e.clientY >= laneRect.top && e.clientY <= laneRect.bottom) {
              targetTrackId = lane.dataset.trackId;
              break;
            }
          }

          if (!targetTrackId) {
            const t = data.assetType === "audio" ? state.tracks[3] : state.tracks[1];
            targetTrackId = t.id;
          }

          state.addClip(targetTrackId, {
            name: data.name,
            type: data.assetType,
            assetId: data.assetId,
            startTime: dropTime,
            duration: data.duration || 5,
            sourceDuration: data.duration || 5
          });
        }
      } catch (err) {
        console.error("Drop error:", err);
      }
    });
  }

  onPlayheadMouseMove = (e) => {
    if (this.isDraggingPlayhead) {
      this.seekFromMouseEvent(e);
    }
  };

  onPlayheadMouseUp = () => {
    this.isDraggingPlayhead = false;
    window.removeEventListener("mousemove", this.onPlayheadMouseMove);
    window.removeEventListener("mouseup", this.onPlayheadMouseUp);
  };

  seekFromMouseEvent(e) {
    const rect = this.lanesContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let time = Math.max(0, mouseX / state.zoom);

    // Snap to nearest boundary if snapping enabled
    if (state.snapping) {
      time = state.getSnapTime(time);
    }

    state.setPlayhead(time, true);
  }

  updatePlayheadPosition() {
    const x = state.playhead * state.zoom;
    if (this.playheadEl) {
      this.playheadEl.style.transform = `translateX(${x}px)`;
    }

    // Auto-scroll timeline to keep playhead in view during playback
    if (state.isPlaying && this.scrollContainer) {
      const scrollLeft = this.scrollContainer.scrollLeft;
      const clientWidth = this.scrollContainer.clientWidth;
      if (x > scrollLeft + clientWidth - 80 || x < scrollLeft) {
        this.scrollContainer.scrollLeft = Math.max(0, x - clientWidth / 3);
      }
    }
  }

  renderRuler() {
    const canvas = this.rulerCanvas;
    if (!canvas) return;

    const width = Math.max(this.scrollContainer?.clientWidth || 1000, (state.getProjectDuration() + 5) * state.zoom);
    canvas.width = width;
    canvas.height = 28;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, 28);

    ctx.fillStyle = "#121620";
    ctx.fillRect(0, 0, width, 28);

    ctx.strokeStyle = "#283043";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px SF Mono, monospace";

    const zoom = state.zoom;
    // Step size based on zoom level
    let stepSec = 1;
    if (zoom < 25) stepSec = 5;
    else if (zoom < 50) stepSec = 2;
    else if (zoom > 150) stepSec = 0.5;

    const totalSecs = width / zoom;

    for (let s = 0; s <= totalSecs; s += stepSec) {
      const x = s * zoom;

      // Major second tick
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 28);
      ctx.stroke();

      const mins = Math.floor(s / 60);
      const secs = Math.floor(s % 60);
      const frames = Math.round((s % 1) * state.project.fps);
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}${stepSec < 1 ? `:${frames.toString().padStart(2, '0')}` : ''}`;
      ctx.fillText(timeStr, x + 4, 11);

      // Minor subdivisions (half seconds or quarter seconds)
      const subTicks = 4;
      for (let sub = 1; sub < subTicks; sub++) {
        const subX = x + (sub * (stepSec * zoom / subTicks));
        ctx.beginPath();
        ctx.moveTo(subX, 22);
        ctx.lineTo(subX, 28);
        ctx.stroke();
      }
    }
  }

  renderTracks() {
    const headersEl = this.container.querySelector("#track-headers");
    const lanesEl = this.lanesContainer;
    if (!headersEl || !lanesEl) return;

    headersEl.innerHTML = "";
    lanesEl.innerHTML = "";

    const projectWidth = Math.max(this.scrollContainer?.clientWidth || 1000, (state.getProjectDuration() + 5) * state.zoom);
    lanesEl.style.width = `${projectWidth}px`;
    this.renderRuler();

    state.tracks.forEach(track => {
      // 1. Render Track Header
      const header = document.createElement("div");
      header.className = "track-header";
      header.innerHTML = `
        <div class="track-header-top">
          <div class="track-title">
            ${track.type === 'video' ? Icons.film : track.type === 'audio' ? Icons.music : Icons.type}
            <span>${track.name}</span>
          </div>
          <div class="track-controls">
            <button class="track-btn mute ${track.muted ? 'active' : ''}" title="Mute Track" data-action="mute">
              ${track.muted ? Icons.volumeX : Icons.volume2}
            </button>
            <button class="track-btn ${track.hidden ? 'active' : ''}" title="Hide Track" data-action="hide">
              ${track.hidden ? Icons.eyeOff : Icons.eye}
            </button>
            <button class="track-btn ${track.locked ? 'active' : ''}" title="Lock Track" data-action="lock">
              ${track.locked ? Icons.lock : Icons.unlock}
            </button>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; font-size:10px; color:var(--text-muted);">
          <span>VOL</span>
          <input type="range" class="slider-control" min="0" max="2" step="0.05" value="${track.volume}" data-action="volume" style="height:3px;" />
          <span style="font-family:var(--font-mono); font-size:9px;">${Math.round(track.volume * 100)}%</span>
        </div>
      `;

      // Track header actions
      header.addEventListener("click", e => {
        const btn = e.target.closest(".track-btn");
        if (btn) {
          const action = btn.dataset.action;
          if (action === "mute") state.setTrackMute(track.id, !track.muted);
          else if (action === "hide") state.setTrackHidden(track.id, !track.hidden);
          else if (action === "lock") state.setTrackLocked(track.id, !track.locked);
        }
      });

      header.querySelector('input[data-action="volume"]').addEventListener("input", e => {
        state.setTrackVolume(track.id, parseFloat(e.target.value));
      });

      headersEl.appendChild(header);

      // 2. Render Track Lane
      const lane = document.createElement("div");
      lane.className = "track-lane";
      lane.dataset.trackId = track.id;

      // Render clips in this lane
      track.clips.forEach(clip => {
        const clipEl = this.createClipElement(clip, track);
        lane.appendChild(clipEl);
      });

      lanesEl.appendChild(lane);
    });

    this.updatePlayheadPosition();
  }

  createClipElement(clip, track) {
    const el = document.createElement("div");
    el.className = `timeline-clip ${clip.type === 'audio' ? 'clip-audio' : clip.type === 'text' ? 'clip-text' : ''} ${state.selectedClipId === clip.id ? 'selected' : ''}`;
    el.dataset.clipId = clip.id;

    const left = clip.startTime * state.zoom;
    const width = clip.duration * state.zoom;

    el.style.left = `${left}px`;
    el.style.width = `${Math.max(16, width)}px`;

    // Transition ribbon if applicable
    let transitionHtml = "";
    if (clip.transition && clip.transition.type !== "none") {
      const transWidth = clip.transition.duration * state.zoom;
      transitionHtml = `<div class="transition-indicator" style="left:0; width:${transWidth}px;">${clip.transition.type.toUpperCase()}</div>`;
    }

    el.innerHTML = `
      <div class="clip-header-bar">
        <span class="clip-title-text">${clip.name}</span>
        <span class="clip-duration-tag">${clip.duration.toFixed(1)}s</span>
      </div>
      <div class="clip-body">
        ${clip.type === 'video' ? `<canvas class="clip-filmstrip-canvas"></canvas>` : ''}
        ${clip.type === 'audio' ? `<canvas class="clip-waveform-canvas"></canvas>` : ''}
        ${clip.type === 'text' ? `<div style="padding:4px; font-size:10px; color:#cbd5e1; white-space:nowrap; overflow:hidden;">"${clip.text?.content || 'Text'}"</div>` : ''}
        ${transitionHtml}
      </div>
      <div class="trim-handle trim-handle-left" data-side="start"></div>
      <div class="trim-handle trim-handle-right" data-side="end"></div>
    `;

    // Asynchronously render filmstrip or waveform onto clip's canvas
    requestAnimationFrame(() => {
      const asset = state.assets.get(clip.assetId);
      if (clip.type === "video") {
        const canvas = el.querySelector(".clip-filmstrip-canvas");
        if (canvas && asset) {
          canvas.width = Math.max(16, width);
          canvas.height = 38;
          thumbnailGenerator.renderFilmstrip(canvas, clip, asset);
        }
      } else if (clip.type === "audio") {
        const canvas = el.querySelector(".clip-waveform-canvas");
        if (canvas && asset && asset.audioBuffer) {
          canvas.width = Math.max(16, width);
          canvas.height = 38;
          WaveformRenderer.renderWaveform(canvas, asset.audioBuffer, clip);
        }
      }
    });

    // Clip Mouse interactions: Select, Drag to Move, or Drag Trim Handles
    el.addEventListener("mousedown", e => {
      e.stopPropagation();

      const trimHandle = e.target.closest(".trim-handle");
      if (trimHandle) {
        // Trimming
        const side = trimHandle.dataset.side;
        this.activeDrag = {
          type: side === "start" ? "trim-start" : "trim-end",
          clipId: clip.id,
          startX: e.clientX,
          origStartTime: clip.startTime,
          origDuration: clip.duration,
          origTrimIn: clip.trimIn
        };
      } else {
        // Selection & Moving
        state.selectClip(clip.id);
        if (!track.locked) {
          this.activeDrag = {
            type: "move",
            clipId: clip.id,
            startX: e.clientX,
            origStartTime: clip.startTime,
            trackId: track.id
          };
        }
      }
    });

    return el;
  }

  handleClipDragMove(e) {
    const { type, clipId, startX, origStartTime, origDuration, origTrimIn } = this.activeDrag;
    const { clip, track } = state.findClip(clipId);
    if (!clip || !track) return;

    const deltaX = e.clientX - startX;
    const deltaTime = deltaX / state.zoom;

    if (type === "move") {
      let proposedStart = Math.max(0, origStartTime + deltaTime);
      if (state.snapping) {
        const snapped = state.getSnapTime(proposedStart, clip.id);
        if (Math.abs(snapped - proposedStart) < state.snapThreshold) {
          proposedStart = snapped;
          this.showSnapGuide(snapped);
        } else {
          this.hideSnapGuide();
        }
      }

      clip.startTime = proposedStart;
      const el = this.lanesContainer.querySelector(`.timeline-clip[data-clip-id="${clip.id}"]`);
      if (el) {
        el.style.left = `${proposedStart * state.zoom}px`;
      }
    } else if (type === "trim-start") {
      let proposedStart = origStartTime + deltaTime;
      if (state.snapping) {
        const snapped = state.getSnapTime(proposedStart, clip.id);
        if (Math.abs(snapped - proposedStart) < state.snapThreshold) {
          proposedStart = snapped;
          this.showSnapGuide(snapped);
        } else {
          this.hideSnapGuide();
        }
      }

      state.trimClip(clip.id, "start", proposedStart);
    } else if (type === "trim-end") {
      let proposedEnd = (origStartTime + origDuration) + deltaTime;
      if (state.snapping) {
        const snapped = state.getSnapTime(proposedEnd, clip.id);
        if (Math.abs(snapped - proposedEnd) < state.snapThreshold) {
          proposedEnd = snapped;
          this.showSnapGuide(snapped);
        } else {
          this.hideSnapGuide();
        }
      }

      state.trimClip(clip.id, "end", proposedEnd);
    }
  }

  showSnapGuide(time) {
    if (this.snapGuideEl) {
      this.snapGuideEl.style.display = "block";
      this.snapGuideEl.style.transform = `translateX(${time * state.zoom}px)`;
    }
  }

  hideSnapGuide() {
    if (this.snapGuideEl) {
      this.snapGuideEl.style.display = "none";
    }
  }

  setZoom(zoomPixelsPerSec) {
    state.zoom = Math.max(10, Math.min(300, zoomPixelsPerSec));
    this.renderTracks();
    this.updatePlayheadPosition();
  }
}
