// js/state.js - Central State Management with Undo/Redo and Event Bus

class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(fn);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }
}

export class AppState extends EventEmitter {
  constructor() {
    super();

    this.project = {
      name: "My Cinematic Edit",
      width: 1920,
      height: 1080,
      fps: 30,
      aspectRatio: "16:9"
    };

    // Tracks hierarchy: Top tracks render above lower tracks.
    // Video Track 2 (Overlay), Video Track 1 (Main Video/B-Roll), Text Track (Subtitles/Titles), Audio Track 1 (Music), Audio Track 2 (Voice/SFX)
    this.tracks = [
      {
        id: "track-v2",
        name: "Overlay V2",
        type: "video",
        muted: false,
        hidden: false,
        locked: false,
        volume: 1.0,
        clips: []
      },
      {
        id: "track-v1",
        name: "Video V1",
        type: "video",
        muted: false,
        hidden: false,
        locked: false,
        volume: 1.0,
        clips: []
      },
      {
        id: "track-text",
        name: "Titles T1",
        type: "text",
        muted: false,
        hidden: false,
        locked: false,
        volume: 1.0,
        clips: []
      },
      {
        id: "track-a1",
        name: "Music A1",
        type: "audio",
        muted: false,
        hidden: false,
        locked: false,
        volume: 1.0,
        clips: []
      },
      {
        id: "track-a2",
        name: "SFX / Voice A2",
        type: "audio",
        muted: false,
        hidden: false,
        locked: false,
        volume: 1.0,
        clips: []
      }
    ];

    this.assets = new Map(); // assetId -> { id, name, type, duration, url, file, blob, width, height, audioBuffer, thumbnails: [] }
    
    this.playhead = 0; // seconds
    this.isPlaying = false;
    this.selectedClipId = null;
    this.selectedTrackId = null;

    this.zoom = 60; // pixels per second (min: 10, max: 300)
    this.snapping = true;
    this.snapThreshold = 0.2; // seconds threshold for snapping

    // Undo / Redo history
    this.historyStack = [];
    this.redoStack = [];
    this.maxHistory = 40;
    this._isHistoryLocked = false;
  }

  // --- Snapshot & History Management ---
  createSnapshot() {
    return {
      tracks: JSON.parse(JSON.stringify(this.tracks)),
      project: { ...this.project },
      selectedClipId: this.selectedClipId,
      playhead: this.playhead
    };
  }

