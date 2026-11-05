// js/media-library.js - Media Import, Asset Management, Thumbnails, and Drag & Drop

import { state } from "./state.js";
import { Icons } from "./icons.js";
import { createSynthAudio, createProceduralVideo } from "./sample-assets.js";

export class MediaLibrary {
  constructor(containerEl) {
    this.container = containerEl;
    this.activeTab = "media"; // "media" | "samples" | "text" | "audio"
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadSampleLibrary();
  }

  render() {
    this.container.innerHTML = `
      <div class="panel-tabs">
        <button class="tab-btn ${this.activeTab === 'media' ? 'active' : ''}" data-tab="media">
          ${Icons.film} Media
        </button>
        <button class="tab-btn ${this.activeTab === 'samples' ? 'active' : ''}" data-tab="samples">
          ${Icons.sparkles} Samples
        </button>
        <button class="tab-btn ${this.activeTab === 'text' ? 'active' : ''}" data-tab="text">
          ${Icons.type} Titles
        </button>
        <button class="tab-btn ${this.activeTab === 'audio' ? 'active' : ''}" data-tab="audio">
          ${Icons.music} Audio
        </button>
      </div>

      <div class="media-tab-content" id="media-tab-content">
        <!-- Content rendered dynamically per tab -->
      </div>
    `;

    this.renderCurrentTab();
  }

  renderCurrentTab() {
    const content = this.container.querySelector("#media-tab-content");
    if (!content) return;

    if (this.activeTab === "media") {
      content.innerHTML = `
        <div class="media-dropzone" id="media-dropzone">
          <input type="file" id="media-file-input" multiple accept="video/*,audio/*,image/*" style="display:none;" />
          <div style="font-size: 28px; color: var(--accent-primary);">📁</div>
          <div style="font-weight: 600; font-size: 13px;">Drop media files here</div>
          <div style="color: var(--text-muted); font-size: 11px;">MP4, WebM, MOV, MP3, WAV, PNG, JPG</div>
          <button class="btn btn-sm btn-primary" id="btn-browse-media" style="margin-top: 6px;">
            ${Icons.plus} Import Media
          </button>
        </div>

        <div class="media-grid" id="project-media-grid">
          <!-- Populated from state.assets -->
        </div>
      `;
      this.populateProjectMedia();
    } else if (this.activeTab === "samples") {
      content.innerHTML = `
        <div style="padding: 4px 0 8px 0; color: var(--text-secondary); font-size: 11px;">
          Built-in procedural demo media generated right in your browser!
        </div>
        <div class="media-grid" id="sample-media-grid">
          <!-- Sample media cards -->
        </div>
        <button class="btn btn-primary" id="btn-load-demo-project" style="width: 100%; margin-top: 10px;">
          ${Icons.sparkles} Load Full Demo Project
        </button>
      `;
      this.populateSampleMedia();
    } else if (this.activeTab === "text") {
      content.innerHTML = `
        <div style="padding: 4px 0 8px 0; color: var(--text-secondary); font-size: 11px;">
          Click or drag title presets onto any Text track!
        </div>
        <div class="media-grid" id="text-presets-grid">
          <!-- Text preset cards -->
        </div>
      `;
      this.populateTextPresets();
    } else if (this.activeTab === "audio") {
      content.innerHTML = `
        <div style="padding: 4px 0 8px 0; color: var(--text-secondary); font-size: 11px;">
          Synthesized royalty-free audio tracks & sound effects!
        </div>
        <div class="media-grid" id="audio-presets-grid">
          <!-- Audio preset cards -->
        </div>
      `;
      this.populateAudioPresets();
    }
  }

