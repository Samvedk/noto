# Noto — The Elite Digital Notebook 📓✨

[![Status](https://img.shields.io/badge/Status-Executed-success?style=for-the-badge)](https://github.com/Samvedk/noto)
[![Engine](https://img.shields.io/badge/Engine-Tauri--Desktop-24C3D5?style=for-the-badge&logo=tauri)](https://github.com/Samvedk/noto)
[![Storage](https://img.shields.io/badge/Storage-High--Capacity%20IndexedDB-F3DF49?style=for-the-badge&logo=javascript&logoColor=black)](https://github.com/Samvedk/noto)

> **"Clarity of Mind Through Clarity of Interface."** — Noto is an elite, distraction-free environment built for premium note-taking, powered by a high-performance desktop architecture.

---

## 🧠 The Architecture (Executed)

### 🏎️ High-Capacity Storage Engine (IndexedDB)
Noto is engineered to handle massive libraries that would break traditional web applications. We have successfully implemented a custom **IndexedDB persistence layer** that:
*   **1GB+ Target Capacity**: Unlike 5MB browser limits, Noto supports gigabytes of notebooks and thousands of rich, hand-drawn pages.
*   **Automatic Migration**: The engine detects legacy `localStorage` data and safely migrates it to the high-capacity IndexedDB store upon first launch, ensuring data continuity.
*   **Atomic Transactions**: Every stroke and organization change is saved with zero-latency background writes, protecting against data loss.

### 🛡️ Desktop Integration (Tauri + Rust)
Noto is not just a website; it is a desktop-native experience. By utilizing the **Tauri Framework**, we have achieved:
*   **Native Performance**: Using the system's webview (WebKit on Mac) for near-instant boot times and minimal memory footprint.
*   **Absolute Privacy**: By running as a native application, Noto operates 100% offline. Your thoughts never leave your local machine.

---

## 🎨 Design Philosophy & UX

### 🌊 "Stark Lab" Immersive UI
The interface follows a strict **minimalist aesthetic**, heavily influenced by high-end digital art suites.
*   **Hierarchical Flow**: Notes are organized through a precise logical chain: `Grade → Subject → Notebook → Page`.
*   **Dynamic Theming**: Support for Light, Dark, and High-Contrast modes for prolonged reading/writing sessions.

### 🧱 Engineered Data Integrity
We believe "speed" shouldn't come at the cost of "safety."
*   **Intentional Friction**: To prevent accidental loss of crucial notes, critical deletions require explicit **text-based confirmation** ("Delete confirmation" logic).
*   **Software Palm Rejection**: Integrated logic to differentiate between deliberate stylus strokes and accidental touch inputs.

---

## 🏗️ Technical Stack
*   **Wrapper:** [Tauri](https://tauri.app/) (Rust-based security & performance)
*   **Core:** Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3 Custom Properties.
- **Persistence:** IndexedDB (The "1GB+ Capacity" Upgrade)

---

## 📈 Social Impact
Noto was built to solve the physical and environmental costs of traditional learning:
- **Zero Paper Consumption**: A direct alternative to the 3,000+ pages used annually by the average student.
- **Bag Weight Reduction**: Consolidates 10kg of physical notebooks into a single digital interface.

---

## 👤 Author
**Sam.K**  
*Building premium digital experiences that bridge the gap between creative intuition and digital efficiency.*

---

© 2026 Samved K (Noto Project). All rights reserved.
