// js/project-store.js - Project Serialization, JSON File Save/Load, and LocalStorage Auto-Save

import { state } from "./state.js";

export class ProjectStore {
  constructor() {
    this.storageKey = "framestudio_autosave_v1";
    this.initAutoSave();
  }

  initAutoSave() {
    setInterval(() => {
      this.saveToLocalStorage();
    }, 15000); // Auto-save every 15s
  }

  saveToLocalStorage() {
    try {
      const data = this.serialize();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (_) {}
  }

  hasAutoSave() {
    try {
      return !!localStorage.getItem(this.storageKey);
    } catch (_) {
      return false;
    }
  }

  restoreAutoSave() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        this.deserialize(data);
        state.emit("toast", { message: "Auto-saved project recovered!", type: "info" });
        return true;
      }
    } catch (e) {
      console.warn("Failed to restore autosave:", e);
    }
    return false;
  }

  serialize() {
    return {
      version: "1.0",
      timestamp: Date.now(),
      project: { ...state.project },
      tracks: state.tracks.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        muted: t.muted,
        hidden: t.hidden,
        locked: t.locked,
        volume: t.volume,
        clips: t.clips.map(c => ({
          id: c.id,
          trackId: c.trackId,
          name: c.name,
          type: c.type,
          assetId: c.assetId,
          startTime: c.startTime,
          duration: c.duration,
          trimIn: c.trimIn,
          sourceDuration: c.sourceDuration,
          speed: c.speed,
          transform: { ...c.transform },
          filters: { ...c.filters },
          audio: { ...c.audio },
          text: c.text ? { ...c.text } : null,
          transition: c.transition ? { ...c.transition } : null
        }))
      }))
    };
  }

  deserialize(data) {
    if (!data || !data.tracks) throw new Error("Invalid project file format");

    state.pushHistory("Load Project File");

    if (data.project) {
      state.project = { ...state.project, ...data.project };
    }

    state.tracks = data.tracks;
    state.setPlayhead(0);
    state.selectedClipId = null;
    state.emit("tracksUpdated");
    state.emit("selectionChanged", { clip: null, track: null });
  }

  saveToFile() {
    const data = this.serialize();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    const safeName = (state.project.name || "FrameStudio_Project").replace(/[^a-z0-9_-]/gi, "_");
    a.download = `${safeName}.fsproj`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    state.emit("toast", { message: `Project saved as ${safeName}.fsproj`, type: "success" });
  }

  loadFromFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".fsproj,.json";

    input.onchange = async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        this.deserialize(data);
        state.emit("toast", { message: `Loaded project "${file.name}"`, type: "success" });
      } catch (err) {
        state.emit("toast", { message: `Failed to open project: ${err.message}`, type: "error" });
      }
    };

    input.click();
  }
}

export const projectStore = new ProjectStore();
