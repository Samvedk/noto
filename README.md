<div align="center">

<img src="public/icon.png" alt="Noto Logo" width="140" height="140" />

# NOTO — Pro-Grade Digital Handwriting Engine & Kiosk Ecosystem
### *Smarter Learning. Lighter Future.*

[![Electron](https://img.shields.io/badge/Electron-v35+-47848F?style=for-the-badge&logo=electron&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2023-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](#)
[![HTML5 Canvas](https://img.shields.io/badge/Canvas_2D-120Hz/240Hz_ProMotion-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![Target OS](https://img.shields.io/badge/Target-Linux_ARM64_|_iPad_Safari_|_Desktop-007ACC?style=for-the-badge&logo=linux&logoColor=white)](#)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB_Offline--First-4479A1?style=for-the-badge&logo=sqlite&logoColor=white)](#)

---

**NOTO** is an enterprise-grade, offline-first digital notebook and study ecosystem engineered from scratch for active/capacitive styluses (iPad Pro, Gizga Disc Tip) and dedicated Linux ARM64 hardware kiosks (Radxa CM3 / Raspberry Pi).

</div>

<br>

## 📌 Executive Technical Overview

Built without bloated heavy frameworks, NOTO combines a high-performance **Dual-Layer HTML5 Canvas 2D Engine** with low-level WebKit Pointer APIs and Node.js Electron IPC. It delivers **$O(1)$ constant-time active stroke rendering** at 120Hz/240Hz refresh rates, realistic **Notability-style fluid dynamics & sub-pixel needle tapering**, and process-isolated **B2B kiosk security**.

---

## 🚀 Key Engineering Accomplishments (Resume Showcase)

* ⚡ **$O(1)$ Constant-Time Active Stroke Engine:** Solved $O(N^2)$ stroke redraw choking on high-refresh 120Hz/240Hz iPad Pro displays by architecting an incremental segment renderer that processes newly added points in $<0.01\text{ms}$ constant time.
* ✍️ **Direct WebKit Touch Driver:** Bypassed iOS Safari's native tap-delay and double-tap zoom gesture recognizers using raw `{ passive: false }` touch listeners with immediate `preventDefault()`, eliminating dropped handwriting strokes during rapid pen lifts ("hi samved" multi-stroke stress test).
* 🖋️ **Notability-Grade Fluid Dynamics & Tapering:** Formulated a sigmoid velocity-to-width ink drag model ($\text{Width} = W_{\text{base}} \times [1.35 - 0.70 \cdot \frac{v}{v+1.6}]$) and a sub-pixel lift-off needle tapering algorithm ($\text{w} \propto [k / (n+1)]^{0.65}$) for realistic fountain pen & ballpoint ink feel.
* 🛡️ **Adaptive Centripetal EMA Filtering:** Implemented speed-adaptive Exponential Moving Average smoothing ($\alpha = 0.45$ for fast flicks, $0.28$ for slow deliberate lines) to eliminate micro-hand tremors without introducing stroke latency.
* 🔒 **Process-Isolated Dual-Mode Architecture:** Engineered a unified Electron desktop app supporting both `--general` (student notebook) and `--b2b` (institute coaching mode) with isolated `userData` sandboxing and PIN-protected study material distribution.
* 🔌 **Secure Electron IPC Bridge:** Designed a bidirectional `preload.js` bridge exposing `window.notoOS` via `contextBridge` for Linux sysfs battery telemetry, offline JSON backup exports, and automated USB MTP storage folder sync.

---

## 🏗️ System Architecture & Data Flow

```mermaid
graph TD
    subgraph Client UI / Renderer Layer
        A[iPad Safari / Electron Web View] -->|Raw Pointer Events| B[Direct Touch Event Driver]
        B -->|Coalesced 240Hz Events| C[Ink Dynamics Engine]
        C -->|Velocity & EMA Filtering| D[O(1) Active Canvas Overlay]
        D -->|Finalise & Needle Taper| E[Main Canvas 2D Layer]
    end

    subgraph Data & Storage Layer
        E -->|Stroke Commit| F[IndexedDB Storage Engine]
        F <-->|Async CRUD| G[(4-Tier DB: Grade > Subject > Notebook > Page)]
    end

    subgraph OS / Native Electron Bridge
        A <-->|contextBridge / window.notoOS| H[Preload IPC Bridge]
        H <-->|ipcRenderer / ipcMain| I[Electron Main Process]
        I <-->|File System API| J[USB MTP Sync Folder / Backup Exports]
        I <-->|Linux Sysfs| K[/sys/class/power_supply/battery/capacity]
    end
```

---

## 📐 Mathematical Models & Physics Pipeline

```
[ Raw Pointer Event ]
         │
         ▼
[ 1. Nonlinear Ink Drag Model ] ──► (Fluid dynamics: slow = rich ink, fast = thin crisp line)
         │
         ▼
[ 2. Centripetal EMA Filter ]    ──► (Adaptive α smoothing eliminates hand tremor without latency)
         │
         ▼
[ 3. Continuous Bezier Splines ] ──► (C² curvature continuity through stroke points)
         │
         ▼
[ 4. Dynamic Lift-off Taper ]    ──► (Calculates velocity on lift-off; tapers tail to needle point)
```

### 1. Speed-to-Width Sigmoid Flow Model
Simulates physical ink flow where slow movement deposits rich ink and fast movement thins out:
$$\text{Width}(v) = W_{\text{base}} \times \left( 1.35 - 0.70 \cdot \frac{v}{v + 1.6} \right)$$
*where $v = \frac{\Delta d}{\Delta t}$ is the stroke velocity in pixels/ms.*

### 2. Adaptive Centripetal EMA Smoothing
Filters hand micro-tremors without adding latency or rounding off sharp intent:
$$w_k = (1 - \alpha) \cdot w_{k-1} + \alpha \cdot w_{\text{target}}, \quad \alpha = \begin{cases} 0.45 & v > 2.5 \text{ px/ms (fast flick)} \\ 0.28 & v \le 2.5 \text{ px/ms (careful writing)} \end{cases}$$

### 3. Sub-Pixel Lift-Off Needle Tapering
Applies a graceful fountain pen tail on the last $N$ points when pen velocity exceeds lift-off threshold:
$$w_k = \max\left(0.6, \, w_k \cdot \left[\frac{k}{N + 1}\right]^{0.65}\right)$$

---

## 🛠️ Tech Stack & Specifications

| Component | Technology / Specification |
|---|---|
| **Frontend Framework** | Pure Vanilla JavaScript (ES2023), Vanilla CSS3 (Custom Tokens, Glassmorphic Glass) |
| **Canvas Engine** | Dual-Layer HTML5 Canvas 2D (`#actC` active overlay + `#dwC` static paper canvas) |
| **Desktop & Kiosk** | Electron 35+, Node.js 22+, `preload.js` IPC `contextBridge` |
| **Target Hardware** | Radxa CM3 SBC (ARM64 Linux Kiosk), iPad Pro / Air (Safari WebKit), macOS / Win |
| **Storage Engine** | Offline-First IndexedDB (`notoDb`) with zero cloud dependency |
| **Stylus & Input** | Apple Pencil (240Hz coalesced events), Active Capacitive, Passive Disc Tip, Touch |
| **Paper Texture** | SVG Dynamic Noise Grain overlay with `mix-blend-mode` (Multiply / Screen) |

---

## 📂 Repository & Codebase Structure

```
Noto/
├── main.js                 # Electron Main process (Kiosk mode, IPC handlers, userData sandboxing)
├── preload.js              # Electron Preload script (window.notoOS IPC bridge)
├── package.json            # NPM dependencies & electron-builder ARM64 configuration
├── public/                 # Primary Web Application UI
│   ├── index.html          # Application entrypoint & grade navigation
│   ├── page.html           # Core Canvas Notebook drawing environment & Notability engine
│   ├── grade.html          # Grade & subject management grid
│   ├── subject.html        # Subject notebook manager & B2B pre-baked material badges
│   ├── notebook.html       # Notebook view & thumbnail grid
│   ├── habits.html         # Student habit tracker & productivity dashboard
│   ├── exam-center.html    # Timed exam simulator with digital signature pad
│   ├── settings.html      # App configuration, Admin PIN management, Backup & Export
│   ├── paper-glass.css     # Glassmorphic UI design system & iPad native resets
│   ├── noto.css            # Base application typography & tokens
│   └── js/
│       ├── renderer.js     # Central brain: IndexedDB CRUD, Modal System, Backup Export/Import
│       └── keyboard.js     # Virtual keyboard & shortcut handlers
└── publicnotostudentpro1/  # B2B Worktree production mirror
```

---

## 💻 Local Development & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 2. Run as Web Server (iPad Safari Testing)
```bash
# Launch no-cache HTTP server on port 8090
cd public && python3 server.py

# Access on iPad Safari via:
# http://<YOUR_LOCAL_IP>:8090/index.html?mode=b2b
```

### 3. Run in Electron Desktop (General Purpose Mode)
```bash
npm install
npm start
```

### 4. Run in Electron Desktop (B2B Coaching Mode)
```bash
npm run start:b2b
```

### 5. Run in Electron Kiosk Mode (Full Screen)
```bash
npm run start:kiosk
```

### 6. Package for ARM64 Linux (Radxa CM3 / Raspberry Pi)
```bash
npm run build:radxa
# Generates production .deb installer package in dist/
```

---

## 📄 Candidate Resume Bullet Points (Copy & Paste for Resume)

```markdown
• Software Engineer | NOTO Digital Handwriting & Kiosk Platform
  - Designed and engineered NOTO, a zero-latency digital handwriting application and Linux ARM64 hardware kiosk environment using HTML5 Canvas 2D, WebKit Pointer APIs, and Electron.
  - Built an O(1) incremental stroke rendering engine supporting 120Hz/240Hz displays with velocity-dependent fluid dynamics, speed-adaptive EMA width smoothing, and sub-pixel lift-off needle tapering.
  - Eliminated iOS Safari touch delays by implementing a raw touch event driver with { passive: false } event suppression, enabling zero dropped strokes during high-speed handwriting tests.
  - Implemented process-isolated dual-mode execution (--general vs --b2b) in Electron using a secure contextBridge (preload.js) for Linux sysfs battery telemetry, IndexedDB JSON backups, and USB MTP auto-sync.
  - Architected an offline-first storage engine powered by IndexedDB handling a 4-tier data hierarchy (Grade -> Subject -> Notebook -> Page) with PIN-authenticated B2B study material distribution.
```

---

<div align="center">

### *"This is not just a notebook. This is the future of organized intelligence."*

<br>

**Designed & Engineered by Samved Kokil**

</div>
