// js/shortcuts.js - Global Keyboard Shortcuts and Help / Format Disclosure Modals

import { state } from "./state.js";
import { Icons } from "./icons.js";

export class ShortcutsManager {
  constructor(shortcutsModalEl, formatModalEl) {
    this.shortcutsModal = shortcutsModalEl;
    this.formatModal = formatModalEl;
    this.init();
  }

  init() {
    this.renderShortcutsModal();
    this.renderFormatModal();
    this.bindGlobalKeys();
    this.bindModalEvents();
  }

  renderShortcutsModal() {
    this.shortcutsModal.innerHTML = `
      <div class="modal-dialog" style="width: 580px;">
        <div class="modal-header">
          <div class="modal-title">
            ${Icons.help}
            <span>KEYBOARD SHORTCUTS (DAVINCI / CAPCUT STYLE)</span>
          </div>
          <button class="btn btn-sm btn-icon-only btn-close-modal" style="background:transparent; border:none;">
            ${Icons.close}
          </button>
        </div>
        <div class="modal-body" style="gap: 14px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px;">
            <div style="background:var(--bg-card); padding:8px 12px; border-radius:6px; border:1px solid var(--border-default);">
              <div style="font-weight:700; color:#60a5fa; margin-bottom:6px;">PLAYBACK & SCRUB</div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Play / Pause</span><kbd class="number-badge">Space</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Step 1 Frame Back</span><kbd class="number-badge">←</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Step 1 Frame Forward</span><kbd class="number-badge">→</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Step 10 Frames</span><kbd class="number-badge">Shift + ← / →</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Jump Start / End</span><kbd class="number-badge">Home / End</kbd></div>
              <div style="display:flex; justify-content:space-between;"><span>Fullscreen Preview</span><kbd class="number-badge">F</kbd></div>
            </div>

            <div style="background:var(--bg-card); padding:8px 12px; border-radius:6px; border:1px solid var(--border-default);">
              <div style="font-weight:700; color:#34d399; margin-bottom:6px;">EDITING TOOLS</div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Split at Playhead</span><kbd class="number-badge">S / C</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Delete Selected Clip</span><kbd class="number-badge">Del / ⌫</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Duplicate Clip</span><kbd class="number-badge">Cmd / Ctrl + D</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Add Text Title</span><kbd class="number-badge">T</kbd></div>
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Toggle Snapping</span><kbd class="number-badge">N</kbd></div>
              <div style="display:flex; justify-content:space-between;"><span>Zoom Timeline</span><kbd class="number-badge">+ / -</kbd></div>
            </div>
          </div>

          <div style="background:var(--bg-card); padding:10px 14px; border-radius:6px; border:1px solid var(--border-default); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; color:#facc15;">UNDO & REDO HISTORY</div>
              <div style="font-size:11px; color:var(--text-muted);">FrameStudio records every edit, move, trim, and filter change.</div>
            </div>
            <div style="display:flex; gap:8px;">
              <kbd class="number-badge">Cmd/Ctrl + Z</kbd>
              <kbd class="number-badge">Cmd/Ctrl + Shift + Z</kbd>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-close-modal">Got It</button>
        </div>
      </div>
    `;
  }

