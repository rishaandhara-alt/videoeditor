// js/inspector.js - Properties Inspector for Transforms, Color Grading, Speed, Audio, and Text

import { state } from "./state.js";
import { Icons } from "./icons.js";

export class Inspector {
  constructor(containerEl) {
    this.container = containerEl;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  bindEvents() {
    state.on("selectionChanged", () => {
      this.render();
    });

    state.on("clipUpdated", () => {
      // Don't completely re-render to avoid losing focus on active inputs
    });
  }

  render() {
    const clip = state.getSelectedClip();

    if (!clip) {
      this.container.innerHTML = `
        <div class="inspector-header">
          <span>INSPECTOR</span>
        </div>
        <div class="inspector-empty">
          <div style="font-size: 32px; opacity: 0.4;">⚙️</div>
          <div style="font-weight: 600; font-size: 13px;">No Clip Selected</div>
          <p style="font-size: 11px; color: var(--text-muted); max-width: 200px;">
            Select a video, audio, or title clip on the timeline to inspect and edit properties.
          </p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="inspector-header">
        <span style="display:flex; align-items:center; gap:6px;">
          ${clip.type === 'video' ? Icons.film : clip.type === 'audio' ? Icons.music : Icons.type}
          ${clip.name}
        </span>
        <button class="btn btn-sm btn-danger btn-icon-only" id="btn-inspector-delete" title="Delete Clip">
          ${Icons.trash}
        </button>
      </div>

      <div class="inspector-content">
        <!-- Quick Timing & Speed Section -->
        <div class="inspector-section">
          <div class="section-title">TIMING & SPEED</div>
          <div class="section-body">
            <div class="prop-row">
              <span class="prop-label">Speed</span>
              <div class="prop-input-group">
                <select class="select-control" id="prop-speed">
                  <option value="0.25" ${clip.speed === 0.25 ? 'selected' : ''}>0.25x (Slow-Mo)</option>
                  <option value="0.5" ${clip.speed === 0.5 ? 'selected' : ''}>0.5x</option>
                  <option value="0.75" ${clip.speed === 0.75 ? 'selected' : ''}>0.75x</option>
                  <option value="1.0" ${clip.speed === 1.0 ? 'selected' : ''}>1.0x (Normal)</option>
                  <option value="1.25" ${clip.speed === 1.25 ? 'selected' : ''}>1.25x</option>
                  <option value="1.5" ${clip.speed === 1.5 ? 'selected' : ''}>1.5x</option>
                  <option value="2.0" ${clip.speed === 2.0 ? 'selected' : ''}>2.0x (Fast)</option>
                  <option value="4.0" ${clip.speed === 4.0 ? 'selected' : ''}>4.0x (Hyperlapse)</option>
                </select>
              </div>
            </div>

            <div class="prop-row">
              <span class="prop-label">Duration</span>
              <span class="number-badge">${clip.duration.toFixed(2)}s</span>
            </div>

            <div class="prop-row">
              <span class="prop-label">Transition</span>
              <select class="select-control" id="prop-transition-type">
                <option value="none" ${clip.transition?.type === 'none' ? 'selected' : ''}>None</option>
                <option value="crossfade" ${clip.transition?.type === 'crossfade' ? 'selected' : ''}>Crossfade</option>
                <option value="fade-black" ${clip.transition?.type === 'fade-black' ? 'selected' : ''}>Fade to Black</option>
                <option value="wipe-left" ${clip.transition?.type === 'wipe-left' ? 'selected' : ''}>Wipe Left</option>
                <option value="wipe-right" ${clip.transition?.type === 'wipe-right' ? 'selected' : ''}>Wipe Right</option>
                <option value="zoom" ${clip.transition?.type === 'zoom' ? 'selected' : ''}>Zoom In</option>
              </select>
            </div>
            ${clip.transition?.type !== 'none' ? `
              <div class="prop-row">
                <span class="prop-label">Trans Duration</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0.1" max="2.0" step="0.1" value="${clip.transition.duration || 0.5}" id="prop-transition-duration" />
                  <span class="number-badge" id="val-transition-duration">${(clip.transition.duration || 0.5).toFixed(1)}s</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        ${clip.type !== 'audio' ? `
          <!-- Transform Section (Video, Image, Text) -->
          <div class="inspector-section">
            <div class="section-title">TRANSFORM & OPACITY</div>
            <div class="section-body">
              <div class="prop-row">
                <span class="prop-label">Scale</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0.2" max="2.5" step="0.05" value="${clip.transform?.scale ?? 1.0}" id="prop-scale" />
                  <span class="number-badge" id="val-scale">${Math.round((clip.transform?.scale ?? 1.0) * 100)}%</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Position X</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-500" max="500" step="10" value="${clip.transform?.x ?? 0}" id="prop-pos-x" />
                  <span class="number-badge" id="val-pos-x">${clip.transform?.x ?? 0}px</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Position Y</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-400" max="400" step="10" value="${clip.transform?.y ?? 0}" id="prop-pos-y" />
                  <span class="number-badge" id="val-pos-y">${clip.transform?.y ?? 0}px</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Rotation</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-180" max="180" step="1" value="${clip.transform?.rotation ?? 0}" id="prop-rotation" />
                  <span class="number-badge" id="val-rotation">${clip.transform?.rotation ?? 0}°</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Opacity</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="1" step="0.05" value="${clip.transform?.opacity ?? 1.0}" id="prop-opacity" />
                  <span class="number-badge" id="val-opacity">${Math.round((clip.transform?.opacity ?? 1.0) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Color Grading & Filters Section -->
          <div class="inspector-section">
            <div class="section-title">
              <span>COLOR GRADING</span>
              <button class="btn btn-sm" id="btn-reset-color" style="font-size:10px; padding:1px 6px;">Reset</button>
            </div>
            <div class="section-body">
              <div class="prop-row">
                <span class="prop-label">Brightness</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-50" max="50" step="1" value="${clip.filters?.brightness ?? 0}" id="prop-brightness" />
                  <span class="number-badge" id="val-brightness">${clip.filters?.brightness ?? 0}%</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Contrast</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-50" max="50" step="1" value="${clip.filters?.contrast ?? 0}" id="prop-contrast" />
                  <span class="number-badge" id="val-contrast">${clip.filters?.contrast ?? 0}%</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Saturation</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="200" step="5" value="${clip.filters?.saturation ?? 100}" id="prop-saturation" />
                  <span class="number-badge" id="val-saturation">${clip.filters?.saturation ?? 100}%</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Hue Rotate</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="360" step="5" value="${clip.filters?.hueRotate ?? 0}" id="prop-hue" />
                  <span class="number-badge" id="val-hue">${clip.filters?.hueRotate ?? 0}°</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Blur</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="20" step="1" value="${clip.filters?.blur ?? 0}" id="prop-blur" />
                  <span class="number-badge" id="val-blur">${clip.filters?.blur ?? 0}px</span>
                </div>
              </div>

              <!-- Color Look Presets -->
              <div style="display:flex; gap:4px; margin-top:4px;">
                <button class="btn btn-sm btn-color-preset" data-preset="cinematic" style="flex:1; font-size:10px;">Teal & Orange</button>
                <button class="btn btn-sm btn-color-preset" data-preset="noir" style="flex:1; font-size:10px;">Noir B&W</button>
                <button class="btn btn-sm btn-color-preset" data-preset="vibrant" style="flex:1; font-size:10px;">Vibrant</button>
              </div>
            </div>
          </div>
        ` : ''}

        ${clip.type === 'text' ? `
          <!-- Typography & Text Overlay Section -->
          <div class="inspector-section">
            <div class="section-title">TEXT & TYPOGRAPHY</div>
            <div class="section-body">
              <div class="prop-row" style="flex-direction:column; align-items:stretch;">
                <span class="prop-label" style="margin-bottom:4px;">Text Content</span>
                <textarea class="text-input" id="prop-text-content" rows="2">${clip.text?.content || ''}</textarea>
              </div>

              <div class="prop-row">
                <span class="prop-label">Font Family</span>
                <select class="select-control" id="prop-text-font">
                  <option value="Inter, sans-serif" ${clip.text?.fontFamily?.includes('Inter') ? 'selected' : ''}>Inter (Modern)</option>
                  <option value="Impact, sans-serif" ${clip.text?.fontFamily?.includes('Impact') ? 'selected' : ''}>Impact (Bold Title)</option>
                  <option value="Georgia, serif" ${clip.text?.fontFamily?.includes('Georgia') ? 'selected' : ''}>Georgia (Editorial)</option>
                  <option value="'SF Mono', monospace" ${clip.text?.fontFamily?.includes('Mono') ? 'selected' : ''}>SF Mono (Tech)</option>
                </select>
              </div>

              <div class="prop-row">
                <span class="prop-label">Font Size</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="16" max="96" step="2" value="${clip.text?.fontSize ?? 48}" id="prop-text-size" />
                  <span class="number-badge" id="val-text-size">${clip.text?.fontSize ?? 48}px</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Text Color</span>
                <input type="color" value="${clip.text?.color || '#ffffff'}" id="prop-text-color" style="cursor:pointer; width:36px; height:24px; border:none; background:transparent;" />
              </div>

              <div class="prop-row">
                <span class="prop-label">Outline / Stroke</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="10" step="1" value="${clip.text?.strokeWidth ?? 3}" id="prop-text-stroke-width" />
                  <input type="color" value="${clip.text?.strokeColor || '#000000'}" id="prop-text-stroke-color" style="cursor:pointer; width:28px; height:24px; border:none; background:transparent;" />
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Alignment</span>
                <select class="select-control" id="prop-text-align">
                  <option value="left" ${clip.text?.align === 'left' ? 'selected' : ''}>Left</option>
                  <option value="center" ${clip.text?.align === 'center' ? 'selected' : ''}>Center</option>
                  <option value="right" ${clip.text?.align === 'right' ? 'selected' : ''}>Right</option>
                </select>
              </div>

              <div class="prop-row">
                <span class="prop-label">Animation</span>
                <select class="select-control" id="prop-text-anim">
                  <option value="none" ${clip.text?.animation === 'none' ? 'selected' : ''}>None</option>
                  <option value="fade" ${clip.text?.animation === 'fade' ? 'selected' : ''}>Fade In</option>
                  <option value="pop" ${clip.text?.animation === 'pop' ? 'selected' : ''}>Pop In</option>
                  <option value="slide-up" ${clip.text?.animation === 'slide-up' ? 'selected' : ''}>Slide Up</option>
                  <option value="typewriter" ${clip.text?.animation === 'typewriter' ? 'selected' : ''}>Typewriter</option>
                </select>
              </div>
            </div>
          </div>
        ` : ''}

        ${(clip.type === 'audio' || clip.type === 'video') ? `
          <!-- Audio Properties Section -->
          <div class="inspector-section">
            <div class="section-title">AUDIO CONTROLS</div>
            <div class="section-body">
              <div class="prop-row">
                <span class="prop-label">Volume</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="0" max="2.0" step="0.05" value="${clip.audio?.volume ?? 1.0}" id="prop-audio-volume" />
                  <span class="number-badge" id="val-audio-volume">${Math.round((clip.audio?.volume ?? 1.0) * 100)}%</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Pan (L / R)</span>
                <div class="prop-input-group">
                  <input type="range" class="slider-control" min="-1" max="1" step="0.1" value="${clip.audio?.pan ?? 0}" id="prop-audio-pan" />
                  <span class="number-badge" id="val-audio-pan">${clip.audio?.pan === 0 ? 'C' : (clip.audio?.pan > 0 ? `R${Math.round(clip.audio.pan * 100)}` : `L${Math.round(-clip.audio.pan * 100)}`)}</span>
                </div>
              </div>

              <div class="prop-row">
                <span class="prop-label">Mute Audio</span>
                <input type="checkbox" ${clip.audio?.muted ? 'checked' : ''} id="prop-audio-mute" style="cursor:pointer;" />
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.attachControlListeners(clip);
  }

  attachControlListeners(clip) {
    const bindSlider = (id, badgeId, transformFn, updateStateFn) => {
      const input = this.container.querySelector(id);
      const badge = this.container.querySelector(badgeId);
      if (input) {
        input.addEventListener("input", e => {
          const val = parseFloat(e.target.value);
          if (badge) badge.textContent = transformFn(val);
          state.updateClipProperties(clip.id, c => updateStateFn(c, val));
        });
      }
    };

    // Transform
    bindSlider("#prop-scale", "#val-scale", v => `${Math.round(v * 100)}%`, (c, v) => c.transform.scale = v);
    bindSlider("#prop-pos-x", "#val-pos-x", v => `${v}px`, (c, v) => c.transform.x = v);
    bindSlider("#prop-pos-y", "#val-pos-y", v => `${v}px`, (c, v) => c.transform.y = v);
    bindSlider("#prop-rotation", "#val-rotation", v => `${v}°`, (c, v) => c.transform.rotation = v);
    bindSlider("#prop-opacity", "#val-opacity", v => `${Math.round(v * 100)}%`, (c, v) => c.transform.opacity = v);

    // Color Filters
    bindSlider("#prop-brightness", "#val-brightness", v => `${v}%`, (c, v) => c.filters.brightness = v);
    bindSlider("#prop-contrast", "#val-contrast", v => `${v}%`, (c, v) => c.filters.contrast = v);
    bindSlider("#prop-saturation", "#val-saturation", v => `${v}%`, (c, v) => c.filters.saturation = v);
    bindSlider("#prop-hue", "#val-hue", v => `${v}°`, (c, v) => c.filters.hueRotate = v);
    bindSlider("#prop-blur", "#val-blur", v => `${v}px`, (c, v) => c.filters.blur = v);

    // Audio
    bindSlider("#prop-audio-volume", "#val-audio-volume", v => `${Math.round(v * 100)}%`, (c, v) => {
      if (!c.audio) c.audio = { volume: 1.0, muted: false, pan: 0 };
      c.audio.volume = v;
    });

    bindSlider("#prop-audio-pan", "#val-audio-pan", v => v === 0 ? 'C' : (v > 0 ? `R${Math.round(v * 100)}` : `L${Math.round(-v * 100)}`), (c, v) => {
      if (!c.audio) c.audio = { volume: 1.0, muted: false, pan: 0 };
      c.audio.pan = v;
    });

    const muteCheckbox = this.container.querySelector("#prop-audio-mute");
    if (muteCheckbox) {
      muteCheckbox.addEventListener("change", e => {
        state.updateClipProperties(clip.id, c => {
          if (!c.audio) c.audio = { volume: 1.0, muted: false, pan: 0 };
          c.audio.muted = e.target.checked;
        });
      });
    }

    // Speed Select
    const speedSelect = this.container.querySelector("#prop-speed");
    if (speedSelect) {
      speedSelect.addEventListener("change", e => {
        const newSpeed = parseFloat(e.target.value);
        state.pushHistory("Change Clip Speed");
        state.updateClipProperties(clip.id, c => {
          c.speed = newSpeed;
        });
      });
    }

    // Transition Select & Duration
    const transSelect = this.container.querySelector("#prop-transition-type");
    if (transSelect) {
      transSelect.addEventListener("change", e => {
        state.updateClipProperties(clip.id, c => {
          if (!c.transition) c.transition = { type: "none", duration: 0.5 };
          c.transition.type = e.target.value;
        });
        this.render();
      });
    }

    bindSlider("#prop-transition-duration", "#val-transition-duration", v => `${v.toFixed(1)}s`, (c, v) => {
      if (c.transition) c.transition.duration = v;
    });

    // Text properties
    const textContent = this.container.querySelector("#prop-text-content");
    if (textContent) {
      textContent.addEventListener("input", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.content = e.target.value;
        });
      });
    }

    const textFont = this.container.querySelector("#prop-text-font");
    if (textFont) {
      textFont.addEventListener("change", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.fontFamily = e.target.value;
        });
      });
    }

    bindSlider("#prop-text-size", "#val-text-size", v => `${v}px`, (c, v) => {
      if (c.text) c.text.fontSize = v;
    });

    const textColor = this.container.querySelector("#prop-text-color");
    if (textColor) {
      textColor.addEventListener("input", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.color = e.target.value;
        });
      });
    }

    const strokeColor = this.container.querySelector("#prop-text-stroke-color");
    if (strokeColor) {
      strokeColor.addEventListener("input", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.strokeColor = e.target.value;
        });
      });
    }

    bindSlider("#prop-text-stroke-width", null, null, (c, v) => {
      if (c.text) c.text.strokeWidth = v;
    });

    const textAlign = this.container.querySelector("#prop-text-align");
    if (textAlign) {
      textAlign.addEventListener("change", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.align = e.target.value;
        });
      });
    }

    const textAnim = this.container.querySelector("#prop-text-anim");
    if (textAnim) {
      textAnim.addEventListener("change", e => {
        state.updateClipProperties(clip.id, c => {
          if (c.text) c.text.animation = e.target.value;
        });
      });
    }

    // Color Look Presets
    this.container.querySelectorAll(".btn-color-preset").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = btn.dataset.preset;
        state.pushHistory(`Apply ${p} color preset`);
        state.updateClipProperties(clip.id, c => {
          if (!c.filters) c.filters = { brightness: 0, contrast: 0, saturation: 100, hueRotate: 0, blur: 0 };
          if (p === "cinematic") {
            c.filters = { brightness: 5, contrast: 20, saturation: 125, hueRotate: 15, blur: 0 };
          } else if (p === "noir") {
            c.filters = { brightness: 10, contrast: 35, saturation: 0, hueRotate: 0, blur: 0 };
          } else if (p === "vibrant") {
            c.filters = { brightness: 10, contrast: 15, saturation: 160, hueRotate: 0, blur: 0 };
          }
        });
        this.render();
      });
    });

    // Reset color filters
    const resetBtn = this.container.querySelector("#btn-reset-color");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        state.updateClipProperties(clip.id, c => {
          c.filters = { brightness: 0, contrast: 0, saturation: 100, hueRotate: 0, blur: 0 };
        });
        this.render();
      });
    }

    // Delete Clip
    const deleteBtn = this.container.querySelector("#btn-inspector-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        state.removeClip(clip.id);
      });
    }
  }
}