  bindEvents() {
    this.container.addEventListener("click", e => {
      const tabBtn = e.target.closest(".tab-btn");
      if (tabBtn) {
        this.activeTab = tabBtn.dataset.tab;
        this.container.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === tabBtn));
        this.renderCurrentTab();
        return;
      }

      if (e.target.closest("#btn-browse-media") || e.target.closest("#media-dropzone")) {
        const input = this.container.querySelector("#media-file-input");
        if (input && !e.target.closest("button.btn-add-track")) {
          input.click();
        }
      }

      if (e.target.closest("#btn-load-demo-project")) {
        this.loadDemoProject();
      }
    });

    // File input change
    this.container.addEventListener("change", e => {
      if (e.target.id === "media-file-input" && e.target.files?.length) {
        this.handleFiles(Array.from(e.target.files));
      }
    });

    // Drag and Drop into dropzone
    this.container.addEventListener("dragover", e => {
      const dropzone = this.container.querySelector("#media-dropzone");
      if (dropzone) {
        e.preventDefault();
        dropzone.classList.add("dragover");
      }
    });

    this.container.addEventListener("dragleave", e => {
      const dropzone = this.container.querySelector("#media-dropzone");
      if (dropzone) {
        dropzone.classList.remove("dragover");
      }
    });

    this.container.addEventListener("drop", e => {
      const dropzone = this.container.querySelector("#media-dropzone");
      if (dropzone) {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files?.length) {
          this.handleFiles(Array.from(e.dataTransfer.files));
        }
      }
    });
  }

  async handleFiles(files) {
    for (const file of files) {
      await this.importFile(file);
    }
    this.renderCurrentTab();
  }

  async importFile(file) {
    const assetId = "asset-" + Math.random().toString(36).substr(2, 9);
    const mime = file.type;
    const url = URL.createObjectURL(file);

    let type = "video";
    if (mime.startsWith("audio/")) type = "audio";
    else if (mime.startsWith("image/")) type = "image";

    state.emit("toast", { message: `Importing ${file.name}...`, type: "info" });

    try {
      let duration = 5;
      let width = 1920;
      let height = 1080;
      let thumbnail = null;
      let audioBuffer = null;

      if (type === "video") {
        const metadata = await this.extractVideoMetadata(url);
        duration = metadata.duration;
        width = metadata.width;
        height = metadata.height;
        thumbnail = metadata.thumbnail;

        // Try extracting audio data from video
        try {
          const arrayBuf = await file.arrayBuffer();
          audioBuffer = await this.audioContext.decodeAudioData(arrayBuf.slice(0));
        } catch (_) {
          // Video may not have audio track, fine
        }
      } else if (type === "audio") {
        const arrayBuf = await file.arrayBuffer();
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuf.slice(0));
        duration = audioBuffer.duration;
        thumbnail = this.createAudioThumbnail(audioBuffer);
      } else if (type === "image") {
        const imgMeta = await this.extractImageMetadata(url);
        width = imgMeta.width;
        height = imgMeta.height;
        thumbnail = url;
        duration = 5; // Default still image duration
      }

      const asset = {
        id: assetId,
        name: file.name,
        type,
        duration,
        url,
        file,
        width,
        height,
        thumbnail,
        audioBuffer
      };

      state.assets.set(assetId, asset);
      state.emit("toast", { message: `Imported "${file.name}"`, type: "success" });
      return asset;
    } catch (err) {
      console.error("Failed to import asset:", err);
      state.emit("toast", { message: `Failed to import ${file.name}: ${err.message}`, type: "error" });
      return null;
    }
  }

  extractVideoMetadata(url) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.5, video.duration / 2);
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(320, video.videoWidth || 320);
        canvas.height = Math.min(180, video.videoHeight || 180);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.7);

        resolve({
          duration: video.duration || 5,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          thumbnail
        });
      };

      video.onerror = () => {
        reject(new Error("Unable to decode video metadata"));
      };
    });
  }

  extractImageMetadata(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080
        });
      };
      img.onerror = () => reject(new Error("Unable to load image"));
      img.src = url;
    });
  }

  createAudioThumbnail(audioBuffer) {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#064e3b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#34d399";
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const mid = canvas.height / 2;

    for (let x = 0; x < canvas.width; x++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[x * step + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(x, mid + min * mid * 0.9, 1, Math.max(1, (max - min) * mid * 0.9));
    }

    return canvas.toDataURL("image/png");
  }

  populateProjectMedia() {
    const grid = this.container.querySelector("#project-media-grid");
    if (!grid) return;

    if (state.assets.size === 0) {
      grid.innerHTML = `
        <div style="grid-column: span 2; text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 11px;">
          No assets imported yet. Drop files above or explore the <strong>Samples</strong> tab!
        </div>
      `;
      return;
    }

    grid.innerHTML = "";
    state.assets.forEach(asset => {
      const card = this.createAssetCard(asset);
      grid.appendChild(card);
    });
  }

  createAssetCard(asset) {
    const card = document.createElement("div");
    card.className = "asset-card";
    card.draggable = true;
    card.dataset.assetId = asset.id;

    const timecode = this.formatTime(asset.duration);

    card.innerHTML = `
      <div class="asset-thumb-wrapper">
        ${asset.thumbnail ? `<img src="${asset.thumbnail}" alt="${asset.name}" />` : `<div style="color:var(--text-muted); font-size:24px;">🎬</div>`}
        <span class="asset-type-badge">${asset.type}</span>
        <span class="asset-duration-badge">${timecode}</span>
      </div>
      <div class="asset-meta">
        <div class="asset-title" title="${asset.name}">${asset.name}</div>
        <div class="asset-details">${asset.type === 'image' ? `${asset.width}x${asset.height}` : `${Math.round(asset.duration)}s • ${asset.type.toUpperCase()}`}</div>
        <button class="btn btn-sm btn-primary btn-add-track" style="margin-top: 4px; padding: 2px 6px; font-size: 10px;">
          ${Icons.plus} Add to Timeline
        </button>
      </div>
    `;

    // Click "Add to Timeline"
    card.querySelector(".btn-add-track").addEventListener("click", e => {
      e.stopPropagation();
      this.addAssetToTimeline(asset);
    });

    // Native Drag and Drop to timeline
    card.addEventListener("dragstart", e => {
      e.dataTransfer.setData("application/json", JSON.stringify({
        type: "asset",
        assetId: asset.id,
        assetType: asset.type,
        name: asset.name,
        duration: asset.duration
      }));
    });

    return card;
  }

  addAssetToTimeline(asset) {
    // Select appropriate track
    let targetTrack = null;
    if (asset.type === "audio") {
      targetTrack = state.tracks.find(t => t.type === "audio" && !t.locked) || state.tracks[3];
    } else {
      targetTrack = state.tracks.find(t => t.type === "video" && !t.locked) || state.tracks[1];
    }

    if (!targetTrack) {
      state.emit("toast", { message: "No available track found", type: "error" });
      return;
    }

    // Place at playhead or end of existing clips on that track
    let startTime = state.playhead;
    const clip = state.addClip(targetTrack.id, {
      name: asset.name,
      type: asset.type,
      assetId: asset.id,
      startTime: startTime,
      duration: asset.duration,
      sourceDuration: asset.duration
    });

    if (clip) {
      state.emit("toast", { message: `Added "${asset.name}" to ${targetTrack.name}`, type: "success" });
    }
  }

  populateSampleMedia() {
    const grid = this.container.querySelector("#sample-media-grid");
    if (!grid) return;

    const samples = [
      { id: "sample-cyber", title: "Cyber Neon City", type: "video", theme: "cyberpunk", duration: 6, thumbColor: "#be185d" },
      { id: "sample-nature", title: "Golden Sunrise", type: "video", theme: "nature", duration: 6, thumbColor: "#d97706" },
      { id: "sample-leader", title: "Action Film Leader", type: "video", theme: "countdown", duration: 5, thumbColor: "#475569" },
      { id: "sample-synthwave", title: "Synthwave Beat 120BPM", type: "audio", sound: "synthwave", duration: 8, thumbColor: "#059669" }
    ];

    grid.innerHTML = "";
    samples.forEach(s => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.innerHTML = `
        <div class="asset-thumb-wrapper" style="background: ${s.thumbColor}; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <div style="font-size:24px;">${s.type === 'video' ? '🌆' : '🎵'}</div>
          <span class="asset-type-badge">${s.type}</span>
          <span class="asset-duration-badge">00:0${s.duration}</span>
        </div>
        <div class="asset-meta">
          <div class="asset-title">${s.title}</div>
          <div class="asset-details">Browser Generated • ${s.duration}s</div>
          <button class="btn btn-sm btn-primary btn-generate-sample" style="margin-top: 4px; padding: 2px 6px; font-size: 10px;">
            ${Icons.sparkles} Generate & Add
          </button>
        </div>
      `;

      card.querySelector(".btn-generate-sample").addEventListener("click", async () => {
        state.emit("toast", { message: `Generating ${s.title}...`, type: "info" });
        if (s.type === "video") {
          const videoData = await createProceduralVideo(s.theme, s.duration);
          const asset = {
            id: s.id + "-" + Date.now(),
            name: s.title,
            type: "video",
            duration: s.duration,
            url: videoData.url,
            blob: videoData.blob,
            width: videoData.width,
            height: videoData.height,
            thumbnail: null
          };
          // Generate thumbnail
          const meta = await this.extractVideoMetadata(videoData.url);
          asset.thumbnail = meta.thumbnail;
          state.assets.set(asset.id, asset);
          this.addAssetToTimeline(asset);
        } else {
          const audioData = await createSynthAudio(s.sound, s.duration);
          const url = URL.createObjectURL(audioData.wavBlob);
          const asset = {
            id: s.id + "-" + Date.now(),
            name: s.title,
            type: "audio",
            duration: s.duration,
            url: url,
            audioBuffer: audioData.audioBuffer,
            thumbnail: this.createAudioThumbnail(audioData.audioBuffer)
          };
          state.assets.set(asset.id, asset);
          this.addAssetToTimeline(asset);
        }
      });

      grid.appendChild(card);
    });
  }

  populateTextPresets() {
    const grid = this.container.querySelector("#text-presets-grid");
    if (!grid) return;

    const presets = [
      { name: "Cinematic Title", content: "FRAMESTUDIO CINEMATIC", fontSize: 52, color: "#ffffff", strokeColor: "#000000", strokeWidth: 3, bg: "rgba(0,0,0,0.5)" },
      { name: "Neon Glow Heading", content: "NEON DREAMS", fontSize: 48, color: "#06b6d4", strokeColor: "#3b82f6", strokeWidth: 2, bg: "rgba(6,182,212,0.15)" },
      { name: "Lower Third Subtitle", content: "Executive Producer • FrameStudio", fontSize: 28, color: "#f8fafc", strokeColor: "#000000", strokeWidth: 1, bg: "rgba(15,23,42,0.8)" },
      { name: "Punchy YouTube Hook", content: "TOP 5 EDITING SECRETS!", fontSize: 60, color: "#facc15", strokeColor: "#000000", strokeWidth: 4, bg: "rgba(0,0,0,0.8)" }
    ];

    grid.innerHTML = "";
    presets.forEach(p => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.innerHTML = `
        <div class="asset-thumb-wrapper" style="background: #1e1b4b; display:flex; align-items:center; justify-content:center; padding: 6px;">
          <div style="font-size: 11px; font-weight:700; color:${p.color}; text-shadow:0 1px 3px #000; text-align:center;">
            ${p.content.substring(0, 20)}...
          </div>
          <span class="asset-type-badge">TITLE</span>
        </div>
        <div class="asset-meta">
          <div class="asset-title">${p.name}</div>
          <div class="asset-details">Overlay text preset</div>
          <button class="btn btn-sm btn-primary btn-add-text" style="margin-top: 4px; padding: 2px 6px; font-size: 10px;">
            ${Icons.plus} Add to Timeline
          </button>
        </div>
      `;

      card.querySelector(".btn-add-text").addEventListener("click", () => {
        const textTrack = state.tracks.find(t => t.type === "text" && !t.locked) || state.tracks[2];
        state.addClip(textTrack.id, {
          name: p.name,
          type: "text",
          startTime: state.playhead,
          duration: 4.0,
          text: {
            content: p.content,
            fontFamily: "Inter, sans-serif",
            fontSize: p.fontSize,
            fontWeight: "bold",
            fontStyle: "normal",
            color: p.color,
            strokeColor: p.strokeColor,
            strokeWidth: p.strokeWidth,
            backgroundColor: p.bg,
            backgroundPadding: 10,
            borderRadius: 6,
            align: "center",
            animation: "fade"
          }
        });
        state.emit("toast", { message: `Added title "${p.name}"`, type: "success" });
      });

      grid.appendChild(card);
    });
  }

  populateAudioPresets() {
    const grid = this.container.querySelector("#audio-presets-grid");
    if (!grid) return;

    const audioItems = [
      { sound: "synthwave", title: "Retro Synthwave 120BPM", duration: 8, icon: "🎹" },
      { sound: "cinematic-boom", title: "Cinematic Sub-Drop & Swell", duration: 6, icon: "💥" },
      { sound: "ambient", title: "Lush Ambient Melody", duration: 8, icon: "✨" }
    ];

    grid.innerHTML = "";
    audioItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "asset-card";
      card.innerHTML = `
        <div class="asset-thumb-wrapper" style="background: #064e3b; display:flex; align-items:center; justify-content:center;">
          <div style="font-size: 28px;">${item.icon}</div>
          <span class="asset-type-badge">AUDIO</span>
          <span class="asset-duration-badge">00:0${item.duration}</span>
        </div>
        <div class="asset-meta">
          <div class="asset-title">${item.title}</div>
          <div class="asset-details">WAV 44.1kHz • ${item.duration}s</div>
          <button class="btn btn-sm btn-primary btn-add-audio" style="margin-top: 4px; padding: 2px 6px; font-size: 10px;">
            ${Icons.plus} Add to Timeline
          </button>
        </div>
      `;

      card.querySelector(".btn-add-audio").addEventListener("click", async () => {
        state.emit("toast", { message: `Generating ${item.title}...`, type: "info" });
        const { audioBuffer, wavBlob } = await createSynthAudio(item.sound, item.duration);
        const url = URL.createObjectURL(wavBlob);
        const assetId = "audio-" + Math.random().toString(36).substr(2, 9);
        const asset = {
          id: assetId,
          name: item.title,
          type: "audio",
          duration: item.duration,
          url,
          audioBuffer,
          thumbnail: this.createAudioThumbnail(audioBuffer)
        };
        state.assets.set(assetId, asset);
        this.addAssetToTimeline(asset);
      });

      grid.appendChild(card);
    });
  }

  async loadSampleLibrary() {
    // Generate initial sample assets silently in the background
    try {
      const audioSynth = await createSynthAudio("synthwave", 8);
      const synthUrl = URL.createObjectURL(audioSynth.wavBlob);
      const synthAsset = {
        id: "asset-synthwave-bg",
        name: "Retro Synthwave Beat.wav",
        type: "audio",
        duration: 8,
        url: synthUrl,
        audioBuffer: audioSynth.audioBuffer,
        thumbnail: this.createAudioThumbnail(audioSynth.audioBuffer)
      };
      state.assets.set(synthAsset.id, synthAsset);
    } catch (e) {
      console.warn("Background audio pre-generation note:", e);
    }
  }

  async loadDemoProject() {
    state.emit("toast", { message: "Generating rich demo project with procedural media...", type: "info" });

    // 1. Generate Video Clip 1 (Cyberpunk)
    const vid1 = await createProceduralVideo("cyberpunk", 6);
    const meta1 = await this.extractVideoMetadata(vid1.url);
    const asset1 = {
      id: "asset-demo-cyber",
      name: "Cyber Neon City.mp4",
      type: "video",
      duration: 6,
      url: vid1.url,
      blob: vid1.blob,
      width: vid1.width,
      height: vid1.height,
      thumbnail: meta1.thumbnail
    };
    state.assets.set(asset1.id, asset1);

    // 2. Generate Video Clip 2 (Sunrise)
    const vid2 = await createProceduralVideo("nature", 6);
    const meta2 = await this.extractVideoMetadata(vid2.url);
    const asset2 = {
      id: "asset-demo-sunrise",
      name: "Golden Sunrise.mp4",
      type: "video",
      duration: 6,
      url: vid2.url,
      blob: vid2.blob,
      width: vid2.width,
      height: vid2.height,
      thumbnail: meta2.thumbnail
    };
    state.assets.set(asset2.id, asset2);

    // 3. Generate Audio Music Track
    const audio1 = await createSynthAudio("synthwave", 12);
    const audioUrl = URL.createObjectURL(audio1.wavBlob);
    const asset3 = {
      id: "asset-demo-synthwave",
      name: "Synthwave Soundtrack.wav",
      type: "audio",
      duration: 12,
      url: audioUrl,
      audioBuffer: audio1.audioBuffer,
      thumbnail: this.createAudioThumbnail(audio1.audioBuffer)
    };
    state.assets.set(asset3.id, asset3);

    // Clear and assemble timeline
    state.pushHistory("Load Demo Project");
    state.tracks.forEach(t => t.clips = []);

    // Track V1: Video Clip 1 from 0s to 5s with crossfade
    const v1Track = state.tracks.find(t => t.id === "track-v1");
    v1Track.clips.push({
      id: "demo-clip-1",
      trackId: "track-v1",
      name: asset1.name,
      type: "video",
      assetId: asset1.id,
      startTime: 0,
      duration: 5,
      trimIn: 0,
      sourceDuration: 6,
      speed: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      filters: { brightness: 10, contrast: 15, saturation: 120, hueRotate: 0, blur: 0 },
      audio: { volume: 0.8, muted: false, pan: 0, fadeIn: 0, fadeOut: 0 },
      transition: { type: "crossfade", duration: 0.8 }
    });

    // Track V1: Video Clip 2 from 4.2s to 10s (slight overlap/cut)
    v1Track.clips.push({
      id: "demo-clip-2",
      trackId: "track-v1",
      name: asset2.name,
      type: "video",
      assetId: asset2.id,
      startTime: 5.0,
      duration: 5.5,
      trimIn: 0,
      sourceDuration: 6,
      speed: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      filters: { brightness: 5, contrast: 10, saturation: 110, hueRotate: 0, blur: 0 },
      audio: { volume: 0.8, muted: false, pan: 0, fadeIn: 0, fadeOut: 0 },
      transition: { type: "wipe-left", duration: 0.6 }
    });

    // Track Text: Cinematic Title from 0.5s to 4.5s
    const textTrack = state.tracks.find(t => t.id === "track-text");
    textTrack.clips.push({
      id: "demo-clip-text-1",
      trackId: "track-text",
      name: "Cinematic Title",
      type: "text",
      startTime: 0.8,
      duration: 3.5,
      trimIn: 0,
      sourceDuration: 3.5,
      speed: 1.0,
      transform: { x: 0, y: -60, scale: 1.0, rotation: 0, opacity: 1.0 },
      filters: { brightness: 0, contrast: 0, saturation: 100, hueRotate: 0, blur: 0 },
      audio: { volume: 1.0, muted: false, pan: 0, fadeIn: 0, fadeOut: 0 },
      text: {
        content: "FRAMESTUDIO PRO",
        fontFamily: "Inter, sans-serif",
        fontSize: 54,
        fontWeight: "bold",
        fontStyle: "normal",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 4,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        backgroundPadding: 14,
        borderRadius: 8,
        align: "center",
        animation: "fade"
      },
      transition: { type: "none", duration: 0 }
    });

    // Track Audio A1: Synthwave Music from 0s to 10.5s
    const a1Track = state.tracks.find(t => t.id === "track-a1");
    a1Track.clips.push({
      id: "demo-clip-audio-1",
      trackId: "track-a1",
      name: asset3.name,
      type: "audio",
      assetId: asset3.id,
      startTime: 0,
      duration: 10.5,
      trimIn: 0,
      sourceDuration: 12,
      speed: 1.0,
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
      filters: { brightness: 0, contrast: 0, saturation: 100, hueRotate: 0, blur: 0 },
      audio: { volume: 0.9, muted: false, pan: 0, fadeIn: 0.5, fadeOut: 1.5 },
      transition: { type: "none", duration: 0 }
    });

    state.setPlayhead(0);
    state.selectClip("demo-clip-1");
    state.emit("tracksUpdated");
    state.emit("toast", { message: "Demo project loaded successfully!", type: "success" });
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