  pushHistory(description = "Edit") {
    if (this._isHistoryLocked) return;
    this.historyStack.push({
      desc: description,
      snapshot: this.createSnapshot()
    });
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }
    // Clear redo when new action is performed
    this.redoStack = [];
    this.emit("historyChange", { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  undo() {
    if (!this.canUndo()) return false;
    const currentState = this.createSnapshot();
    const lastAction = this.historyStack.pop();
    this.redoStack.push({
      desc: lastAction.desc,
      snapshot: currentState
    });

    this._applySnapshot(lastAction.snapshot);
    this.emit("historyChange", { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    const currentState = this.createSnapshot();
    const nextAction = this.redoStack.pop();
    this.historyStack.push({
      desc: nextAction.desc,
      snapshot: currentState
    });

    this._applySnapshot(nextAction.snapshot);
    this.emit("historyChange", { canUndo: this.canUndo(), canRedo: this.canRedo() });
    return true;
  }

  canUndo() {
    return this.historyStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  _applySnapshot(snapshot) {
    this._isHistoryLocked = true;
    try {
      this.tracks = JSON.parse(JSON.stringify(snapshot.tracks));
      this.project = { ...snapshot.project };
      this.selectedClipId = snapshot.selectedClipId;
      this.emit("tracksUpdated");
      this.emit("selectionChanged", { clip: this.getSelectedClip() });
      this.emit("timeUpdate", { time: this.playhead });
    } finally {
      this._isHistoryLocked = false;
    }
  }

  // --- Duration & Time Utilities ---
  getProjectDuration() {
    let maxTime = 10.0; // Minimum 10 seconds empty timeline
    for (const track of this.tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > maxTime) maxTime = end;
      }
    }
    return maxTime;
  }

  setPlayhead(time, isUserScrub = false) {
    const maxTime = Math.max(10, this.getProjectDuration() + 2);
    this.playhead = Math.max(0, Math.min(time, maxTime));
    this.emit("timeUpdate", { time: this.playhead, isUserScrub });
  }

  stepFrames(count) {
    const frameDuration = 1 / this.project.fps;
    this.setPlayhead(this.playhead + count * frameDuration, true);
  }

  setPlaying(playing) {
    if (this.isPlaying === playing) return;
    this.isPlaying = playing;
    this.emit("playbackState", { isPlaying: this.isPlaying });
  }

  togglePlay() {
    this.setPlaying(!this.isPlaying);
  }

  // --- Track Management ---
  getTrack(trackId) {
    return this.tracks.find(t => t.id === trackId);
  }

  setTrackMute(trackId, muted) {
    const track = this.getTrack(trackId);
    if (!track) return;
    this.pushHistory(`Toggle Mute ${track.name}`);
    track.muted = muted;
    this.emit("tracksUpdated");
  }

  setTrackHidden(trackId, hidden) {
    const track = this.getTrack(trackId);
    if (!track) return;
    this.pushHistory(`Toggle Hide ${track.name}`);
    track.hidden = hidden;
    this.emit("tracksUpdated");
  }

  setTrackLocked(trackId, locked) {
    const track = this.getTrack(trackId);
    if (!track) return;
    track.locked = locked;
    this.emit("tracksUpdated");
  }

  setTrackVolume(trackId, vol) {
    const track = this.getTrack(trackId);
    if (!track) return;
    track.volume = Math.max(0, Math.min(vol, 2.0));
    this.emit("tracksUpdated");
  }

  // --- Clip Management ---
  findClip(clipId) {
    for (const track of this.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) return { clip, track };
    }
    return { clip: null, track: null };
  }

  getSelectedClip() {
    if (!this.selectedClipId) return null;
    const { clip } = this.findClip(this.selectedClipId);
    return clip;
  }

  selectClip(clipId) {
    if (this.selectedClipId === clipId) return;
    this.selectedClipId = clipId;
    const { clip, track } = this.findClip(clipId);
    this.selectedTrackId = track ? track.id : null;
    this.emit("selectionChanged", { clip, track });
  }

  addClip(trackId, clipData, recordHistory = true) {
    const track = this.getTrack(trackId);
    if (!track) return null;
    if (track.locked) {
      this.emit("toast", { message: "Track is locked", type: "error" });
      return null;
    }

    if (recordHistory) this.pushHistory("Add Clip");

    const defaultClip = {
      id: "clip-" + Math.random().toString(36).substr(2, 9),
      trackId: trackId,
      name: clipData.name || "Untitled Clip",
      type: clipData.type || (track.type === "audio" ? "audio" : "video"),
      assetId: clipData.assetId || null,
      startTime: Math.max(0, clipData.startTime || 0),
      duration: Math.max(0.1, clipData.duration || 5),
      trimIn: Math.max(0, clipData.trimIn || 0),
      sourceDuration: clipData.sourceDuration || clipData.duration || 5,
      speed: 1.0,
      transform: {
        x: 0,
        y: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0
      },
      filters: {
        brightness: 0,
        contrast: 0,
        saturation: 100,
        hueRotate: 0,
        blur: 0
      },
      audio: {
        volume: 1.0,
        muted: false,
        pan: 0,
        fadeIn: 0,
        fadeOut: 0
      },
      text: clipData.type === "text" ? {
        content: clipData.content || "DOUBLE CLICK TO EDIT TITLE",
        fontFamily: "Inter, sans-serif",
        fontSize: 48,
        fontWeight: "bold",
        fontStyle: "normal",
        color: "#ffffff",
        strokeColor: "#000000",
        strokeWidth: 3,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        backgroundPadding: 12,
        borderRadius: 8,
        align: "center",
        animation: "fade"
      } : null,
      transition: {
        type: clipData.transitionType || "none",
        duration: 0.5
      }
    };

    const newClip = { ...defaultClip, ...clipData };
    track.clips.push(newClip);

    // Keep clips sorted by startTime
    track.clips.sort((a, b) => a.startTime - b.startTime);

    this.selectClip(newClip.id);
    this.emit("tracksUpdated");
    return newClip;
  }

  removeClip(clipId) {
    const { clip, track } = this.findClip(clipId);
    if (!clip || !track) return false;
    if (track.locked) {
      this.emit("toast", { message: "Cannot delete clip from locked track", type: "error" });
      return false;
    }

    this.pushHistory(`Delete Clip "${clip.name}"`);
    track.clips = track.clips.filter(c => c.id !== clipId);
    if (this.selectedClipId === clipId) {
      this.selectedClipId = null;
      this.emit("selectionChanged", { clip: null, track: null });
    }
    this.emit("tracksUpdated");
    return true;
  }

  duplicateClip(clipId) {
    const { clip, track } = this.findClip(clipId);
    if (!clip || !track) return null;
    if (track.locked) return null;

    this.pushHistory(`Duplicate Clip "${clip.name}"`);

    const cloned = JSON.parse(JSON.stringify(clip));
    cloned.id = "clip-" + Math.random().toString(36).substr(2, 9);
    cloned.name = `${clip.name} (Copy)`;
    cloned.startTime = clip.startTime + clip.duration + 0.1;

    track.clips.push(cloned);
    track.clips.sort((a, b) => a.startTime - b.startTime);

    this.selectClip(cloned.id);
    this.emit("tracksUpdated");
    return cloned;
  }

  splitClipAtPlayhead(clipId = null) {
    const targetClipId = clipId || this.selectedClipId;
    let target = null;
    let targetTrack = null;

    if (targetClipId) {
      const found = this.findClip(targetClipId);
      target = found.clip;
      targetTrack = found.track;
    } else {
      // Find the top-most clip intersecting playhead
      for (const track of this.tracks) {
        if (track.locked) continue;
        const c = track.clips.find(clip => this.playhead > clip.startTime && this.playhead < (clip.startTime + clip.duration));
        if (c) {
          target = c;
          targetTrack = track;
          break;
        }
      }
    }

    if (!target || !targetTrack || targetTrack.locked) {
      this.emit("toast", { message: "No active clip at playhead to split", type: "error" });
      return false;
    }

    const cutPoint = this.playhead;
    if (cutPoint <= target.startTime + 0.05 || cutPoint >= target.startTime + target.duration - 0.05) {
      this.emit("toast", { message: "Cut point too close to clip boundary", type: "warning" });
      return false;
    }

    this.pushHistory(`Split Clip "${target.name}"`);

    const firstDuration = cutPoint - target.startTime;
    const secondDuration = target.duration - firstDuration;

    // Second half clip
    const secondClip = JSON.parse(JSON.stringify(target));
    secondClip.id = "clip-" + Math.random().toString(36).substr(2, 9);
    secondClip.startTime = cutPoint;
    secondClip.duration = secondDuration;
    secondClip.trimIn = target.trimIn + (firstDuration * target.speed);

    // Truncate first clip
    target.duration = firstDuration;

    targetTrack.clips.push(secondClip);
    targetTrack.clips.sort((a, b) => a.startTime - b.startTime);

    this.selectClip(secondClip.id);
    this.emit("tracksUpdated");
    this.emit("toast", { message: "Clip split at playhead", type: "success" });
    return true;
  }

  trimClip(clipId, side, newEdgeTime) {
    const { clip, track } = this.findClip(clipId);
    if (!clip || !track || track.locked) return;

    if (side === "start") {
      const originalEnd = clip.startTime + clip.duration;
      const proposedStart = Math.max(0, Math.min(newEdgeTime, originalEnd - 0.1));
      const delta = proposedStart - clip.startTime;
      const proposedTrimIn = clip.trimIn + (delta * clip.speed);

      if (proposedTrimIn >= 0) {
        clip.startTime = proposedStart;
        clip.duration = originalEnd - proposedStart;
        clip.trimIn = proposedTrimIn;
      }
    } else if (side === "end") {
      const proposedEnd = Math.max(clip.startTime + 0.1, newEdgeTime);
      const proposedDuration = proposedEnd - clip.startTime;
      const maxSourceAvailable = (clip.sourceDuration - clip.trimIn) / clip.speed;

      // Restrict to source limits if video/audio
      if (clip.type === "video" || clip.type === "audio") {
        clip.duration = Math.min(proposedDuration, maxSourceAvailable);
      } else {
        clip.duration = proposedDuration;
      }
    }

    this.emit("tracksUpdated");
  }

  moveClip(clipId, newStartTime, newTrackId = null) {
    const { clip, track: sourceTrack } = this.findClip(clipId);
    if (!clip || !sourceTrack) return;

    const targetTrack = newTrackId ? this.getTrack(newTrackId) : sourceTrack;
    if (!targetTrack || targetTrack.locked) return;

    // Enforce media type track compatibility
    if (clip.type === "audio" && targetTrack.type !== "audio") return;
    if (clip.type !== "audio" && targetTrack.type === "audio") return;

    clip.startTime = Math.max(0, newStartTime);

    if (targetTrack.id !== sourceTrack.id) {
      sourceTrack.clips = sourceTrack.clips.filter(c => c.id !== clip.id);
      clip.trackId = targetTrack.id;
      targetTrack.clips.push(clip);
    }

    targetTrack.clips.sort((a, b) => a.startTime - b.startTime);
    this.emit("tracksUpdated");
  }

  updateClipProperties(clipId, updater) {
    const { clip } = this.findClip(clipId);
    if (!clip) return;
    updater(clip);
    this.emit("clipUpdated", { clip });
    this.emit("tracksUpdated");
  }

  // --- Snapping calculation ---
  getSnapTime(proposedTime, ignoreClipId = null) {
    if (!this.snapping) return proposedTime;

    const threshold = this.snapThreshold;
    let closestTime = proposedTime;
    let minDelta = threshold;

    const snapPoints = [0, this.playhead];

    for (const track of this.tracks) {
      for (const clip of track.clips) {
        if (clip.id === ignoreClipId) continue;
        snapPoints.push(clip.startTime);
        snapPoints.push(clip.startTime + clip.duration);
      }
    }

    for (const point of snapPoints) {
      const delta = Math.abs(proposedTime - point);
      if (delta < minDelta) {
        minDelta = delta;
        closestTime = point;
      }
    }

    return closestTime;
  }
}

export const state = new AppState();
