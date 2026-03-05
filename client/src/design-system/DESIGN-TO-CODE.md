# Dawayir — Design-to-Code Translation Guide

> **Role**: Vercel Design Engineer
> **Tech Stack**: React 18 + CSS Custom Properties + Canvas 2D API
> **Source**: Design System v1.0.0 (`tokens.json`, `dawayir-ds.css`, `DESIGN-SYSTEM.md`, `UI-UX-PATTERNS.md`, `BRAND-IDENTITY.md`)
> **Target**: Production-ready frontend code with full accessibility, responsive layout, animation, and performance optimization

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Component Structure](#2-component-structure)
3. [Design Tokens → Code Mapping](#3-design-tokens--code-mapping)
4. [Component Specifications](#4-component-specifications)
5. [Props & State Interfaces](#5-props--state-interfaces)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Responsive Layout System](#7-responsive-layout-system)
8. [ARIA & Accessibility](#8-aria--accessibility)
9. [Error & Loading States](#9-error--loading-states)
10. [Animation System](#10-animation-system)
11. [Styling Architecture](#11-styling-architecture)
12. [Asset Optimization](#12-asset-optimization)
13. [Performance Guide](#13-performance-guide)
14. [Testing Strategy](#14-testing-strategy)
15. [Documentation](#15-documentation)
16. [Copy-Paste Code Reference](#16-copy-paste-code-reference)

---

## 1. Architecture Overview

### 1.1 Application Shell

```
┌─────────────────────────────────────────────────────────────────┐
│ <App>  role="application"  aria-label="Dawayir Mental Space"    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ <DawayirCanvas>   — Full-screen canvas (z-index: 0)      │   │
│  │  3 animated circles + particles + connections             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────┐                              ┌──────────────┐    │
│  │ Overlay   │  role="complementary"        │ Transcript    │    │
│  │ Panel     │  360px left rail              │ Overlay       │    │
│  │ z-index:10│  glassmorphism                │ 320px right   │    │
│  │           │                              │ z-index: 20   │    │
│  └──────────┘                              └──────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Modal Layer  z-index: 40                                  │   │
│  │  OnboardingModal | EndSessionConfirmModal | SettingsModal │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Breathing HUD  role="toolbar"  z-index: 15                │   │
│  │  Bottom-center floating bar (camera, audio controls)      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 View State Machine

```
welcome → setup → live → complete
                ↘ dashboard
                ↘ settings (overlay)
```

State variable: `appView` — `'welcome' | 'setup' | 'live' | 'complete' | 'dashboard' | 'settings'`

### 1.3 File Structure

```
client/src/
├── App.jsx                          # Root component (~1800 lines)
├── App.css                          # All application styles (~2033 lines)
├── assets/
│   └── dawayir-logo-cognitive-trinity.svg
├── audio/
│   └── mic-processor.js             # AudioWorklet for mic capture
├── components/
│   ├── DawayirCanvas.jsx            # Full-screen animated canvas
│   ├── ConnectProgressCard.jsx      # Connection progress indicator
│   ├── OnboardingModal.jsx          # 3-step onboarding flow
│   ├── EndSessionConfirmModal.jsx   # Confirm before ending session
│   ├── SettingsModal.jsx            # Settings with persist to localStorage
│   └── DashboardView.jsx            # Memory Bank (reports list + detail)
├── design-system/
│   ├── tokens.json                  # W3C Design Token format
│   ├── dawayir-ds.css               # CSS Custom Properties + utilities
│   ├── DESIGN-SYSTEM.md             # Full design system documentation
│   ├── BRAND-IDENTITY.md            # Brand strategy + visual identity
│   ├── UI-UX-PATTERNS.md            # Screens, interactions, patterns
│   ├── DESIGN-CRITIQUE.md           # Nielsen heuristic evaluation
│   ├── WCAG-AUDIT.md                # WCAG 2.2 AA audit
│   └── DESIGN-TO-CODE.md            # This file
└── public/
    └── pcm-player-processor.js      # AudioWorklet for PCM playback
```

---

## 2. Component Structure

### 2.1 Component Tree

```
App
├── DawayirCanvas (ref: canvasRef)
├── [View: welcome]
│   ├── Brand Header (logo + name + subtitle)
│   ├── OnboardingModal (conditional)
│   └── Enter Button (CTA)
├── [View: setup]
│   ├── Camera Setup (video + capture)
│   └── ConnectProgressCard
├── [View: live]
│   ├── Overlay Panel (role="complementary")
│   │   ├── Brand Header
│   │   ├── StatusBadge (role="status", aria-live="polite")
│   │   ├── Visualizer (inline, audio frequency bars)
│   │   ├── CognitiveMetrics (3 bars)
│   │   ├── CircleControls (3 circles × grow/shrink/pulse)
│   │   ├── CommandInput (form)
│   │   └── SessionFooter (end session + dashboard)
│   ├── TranscriptOverlay (right panel)
│   ├── BreathingHUD (role="toolbar", bottom center)
│   │   ├── Mini Camera Button
│   │   ├── Look At Me Button
│   │   └── Mic Status Indicator
│   └── AI Speaking Bar (conditional)
├── [View: complete]
│   ├── Session Summary
│   └── Return Button
├── [View: dashboard]
│   └── DashboardView
├── SettingsModal (conditional overlay)
└── EndSessionConfirmModal (conditional overlay)
```

### 2.2 Component Count

| Category | Components | Status |
|----------|-----------|--------|
| Shell / Layout | 2 | Implemented |
| Canvas / Visual | 1 | Implemented |
| Modals | 3 | Implemented |
| Cards | 2 | Implemented |
| Inline (in App.jsx) | 5+ | Implemented (not extracted) |
| **Total** | **13+** | |

---

## 3. Design Tokens → Code Mapping

### 3.1 Token Import Chain

```
tokens.json → dawayir-ds.css (CSS Custom Properties) → App.css (aliases) → Components
```

**App.css aliases** (line 6–21):
```css
:root {
  --cyan: var(--ds-cyan-500);        /* #00f5ff */
  --green: var(--ds-green-500);      /* #00ff94 */
  --magenta: var(--ds-magenta-400);  /* #FF00E5 */
  --gold: var(--ds-gold-400);        /* #ffd166 */
  --bg-deep: var(--ds-bg-deep);      /* #04040f */
  --bg-mid: var(--ds-bg-mid);        /* #080820 */
  --panel-bg: var(--ds-bg-surface);  /* rgba(8,8,28,0.82) */
  --panel-border: var(--ds-border-default); /* rgba(0,245,255,0.12) */
  --panel-glow: var(--ds-shadow-panel);
  --text-primary: var(--ds-text-primary);   /* #f0f4ff */
  --text-secondary: var(--ds-text-secondary); /* rgba(200,210,240,0.55) */
  --radius-panel: var(--ds-radius-3xl);     /* 28px */
  --radius-btn: var(--ds-radius-lg);        /* 16px */
  --ds-grid-panel-width: 380;
}
```

### 3.2 Color Token Reference

#### Primary Palette

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `color.primitive.cyan.500` | `--ds-cyan-500` | `#00F5FF` | Brand primary, links, focus |
| `color.primitive.neutral.900` | `--ds-neutral-900` | `#04040F` | Deep background |
| `color.primitive.neutral.800` | `--ds-neutral-800` | `#080820` | Mid background |
| `color.primitive.neutral.50` | `--ds-neutral-50` | `#F0F4FF` | Primary text |

#### Circle Colors

| Circle | Token | CSS Variable | Value |
|--------|-------|-------------|-------|
| Awareness (ID: 1) | `color.circle.awareness.default` | `--ds-circle-awareness` | `#00F5FF` |
| Knowledge (ID: 2) | `color.circle.knowledge.default` | `--ds-circle-knowledge` | `#00FF41` |
| Truth (ID: 3) | `color.circle.truth.default` | `--ds-circle-truth` | `#FF00E5` |

#### Emotion Colors (Bio-Feedback)

| Emotion | Token | CSS Variable | Value |
|---------|-------|-------------|-------|
| Calm | `color.emotion.calm` | `--ds-emotion-calm` | `#00CED1` |
| Anxious | `color.emotion.anxious` | `--ds-emotion-anxious` | `#FF6B35` |
| Joyful | `color.emotion.joyful` | `--ds-emotion-joyful` | `#FFD700` |
| Sad | `color.emotion.sad` | `--ds-emotion-sad` | `#4169E1` |
| Stressed | `color.emotion.stressed` | `--ds-emotion-stressed` | `#FF5E5E` |

#### Status Colors

| Status | Token | CSS Variable | Value |
|--------|-------|-------------|-------|
| Success | `color.semantic.status.success` | `--ds-status-success` | `#00FF94` |
| Warning | `color.semantic.status.warning` | `--ds-status-warning` | `#FFD166` |
| Error | `color.semantic.status.error` | `--ds-status-error` | `#FF5F6D` |
| Info | `color.semantic.status.info` | `--ds-status-info` | `#00F5FF` |

#### Gradients

| Gradient | CSS Variable | Value |
|----------|-------------|-------|
| Brand Text | `--ds-gradient-brand` | `linear-gradient(135deg, #fff 0%, #00f5ff 60%, #a0f0ff 100%)` |
| CTA Primary | `--ds-gradient-cta` | `linear-gradient(90deg, #abfc55 0%, #20d866 100%)` |
| CTA Hover | `--ds-gradient-cta-hover` | `linear-gradient(90deg, #bfff70 0%, #28e674 100%)` |
| Surface Glow | `--ds-gradient-surface` | `radial-gradient(ellipse at 30% 20%, rgba(0,245,255,0.03) 0%, transparent 60%)` |

### 3.3 Typography Token Reference

#### Font Families

| Token | CSS Variable | Value |
|-------|-------------|-------|
| `typography.fontFamily.display` | `--ds-font-display` | `'Outfit', sans-serif` |
| `typography.fontFamily.body` | `--ds-font-body` | `'Inter', sans-serif` |
| `typography.fontFamily.arabic` | `--ds-font-arabic` | `'Noto Kufi Arabic', 'Inter', sans-serif` |
| `typography.fontFamily.mono` | `--ds-font-mono` | `'JetBrains Mono', 'Fira Code', monospace` |

#### Type Scale (9 Levels)

| Level | Size | Line Height | Letter Spacing | Weight | Family | Usage |
|-------|------|-------------|----------------|--------|--------|-------|
| Display | 36px | 44px | -0.8px | 800 | Outfit | Hero text, splash |
| Heading | 26px | 34px | -0.5px | 900 | Outfit | Brand name, h1 |
| Title | 20px | 28px | -0.3px | 600 | Outfit | Section headers |
| Lead | 16px | 24px | -0.1px | 600 | Inter | Primary buttons, large body |
| Body | 14px | 22px | 0px | 400 | Inter | Default text, buttons |
| Small | 12px | 18px | 0.2px | 600 | Inter | Status badges, labels |
| Caption | 11px | 16px | 0.3px | 400 | Inter | Timestamps, dates |
| Micro | 10px | 14px | 0.5px | 400 | Inter | Footer info |
| Nano | 11px | 16px | 0.4px | 700 | Inter | Metric labels |

#### Mobile Overrides (`max-width: 480px`)

| Level | Desktop | Mobile |
|-------|---------|--------|
| Display | 36px | 28px |
| Heading | 26px | 22px |
| Lead | 16px | 14px |

### 3.4 Spacing Scale

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `spacing.0` | `--ds-space-0` | 0px | — |
| `spacing.1` | `--ds-space-1` | 4px | Icon gaps, thin dividers |
| `spacing.2` | `--ds-space-2` | 8px | Inner component spacing |
| `spacing.3` | `--ds-space-3` | 12px | Standard gap, button padding |
| `spacing.4` | `--ds-space-4` | 16px | Section gaps, list spacing |
| `spacing.5` | `--ds-space-5` | 20px | Panel padding, mobile insets |
| `spacing.6` | `--ds-space-6` | 24px | Header margins, section breaks |
| `spacing.7` | `--ds-space-7` | 28px | Panel padding |
| `spacing.8` | `--ds-space-8` | 32px | Overlay top padding |
| `spacing.10` | `--ds-space-10` | 40px | Major section separators |
| `spacing.12` | `--ds-space-12` | 48px | Page-level spacing |
| `spacing.16` | `--ds-space-16` | 64px | Hero spacing |
| `spacing.20` | `--ds-space-20` | 80px | Landmark spacing |

### 3.5 Border Radius

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `radius.xs` | `--ds-radius-xs` | 4px | Bubble corners |
| `radius.sm` | `--ds-radius-sm` | 8px | Tags, node labels |
| `radius.md` | `--ds-radius-md` | 12px | Small cards, icon buttons |
| `radius.lg` | `--ds-radius-lg` | 16px | Standard buttons |
| `radius.xl` | `--ds-radius-xl` | 20px | Transcript bubbles |
| `radius.2xl` | `--ds-radius-2xl` | 24px | Mobile overlay corners |
| `radius.3xl` | `--ds-radius-3xl` | 28px | Panel corners |
| `radius.full` | `--ds-radius-full` | 100px | Pill badges |
| `radius.circle` | `--ds-radius-circle` | 50% | Circular elements |

### 3.6 Shadows & Glows

| Token | CSS Variable | Value |
|-------|-------------|-------|
| `shadow.sm` | `--ds-shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` |
| `shadow.md` | `--ds-shadow-md` | `0 4px 20px rgba(0,0,0,0.4)` |
| `shadow.lg` | `--ds-shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` |
| `shadow.xl` | `--ds-shadow-xl` | `0 24px 48px rgba(0,0,0,0.7)` |
| `shadow.panel` | `--ds-shadow-panel` | `0 0 60px rgba(0,245,255,0.04), 0 24px 48px rgba(0,0,0,0.7)` |
| `shadow.glow-cyan` | `--ds-glow-cyan` | `0 0 20px rgba(0,245,255,0.3)` |
| `shadow.glow-cyan-strong` | `--ds-glow-cyan-strong` | `0 4px 20px rgba(0,245,255,0.4)` |
| `shadow.glow-green` | `--ds-glow-green` | `0 0 10px rgba(0,255,148,0.3)` |
| `shadow.glow-red` | `--ds-glow-red` | `0 0 10px rgba(255,95,109,0.3)` |

### 3.7 Motion Tokens

| Token | CSS Variable | Value |
|-------|-------------|-------|
| `motion.duration.fast` | `--ds-duration-fast` | 120ms |
| `motion.duration.normal` | `--ds-duration-normal` | 200ms |
| `motion.duration.moderate` | `--ds-duration-moderate` | 300ms |
| `motion.duration.slow` | `--ds-duration-slow` | 400ms |
| `motion.duration.slower` | `--ds-duration-slower` | 600ms |
| `motion.duration.deliberate` | `--ds-duration-deliberate` | 800ms |
| `motion.easing.spring` | `--ds-ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `motion.easing.smooth` | `--ds-ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` |

### 3.8 Z-Index Layers

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| `zIndex.base` | `--ds-z-base` | 0 | Canvas |
| `zIndex.raised` | `--ds-z-raised` | 1 | — |
| `zIndex.dropdown` | `--ds-z-dropdown` | 10 | Overlay panel |
| `zIndex.sticky` | `--ds-z-sticky` | 20 | Transcript, HUD |
| `zIndex.overlay` | `--ds-z-overlay` | 30 | Backdrop |
| `zIndex.modal` | `--ds-z-modal` | 40 | Modals |
| `zIndex.toast` | `--ds-z-toast` | 60 | Notifications |
| `zIndex.max` | `--ds-z-max` | 9999 | Dev tools |

---

## 4. Component Specifications

### 4.1 DawayirCanvas

**File**: `components/DawayirCanvas.jsx` (314 lines)
**Type**: `React.forwardRef` + `React.memo`

#### Visual Specification

| Property | Value |
|----------|-------|
| Dimensions | `window.innerWidth × window.innerHeight` |
| Background | `--ds-bg-deep` (`#04040F`) |
| Frame Rate | 24 FPS target (throttled via `requestAnimationFrame`) |
| Particles | 30 floating dots, `rgba(255,255,255, 0.1–0.4)`, size 0.5–2.5px |
| Connections | Animated dashed lines between all 3 circles, `rgba(255,255,255,0.08)`, dash `[8,6]` |

#### Circle Nodes

| Circle | ID | Default Radius | Color | Label (AR) | Label (EN) |
|--------|----|----------------|-------|------------|------------|
| Awareness | 1 | 70px | `#00F5FF` | الوعي | Awareness |
| Knowledge | 2 | 85px | `#00FF41` | العلم | Knowledge |
| Truth | 3 | 95px | `#FF00E5` | الحقيقة | Truth |

#### Circle Rendering (per node)

```
Layer 1: Pulse ring (when pulse > 0.1)
  - radius: currentRadius + (pulse × 30)
  - stroke: hexToRgba(color, pulse × 0.75)
  - lineWidth: 3

Layer 2: Outer glow
  - radius: currentRadius + 6
  - fill: hexToRgba(color, 0.15)

Layer 3: Main circle
  - radius: currentRadius
  - fill: hexToRgba(color, 0.6)

Layer 4: Highlight dot
  - position: (x - r/3, y - r/3)
  - radius: currentRadius / 5
  - fill: rgba(255,255,255, 0.2)

Layer 5: Label text
  - fill: #FFF
  - font: 600 {floor(currentRadius/3.5)}px 'Outfit'
  - textAlign: center
  - textBaseline: middle
```

#### Physics

| Property | Value |
|----------|-------|
| Lerp speed (radius) | 0.08 |
| Lerp speed (color) | 0.16 |
| Pulse decay | -0.015 per frame |
| Velocity | Various: ±0.1–0.25 px/frame |
| Boundary | Bounce at canvas edges (respects panel width) |
| Drag | Direct position follow, stop velocity |

#### Imperative API (via `ref`)

```javascript
canvasRef.current.updateNode(id, { radius, color, label, x, y })
canvasRef.current.pulseNode(id)       // pulse = 1.0
canvasRef.current.pulseAll()           // pulse = 0.8 for all
canvasRef.current.getNodes()           // returns [{id, x, y, radius, color, label}]
```

---

### 4.2 Overlay Panel

**Rendered in**: `App.jsx` (inline)
**Class**: `.overlay`

#### Layout

```css
.overlay {
  position: absolute;
  top: 0; left: 0;
  width: 360px;
  height: 100vh;
  z-index: 10;
  background: var(--panel-bg);              /* rgba(8,8,28,0.82) */
  backdrop-filter: blur(28px) saturate(140%);
  border-right: 1px solid var(--panel-border);
  box-shadow: var(--panel-glow);
  display: flex;
  flex-direction: column;
  padding: 32px 28px 28px;
  overflow-y: auto;
  gap: 20px;
  transition: all 0.4s var(--ds-ease-spring);
}
```

#### Glassmorphism Recipe

```css
/* Base glass surface */
background: rgba(8, 8, 28, 0.82);
backdrop-filter: blur(28px) saturate(140%);
-webkit-backdrop-filter: blur(28px) saturate(140%);
border: 1px solid rgba(0, 245, 255, 0.12);

/* Panel-level glow */
box-shadow: 0 0 60px rgba(0, 245, 255, 0.04),
            0 24px 48px rgba(0, 0, 0, 0.7);
```

#### Collapsed State

```css
.overlay-collapsed {
  width: 0;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
  padding: 0;
}
```

---

### 4.3 StatusBadge

**Rendered in**: `App.jsx` (inline)

#### Variants

| State | Class | Border Color | Background | Dot Animation |
|-------|-------|-------------|------------|---------------|
| Connected | `.status-badge.connected` | `rgba(0,255,148,0.25)` | `rgba(0,255,148,0.07)` | `blink 2s infinite` |
| Connecting | `.status-badge.connecting` | `rgba(255,209,102,0.25)` | `rgba(255,209,102,0.07)` | — |
| Error | `.status-badge.error` | `rgba(255,95,109,0.25)` | `rgba(255,95,109,0.07)` | — |
| Disconnected | `.status-badge.disconnected` | `rgba(200,210,240,0.15)` | `rgba(200,210,240,0.05)` | — |

#### Code

```jsx
<span
  className={`status-badge ${statusClass}`}
  role="status"
  aria-live="polite"
>
  <span className="dot" />
  {statusText}
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--ds-radius-full);  /* 100px */
  font-size: 12px;
  font-weight: 600;
  font-family: var(--ds-font-body);
  letter-spacing: 0.2px;
  border: 1px solid;
  transition: all 0.4s ease;
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.connected .dot {
  animation: blink 2s infinite;
}
```

---

### 4.4 Primary Button (CTA)

#### Visual Specification

```css
.primary-btn {
  position: relative;
  overflow: hidden;
  padding: 14px 32px;
  border: none;
  border-radius: var(--radius-btn);       /* 16px */
  background: var(--ds-gradient-cta);      /* linear-gradient(90deg, #abfc55, #20d866) */
  color: #030814;
  font-family: var(--ds-font-display);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.3px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(171, 252, 85, 0.15);
  transition: all 0.2s var(--ds-ease-spring);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(171, 252, 85, 0.3);
  background: var(--ds-gradient-cta-hover);
}

.primary-btn:active {
  transform: translateY(0);
}
```

#### Shimmer Effect

```css
.primary-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.7s ease;
}

.primary-btn:hover::before {
  left: 200%;
}
```

#### Outline Variant

```css
.primary-btn.outline-btn {
  background: transparent;
  border: 1px solid rgba(0, 245, 255, 0.3);
  color: var(--ds-text-primary);
  box-shadow: none;
}
```

---

### 4.5 Secondary Button

```css
.secondary {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--ds-radius-md);     /* 12px */
  background: transparent;
  color: var(--ds-text-secondary);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--ds-font-body);
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary:hover {
  background: var(--ds-bg-hover);          /* rgba(0,245,255,0.08) */
  color: var(--ds-text-primary);
  border-color: rgba(0, 245, 255, 0.3);
}

.secondary.is-active {
  background: var(--ds-bg-active);          /* rgba(0,245,255,0.15) */
  border-color: var(--ds-cyan-500);
  color: var(--ds-cyan-500);
}
```

---

### 4.6 Icon Button

```css
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--ds-radius-md);     /* 12px */
  border: none;
  background: transparent;
  color: var(--ds-text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}

.icon-btn:hover {
  background: var(--ds-bg-hover);
  color: var(--ds-text-primary);
  transform: scale(1.05);
}
```

---

### 4.7 Modal System

#### Backdrop

```css
.modal-backdrop {
  position: absolute;
  inset: 0;
  background: var(--ds-bg-overlay);        /* rgba(0,0,0,0.5) */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--ds-z-modal);              /* 40 */
}
```

#### Card

```css
.modal-card {
  min-width: 480px;
  max-width: 540px;
  background: var(--ds-bg-surface);
  backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-3xl);     /* 28px */
  padding: 32px;
  box-shadow: var(--ds-shadow-xl);
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

#### Modal Components

**OnboardingModal** — 3-step flow introducing the 3 circles:
```jsx
<OnboardingModal
  lang="ar"
  step={0}                // 0, 1, 2
  steps={ONBOARDING_STEPS[lang]}
  logoSrc={logoCognitiveTrinity}
  onSkip={() => closeOnboarding()}
  onNext={() => advanceOnboarding()}
/>
```

**EndSessionConfirmModal** — Confirmation before ending:
```jsx
<EndSessionConfirmModal
  lang="ar"
  onCancel={() => setShowEndSessionConfirm(false)}
  onConfirm={() => handleEndSession()}
/>
```

**SettingsModal** — Settings with localStorage persist:
```jsx
<SettingsModal
  lang="ar"
  onClose={() => setShowSettings(false)}
  onLanguageChange={(newLang) => setLang(newLang)}
/>
```

Settings state: `{ reducedMotion: bool, highContrast: bool, rememberOnboarding: bool }`
LocalStorage key: `'dawayir-settings-v1'`

---

### 4.8 ConnectProgressCard

```jsx
<ConnectProgressCard
  steps={CONNECT_PROGRESS[lang]}
  stage={connectStage}   // 0-3
/>
```

#### Steps Data

```javascript
const CONNECT_PROGRESS = {
  ar: [
    { key: 'network', label: 'الاتصال بالخادم' },
    { key: 'session', label: 'تأسيس الجلسة' },
    { key: 'voice',   label: 'تجهيز الصوت' },
    { key: 'ready',   label: 'جاهز' },
  ],
};
```

#### Progress Bar

```css
.connect-progress-bar {
  height: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}

.connect-progress-bar span {
  display: block;
  height: 100%;
  background: var(--ds-gradient-cta);
  border-radius: 4px;
  transition: width 0.6s var(--ds-ease-spring);
}
```

---

### 4.9 TranscriptOverlay

#### Layout

```css
.transcript-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  z-index: 20;
  display: flex;
  flex-direction: column;
  padding: 24px 16px;
  overflow-y: auto;
  pointer-events: auto;
}
```

#### Message Bubble

```css
.transcript-entry {
  display: flex;
  flex-direction: column;
  animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.transcript-text {
  padding: 10px 14px;
  border-radius: var(--ds-radius-xl);     /* 20px */
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(16px) saturate(160%);
  font-size: 14px;
  line-height: 22px;
  color: var(--ds-text-primary);
  max-width: 90%;
  word-break: break-word;
}

.transcript-text.transcript-agent {
  background: rgba(0, 245, 255, 0.08);
  border: 1px solid rgba(0, 245, 255, 0.12);
}
```

---

### 4.10 Visualizer (Audio)

**Type**: Inline component in App.jsx
**Canvas**: 72px height, frequency bar visualization

```jsx
function Visualizer({ stream, isConnected, lang }) {
  const [stressLevel, setStressLevel] = useState('calm');
  // Uses AnalyserNode.getByteFrequencyData()
  // Draws frequency bars using requestAnimationFrame
  // Calculates RMS for bio-badge stress detection
}
```

#### Bio Badge

```css
.bio-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--ds-radius-full);
  font-size: 11px;
  font-weight: 600;
}

.bio-badge.bio-calm {
  background: rgba(0, 206, 209, 0.12);
  color: var(--ds-emotion-calm);
  border: 1px solid rgba(0, 206, 209, 0.25);
}

.bio-badge.bio-stressed {
  background: rgba(255, 94, 94, 0.12);
  color: var(--ds-emotion-stressed);
  border: 1px solid rgba(255, 94, 94, 0.25);
}
```

---

### 4.11 AI Speaking Bar

```css
.ai-state-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: var(--ds-radius-lg);
  background: rgba(0, 245, 255, 0.06);
  border: 1px solid rgba(0, 245, 255, 0.12);
  font-size: 13px;
  color: var(--ds-cyan-500);
}

.ai-state-bar .wave {
  display: flex;
  gap: 3px;
  align-items: center;
  height: 16px;
}

.ai-state-bar .wave span {
  width: 3px;
  height: 10px;
  background: var(--ds-cyan-500);
  border-radius: 2px;
  animation: wave-bar 1.2s ease-in-out infinite;
}
```

Wave bars stagger: `0s, 0.15s, 0.3s, 0.1s, 0.25s`

```css
@keyframes wave-bar {
  0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
  50%      { transform: scaleY(1);   opacity: 1; }
}
```

---

### 4.12 DashboardView

**File**: `components/DashboardView.jsx` (114 lines)

#### Props

```typescript
interface DashboardViewProps {
  onBack: () => void;
  lang: 'ar' | 'en';
  emptyLogoSrc: string;
}
```

#### State

```javascript
const [reports, setReports] = useState([]);
const [selectedReport, setSelectedReport] = useState(null);
const [loading, setLoading] = useState(true);
const [search, setSearch] = useState('');
const [sortBy, setSortBy] = useState('recent');  // 'recent' | 'name'
```

#### Data Fetch

```javascript
// GET /api/reports → [{name, updated}]
// GET /api/reports/:filename → text content
```

#### Layout Classes

```css
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dashboard-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: var(--ds-bg-elevated);
  border: 1px solid var(--ds-border-subtle);
  border-radius: var(--ds-radius-md);
}
```

---

### 4.13 CommandInput

```css
.command-input-form {
  display: flex;
  gap: 8px;
}

.command-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: var(--ds-radius-md);
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--ds-text-primary);
  font-size: 13px;
  font-family: var(--ds-font-body);
}

.command-input:focus {
  border-color: var(--ds-cyan-500);
  box-shadow: 0 0 0 2px rgba(0, 245, 255, 0.15);
  outline: none;
}

.command-send-btn {
  padding: 8px 14px;
  border-radius: var(--ds-radius-md);
  border: 1px solid rgba(0, 245, 255, 0.2);
  background: rgba(0, 245, 255, 0.08);
  color: var(--ds-cyan-500);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
```

---

### 4.14 CircleControls

```css
.circle-controls-row {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.circle-control-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.circle-control-label {
  font-size: 13px;
  font-family: var(--ds-font-arabic);
}

.circle-control-btns {
  display: flex;
  gap: 6px;
}

.circle-control-btns button {
  width: 36px;
  height: 36px;
  border-radius: var(--ds-radius-md);
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--ds-text-secondary);
  cursor: pointer;
  font-size: 14px;
}
```

---

### 4.15 Camera Components

```css
.video-container {
  border-radius: var(--ds-radius-xl);
  overflow: hidden;
  aspect-ratio: 4/3;
  background: #000;
}

.video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.capture-btn {
  padding: 14px 32px;
  border-radius: var(--ds-radius-lg);
  background: var(--ds-gradient-cta);
  color: #030814;
  font-size: 16px;
  font-weight: 800;
  border: none;
}

.capture-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(171, 252, 85, 0.3);
}
```

---

## 5. Props & State Interfaces

### 5.1 App Component State

```typescript
// View & Navigation
appView: 'welcome' | 'setup' | 'live' | 'complete' | 'dashboard' | 'settings'
lang: 'ar' | 'en'

// Connection
status: string                   // Human-readable status text
isConnected: boolean
isStarting: boolean
connectStage: number             // 0-3 for ConnectProgressCard
errorMessage: string | null

// Session
lastEvent: string
toolCallsCount: number
journeyStage: string
commandText: string

// Audio
isMicActive: boolean
isAgentSpeaking: boolean
isUserSpeaking: boolean

// Visual
isCameraActive: boolean
capturedImage: string | null     // Base64 data URL

// Cognitive Model
cognitiveMetrics: {
  equilibriumScore: number,
  overloadIndex: number,
  clarityDelta: number
}

// UI State
transcript: Array<{ role: string, text: string, time: Date }>
isTranscriptVisible: boolean
isBreathingRoom: boolean
showOnboarding: boolean
onboardingStep: number           // 0-2
showEndSessionConfirm: boolean
showSettings: boolean
```

### 5.2 Component Props

```typescript
// DawayirCanvas
interface DawayirCanvasProps {
  lang: 'ar' | 'en';
}
// Ref API: { updateNode, pulseNode, pulseAll, getNodes }

// ConnectProgressCard
interface ConnectProgressCardProps {
  steps: Array<{ key: string; label: string }>;
  stage: number;
}

// OnboardingModal
interface OnboardingModalProps {
  lang: 'ar' | 'en';
  step: number;
  steps: Array<{ title: string; body: string }>;
  logoSrc: string;
  onSkip: () => void;
  onNext: () => void;
}

// EndSessionConfirmModal
interface EndSessionConfirmModalProps {
  lang: 'ar' | 'en';
  onCancel: () => void;
  onConfirm: () => void;
}

// SettingsModal
interface SettingsModalProps {
  lang: 'ar' | 'en';
  onClose: () => void;
  onLanguageChange: (lang: 'ar' | 'en') => void;
}

// DashboardView
interface DashboardViewProps {
  onBack: () => void;
  lang: 'ar' | 'en';
  emptyLogoSrc: string;
}
```

---

## 6. Data Flow Architecture

### 6.1 WebSocket Communication

```
Client (App.jsx)
  │
  ├── wsRef.current.send(JSON.stringify(message))
  │     ├── { type: 'audio', data: base64 }      // Mic audio chunks
  │     ├── { type: 'image', data: base64 }       // Camera capture
  │     ├── { type: 'text', text: string }         // Command input
  │     └── { type: 'toolResponse', ... }          // Tool call responses
  │
  └── wsRef.current.onmessage
        ├── serverContent.modelTurn → transcript update
        ├── toolCall → canvasRef.current.updateNode / pulseNode
        ├── audioBlob → PCM playback via AudioWorklet
        ├── setupComplete → connectStage = 3
        ├── inputTranscription → transcript (user side)
        └── debugTranscription → sessionContextRef update
```

### 6.2 Audio Pipeline

```
Microphone → getUserMedia → AudioWorklet (mic-processor.js)
  → Float32 → Int16 PCM → Base64 → WebSocket → Server → Gemini

Gemini → Server → WebSocket → Base64 PCM
  → AudioWorklet (pcm-player-processor.js) → Ring Buffer → AudioContext
```

### 6.3 Canvas Update Flow

```
Gemini tool call (update_node)
  → Server intercepts & resolves immediately
  → Server sends toolCall to client via WebSocket
  → App.jsx handleToolCall()
  → canvasRef.current.updateNode(id, { radius, color })
  → Canvas renders in next rAF frame (lerp interpolation)
```

### 6.4 State Management Pattern

**High-frequency data** → `useRef` (no re-renders):
- Audio buffers, PCM chunks
- WebSocket reference
- VAD state, mic state
- Canvas nodes (physics)
- Session context

**UI-bound data** → `useState` (triggers re-render):
- View state, connection status
- Transcript array
- Modal visibility
- Language

---

## 7. Responsive Layout System

### 7.1 Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| xs | 320px | Small phones |
| sm | 480px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

### 7.2 Grid System

```css
.ds-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: 32px;   /* desktop */
}

/* Tablet */
@media (max-width: 768px) {
  :root {
    --ds-grid-margin: 24px;
    --ds-grid-gutter: 12px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  :root {
    --ds-grid-margin: 16px;
  }
}
```

### 7.3 Panel Responsive Behavior

```css
/* Desktop: 360px fixed left rail */
.overlay {
  width: 360px;
}

/* Tablet (≤768px): Full-width overlay */
@media (max-width: 768px) {
  .overlay {
    width: 100%;
    border-radius: 0;
    border-right: none;
  }

  .transcript-overlay {
    display: none;
  }
}

/* Mobile (≤480px): Stack everything */
@media (max-width: 480px) {
  .overlay {
    padding: 20px 16px 16px;
  }

  .modal-card {
    min-width: auto;
    width: calc(100% - 32px);
    border-radius: var(--ds-radius-2xl);
  }
}
```

### 7.4 Typography Responsive

```css
@media (max-width: 480px) {
  :root {
    --ds-text-heading: 22px;
    --ds-text-heading-lh: 28px;
    --ds-text-display: 28px;
    --ds-text-display-lh: 36px;
    --ds-text-lead: 14px;
    --ds-text-lead-lh: 22px;
  }
}
```

---

## 8. ARIA & Accessibility

### 8.1 Landmarks & Roles

| Element | Role | Aria Attribute | Description |
|---------|------|---------------|-------------|
| App root | `application` | `aria-label="Dawayir Mental Space"` | Full app container |
| Overlay Panel | `complementary` | `aria-label` (bilingual) | Side navigation |
| Canvas wrapper | `main` | — | Primary content |
| Status badge | `status` | `aria-live="polite"` | Connection state |
| Breathing HUD | `toolbar` | — | Action buttons |
| Transcript | — | `aria-label` (bilingual) | Chat messages |
| Progress card | — | `aria-live="polite"` | Connection progress |
| Settings close | `button` | `aria-label="Close"` | Close button |

### 8.2 Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| Escape | Close overlays | Settings, Confirm, Onboarding modals |
| Space | Toggle transcript | Live view |
| M | Toggle transcript | Live view |
| S | Toggle settings | Live view |

### 8.3 Focus Management

```css
:focus-visible {
  outline: 2px solid var(--ds-border-focus);  /* #00F5FF */
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.2);
}
```

### 8.4 Screen Reader Utility

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  margin: -1px;
  padding: 0;
}
```

### 8.5 Media Preferences

```css
/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  :root {
    --ds-duration-fast: 0ms;
    --ds-duration-normal: 0ms;
    --ds-duration-moderate: 0ms;
    --ds-duration-slow: 0ms;
    --ds-duration-slower: 0ms;
    --ds-duration-deliberate: 0ms;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  :root {
    --ds-text-secondary: rgba(200, 210, 240, 0.85);
    --ds-text-disabled: rgba(200, 210, 240, 0.6);
    --ds-border-default: rgba(0, 245, 255, 0.4);
    --ds-border-subtle: rgba(255, 255, 255, 0.2);
    --ds-bg-elevated: rgba(255, 255, 255, 0.1);
  }
}
```

### 8.6 Programmatic Accessibility Toggle

```javascript
// SettingsModal applies CSS classes for manual override
document.documentElement.classList.toggle('prefers-reduced-motion', settings.reducedMotion);
document.documentElement.classList.toggle('prefers-high-contrast', settings.highContrast);
```

### 8.7 Known WCAG Gaps (from WCAG-AUDIT.md)

| ID | Issue | Priority | Fix |
|----|-------|----------|-----|
| CR-1 | Canvas has no `role="img"` or `aria-label` | Critical | Add `role="img" aria-label="..."` |
| CR-2 | No `<h1>` element anywhere | Critical | Add `<h1 className="visually-hidden">` |
| CR-3 | No skip link | Critical | Add skip-to-main link |
| CR-4 | `html[lang]` not updated dynamically | Critical | Set `document.documentElement.lang` on lang change |
| CR-5 | Font sizes in `px` not `rem` | Critical | Convert all token sizes to rem |
| CR-6 | Canvas mouse-only (no touch/keyboard) | Critical | Add touch + keyboard events |
| CR-7 | Section labels opacity 0.6 fails contrast | Critical | Increase to 0.85 |

---

## 9. Error & Loading States

### 9.1 Error Message

```css
.error-message {
  color: #ff8787;
  font-size: 12px;
  font-style: italic;
  padding: 8px 12px;
  background: rgba(255, 77, 77, 0.08);
  border-radius: var(--ds-radius-sm);
  border: 1px solid rgba(255, 77, 77, 0.15);
}
```

### 9.2 Loading State

```css
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-cyan-500);
  font-style: italic;
  padding: 40px;
}
```

### 9.3 Empty State

```css
.empty-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  text-align: center;
}

.empty-state-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--ds-text-primary);
}

.empty-state-card p {
  font-size: 13px;
  color: var(--ds-text-secondary);
  max-width: 280px;
}
```

### 9.4 Connection States

| State | UI Behavior |
|-------|------------|
| Connecting | Show ConnectProgressCard, disable buttons |
| Connected | Hide progress, enable all controls |
| Error | Show error-message, StatusBadge turns red |
| Disconnected | StatusBadge grey, show reconnect option |
| Reconnecting | StatusBadge yellow, attempt count display |

### 9.5 beforeunload Warning

```javascript
window.addEventListener('beforeunload', (e) => {
  if (isConnected) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

---

## 10. Animation System

### 10.1 CSS Keyframes

```css
/* Blink (status dot) */
@keyframes blink {
  0%  { opacity: 1; }
  50% { opacity: 0.4; }
  100%{ opacity: 1; }
}

/* Spin (loading) */
@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Slide up (transcript messages) */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Wave bars (speaking indicator) */
@keyframes wave-bar {
  0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
  50%      { transform: scaleY(1);   opacity: 1; }
}

/* Design system blink */
@keyframes ds-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
```

### 10.2 Canvas Animations

| Animation | Type | Parameters |
|-----------|------|-----------|
| Circle radius lerp | Continuous | `lerp(current, target, 0.08)` per frame |
| Circle color lerp | Continuous | `lerpColor(current, target, 0.16)` per frame |
| Pulse ring | Decay | `pulse -= 0.015` per frame, renders when > 0.1 |
| Circle velocity | Constant | Bounce at edges, ±0.1–0.25 px/frame |
| Particles | Constant | 30 dots, wrap at boundaries, ±0.15 px/frame |
| Dashed lines | Continuous | `dashOffset += 0.2` per frame |

### 10.3 Transition Catalog

| Element | Property | Duration | Easing | Trigger |
|---------|----------|----------|--------|---------|
| Primary button | transform, box-shadow | 200ms | spring | hover |
| Secondary button | all | 200ms | ease | hover |
| Icon button | background, color, transform | 200ms | ease | hover |
| Status badge | all | 400ms | ease | state change |
| Overlay panel | all | 400ms | spring | collapse/expand |
| Report card | transform, background | 200ms | ease | hover |
| Modal card | opacity, transform | 300ms | spring | show/hide |

### 10.4 Shimmer Effect (Primary Button)

```css
.primary-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.7s ease;
}

.primary-btn:hover::before {
  left: 200%;
}
```

---

## 11. Styling Architecture

### 11.1 Import Chain

```
dawayir-ds.css           ← Design system tokens + utilities
  └── App.css            ← Component styles + aliases
       └── App.jsx       ← Inline styles for dynamic values
```

### 11.2 Naming Convention

- Design system: `--ds-{category}-{variant}` (e.g., `--ds-cyan-500`, `--ds-text-body`)
- App aliases: `--{shortname}` (e.g., `--cyan`, `--bg-deep`)
- Classes: BEM-lite (`.status-badge.connected`, `.primary-btn.outline-btn`)
- Utility classes: `ds-` prefix (`.ds-grid`, `.ds-col-6`, `.ds-text-body`, `.ds-gap-4`)

### 11.3 Dark Mode

The app is **dark-only by design**. The entire color system is built for dark backgrounds:

```css
:root {
  /* All semantic colors are dark-mode native */
  --ds-bg-deep: #04040f;
  --ds-bg-mid: #080820;
  --ds-bg-surface: rgba(8, 8, 28, 0.82);
  --ds-text-primary: #f0f4ff;
}
```

No light mode tokens exist. The design rationale (from BRAND-IDENTITY.md):
> "Deep cosmic black creates the mental space metaphor. Light modes would break the immersive therapy environment."

### 11.4 Glassmorphism Pattern

Used in: Overlay panel, modals, transcript bubbles

```css
/* Level 1: Panel glass */
background: rgba(8, 8, 28, 0.82);
backdrop-filter: blur(28px) saturate(140%);
border: 1px solid rgba(0, 245, 255, 0.12);

/* Level 2: Card glass */
background: rgba(8, 8, 28, 0.82);
backdrop-filter: blur(28px) saturate(140%);

/* Level 3: Bubble glass */
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(16px) saturate(160%);
```

### 11.5 CSS Custom Properties Utility Classes

Available in `dawayir-ds.css`:

**Grid**: `.ds-grid`, `.ds-col-1` through `.ds-col-12`, `.ds-col-md-6`, `.ds-col-md-12`, `.ds-col-sm-12`

**Typography**: `.ds-text-nano` through `.ds-text-display`, `.ds-font-display`, `.ds-font-body`, `.ds-font-arabic`, `.ds-font-mono`, `.ds-weight-light` through `.ds-weight-black`

**Spacing**: `.ds-gap-0` through `.ds-gap-8`, `.ds-p-0` through `.ds-p-5`

---

## 12. Asset Optimization

### 12.1 Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;600;700;800;900&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
```

**Optimization recommendations**:
1. Use `font-display: swap` (already included via `&display=swap`)
2. Subset Arabic font to Egyptian Arabic characters
3. Preload critical fonts:
   ```html
   <link rel="preload" href="Outfit-800.woff2" as="font" type="font/woff2" crossorigin>
   <link rel="preload" href="Inter-400.woff2" as="font" type="font/woff2" crossorigin>
   ```

### 12.2 Images

| Asset | Format | Size | Usage |
|-------|--------|------|-------|
| `dawayir-logo-cognitive-trinity.svg` | SVG | ~2KB | Logo (scalable) |

**Recommendations**:
- SVG logo is optimal (vector, tiny)
- Camera captures: compress to JPEG quality 0.7 before sending
- No raster images needed (all visuals are canvas-rendered)

### 12.3 Audio Worklets

| File | Purpose |
|------|---------|
| `mic-processor.js` | Captures mic input, converts to 16-bit PCM |
| `pcm-player-processor.js` | Ring buffer for streaming PCM playback |

---

## 13. Performance Guide

### 13.1 Canvas Optimization

| Technique | Implementation |
|-----------|---------------|
| Frame throttling | 24 FPS target via timestamp check |
| Ref-based state | `nodesRef`, `particlesRef` avoid re-renders |
| `React.memo` | Canvas component is memoized |
| `forwardRef` | Imperative handle for external updates |
| Avoid `setState` in animation loop | All physics in refs |

### 13.2 Audio Optimization

| Technique | Implementation |
|-----------|---------------|
| `queueMicrotask` | Batch PCM chunk processing |
| Ring buffer | Worklet-based circular buffer for playback |
| Debounced drain detection | 500ms timeout after last audio |
| Single AudioContext | Shared speaker context |

### 13.3 React Optimization

| Technique | Implementation |
|-----------|---------------|
| `useMemo` | `filteredReports` in DashboardView |
| `useCallback` | Event handlers in App.jsx |
| `useRef` for high-frequency updates | Audio, WebSocket, VAD state |
| Conditional rendering | Views render only when active |
| `React.memo` | DawayirCanvas wrapped |

### 13.4 CSS Optimization

| Technique | Implementation |
|-----------|---------------|
| CSS Custom Properties | Single source of truth, no runtime JS for theming |
| `will-change` | Apply on animated elements |
| GPU compositing | `transform`, `opacity` for animations |
| `backdrop-filter` | Hardware-accelerated blur |
| Reduced motion | Zero-duration via CSS variables |

### 13.5 Network Optimization

| Technique | Implementation |
|-----------|---------------|
| WebSocket binary frames | Base64 audio streaming |
| Reconnect backoff | Exponential: 2s → 20s max, 12 attempts |
| `beforeunload` | Warn before losing session |

---

## 14. Testing Strategy

### 14.1 Unit Tests

| Component | Test Cases |
|-----------|-----------|
| ConnectProgressCard | Progress calculation, step rendering, edge cases (0, max) |
| OnboardingModal | Step navigation, skip action, last step label |
| EndSessionConfirmModal | Cancel/confirm callbacks, backdrop click |
| SettingsModal | Toggle persistence, language switch, localStorage |
| DashboardView | Loading state, empty state, search filter, sort |

### 14.2 Integration Tests

| Flow | Test Cases |
|------|-----------|
| Welcome → Setup → Live | View transitions, button states |
| Connect → Connected | Progress card updates, status badge |
| Live → End Session | Confirm modal, cleanup |
| Canvas updates | `updateNode` reflects visually |
| Transcript | Messages appear with correct roles |

### 14.3 Accessibility Tests

| Category | Tools |
|----------|-------|
| ARIA attributes | `@testing-library/jest-dom`, `toHaveAttribute` |
| Keyboard navigation | `userEvent.keyboard`, tab order verification |
| Color contrast | `axe-core` via `jest-axe` |
| Screen reader | Manual VoiceOver / NVDA testing |
| Reduced motion | `matchMedia` mock, verify 0ms durations |

### 14.4 Visual Regression Tests

| Target | Tool |
|--------|------|
| Component snapshots | Storybook + Chromatic |
| Full-page screenshots | Playwright |
| Canvas rendering | Canvas snapshot comparison |

### 14.5 Performance Tests

| Metric | Target | Tool |
|--------|--------|------|
| FCP | < 1.5s | Lighthouse |
| LCP | < 2.5s | Lighthouse |
| CLS | < 0.1 | Lighthouse |
| Canvas FPS | ≥ 24 FPS stable | Performance.now() profiling |
| Audio latency | < 200ms round-trip | Manual measurement |

---

## 15. Documentation

### 15.1 String Internationalization

All user-facing strings are in `STRINGS` object with `ar`/`en` keys:

```javascript
const STRINGS = {
  en: {
    brandName: 'Dawayir',
    brandSub: 'Your Living Mental Space',
    statusActive: 'Session Active',
    statusDisconnected: 'Disconnected',
    captureBtn: '📸 Visual Pulse Check',
    capture: '🎯 Capture',
    cancel: '✕ Cancel',
    initialState: 'Your Initial State',
    retake: '🔄 Retake',
    connectedMsg: '✨ Connected to Your Mental Space',
    connecting: 'Connecting',
    enterSpace: 'Enter Mental Space 🧠',
    enterSpaceVision: 'Enter Mental Space (with Vision)',
    agentSpeaking: 'Dawayir is speaking...',
    updateVisual: '📸 Update Visual Context',
    lookAtMe: '👁️ Look at me',
    endSession: 'End Session',
    hint: 'Speak freely and explore your mental space. ✨',
    liveChat: '💬 Live Conversation',
    memoryBank: 'Memory Bank',
    dashboardBtn: '💾',
  },
  ar: {
    brandName: 'دوائر',
    brandSub: 'مساحتك الذهنية الحية',
    // ... (full Arabic translations)
  }
};
```

### 15.2 Node Labels (Circle Names)

```javascript
const NODE_LABELS = {
  en: { 1: 'Awareness', 2: 'Knowledge', 3: 'Truth' },
  ar: { 1: 'الوعي', 2: 'العلم', 3: 'الحقيقة' }
};
```

### 15.3 Onboarding Steps

```javascript
const ONBOARDING_STEPS = {
  ar: [
    { title: 'الوعي', body: 'الدائرة دي بتمثل وعيك. هتتحرك وتغيّر شكلها مع الكلام والتنفس والحالة.' },
    { title: 'العلم', body: 'دي مساحة الفهم. كل ما تتكلم أكتر، دواير بتبني صورة أوضح عن اللي جواك.' },
    { title: 'الحقيقة', body: 'دي نقطة الوضوح. الهدف مش إجابة سريعة، الهدف إن الصورة ترتب نفسها.' },
  ],
  en: [
    { title: 'Awareness', body: 'This circle reflects awareness. It shifts with speech, pacing, and state.' },
    { title: 'Knowledge', body: 'This is the layer of understanding. The system builds context as you talk.' },
    { title: 'Truth', body: 'This is the clarity point. The goal is not speed, but a clearer inner map.' },
  ],
};
```

### 15.4 Connection Progress Steps

```javascript
const CONNECT_PROGRESS = {
  ar: [
    { key: 'network', label: 'الاتصال بالخادم' },
    { key: 'session', label: 'تأسيس الجلسة' },
    { key: 'voice',   label: 'تجهيز الصوت' },
    { key: 'ready',   label: 'جاهز' },
  ],
  en: [
    { key: 'network', label: 'Connecting to server' },
    { key: 'session', label: 'Establishing session' },
    { key: 'voice',   label: 'Preparing voice' },
    { key: 'ready',   label: 'Ready' },
  ],
};
```

---

## 16. Copy-Paste Code Reference

### 16.1 Complete Token-Aware Button Component

```jsx
function DsButton({ variant = 'primary', size = 'md', children, ...props }) {
  const classMap = {
    primary: 'primary-btn',
    secondary: 'secondary',
    outline: 'primary-btn outline-btn',
    icon: 'icon-btn',
    danger: 'secondary disconnect-btn',
  };

  const sizeMap = {
    sm: { padding: '6px 14px', fontSize: '12px' },
    md: { padding: '10px 20px', fontSize: '14px' },
    lg: { padding: '14px 32px', fontSize: '16px' },
  };

  return (
    <button
      className={classMap[variant]}
      style={variant !== 'icon' ? sizeMap[size] : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 16.2 Complete Status Badge Component

```jsx
function StatusBadge({ status, lang }) {
  const statusMap = {
    connected: { class: 'connected', text: { ar: 'متصل', en: 'Connected' } },
    connecting: { class: 'connecting', text: { ar: 'جاري الاتصال', en: 'Connecting' } },
    error: { class: 'error', text: { ar: 'خطأ', en: 'Error' } },
    disconnected: { class: 'disconnected', text: { ar: 'غير متصل', en: 'Disconnected' } },
  };

  const config = statusMap[status] || statusMap.disconnected;

  return (
    <span
      className={`status-badge ${config.class}`}
      role="status"
      aria-live="polite"
    >
      <span className="dot" aria-hidden="true" />
      {config.text[lang]}
    </span>
  );
}
```

### 16.3 Complete Glass Card Component

```jsx
function GlassCard({ level = 'panel', children, className = '', ...props }) {
  const levelClass = {
    panel: 'glass-panel',
    card: 'glass-card',
    bubble: 'glass-bubble',
  };

  return (
    <div className={`${levelClass[level]} ${className}`} {...props}>
      {children}
    </div>
  );
}
```

```css
.glass-panel {
  background: rgba(8, 8, 28, 0.82);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(0, 245, 255, 0.12);
  border-radius: var(--ds-radius-3xl);
  box-shadow: var(--ds-shadow-panel);
}

.glass-card {
  background: rgba(8, 8, 28, 0.82);
  backdrop-filter: blur(28px) saturate(140%);
  -webkit-backdrop-filter: blur(28px) saturate(140%);
  border: 1px solid rgba(0, 245, 255, 0.12);
  border-radius: var(--ds-radius-xl);
}

.glass-bubble {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-radius: var(--ds-radius-xl);
}
```

### 16.4 Complete Modal Shell

```jsx
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
```

### 16.5 Complete Accessible Canvas Wrapper

```jsx
function AccessibleCanvas({ canvasRef, lang, children }) {
  const description = lang === 'ar'
    ? 'ثلاث دوائر متحركة تمثل الوعي والعلم والحقيقة'
    : 'Three animated circles representing Awareness, Knowledge, and Truth';

  return (
    <div role="main">
      <DawayirCanvas ref={canvasRef} lang={lang} />
      <div
        role="img"
        aria-label={description}
        className="visually-hidden"
      />
    </div>
  );
}
```

### 16.6 useReducedMotion Hook

```jsx
function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mql.matches);
    const handler = (e) => setPrefersReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

### 16.7 useLocalStorage Hook

```jsx
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    try {
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch {
      // Silently fail
    }
  };

  return [storedValue, setValue];
}
```

### 16.8 Complete Skip Link

```jsx
{/* Add as first child of App */}
<a href="#main-content" className="skip-link">
  {lang === 'ar' ? 'تخطي إلى المحتوى' : 'Skip to main content'}
</a>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  padding: 8px 16px;
  background: var(--ds-cyan-500);
  color: var(--ds-text-inverse);
  border-radius: var(--ds-radius-md);
  font-weight: 600;
  z-index: var(--ds-z-max);
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 16px;
}
```

### 16.9 Dynamic Lang Attribute

```javascript
// Add to App useEffect on lang change
useEffect(() => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}, [lang]);
```

### 16.10 Canvas Touch Events

```jsx
// Add to DawayirCanvas alongside mouse events
const handleTouchStart = (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvasRef.current.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  const clicked = nodesRef.current.find(node => {
    const dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
    return dist < node.radius;
  });
  if (clicked) setDraggingNode(clicked.id);
};

const handleTouchMove = (e) => {
  if (!draggingNode) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvasRef.current.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  nodesRef.current = nodesRef.current.map(node =>
    node.id === draggingNode ? { ...node, x, y } : node
  );
};

const handleTouchEnd = () => setDraggingNode(null);

// Add to <canvas> element:
// onTouchStart={handleTouchStart}
// onTouchMove={handleTouchMove}
// onTouchEnd={handleTouchEnd}
```

---

## Appendix A: Token → CSS Variable Quick Reference

```
tokens.json path                    → CSS Variable
─────────────────────────────────────────────────
color.primitive.cyan.500            → --ds-cyan-500
color.primitive.green.500           → --ds-green-500
color.primitive.magenta.400         → --ds-magenta-400
color.primitive.gold.400            → --ds-gold-400
color.primitive.red.500             → --ds-red-500
color.primitive.neutral.50          → --ds-neutral-50
color.primitive.neutral.800         → --ds-neutral-800
color.primitive.neutral.900         → --ds-neutral-900
color.semantic.brand.primary        → --ds-brand-primary
color.semantic.background.deep      → --ds-bg-deep
color.semantic.background.mid       → --ds-bg-mid
color.semantic.background.surface   → --ds-bg-surface
color.semantic.background.elevated  → --ds-bg-elevated
color.semantic.background.hover     → --ds-bg-hover
color.semantic.background.active    → --ds-bg-active
color.semantic.text.primary         → --ds-text-primary
color.semantic.text.secondary       → --ds-text-secondary
color.semantic.text.disabled        → --ds-text-disabled
color.semantic.border.default       → --ds-border-default
color.semantic.border.focus         → --ds-border-focus
color.semantic.status.success       → --ds-status-success
color.semantic.status.warning       → --ds-status-warning
color.semantic.status.error         → --ds-status-error
color.circle.awareness.default      → --ds-circle-awareness
color.circle.knowledge.default      → --ds-circle-knowledge
color.circle.truth.default          → --ds-circle-truth
color.emotion.calm                  → --ds-emotion-calm
color.emotion.anxious               → --ds-emotion-anxious
color.emotion.joyful                → --ds-emotion-joyful
color.emotion.sad                   → --ds-emotion-sad
color.gradient.brand-text           → --ds-gradient-brand
color.gradient.cta-primary          → --ds-gradient-cta
typography.fontFamily.display       → --ds-font-display
typography.fontFamily.body          → --ds-font-body
typography.fontFamily.arabic        → --ds-font-arabic
typography.scale.body.fontSize      → --ds-text-body
typography.scale.heading.fontSize   → --ds-text-heading
spacing.4                           → --ds-space-4
radius.lg                           → --ds-radius-lg
shadow.panel                        → --ds-shadow-panel
motion.duration.normal              → --ds-duration-normal
motion.easing.spring                → --ds-ease-spring
breakpoint.md                       → 768px (media query only)
zIndex.modal                        → --ds-z-modal
```

---

## Appendix B: Component → CSS Class Map

| Component | Primary Class | Variant Classes |
|-----------|--------------|-----------------|
| App Shell | `.App` | — |
| Canvas | `canvas` (element) | — |
| Overlay Panel | `.overlay` | `.overlay-collapsed`, `.overlay-dashboard` |
| Status Badge | `.status-badge` | `.connected`, `.connecting`, `.error`, `.disconnected` |
| Primary Button | `.primary-btn` | `.outline-btn`, `.secure-link` |
| Secondary Button | `.secondary` | `.is-active`, `.disconnect-btn` |
| Icon Button | `.icon-btn` | — |
| Modal Backdrop | `.modal-backdrop` | — |
| Modal Card | `.modal-card` | `.settings-card`, `.onboarding-card` |
| Progress Card | `.connect-progress-card` | — |
| Transcript | `.transcript-overlay` | — |
| Message Bubble | `.transcript-text` | `.transcript-agent` |
| Visualizer | `.visualizer` | `.speaking` |
| Bio Badge | `.bio-badge` | `.bio-calm`, `.bio-stressed` |
| AI State | `.ai-state-bar` | — |
| Dashboard | `.dashboard-view` | — |
| Report Card | `.report-card` | — |
| Command Input | `.command-input` | `.command-input-hidden` |
| Circle Controls | `.circle-controls` | `.circle-controls-row`, `.legend-only` |
| Camera | `.camera-setup` | `.video-container`, `.video-container-mini` |
| Error Message | `.error-message` | — |
| Loader | `.loader` | — |
| Empty State | `.empty-state-card` | — |

---

## Appendix C: Implementation Checklist

### Critical WCAG Fixes (Do First)
- [ ] Add `role="img"` + `aria-label` to canvas element
- [ ] Add `<h1 className="visually-hidden">` to page
- [ ] Add skip-to-main link
- [ ] Set `document.documentElement.lang` dynamically
- [ ] Convert font sizes from `px` to `rem`
- [ ] Add touch events to DawayirCanvas
- [ ] Fix section-label contrast (opacity 0.6 → 0.85)

### Component Extraction (Recommended)
- [ ] Extract StatusBadge from App.jsx
- [ ] Extract Visualizer from App.jsx
- [ ] Extract CircleControls from App.jsx
- [ ] Extract CommandInput from App.jsx
- [ ] Extract BrandHeader from App.jsx
- [ ] Extract TranscriptOverlay from App.jsx

### Performance Optimization
- [ ] Preload critical fonts
- [ ] Add `will-change: transform` to animated elements
- [ ] Implement code splitting for DashboardView
- [ ] Add `loading="lazy"` to non-critical images
- [ ] Profile canvas with 24 FPS target

### Testing Setup
- [ ] Add Jest + React Testing Library
- [ ] Add jest-axe for accessibility
- [ ] Add Playwright for E2E
- [ ] Create Storybook stories for each component

---

*Generated by Design-to-Code Translation — Vercel Design Engineering*
*Source: Dawayir Design System v1.0.0*
*Date: 2026-03-04*
