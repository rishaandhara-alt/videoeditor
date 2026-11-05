// js/audio-engine.js - Multi-track Web Audio API synchronization & mixing engine

import { state } from "./state.js";

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeNodes = new Map(); // clipId -> { sourceNode, gainNode, pannerNode, startTimeOffset }
    this.isPlaying = false;
    this.lastPlayhead = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  startPlayback(fromTime) {
    this.ensureContext();
    this.stopPlayback();
    this.isPlaying = true;
    this.lastPlayhead = fromTime;

    const currentTime = fromTime;
    const now = this.ctx.currentTime;

    for (const track of state.tracks) {
      if (track.muted) continue;

      for (const clip of track.clips) {
        if (clip.audio && clip.audio.muted) continue;

        const asset = state.assets.get(clip.assetId);
        if (!asset || !asset.audioBuffer) continue;

        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;

        // Is clip currently active or starting in the future?
        if (clipEnd > currentTime) {
          this.scheduleClip(clip, track, asset, currentTime, now);
        }
      }
    }
  }

  scheduleClip(clip, track, asset, playheadTime, audioContextNow) {
    const buffer = asset.audioBuffer;
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = clip.speed || 1.0;

    const gain = this.ctx.createGain();
    const clipVol = (clip.audio ? clip.audio.volume : 1.0) * (track.volume ?? 1.0);
    gain.gain.value = clipVol;

    // Apply Fade In / Fade Out if defined
    if (clip.audio?.fadeIn > 0 || clip.audio?.fadeOut > 0) {
      const fadeIn = clip.audio.fadeIn || 0;
      const fadeOut = clip.audio.fadeOut || 0;
      const dur = clip.duration;
      // We can apply gain ramp relative to clip start
    }

    let panner = null;
    if (this.ctx.createStereoPanner && clip.audio?.pan !== undefined) {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, clip.audio.pan));
      source.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      source.connect(gain);
      gain.connect(this.masterGain);
    }

    let whenToStart = audioContextNow;
    let offsetInBuffer = clip.trimIn;
    let playDuration = clip.duration * (clip.speed || 1.0);

    if (playheadTime > clip.startTime) {
      // Playhead is already inside the clip
      const elapsedInClip = (playheadTime - clip.startTime) * (clip.speed || 1.0);
      offsetInBuffer += elapsedInClip;
      playDuration = Math.max(0, (clip.startTime + clip.duration - playheadTime) * (clip.speed || 1.0));
      whenToStart = audioContextNow;
    } else {
      // Clip starts in future
      const delay = clip.startTime - playheadTime;
      whenToStart = audioContextNow + delay;
    }

    try {
      source.start(whenToStart, offsetInBuffer, playDuration);
      this.activeNodes.set(clip.id, { source, gain, panner });

      source.onended = () => {
        if (this.activeNodes.get(clip.id)?.source === source) {
          this.activeNodes.delete(clip.id);
        }
      };
    } catch (e) {
      console.warn("Audio scheduling warning:", e);
    }
  }

  stopPlayback() {
    this.isPlaying = false;
    for (const [_, nodeGroup] of this.activeNodes.entries()) {
      try {
        nodeGroup.source.stop();
        nodeGroup.source.disconnect();
        nodeGroup.gain.disconnect();
        if (nodeGroup.panner) nodeGroup.panner.disconnect();
      } catch (_) {}
    }
    this.activeNodes.clear();
  }

  updateLiveVolume(clipId, volume) {
    const active = this.activeNodes.get(clipId);
    if (active && active.gain) {
      active.gain.gain.value = volume;
    }
  }

  updateLivePan(clipId, pan) {
    const active = this.activeNodes.get(clipId);
    if (active && active.panner) {
      active.panner.pan.value = pan;
    }
  }
}

export const audioEngine = new AudioEngine();
