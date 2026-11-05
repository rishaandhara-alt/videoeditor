// js/app.js - Main Application Orchestrator for FrameStudio

import { state } from "./state.js";
import { Icons } from "./icons.js";
import { MediaLibrary } from "./media-library.js";
import { VideoRenderer } from "./renderer.js";
import { Inspector } from "./inspector.js";
import { Timeline } from "./timeline.js";
import { VideoExporter } from "./exporter.js";
import { ShortcutsManager } from "./shortcuts.js";
import { projectStore } from "./project-store.js";

class FrameStudioApp {
  constructor() {
    this.mediaLibrary = null;
    this.videoRenderer = null;
    this.inspector = null;
    this.timeline = null;
    this.exporter = null;
    this.shortcuts = null;
  }

  init() {
    this.setupUI();
    this.initToastSystem();
    this.initComponents();
    this.bindHeaderAndToolbar();

    // Check if auto-save exists or load demo project automatically so user can start testing right away!
    setTimeout(() => {
      if (projectStore.hasAutoSave()) {
        const restored = projectStore.restoreAutoSave();
        if (!restored) {
          this.mediaLibrary.loadDemoProject();
        }
      } else {
        this.mediaLibrary.loadDemoProject();
      }
    }, 200);
  }

  setupUI() {
    const root = document.getElementById("app-root");
    root.innerHTML = `
      <!-- Top Application Header -->
      <header class="app-header">
        <div class="brand-section">
          <div class="brand-logo">
            <span style="font-size:20px; color:#3b82f6;">🎬</span>
            <span>FrameStudio</span>
            <span class="brand-badge">PRO</span>
          </div>
          <input type="text" class="project-name-input" id="project-name" value="${state.project.name}" title="Click to rename project" />
        </div>

        <div class="header-center">
          <button class="btn btn-sm btn-icon-only" id="btn-undo" title="Undo (Cmd+Z)" disabled>
            ${Icons.undo}
          </button>
          <button class="btn btn-sm btn-icon-only" id="btn-redo" title="Redo (Cmd+Shift+Z)" disabled>
            ${Icons.redo}
          </button>
        </div>

        <div class="header-actions">
          <button class="btn btn-sm" id="btn-save-project" title="Save Project (.fsproj)">
            ${Icons.save} Save
          </button>
          <button class="btn btn-sm" id="btn-load-project" title="Open Project File">
            ${Icons.folderOpen} Open
          </button>
          <button class="btn btn-sm" id="btn-show-formats" title="Supported Codecs & Limitations">
            ${Icons.info} Formats
          </button>
          <button class="btn btn-sm" id="btn-show-shortcuts" title="Keyboard Shortcuts (?)">
            ${Icons.help} Shortcuts
          </button>
          <button class="btn btn-primary" id="btn-open-export">
            ${Icons.download} Export Video
          </button>
        </div>
      </header>

      <!-- Main Workspace -->
      <div class="workspace-container">
        <!-- Upper Workspace: Media Library, Canvas Preview, Properties Inspector -->
        <div class="upper-workspace">
          <!-- Left: Media Library -->
          <aside class="media-panel" id="media-panel-container"></aside>

          <!-- Center: Real-Time Preview Monitor -->
          <main class="preview-panel">
            <div class="preview-topbar">
              <span class="preview-resolution-badge" id="preview-res-badge">1920x1080 • 16:9</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <select class="select-control" id="preview-aspect-select" style="padding:2px 6px; font-size:11px; height:24px;">
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Shorts/Reels</option>
                  <option value="1:1">1:1 Square</option>
                </select>
                <button class="btn btn-sm btn-icon-only" id="btn-fullscreen-preview" title="Fullscreen (F)">
                  ${Icons.maximize}
                </button>
              </div>
            </div>

            <div class="preview-viewport" id="preview-viewport">
              <canvas id="preview-canvas"></canvas>
            </div>

            <!-- Transport Control Bar -->
            <div class="preview-controls">
              <div class="transport-timecode" id="transport-timecode">00:00:00:00</div>

              <div class="transport-buttons">
                <button class="btn btn-sm btn-icon-only" id="btn-jump-start" title="Jump to Start (Home)">
                  ${Icons.skipBack}
                </button>
                <button class="btn btn-sm btn-icon-only" id="btn-step-back" title="Step 1 Frame Back (←)">
                  ${Icons.stepBack}
                </button>
                <button class="play-btn" id="btn-play-pause" title="Play / Pause (Space)">
                  ${Icons.play}
                </button>
                <button class="btn btn-sm btn-icon-only" id="btn-step-forward" title="Step 1 Frame Forward (→)">
                  ${Icons.stepForward}
                </button>
                <button class="btn btn-sm btn-icon-only" id="btn-jump-end" title="Jump to End (End)">
                  ${Icons.skipForward}
                </button>
              </div>

              <div style="display:flex; align-items:center; gap:10px; font-size:11px; color:var(--text-muted);">
                <span id="project-total-duration">Total: 00:00:00</span>
              </div>
            </div>
          </main>

          <!-- Right: Properties Inspector -->
          <aside class="inspector-panel" id="inspector-panel-container"></aside>
        </div>

        <!-- Middle: Editing Toolbar -->
        <div class="editing-toolbar">
          <div class="toolbar-group">
            <button class="btn btn-sm" id="btn-tool-split" title="Split Clip at Playhead (S or C)">
              ${Icons.scissors} Split
            </button>
            <button class="btn btn-sm" id="btn-tool-duplicate" title="Duplicate Clip (Cmd+D)">
              ${Icons.copy} Duplicate
            </button>
            <button class="btn btn-sm btn-danger" id="btn-tool-delete" title="Delete Clip (Backspace)">
              ${Icons.trash} Delete
            </button>
            <div class="toolbar-separator"></div>
            <button class="btn btn-sm" id="btn-add-text-title" title="Add Text Overlay Track">
              ${Icons.type} Add Title
            </button>
            <button class="btn btn-sm ${state.snapping ? 'active' : ''}" id="btn-toggle-snapping" title="Toggle Snapping (N)">
              ${Icons.magnet} Snapping
            </button>
          </div>

          <div class="toolbar-group">
            <button class="btn btn-sm btn-icon-only" id="btn-zoom-out" title="Zoom Out (-)">
              ${Icons.zoomOut}
            </button>
            <input type="range" class="slider-control" min="15" max="250" step="5" value="${state.zoom}" id="timeline-zoom-slider" style="width:100px;" title="Timeline Zoom" />
            <button class="btn btn-sm btn-icon-only" id="btn-zoom-in" title="Zoom In (+)">
              ${Icons.zoomIn}
            </button>
            <button class="btn btn-sm" id="btn-zoom-fit" style="font-size:11px;">
              Fit
            </button>
          </div>
        </div>

        <!-- Bottom: Multi-Track Timeline -->
        <section class="timeline-panel" id="timeline-panel-container"></section>
      </div>

      <!-- Modals Container -->
      <div class="modal-backdrop" id="export-modal"></div>
      <div class="modal-backdrop" id="shortcuts-modal"></div>
      <div class="modal-backdrop" id="format-modal"></div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    `;
  }

