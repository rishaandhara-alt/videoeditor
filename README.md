# FrameStudio Pro 🎬
### Professional Browser-Based Video Editing Application inspired by DaVinci Resolve & CapCut

FrameStudio is a high-performance, browser-based nonlinear video editing suite crafted for precision editing, real-time effects grading, multi-track audio mixing, and frame-accurate video rendering—running entirely in modern web browsers without backend server processing dependencies.

---

## 🌟 Key Features

### 1. Polished Professional Dark Interface
- **DaVinci Resolve / CapCut Aesthetic**: Deep slate/charcoal palette (`#0d0f14`), glowing clip selections, customizable track heights, responsive split panes, and transport HUD.
- **Aspect Ratio Switching**: 16:9 Landscape (YouTube/Vimeo), 9:16 Vertical (Shorts/TikTok/Reels), and 1:1 Square (Instagram/Social).
- **Timecode Display**: SMPTE-standard frame-accurate timecode (`HH:MM:SS:FF` at 30 fps).

### 2. Media Library & Procedural Asset Engine
- **Multi-format Imports**: Import video (`.mp4`, `.webm`, `.mov`), audio (`.mp3`, `.wav`, `.ogg`), and images (`.png`, `.jpg`, `.webp`, `.svg`).
- **Drag & Drop**: Drag assets from the library directly onto timeline track lanes.
- **Procedural Demo Media Generator**: Synthesizes high-definition 60fps canvas animations ("Cyber Neon City", "Golden Sunrise", "Film Leader") and Web Audio multi-voice tracks ("Retro Synthwave 120BPM", "Cinematic Sub-Drop & Swell") inside the browser.
- **1-Click Demo Project**: Instant timeline assembly with video tracks, titles, audio tracks, and transitions ready to edit.

### 3. Multi-Track Timeline & Non-Linear Editing
- **Multi-Track Layering**:
  - `Video V2` (Overlays / B-Roll / PIP)
  - `Video V1` (Primary footage)
  - `Titles T1` (Dynamic text overlays and subtitles)
  - `Music A1` (Soundtrack / background music)
  - `SFX A2` (Sound effects / dialogue)
- **Filmstrip Thumbnails**: Generates frame thumbnails along the length of each video clip.
- **Real Audio Waveforms**: Decodes PCM audio buffers and paints amplitude peaks directly on audio and video clips.
- **Interactive Trimming**: Precision left and right trim handles (`col-resize`) for in-point and out-point trimming.
- **Razor Blade Split**: Split clips cleanly at the playhead position (`S` or `C`).
- **Magnetic Snapping**: Snaps clip edges to other clips, playhead, and timeline zero with cyan guide line (`N` to toggle).
- **Timeline Zoom**: Smooth scaling from 15px/s to 250px/s, with zoom slider, zoom buttons, and "Fit" button.

### 4. Real-Time Video Preview & Compositor
- **Canvas Composition Pipeline**: Composites multiple video tracks, images, and text overlays in real-time.
- **Geometric Transforms**: Position X/Y, Scale (10% to 250%), Rotation (-180° to 180°), and Opacity.
- **Color Grading & Filters**: Real-time Brightness, Contrast, Saturation, Hue Rotate, and Blur adjustments with one-click presets ("Teal & Orange", "Noir B&W", "Vibrant").
- **Variable Playback Speed**: 0.25x (Slow-Motion) to 4.0x (Hyperlapse) with timeline speed scaling.
- **Transitions**: Crossfade / Dissolve, Fade to Black, Wipe Left, Wipe Right, and Zoom In with adjustable duration.
- **Animated Text Overlays**: Font family, font size, bold/italic, fill color, outline stroke, background banner box, alignment, and animations (`fade`, `pop`, `slide-up`, `typewriter`).

### 5. Multi-Track Audio Engine
- **Web Audio API Graph**: Synchronizes audio buffers across all tracks with sub-millisecond precision.
- **Per-Clip & Per-Track Controls**: Volume gain sliders (0% to 200%), stereo panning (L100 to R100), and mute toggles.
- **Fade In & Fade Out**: Gain ramps at clip boundaries to eliminate audio pops.

### 6. Frame-Accurate Video Exporter
- **Real Rendering Engine**: Renders all visual layers, transitions, text animations, color grading, and mixed audio tracks into a downloadable `.webm` or `.mp4` file.
- **Custom Export Presets**:
  - Full HD 1080p (1920x1080, 30fps)
  - HD 720p (1280x720, 30fps)
  - Vertical Shorts / Reels (1080x1920, 30fps)
  - Square Social (1080x1080, 30fps)
- **Live Progress Monitor**: Displays real-time frame counter, percent complete, elapsed time, and ETA.

### 7. Project Persistence & History
- **Undo / Redo Stack**: Up to 40 levels of history tracking every trim, split, move, duplicate, and filter adjustment (`Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z`).
- **Project Save / Load**: Downloads structured `.fsproj` (JSON) files and loads existing projects.
- **Auto-Save**: Automatically records project state to `localStorage` every 15 seconds.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause playback |
| `←` / `→` | Step 1 frame backward / forward |
| `Shift + ←` / `Shift + →` | Step 10 frames backward / forward |
| `Home` / `End` | Jump to beginning / end of timeline |
| `S` or `C` | Split selected clip at playhead (Razor Blade) |
| `Delete` / `Backspace` | Delete selected clip |
| `Cmd/Ctrl + D` | Duplicate selected clip |
| `Cmd/Ctrl + Z` | Undo last action |
| `Cmd/Ctrl + Shift + Z` | Redo action |
| `N` | Toggle magnetic snapping on/off |
| `+` / `-` | Zoom timeline in / out |
| `F` | Toggle fullscreen preview |
| `J` / `K` / `L` | Shuttle reverse / pause / forward |
| `?` | Open Keyboard Shortcuts modal |

---

## 🚀 Running Locally

FrameStudio is architected with **zero third-party package dependencies**, meaning you don't even need `npm install`!

### Method 1: Built-in Node Server (Recommended)
```bash
# Starts the range-request static HTTP server on port 3000
npm start
# OR:
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in Google Chrome, Safari, Edge, or Firefox.

### Method 2: Python 3 HTTP Server
```bash
python3 -m http.server 3000
```

---

## ☁️ Deploying to Vercel

FrameStudio is 100% Vercel-ready with preconfigured `vercel.json` (includes `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers):

### Option 1: Vercel CLI
```bash
# Install vercel if not installed
npm i -g vercel

# Deploy instantly
vercel --prod
```

### Option 2: GitHub / Vercel Web Dashboard
1. Push this directory to your GitHub repository.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository and click **Deploy**. Vercel will automatically serve the static assets with optimal caching and global CDN delivery.

---

## 📋 Disclosed Formats & Browser Capabilities

- **Video Ingestion:** MP4 (H.264/AAC), WebM (VP8/VP9/Opus), MOV (H.264).
- **Audio Ingestion:** MP3, WAV (PCM 16/24-bit), AAC, OGG / WebA.
- **Images:** PNG, JPEG, WebP, SVG.
- **Proprietary Codecs:** HEVC (H.265), Apple ProRes, and Avid DNxHD require browser host hardware decoding. If a clip fails to decode, convert to H.264 MP4.
- **Export Formats:** Uses browser `MediaRecorder` encoding to WebM (VP9 + Opus) or MP4 (H.264 + AAC) based on host platform support.