  renderFormatModal() {
    this.formatModal.innerHTML = `
      <div class="modal-dialog" style="width: 580px;">
        <div class="modal-header">
          <div class="modal-title">
            ${Icons.info}
            <span>SUPPORTED FORMATS & BROWSER LIMITATIONS</span>
          </div>
          <button class="btn btn-sm btn-icon-only btn-close-modal" style="background:transparent; border:none;">
            ${Icons.close}
          </button>
        </div>
        <div class="modal-body" style="font-size:12px; line-height:1.6; color:var(--text-secondary);">
          <div style="background:var(--bg-card); padding:12px; border-radius:6px; border:1px solid var(--border-default);">
            <div style="font-weight:700; color:#38bdf8; margin-bottom:6px;">Supported Video & Audio Formats</div>
            <ul style="margin-left:18px; margin-bottom:6px;">
              <li><strong>Video:</strong> MP4 (H.264/AVC + AAC audio), WebM (VP8/VP9 + Opus audio), QuickTime MOV (H.264).</li>
              <li><strong>Audio:</strong> MP3, WAV (PCM 16/24-bit), AAC, OGG / WebA, M4A.</li>
              <li><strong>Images:</strong> PNG (transparency supported), JPEG, WebP, SVG, GIF.</li>
            </ul>
          </div>

          <div style="background:rgba(245, 158, 11, 0.08); padding:12px; border-radius:6px; border:1px solid rgba(245, 158, 11, 0.3); color:#fde68a;">
            <div style="font-weight:700; color:#fbbf24; margin-bottom:4px;">Disclosed Browser & Codec Limitations</div>
            <ul style="margin-left:18px; font-size:11px; line-height:1.5;">
              <li><strong>Proprietary Codecs:</strong> HEVC / H.265, ProRes, and Avid DNxHD require host operating system hardware decoder support and may not decode in older browsers. For guaranteed performance, use H.264 MP4 or VP9 WebM.</li>
              <li><strong>Variable Frame Rate (VFR):</strong> Clips recorded on some smartphones with variable frame rates may experience minor audio sync drift during scrub. Transcoding to Constant Frame Rate (CFR 30fps) is recommended.</li>
              <li><strong>Memory & Sandbox:</strong> Video frames and Web Audio PCM buffers reside in browser memory. Chrome and modern browsers allocate up to 4GB of RAM per tab, allowing editing multi-minute 1080p timelines smoothly.</li>
              <li><strong>Export Codecs:</strong> Real export relies on browser-native <code>MediaRecorder</code> and HTML5 Canvas capture, producing WebM (VP9/Opus) or MP4 (H.264/AAC) playable on YouTube, TikTok, QuickTime, and VLC.</li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-close-modal">I Understand</button>
        </div>
      </div>
    `;
  }

  bindModalEvents() {
    this.shortcutsModal.addEventListener("click", e => {
      if (e.target.closest(".btn-close-modal") || e.target === this.shortcutsModal) {
        this.shortcutsModal.classList.remove("open");
      }
    });

    this.formatModal.addEventListener("click", e => {
      if (e.target.closest(".btn-close-modal") || e.target === this.formatModal) {
        this.formatModal.classList.remove("open");
      }
    });
  }

  openShortcuts() {
    this.shortcutsModal.classList.add("open");
  }

  openFormats() {
    this.formatModal.classList.add("open");
  }

  bindGlobalKeys() {
    window.addEventListener("keydown", e => {
      // Ignore if user is typing in an input, textarea, or contentEditable
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Space: Toggle Play/Pause
      if (e.code === "Space") {
        e.preventDefault();
        state.togglePlay();
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if (cmdOrCtrl && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (state.undo()) {
          state.emit("toast", { message: "Undo", type: "info" });
        }
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((cmdOrCtrl && e.shiftKey && (e.key === "z" || e.key === "Z")) || (cmdOrCtrl && (e.key === "y" || e.key === "Y"))) {
        e.preventDefault();
        if (state.redo()) {
          state.emit("toast", { message: "Redo", type: "info" });
        }
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if (cmdOrCtrl && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (state.selectedClipId) {
          state.duplicateClip(state.selectedClipId);
        }
        return;
      }

      // Split: S or C
      if (e.key === "s" || e.key === "S" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        state.splitClipAtPlayhead();
        return;
      }

      // Delete: Backspace or Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        if (state.selectedClipId) {
          state.removeClip(state.selectedClipId);
        }
        return;
      }

      // Frame stepping
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        state.stepFrames(e.shiftKey ? -10 : -1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        state.stepFrames(e.shiftKey ? 10 : 1);
        return;
      }

      // Snapping toggle: N
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        state.snapping = !state.snapping;
        state.emit("snappingChanged", { snapping: state.snapping });
        state.emit("toast", { message: state.snapping ? "Snapping Enabled" : "Snapping Disabled", type: "info" });
        return;
      }

      // Timeline Zoom: + and -
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        state.zoom = Math.min(300, state.zoom + 15);
        state.emit("tracksUpdated");
        return;
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        state.zoom = Math.max(10, state.zoom - 15);
        state.emit("tracksUpdated");
        return;
      }

      // Jump Home / End
      if (e.key === "Home") {
        e.preventDefault();
        state.setPlayhead(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        state.setPlayhead(state.getProjectDuration());
        return;
      }

      // Shuttle keys: J, K, L
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        state.setPlaying(false);
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        state.setPlaying(true);
        return;
      }

      // Help: ?
      if (e.key === "?") {
        e.preventDefault();
        this.openShortcuts();
        return;
      }
    });
  }
}