  initComponents() {
    const mediaContainer = document.getElementById("media-panel-container");
    this.mediaLibrary = new MediaLibrary(mediaContainer);

    const canvas = document.getElementById("preview-canvas");
    this.videoRenderer = new VideoRenderer(canvas);

    const inspectorContainer = document.getElementById("inspector-panel-container");
    this.inspector = new Inspector(inspectorContainer);

    const timelineContainer = document.getElementById("timeline-panel-container");
    this.timeline = new Timeline(timelineContainer);

    const exportModal = document.getElementById("export-modal");
    this.exporter = new VideoExporter(exportModal);

    const shortcutsModal = document.getElementById("shortcuts-modal");
    const formatModal = document.getElementById("format-modal");
    this.shortcuts = new ShortcutsManager(shortcutsModal, formatModal);
  }

  bindHeaderAndToolbar() {
    // Project Name rename
    const nameInput = document.getElementById("project-name");
    nameInput.addEventListener("change", e => {
      state.project.name = e.target.value;
      state.pushHistory("Rename Project");
    });

    // Undo / Redo
    const undoBtn = document.getElementById("btn-undo");
    const redoBtn = document.getElementById("btn-redo");

    undoBtn.addEventListener("click", () => state.undo());
    redoBtn.addEventListener("click", () => state.redo());

    state.on("historyChange", ({ canUndo, canRedo }) => {
      undoBtn.disabled = !canUndo;
      redoBtn.disabled = !canRedo;
    });

    // Save & Load Project
    document.getElementById("btn-save-project").addEventListener("click", () => {
      projectStore.saveToFile();
    });

    document.getElementById("btn-load-project").addEventListener("click", () => {
      projectStore.loadFromFile();
    });

    // Export Video
    document.getElementById("btn-open-export").addEventListener("click", () => {
      this.exporter.open();
    });

    // Formats & Shortcuts Dialogs
    document.getElementById("btn-show-formats").addEventListener("click", () => {
      this.shortcuts.openFormats();
    });

    document.getElementById("btn-show-shortcuts").addEventListener("click", () => {
      this.shortcuts.openShortcuts();
    });

    // Transport buttons
    const playBtn = document.getElementById("btn-play-pause");
    playBtn.addEventListener("click", () => {
      state.togglePlay();
    });

    state.on("playbackState", ({ isPlaying }) => {
      playBtn.innerHTML = isPlaying ? Icons.pause : Icons.play;
    });

    document.getElementById("btn-jump-start").addEventListener("click", () => state.setPlayhead(0));
    document.getElementById("btn-jump-end").addEventListener("click", () => state.setPlayhead(state.getProjectDuration()));
    document.getElementById("btn-step-back").addEventListener("click", () => state.stepFrames(-1));
    document.getElementById("btn-step-forward").addEventListener("click", () => state.stepFrames(1));

    // Fullscreen Preview
    document.getElementById("btn-fullscreen-preview").addEventListener("click", () => {
      const viewport = document.getElementById("preview-viewport");
      if (!document.fullscreenElement) {
        viewport.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Aspect Ratio Toggle
    document.getElementById("preview-aspect-select").addEventListener("change", e => {
      const aspect = e.target.value;
      state.project.aspectRatio = aspect;
      const resBadge = document.getElementById("preview-res-badge");

      if (aspect === "16:9") {
        this.videoRenderer.setResolution(1920, 1080);
        resBadge.textContent = "1920x1080 • 16:9";
      } else if (aspect === "9:16") {
        this.videoRenderer.setResolution(1080, 1920);
        resBadge.textContent = "1080x1920 • 9:16 Shorts";
      } else if (aspect === "1:1") {
        this.videoRenderer.setResolution(1080, 1080);
        resBadge.textContent = "1080x1080 • 1:1 Square";
      }
    });

    // Timecode updates
    const timecodeEl = document.getElementById("transport-timecode");
    const totalDurationEl = document.getElementById("project-total-duration");

    state.on("timeUpdate", ({ time }) => {
      timecodeEl.textContent = this.formatTimecode(time);
      totalDurationEl.textContent = `Total: ${this.formatTimecode(state.getProjectDuration())}`;
    });

    // Toolbar actions
    document.getElementById("btn-tool-split").addEventListener("click", () => {
      state.splitClipAtPlayhead();
    });

    document.getElementById("btn-tool-duplicate").addEventListener("click", () => {
      if (state.selectedClipId) {
        state.duplicateClip(state.selectedClipId);
      } else {
        state.emit("toast", { message: "Select a clip to duplicate", type: "warning" });
      }
    });

    document.getElementById("btn-tool-delete").addEventListener("click", () => {
      if (state.selectedClipId) {
        state.removeClip(state.selectedClipId);
      } else {
        state.emit("toast", { message: "Select a clip to delete", type: "warning" });
      }
    });

    document.getElementById("btn-add-text-title").addEventListener("click", () => {
      const textTrack = state.tracks.find(t => t.type === "text" && !t.locked) || state.tracks[2];
      state.addClip(textTrack.id, {
        name: "Title Overlay",
        type: "text",
        startTime: state.playhead,
        duration: 4.0,
        text: {
          content: "TITLE TEXT HERE",
          fontFamily: "Inter, sans-serif",
          fontSize: 50,
          fontWeight: "bold",
          color: "#ffffff",
          strokeColor: "#000000",
          strokeWidth: 3,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backgroundPadding: 12,
          borderRadius: 6,
          align: "center",
          animation: "fade"
        }
      });
      state.emit("toast", { message: "Added title overlay clip", type: "success" });
    });

    // Snapping toggle
    const snappingBtn = document.getElementById("btn-toggle-snapping");
    snappingBtn.addEventListener("click", () => {
      state.snapping = !state.snapping;
      snappingBtn.classList.toggle("active", state.snapping);
      state.emit("toast", { message: state.snapping ? "Snapping Enabled" : "Snapping Disabled", type: "info" });
    });

    // Timeline Zoom Slider & Buttons
    const zoomSlider = document.getElementById("timeline-zoom-slider");
    zoomSlider.addEventListener("input", e => {
      this.timeline.setZoom(parseFloat(e.target.value));
    });

    document.getElementById("btn-zoom-in").addEventListener("click", () => {
      const newZoom = Math.min(250, state.zoom + 20);
      zoomSlider.value = newZoom;
      this.timeline.setZoom(newZoom);
    });

    document.getElementById("btn-zoom-out").addEventListener("click", () => {
      const newZoom = Math.max(15, state.zoom - 20);
      zoomSlider.value = newZoom;
      this.timeline.setZoom(newZoom);
    });

    document.getElementById("btn-zoom-fit").addEventListener("click", () => {
      const lanesContainer = document.getElementById("track-lanes-scroll");
      const clientWidth = lanesContainer ? lanesContainer.clientWidth - 50 : 800;
      const totalSec = Math.max(10, state.getProjectDuration());
      const fitZoom = Math.max(15, Math.min(250, clientWidth / totalSec));
      zoomSlider.value = fitZoom;
      this.timeline.setZoom(fitZoom);
    });
  }

  formatTimecode(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * state.project.fps);

    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  initToastSystem() {
    const toastContainer = document.getElementById("toast-container");
    state.on("toast", ({ message, type = "info" }) => {
      const toast = document.createElement("div");
      toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
      toast.innerHTML = `
        <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span>${message}</span>
      `;

      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s";
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    });
  }
}

// Bootstrap application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new FrameStudioApp();
  app.init();
});
