# Dawayir Design System v1.0.0

> A comprehensive design system for **Dawayir** — a real-time Arabic voice conversation agent with interactive emotional circles.

**Design Philosophy**: Dark-first, neon-accented, glassmorphic interfaces optimized for Arabic-English bilingual experiences and emotional feedback visualization.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Grid System](#4-grid-system)
5. [Spacing System](#5-spacing-system)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Motion & Animation](#7-motion--animation)
8. [Components (30+)](#8-components)
9. [Patterns](#9-patterns)
10. [Accessibility](#10-accessibility)
11. [Do's and Don'ts](#11-dos-and-donts)
12. [Developer Guide](#12-developer-guide)

---

## 1. Design Principles

### Core Principles

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Emotional Clarity** | Every visual element maps to an emotional state. Color, motion, and scale communicate feeling before cognition. |
| 2 | **Arabic-First Bilingual** | Arabic is the primary language. All layouts support RTL. English serves technical and display purposes. |
| 3 | **Dark Canvas** | Deep dark backgrounds allow neon accents to guide focus. The canvas IS the interface — UI overlays it. |
| 4 | **Minimal Friction** | Voice-first interaction. UI elements stay out of the way. One tap, one action. |
| 5 | **Living Feedback** | The interface breathes — circles pulse, colors shift, particles float. Static = dead. |
| 6 | **Glassmorphism** | Panels float above the canvas with blur, transparency, and subtle borders. Never opaque. |
| 7 | **Progressive Disclosure** | Show only what's needed. Complexity reveals on demand. |
| 8 | **Accessible by Default** | 4.5:1 contrast ratios. Focus rings. Screen-reader labels. Reduced motion support. |

---

## 2. Color System

### 2.1 Color Primitives

Each color has a 10-step scale (50–900). Use primitives only in token definitions, never directly in components.

#### Cyan (Brand Primary)
| Step | Hex | Swatch | Usage |
|------|-----|--------|-------|
| 50 | `#e0fcff` | ![](https://via.placeholder.com/20/e0fcff/e0fcff) | Tinted backgrounds |
| 100 | `#b3f6ff` | ![](https://via.placeholder.com/20/b3f6ff/b3f6ff) | Light accents |
| 200 | `#80efff` | ![](https://via.placeholder.com/20/80efff/80efff) | Hover states |
| 300 | `#4de8ff` | ![](https://via.placeholder.com/20/4de8ff/4de8ff) | Active elements |
| 400 | `#1ae1ff` | ![](https://via.placeholder.com/20/1ae1ff/1ae1ff) | Bright highlights |
| **500** | **`#00f5ff`** | ![](https://via.placeholder.com/20/00f5ff/00f5ff) | **Primary brand** |
| 600 | `#00CED1` | ![](https://via.placeholder.com/20/00CED1/00CED1) | Calm emotion |
| 700 | `#00A3A6` | ![](https://via.placeholder.com/20/00A3A6/00A3A6) | Muted accent |
| 800 | `#00787A` | ![](https://via.placeholder.com/20/00787A/00787A) | Dark accent |
| 900 | `#004D4F` | ![](https://via.placeholder.com/20/004D4F/004D4F) | Darkest |

#### Green (Success)
| Step | Hex | Core Usage |
|------|-----|------------|
| **500** | **`#00ff94`** | Connected state, success |
| 600 | `#20d866` | CTA gradient end |

#### Magenta (Accent)
| Step | Hex | Core Usage |
|------|-----|------------|
| **400** | **`#FF00E5`** | Truth circle |
| **500** | **`#b600ff`** | Secondary brand |

#### Gold (Warning)
| Step | Hex | Core Usage |
|------|-----|------------|
| **400** | **`#ffd166`** | Connecting state, warning |

#### Red (Error)
| Step | Hex | Core Usage |
|------|-----|------------|
| **500** | **`#ff5f6d`** | Error states |
| 400 | `#ff6b6b` | Disconnect button |
| 300 | `#ff8787` | Error messages |

#### Neutral
| Step | Hex | Core Usage |
|------|-----|------------|
| **50** | **`#f0f4ff`** | Primary text |
| 100 | `#c8d2f0` | Secondary text base |
| **800** | **`#080820`** | Mid background |
| **900** | **`#04040f`** | Deep background (app root) |

### 2.2 Semantic Color Tokens

Always reference semantic tokens in components, never primitives.

```css
/* Backgrounds */
--ds-bg-deep:     #04040f       /* App root */
--ds-bg-mid:      #080820       /* Canvas mid-layer */
--ds-bg-surface:  rgba(8,8,28,0.82)   /* Panels */
--ds-bg-elevated: rgba(255,255,255,0.04) /* Cards, buttons */
--ds-bg-hover:    rgba(0,245,255,0.08)   /* Hover state */
--ds-bg-active:   rgba(0,245,255,0.15)   /* Active/pressed */
--ds-bg-overlay:  rgba(0,0,0,0.5)        /* Backdrop overlays */

/* Text */
--ds-text-primary:   #f0f4ff
--ds-text-secondary: rgba(200,210,240,0.55)
--ds-text-disabled:  rgba(200,210,240,0.3)
--ds-text-inverse:   #030814
--ds-text-link:      #00f5ff

/* Borders */
--ds-border-default: rgba(0,245,255,0.12)
--ds-border-hover:   rgba(0,245,255,0.3)
--ds-border-focus:   #00f5ff
```

### 2.3 Contrast Ratios (WCAG 2.1 AA)

| Pair | Ratio | Pass |
|------|-------|------|
| `--ds-text-primary` on `--ds-bg-deep` | 15.8:1 | AAA |
| `--ds-text-secondary` on `--ds-bg-deep` | 5.2:1 | AA |
| `--ds-text-inverse` on `--ds-gradient-cta` | 11.4:1 | AAA |
| `--ds-status-error` on `--ds-bg-deep` | 6.1:1 | AA |
| `--ds-status-success` on `--ds-bg-deep` | 12.3:1 | AAA |

### 2.4 High Contrast Mode

When `prefers-contrast: high` is active:
- Secondary text opacity: 0.55 → 0.85
- Border opacity: 0.12 → 0.4
- Elevated background: 0.04 → 0.1

### 2.5 Circle Domain Colors

| Circle | Arabic | Color | Hex | Glow |
|--------|--------|-------|-----|------|
| Awareness | وعي | Cyan | `#00F5FF` | `rgba(0,245,255,0.15)` |
| Knowledge | علم | Green | `#00FF41` | `rgba(0,255,65,0.15)` |
| Truth | حقيقة | Magenta | `#FF00E5` | `rgba(255,0,229,0.15)` |

### 2.6 Emotion Color Map

| Emotion | Hex | When |
|---------|-----|------|
| Calm | `#00CED1` | Default/relaxed state |
| Anxious | `#FF6B35` | Stress detected |
| Joyful | `#FFD700` | Happiness/excitement |
| Sad | `#4169E1` | Melancholy detected |
| Stressed | `#ff5e5e` | High tension |

---

## 3. Typography

### 3.1 Font Stack

| Font | Weights | Role |
|------|---------|------|
| **Outfit** | 400, 600, 700, 800, 900 | Display, headings, brand, buttons |
| **Inter** | 300, 400, 500, 600 | Body text, secondary content |
| **Noto Kufi Arabic** | 400, 600, 700 | Arabic text, bilingual labels |
| **JetBrains Mono** | 400 | Code snippets, debug info |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Outfit:wght@400;600;700;800;900&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap');
```

### 3.2 Type Scale (9 Levels)

| Level | Token | Size | Line Height | Letter Spacing | Usage |
|-------|-------|------|-------------|----------------|-------|
| 1 | `nano` | 9px | 12px | 0.8px | Metric labels, tiny annotations |
| 2 | `micro` | 10px | 14px | 0.5px | Footer info, smallest labels |
| 3 | `caption` | 11px | 16px | 0.3px | Timestamps, report dates |
| 4 | `small` | 12px | 18px | 0.2px | Status badges, section labels |
| 5 | `body` | 14px | 22px | 0px | Default body, buttons, lists |
| 6 | `lead` | 16px | 24px | -0.1px | Primary CTA text, large body |
| 7 | `title` | 20px | 28px | -0.3px | Section headers, dashboard |
| 8 | `heading` | 26px | 34px | -0.5px | Brand name, major headings |
| 9 | `display` | 36px | 44px | -0.8px | Hero text, splash screen |

### 3.3 Responsive Typography

| Level | Desktop | Mobile (≤480px) |
|-------|---------|-----------------|
| Display | 36px | 28px |
| Heading | 26px | 22px |
| Lead | 16px | 14px |
| Body–Nano | No change | No change |

### 3.4 Arabic Typography Rules

```css
.ds-font-arabic {
  font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
  direction: rtl;
  text-align: right;
  line-height: 1.7;          /* Arabic needs more line height */
  letter-spacing: 0.3px;     /* Slight tracking for readability */
}
```

### 3.5 Font Weight Usage

| Weight | Value | When to Use |
|--------|-------|-------------|
| Light | 300 | Decorative large text only |
| Regular | 400 | Body text, Arabic content |
| Medium | 500 | Emphasized body, form labels |
| Semibold | 600 | Section headers, active tabs, card titles |
| Bold | 700 | Warnings, strong emphasis |
| Extrabold | 800 | Primary buttons, brand elements |
| Black | 900 | Brand name "Dawayir" only |

---

## 4. Grid System

### 4.1 12-Column Grid

```
┌─────────────────────────────────────────────────────────────┐
│ margin │  1  2  3  4  5  6  7  8  9  10  11  12  │ margin │
│  32px  │  ←────── gutter: 16px between ──────→    │  32px  │
│        │        max-width: 1440px                 │        │
└─────────────────────────────────────────────────────────────┘
```

| Property | Desktop | Tablet (≤768px) | Mobile (≤480px) |
|----------|---------|-----------------|-----------------|
| Columns | 12 | 12 | 12 |
| Gutter | 16px | 12px | 12px |
| Margin | 32px | 24px | 16px |
| Max Width | 1440px | 100% | 100% |

### 4.2 Common Layouts

```
Desktop Sidebar:
┌──────────┬──────────────────────────────┐
│  col-3   │           col-9              │
│  Panel   │          Canvas              │
│  360px   │        remaining             │
└──────────┴──────────────────────────────┘

Desktop Dashboard:
┌──────┬──────┬──────┬──────┐
│ col-3│ col-3│ col-3│ col-3│
│ Card │ Card │ Card │ Card │
└──────┴──────┴──────┴──────┘

Mobile:
┌────────────────────────┐
│        col-12          │
│        Canvas          │
│                        │
├────────────────────────┤
│        col-12          │
│    Bottom Sheet        │
└────────────────────────┘
```

### 4.3 CSS Usage

```css
.ds-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--ds-grid-gutter);
  max-width: var(--ds-grid-max-width);
  margin-inline: auto;
  padding-inline: var(--ds-grid-margin);
}

.ds-col-3  { grid-column: span 3; }
.ds-col-6  { grid-column: span 6; }
.ds-col-12 { grid-column: span 12; }
```

---

## 5. Spacing System

### 5.1 8px Base Scale

All spacing derives from an 8px base unit with a 4px half-step.

| Token | Value | Visual | Usage |
|-------|-------|--------|-------|
| `space-0` | 0px | | Reset |
| `space-1` | 4px | `▪` | Icon gaps, thin dividers |
| `space-2` | 8px | `▪▪` | Inner component spacing |
| `space-3` | 12px | `▪▪▪` | Standard gap, button padding |
| `space-4` | 16px | `▪▪▪▪` | Section gaps, list spacing |
| `space-5` | 20px | `▪▪▪▪▪` | Panel padding (mobile) |
| `space-6` | 24px | `▪▪▪▪▪▪` | Header margins, section breaks |
| `space-7` | 28px | `▪▪▪▪▪▪▪` | Panel padding (desktop) |
| `space-8` | 32px | `▪▪▪▪▪▪▪▪` | Overlay top padding |
| `space-10` | 40px | `▪▪▪▪▪▪▪▪▪▪` | Major separators |
| `space-12` | 48px | `▪▪▪▪▪▪▪▪▪▪▪▪` | Page-level spacing |
| `space-16` | 64px | | Hero spacing |
| `space-20` | 80px | | Landmark spacing |

### 5.2 Spacing Decision Tree

```
Is it inside a component?
  └─ Yes → space-1 (4px) to space-3 (12px)
Is it between sibling components?
  └─ Yes → space-3 (12px) to space-5 (20px)
Is it between sections?
  └─ Yes → space-6 (24px) to space-8 (32px)
Is it page-level padding?
  └─ Yes → space-10 (40px) to space-16 (64px)
```

---

## 6. Shadows & Elevation

### 6.1 Elevation Scale

| Level | Token | Value | Usage |
|-------|-------|-------|-------|
| 0 | `shadow-none` | `none` | Flat elements |
| 1 | `shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | Cards, buttons |
| 2 | `shadow-md` | `0 4px 20px rgba(0,0,0,0.4)` | Dropdowns, tooltips |
| 3 | `shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` | Modals, dialogs |
| 4 | `shadow-xl` | `0 24px 48px rgba(0,0,0,0.7)` | Overlay panels |
| G | `shadow-panel` | Cyan glow + XL shadow | Main sidebar panel |

### 6.2 Glow Effects

| Token | Color | Usage |
|-------|-------|-------|
| `glow-cyan` | Cyan 30% | Hover highlights |
| `glow-cyan-strong` | Cyan 40% | Active/pressed |
| `glow-green` | Green 30% | Success indicators |
| `glow-red` | Red 30% | Error indicators |

### 6.3 Glassmorphism Recipe

```css
.glass-panel {
  background: var(--ds-bg-surface);        /* rgba(8,8,28,0.82) */
  backdrop-filter: blur(var(--ds-blur-xl)); /* 28px */
  -webkit-backdrop-filter: blur(var(--ds-blur-xl));
  border: 1px solid var(--ds-border-default);
  box-shadow: var(--ds-shadow-panel);
}
```

---

## 7. Motion & Animation

### 7.1 Duration Tokens

| Token | Duration | Usage |
|-------|----------|-------|
| `instant` | 0ms | Immediate state changes |
| `fast` | 120ms | Micro-interactions (hover) |
| `normal` | 200ms | Standard transitions |
| `moderate` | 300ms | Slide animations |
| `slow` | 400ms | CTA hover transforms |
| `slower` | 600ms | Panel entry/exit |
| `deliberate` | 800ms | Spinner rotation |

### 7.2 Easing Curves

| Token | Value | Usage |
|-------|-------|-------|
| `ease-default` | `ease` | General purpose |
| `ease-in` | `ease-in` | Exit animations |
| `ease-out` | `ease-out` | Entry animations |
| `ease-spring` | `cubic-bezier(0.16,1,0.3,1)` | Bouncy hover, CTA interactions |
| `ease-smooth` | `cubic-bezier(0.4,0,0.2,1)` | Smooth material transitions |

### 7.3 Named Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `ds-blink` | 2s infinite | — | Connected status dot |
| `ds-spin` | 0.8s linear infinite | — | Loading spinner |
| `ds-pulse` | 1.5s ease-in-out infinite | — | Loading text |
| `ds-wave` | 1.2s ease-in-out infinite | — | Audio wave bars |
| `ds-slide-up` | 0.3s ease-out | — | Transcript entries |
| `ds-slide-in` | 0.6s spring | — | Panel entry |
| `ds-fade-in` | 0.3s ease | — | General fade |
| `ds-scale-in` | 0.3s ease | — | Scale + fade |
| `ds-pulse-stress` | 1s infinite alternate | — | Stressed bio dot |
| `ds-shimmer` | 2s linear infinite | — | Skeleton loading |

### 7.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* All durations set to 0ms */
  /* Animations: prefer opacity-only transitions */
  /* Circle animations: reduce to slow fade */
}
```

---

## 8. Components

### Component Documentation Format

Each component includes:
- **Anatomy** — structural breakdown
- **States** — all possible visual states
- **Tokens** — design tokens used
- **Accessibility** — ARIA, keyboard, focus
- **Code** — CSS/JSX specification
- **Do's/Don'ts** — usage guidelines

---

### 8.1 Button — Primary

**Anatomy:**
```
┌─────────────────────────────────┐
│  [Icon?]  Label Text  [Spinner?] │
│         18px × 24px padding      │
└─────────────────────────────────┘
```

**States:**

| State | Background | Transform | Shadow |
|-------|-----------|-----------|--------|
| Default | `--ds-gradient-cta` | none | none |
| Hover | `--ds-gradient-cta-hover` | `translateY(-2px)` | `--ds-glow-cyan` |
| Active | `--ds-gradient-cta` | `translateY(0) scale(0.98)` | none |
| Disabled | `opacity: 0.4` | none | none |
| Loading | `--ds-gradient-cta` | none | none + spinner |

**Tokens:**
```css
.ds-btn-primary {
  padding: var(--ds-space-5) var(--ds-space-6);     /* 18px 24px */
  border-radius: var(--ds-radius-lg);                /* 16px */
  font-family: var(--ds-font-display);
  font-size: var(--ds-text-lead);                    /* 16px */
  font-weight: var(--ds-weight-extrabold);           /* 800 */
  background: var(--ds-gradient-cta);
  color: var(--ds-text-inverse);
  border: none;
  cursor: pointer;
  transition: all var(--ds-duration-slow) var(--ds-ease-spring);
}
```

**Accessibility:**
- `role="button"` when not `<button>`
- `aria-disabled="true"` when disabled (don't remove from tab order)
- `aria-busy="true"` during loading
- Focus ring: `2px solid var(--ds-border-focus)` with 2px offset
- Min touch target: 44×44px

---

### 8.2 Button — Secondary

**States:**

| State | Background | Border |
|-------|-----------|--------|
| Default | `--ds-bg-elevated` | `--ds-border-default` |
| Hover | `--ds-bg-hover` | `--ds-border-hover` |
| Active | `--ds-bg-active` | `--ds-border-focus` |

**Tokens:**
```css
.ds-btn-secondary {
  padding: var(--ds-space-3) var(--ds-space-5);      /* 13px 20px */
  border-radius: var(--ds-radius-lg);                /* 16px */
  font-size: var(--ds-text-body);                    /* 14px */
  font-weight: var(--ds-weight-semibold);            /* 600 */
  background: var(--ds-bg-elevated);
  color: var(--ds-text-primary);
  border: 1px solid var(--ds-border-default);
  transition: all var(--ds-duration-normal);
}
```

---

### 8.3 Button — Outline

```css
.ds-btn-outline {
  padding: var(--ds-space-5) var(--ds-space-6);
  border-radius: var(--ds-radius-lg);
  font-family: var(--ds-font-display);
  font-size: var(--ds-text-lead);
  font-weight: var(--ds-weight-extrabold);
  background: var(--ds-bg-elevated);
  color: var(--ds-brand-primary);
  border: 1px solid var(--ds-border-default);
}
```

---

### 8.4 Button — Destructive

```css
.ds-btn-destructive {
  padding: var(--ds-space-3) var(--ds-space-5);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-status-error-bg);
  color: var(--ds-red-400);
  border: 1px solid var(--ds-status-error-border);
}
.ds-btn-destructive:hover {
  background: rgba(255, 77, 77, 0.12);
}
```

---

### 8.5 Button — Icon

**Anatomy:**
```
┌──────┐
│  🎤  │  38 × 38px
└──────┘
```

```css
.ds-btn-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--ds-radius-md);                /* 12px */
  background: var(--ds-bg-elevated);
  border: 1px solid var(--ds-border-default);
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--ds-duration-normal);
}
.ds-btn-icon:hover {
  background: var(--ds-bg-hover);
  transform: scale(1.05);
}
```

---

### 8.6 Button — Mini

```css
.ds-btn-mini {
  padding: var(--ds-space-2) var(--ds-space-3);      /* 9px 12px */
  border-radius: var(--ds-radius-md);                /* 10px */
  font-size: var(--ds-text-small);                   /* 13px */
  font-weight: var(--ds-weight-bold);                /* 700 */
}
```

---

### 8.7 Panel (Glassmorphic Overlay)

**Anatomy:**
```
┌──────────────────────────┐
│ ┌──────────────────────┐ │  ← padding: 32px 28px
│ │   Brand Header       │ │
│ ├──────────────────────┤ │  ← divider (border-bottom)
│ │   Status Badge       │ │
│ │   Content Area       │ │
│ │   ...                │ │
│ │   Action Buttons     │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

**States:**

| State | Width | Position |
|-------|-------|----------|
| Desktop | 360px | Absolute left, full height |
| Tablet | 100vw | Bottom sheet, max-height 60vh |
| Mobile | 100vw | Bottom sheet, rounded top corners |

**Tokens:**
```css
.ds-panel {
  width: 360px;
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--ds-z-dropdown);
  background: var(--ds-bg-surface);
  backdrop-filter: blur(var(--ds-blur-xl));
  -webkit-backdrop-filter: blur(var(--ds-blur-xl));
  border-right: 1px solid var(--ds-border-default);
  box-shadow: var(--ds-shadow-panel);
  padding: var(--ds-space-8) var(--ds-space-7) var(--ds-space-7);
  overflow-y: auto;
  animation: ds-slide-in var(--ds-duration-slower) var(--ds-ease-spring);
}

@media (max-width: 768px) {
  .ds-panel {
    width: 100vw;
    height: auto;
    max-height: 60vh;
    top: auto;
    bottom: 0;
    border-radius: var(--ds-radius-2xl) var(--ds-radius-2xl) 0 0;
    padding: var(--ds-space-5);
  }
}
```

**Scrollbar:**
```css
.ds-panel::-webkit-scrollbar {
  width: 3px;
}
.ds-panel::-webkit-scrollbar-thumb {
  background: var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}
```

**Accessibility:**
- `role="dialog"` or `role="complementary"`
- `aria-label="لوحة التحكم"` (Control Panel)
- Trap focus when modal
- Escape to close

---

### 8.8 Brand Header

**Anatomy:**
```
┌───────────────────────┐
│  DAWAYIR              │  ← Outfit 900, 26px, gradient text
│  نظام المحادثة الذكي  │  ← Noto Kufi Arabic 400, 13px
└───────────────────────┘
```

```css
.ds-brand-header {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  padding-bottom: var(--ds-space-6);
  margin-bottom: var(--ds-space-6);
  border-bottom: 1px solid var(--ds-border-subtle);
}

.ds-brand-name {
  font-family: var(--ds-font-display);
  font-weight: var(--ds-weight-black);
  font-size: var(--ds-text-heading);
  letter-spacing: var(--ds-text-heading-ls);
  background: var(--ds-gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ds-brand-subtitle {
  font-family: var(--ds-font-arabic);
  font-size: var(--ds-text-small);
  color: var(--ds-text-secondary);
  direction: rtl;
  letter-spacing: 0.3px;
}
```

---

### 8.9 Status Badge

**Anatomy:**
```
┌───────────────────┐
│  ● Connected      │  ← dot + label
└───────────────────┘
```

**States:**

| State | Dot Color | Label Color | Background |
|-------|-----------|-------------|------------|
| Connected | `--ds-status-success` | `--ds-status-success` | `--ds-status-success-bg` |
| Connecting | `--ds-status-warning` | `--ds-status-warning` | `--ds-status-warning-bg` |
| Error | `--ds-status-error` | `--ds-status-error` | `--ds-status-error-bg` |
| Disconnected | `#555` | `--ds-text-secondary` | `--ds-bg-elevated` |

```css
.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: var(--ds-text-small);
  font-weight: var(--ds-weight-semibold);
  padding: 5px var(--ds-space-3);
  border-radius: var(--ds-radius-full);
  width: fit-content;
}

.ds-badge__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--ds-radius-circle);
}

.ds-badge--connected {
  color: var(--ds-status-success);
  background: var(--ds-status-success-bg);
  border: 1px solid var(--ds-status-success-border);
}
.ds-badge--connected .ds-badge__dot {
  background: var(--ds-status-success);
  animation: ds-blink 2s infinite;
}
```

**Accessibility:**
- `role="status"` + `aria-live="polite"`
- Screen reader: "Connection status: connected"

---

### 8.10 Audio Visualizer

**Anatomy:**
```
┌─────────────────────────────────┐
│  ▎▌█▎▌▎▌█▌▎▌▎█▌▎▌▎▌█▎▌▎▌█▎▌  │  ← frequency bars
│            72px height          │
└─────────────────────────────────┘
```

```css
.ds-visualizer {
  width: 100%;
  height: 72px;
  border-radius: var(--ds-radius-lg);
  background: var(--ds-bg-overlay);
  box-shadow: var(--ds-shadow-inset);
  overflow: hidden;
}

.ds-visualizer--active {
  background: rgba(0, 245, 255, 0.1);
}
```

---

### 8.11 Transcript Bubble

**Anatomy:**
```
User bubble:                    Agent bubble:
         ┌──────────────┐     ┌──────────────┐
         │ Arabic text   │     │ Arabic text   │
         │         20 20 │     │ 20 20         │
         └──────────20 4─┘     └─4 20──────────┘
                      ▶                 ◀
```

**States:**

| Variant | Alignment | Background | Radius |
|---------|-----------|-----------|--------|
| User | Right | `rgba(12,12,35,0.55)` | `20px 20px 4px 20px` |
| Agent | Left | `rgba(0,245,255,0.1)` | `20px 20px 20px 4px` |

```css
.ds-bubble {
  padding: var(--ds-space-3) var(--ds-space-5);      /* 14px 18px */
  backdrop-filter: blur(var(--ds-blur-lg)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--ds-blur-lg)) saturate(160%);
  direction: rtl;
  font-family: var(--ds-font-arabic);
  font-size: var(--ds-text-body);                    /* 15px */
  line-height: 1.5;
  color: var(--ds-text-primary);
  animation: ds-slide-up var(--ds-duration-moderate) var(--ds-ease-out);
}

.ds-bubble--user {
  background: rgba(12, 12, 35, 0.55);
  border-radius: var(--ds-radius-xl) var(--ds-radius-xl) var(--ds-radius-xs) var(--ds-radius-xl);
  margin-left: auto;
  max-width: 85%;
}

.ds-bubble--agent {
  background: rgba(0, 245, 255, 0.1);
  border-radius: var(--ds-radius-xl) var(--ds-radius-xl) var(--ds-radius-xl) var(--ds-radius-xs);
  margin-right: auto;
  max-width: 85%;
}
```

**Accessibility:**
- `role="log"` on transcript container
- `aria-live="polite"` for new messages
- Each bubble: `role="listitem"`

---

### 8.12 Transcript Overlay

```css
.ds-transcript {
  position: absolute;
  bottom: 30px;
  right: 30px;
  width: 400px;
  max-height: 450px;
  overflow-y: auto;
  z-index: var(--ds-z-max);
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-4);
}

@media (max-width: 768px) {
  .ds-transcript {
    width: calc(100vw - 40px);
    right: 20px;
    max-height: 140px;
  }
}
```

---

### 8.13 Card — Report

**Anatomy:**
```
┌──────────────────────────┐
│  📊  Report Name         │  ← icon 22px + title 14px semibold
│       March 4, 2026      │  ← date 11px secondary
└──────────────────────────┘
```

**States:**

| State | Transform | Background |
|-------|-----------|-----------|
| Default | none | `--ds-bg-elevated` |
| Hover | `translateX(4px)` | `rgba(0,245,255,0.05)` |

```css
.ds-card {
  padding: var(--ds-space-3);                        /* 14px */
  background: var(--ds-bg-elevated);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-lg);                /* 14px */
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  cursor: pointer;
  transition: all var(--ds-duration-moderate) var(--ds-ease-smooth);
}

.ds-card:hover {
  background: rgba(0, 245, 255, 0.05);
  transform: translateX(4px);
}

.ds-card__icon {
  font-size: 22px;
  flex-shrink: 0;
}

.ds-card__title {
  font-weight: var(--ds-weight-semibold);
  font-size: var(--ds-text-body);
}

.ds-card__subtitle {
  font-size: var(--ds-text-caption);
  color: var(--ds-text-secondary);
  margin-top: 2px;
}
```

---

### 8.14 Metric Display

**Anatomy:**
```
┌──────────┐
│ COHERENCE│  ← label: 9px, uppercase, 0.8px tracking
│   0.85   │  ← value: extrabold, colored
└──────────┘
```

```css
.ds-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--ds-space-1) 0;
}

.ds-metric__label {
  font-size: var(--ds-text-nano);
  font-weight: var(--ds-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.7;
  color: var(--ds-text-secondary);
}

.ds-metric__value {
  font-weight: var(--ds-weight-extrabold);
  color: var(--ds-brand-primary);
}

.ds-metric__value--positive {
  color: var(--ds-status-success);
  text-shadow: var(--ds-glow-green);
}

.ds-metric__value--negative {
  color: var(--ds-status-error);
  text-shadow: var(--ds-glow-red);
}
```

---

### 8.15 Cognitive Metrics Bar

```css
.ds-metrics-bar {
  display: flex;
  padding: var(--ds-space-3);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--ds-radius-lg);
  backdrop-filter: blur(var(--ds-blur-md));
  gap: var(--ds-space-2);
}

.ds-metrics-bar .ds-metric {
  flex: 1;
  text-align: center;
}
```

---

### 8.16 Circle Control

**Anatomy:**
```
     وعي            علم           حقيقة
   ┌─────┐        ┌─────┐       ┌─────┐
   │ ▲ ▼ │        │ ▲ ▼ │       │ ▲ ▼ │
   └─────┘        └─────┘       └─────┘
     36×36          36×36         36×36
```

```css
.ds-circle-controls {
  display: flex;
  justify-content: center;
  gap: var(--ds-space-4);
  margin-bottom: var(--ds-space-3);
}

.ds-circle-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ds-space-1);
}

.ds-circle-control__label {
  font-family: var(--ds-font-arabic);
  font-size: var(--ds-text-small);
  font-weight: var(--ds-weight-semibold);
}

.ds-circle-control__btn {
  width: 36px;
  height: 36px;
  border-radius: var(--ds-radius-circle);
  border: 1px solid var(--ds-border-default);
  background: var(--ds-bg-surface);
  color: var(--ds-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--ds-duration-normal);
}

.ds-circle-control__btn:hover {
  background: var(--ds-bg-active);
  border-color: var(--ds-brand-primary);
  box-shadow: var(--ds-glow-cyan);
}
```

---

### 8.17 Video Container

**Anatomy:**
```
┌────────────────────────┐
│                        │
│      Camera Feed       │  ← aspect-ratio: 4/3
│                        │
└────────────────────────┘
```

```css
.ds-video {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: var(--ds-radius-lg);
  background: var(--ds-neutral-1000);
  overflow: hidden;
  box-shadow: var(--ds-glow-cyan);
}

.ds-video--mini {
  max-width: 280px;
  border-radius: var(--ds-radius-md);
}

.ds-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

### 8.18 AI State Bar

**Anatomy:**
```
┌─────────────────────────────┐
│  ▎▌▎▌▎  Listening...        │
└─────────────────────────────┘
```

```css
.ds-ai-state {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  background: var(--ds-bg-elevated);
  font-size: var(--ds-text-small);
  color: var(--ds-text-secondary);
}

.ds-ai-state__wave {
  display: flex;
  gap: 2px;
  align-items: center;
}

.ds-ai-state__wave span {
  width: 3px;
  height: 14px;
  background: var(--ds-brand-primary);
  border-radius: 2px;
  animation: ds-wave 1.2s ease-in-out infinite;
}

.ds-ai-state__wave span:nth-child(2) { animation-delay: 0.15s; }
.ds-ai-state__wave span:nth-child(3) { animation-delay: 0.3s; }
.ds-ai-state__wave span:nth-child(4) { animation-delay: 0.1s; }
.ds-ai-state__wave span:nth-child(5) { animation-delay: 0.25s; }
```

---

### 8.19 Spinner

```css
.ds-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: rgba(0, 0, 0, 0.8);
  border-radius: var(--ds-radius-circle);
  animation: ds-spin 0.8s linear infinite;
}

.ds-spinner--light {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
}

.ds-spinner--lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}
```

---

### 8.20 Error Message

```css
.ds-error {
  color: var(--ds-red-300);
  font-size: var(--ds-text-small);
  background: var(--ds-status-error-bg);
  padding: var(--ds-space-3) var(--ds-space-3);
  border-radius: var(--ds-radius-md);
  line-height: 1.5;
  border: 1px solid var(--ds-status-error-border);
}
```

**Accessibility:**
- `role="alert"` + `aria-live="assertive"`

---

### 8.21 Bio-Feedback Badge

**Anatomy:**
```
┌────────────┐
│  ● Calm    │  ← floating top-right
└────────────┘
```

```css
.ds-bio-badge {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  align-items: center;
  gap: var(--ds-space-1);
  font-size: var(--ds-text-caption);
  font-weight: var(--ds-weight-bold);
  padding: var(--ds-space-1) var(--ds-space-3);
  border-radius: var(--ds-radius-full);
  background: rgba(8, 8, 28, 0.75);
  border: 1px solid var(--ds-border-strong);
  z-index: var(--ds-z-raised);
}

.ds-bio-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--ds-radius-circle);
}

.ds-bio-badge--calm {
  color: var(--ds-status-success);
}
.ds-bio-badge--calm .ds-bio-badge__dot {
  background: var(--ds-status-success);
  box-shadow: 0 0 8px rgba(0, 255, 148, 0.6);
}

.ds-bio-badge--stressed {
  color: var(--ds-emotion-stressed);
}
.ds-bio-badge--stressed .ds-bio-badge__dot {
  background: var(--ds-emotion-stressed);
  animation: ds-pulse-stress 1s infinite alternate;
}
```

---

### 8.22 Timeline Node

**Anatomy:**
```
●─── Node Label
│
●─── Node Label (active)
│
○─── Node Label
```

```css
.ds-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.ds-timeline__node {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  opacity: 0.5;
  transition: all var(--ds-duration-slow) var(--ds-ease-default);
}

.ds-timeline__node--active {
  opacity: 1;
}

.ds-timeline__dot {
  width: 12px;
  height: 12px;
  border-radius: var(--ds-radius-circle);
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.ds-timeline__node--active .ds-timeline__dot {
  background: var(--ds-brand-primary);
  box-shadow: 0 0 15px var(--ds-brand-primary);
  transform: scale(1.3);
}

.ds-timeline__label {
  font-size: var(--ds-text-small);
  padding: var(--ds-space-1) var(--ds-space-3);
  border-radius: var(--ds-radius-sm);
  background: rgba(8, 8, 28, 0.6);
  backdrop-filter: blur(var(--ds-blur-sm));
}
```

---

### 8.23 Divider

```css
.ds-divider {
  width: 100%;
  height: 1px;
  background: var(--ds-border-subtle);
  margin: var(--ds-space-4) 0;
}

.ds-divider--glow {
  background: linear-gradient(
    90deg,
    transparent,
    var(--ds-border-default),
    transparent
  );
}
```

---

### 8.24 Tooltip

**Anatomy:**
```
      ┌───────────────┐
      │  Tooltip text  │
      └───────▲───────┘
              │
         [Target]
```

```css
.ds-tooltip {
  position: absolute;
  padding: var(--ds-space-2) var(--ds-space-3);
  background: var(--ds-neutral-700);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-small);
  color: var(--ds-text-primary);
  z-index: var(--ds-z-tooltip);
  box-shadow: var(--ds-shadow-md);
  animation: ds-fade-in var(--ds-duration-fast);
  pointer-events: none;
  white-space: nowrap;
}

.ds-tooltip::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--ds-neutral-700);
  border-right: 1px solid var(--ds-border-default);
  border-bottom: 1px solid var(--ds-border-default);
}
```

**Accessibility:**
- `role="tooltip"` + `id` referenced by `aria-describedby`
- Show on focus (not just hover)

---

### 8.25 Modal / Dialog

```css
.ds-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(var(--ds-blur-sm));
  z-index: var(--ds-z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ds-fade-in var(--ds-duration-moderate);
}

.ds-modal {
  background: var(--ds-bg-surface);
  backdrop-filter: blur(var(--ds-blur-xl));
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-3xl);
  padding: var(--ds-space-8);
  max-width: 480px;
  width: 90vw;
  box-shadow: var(--ds-shadow-panel);
  animation: ds-scale-in var(--ds-duration-moderate) var(--ds-ease-spring);
}

.ds-modal__header {
  font-family: var(--ds-font-display);
  font-size: var(--ds-text-title);
  font-weight: var(--ds-weight-bold);
  margin-bottom: var(--ds-space-4);
}

.ds-modal__body {
  font-size: var(--ds-text-body);
  color: var(--ds-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--ds-space-6);
}

.ds-modal__actions {
  display: flex;
  gap: var(--ds-space-3);
  justify-content: flex-end;
}
```

**Accessibility:**
- `role="dialog"` + `aria-modal="true"`
- `aria-labelledby` pointing to header
- Focus trap inside modal
- Escape to close
- Return focus to trigger on close

---

### 8.26 Toast / Notification

```css
.ds-toast-container {
  position: fixed;
  top: var(--ds-space-5);
  right: var(--ds-space-5);
  z-index: var(--ds-z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-3);
}

.ds-toast {
  display: flex;
  align-items: center;
  gap: var(--ds-space-3);
  padding: var(--ds-space-3) var(--ds-space-4);
  background: var(--ds-bg-surface);
  backdrop-filter: blur(var(--ds-blur-lg));
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-lg);
  animation: ds-slide-in var(--ds-duration-moderate) var(--ds-ease-spring);
  min-width: 300px;
  max-width: 420px;
}

.ds-toast--success { border-left: 3px solid var(--ds-status-success); }
.ds-toast--warning { border-left: 3px solid var(--ds-status-warning); }
.ds-toast--error   { border-left: 3px solid var(--ds-status-error); }
.ds-toast--info    { border-left: 3px solid var(--ds-status-info); }

.ds-toast__message {
  flex: 1;
  font-size: var(--ds-text-body);
}

.ds-toast__close {
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--ds-duration-fast);
}
.ds-toast__close:hover { opacity: 1; }
```

**Accessibility:**
- `role="alert"` for errors, `role="status"` for info
- `aria-live="polite"` (info) or `aria-live="assertive"` (error)
- Auto-dismiss after 5s (configurable)
- Close button with `aria-label="إغلاق"` (Close)

---

### 8.27 Skeleton Loader

```css
.ds-skeleton {
  background: linear-gradient(
    90deg,
    var(--ds-bg-elevated) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    var(--ds-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: ds-shimmer 2s linear infinite;
  border-radius: var(--ds-radius-sm);
}

.ds-skeleton--text {
  height: 14px;
  width: 80%;
  margin-bottom: var(--ds-space-2);
}

.ds-skeleton--circle {
  border-radius: var(--ds-radius-circle);
}

.ds-skeleton--card {
  height: 60px;
  border-radius: var(--ds-radius-lg);
}
```

---

### 8.28 Toggle / Switch

```css
.ds-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: var(--ds-radius-full);
  background: var(--ds-bg-elevated);
  border: 1px solid var(--ds-border-default);
  cursor: pointer;
  transition: all var(--ds-duration-normal);
}

.ds-toggle--active {
  background: rgba(0, 245, 255, 0.2);
  border-color: var(--ds-brand-primary);
}

.ds-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: var(--ds-radius-circle);
  background: var(--ds-text-secondary);
  transition: all var(--ds-duration-normal) var(--ds-ease-spring);
}

.ds-toggle--active .ds-toggle__thumb {
  left: 22px;
  background: var(--ds-brand-primary);
  box-shadow: var(--ds-glow-cyan);
}
```

**Accessibility:**
- `role="switch"` + `aria-checked`
- Keyboard: Space/Enter to toggle
- `aria-label` describing the setting

---

### 8.29 Input Field

```css
.ds-input {
  width: 100%;
  padding: var(--ds-space-3) var(--ds-space-4);
  background: var(--ds-bg-elevated);
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-md);
  font-family: var(--ds-font-body);
  font-size: var(--ds-text-body);
  color: var(--ds-text-primary);
  outline: none;
  transition: border-color var(--ds-duration-fast);
}

.ds-input::placeholder {
  color: var(--ds-text-disabled);
}

.ds-input:focus {
  border-color: var(--ds-border-focus);
  box-shadow: 0 0 0 2px rgba(0, 245, 255, 0.15);
}

.ds-input--error {
  border-color: var(--ds-status-error);
}

.ds-input--rtl {
  direction: rtl;
  font-family: var(--ds-font-arabic);
  text-align: right;
}

.ds-input-label {
  display: block;
  font-size: var(--ds-text-small);
  font-weight: var(--ds-weight-semibold);
  color: var(--ds-text-secondary);
  margin-bottom: var(--ds-space-1);
}

.ds-input-error {
  font-size: var(--ds-text-caption);
  color: var(--ds-status-error);
  margin-top: var(--ds-space-1);
}
```

---

### 8.30 Tabs

```css
.ds-tabs {
  display: flex;
  border-bottom: 1px solid var(--ds-border-subtle);
  gap: var(--ds-space-1);
}

.ds-tab {
  padding: var(--ds-space-2) var(--ds-space-4);
  font-size: var(--ds-text-body);
  font-weight: var(--ds-weight-medium);
  color: var(--ds-text-secondary);
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  transition: color var(--ds-duration-fast);
}

.ds-tab:hover {
  color: var(--ds-text-primary);
}

.ds-tab--active {
  color: var(--ds-brand-primary);
}

.ds-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--ds-brand-primary);
  border-radius: 2px 2px 0 0;
}
```

**Accessibility:**
- `role="tablist"` on container
- `role="tab"` + `aria-selected` on each tab
- `role="tabpanel"` on content, linked by `aria-labelledby`
- Arrow keys to navigate between tabs
- Home/End for first/last tab

---

### 8.31 Avatar / Profile Circle

```css
.ds-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--ds-radius-circle);
  overflow: hidden;
  border: 2px solid var(--ds-border-default);
  flex-shrink: 0;
}

.ds-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ds-avatar--sm { width: 28px; height: 28px; }
.ds-avatar--lg { width: 56px; height: 56px; }

.ds-avatar--glow {
  border-color: var(--ds-brand-primary);
  box-shadow: var(--ds-glow-cyan);
}
```

---

### 8.32 Progress Bar

```css
.ds-progress {
  width: 100%;
  height: 4px;
  background: var(--ds-bg-elevated);
  border-radius: var(--ds-radius-full);
  overflow: hidden;
}

.ds-progress__fill {
  height: 100%;
  background: var(--ds-brand-primary);
  border-radius: var(--ds-radius-full);
  transition: width var(--ds-duration-slow) var(--ds-ease-smooth);
}

.ds-progress--success .ds-progress__fill {
  background: var(--ds-status-success);
}
```

**Accessibility:**
- `role="progressbar"`
- `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- `aria-label` describing what's loading

---

### 8.33 Dropdown Menu

```css
.ds-dropdown {
  position: absolute;
  min-width: 180px;
  background: var(--ds-bg-surface);
  backdrop-filter: blur(var(--ds-blur-xl));
  border: 1px solid var(--ds-border-default);
  border-radius: var(--ds-radius-lg);
  box-shadow: var(--ds-shadow-lg);
  padding: var(--ds-space-1);
  z-index: var(--ds-z-dropdown);
  animation: ds-scale-in var(--ds-duration-fast) var(--ds-ease-spring);
}

.ds-dropdown__item {
  display: flex;
  align-items: center;
  gap: var(--ds-space-2);
  padding: var(--ds-space-2) var(--ds-space-3);
  border-radius: var(--ds-radius-sm);
  font-size: var(--ds-text-body);
  color: var(--ds-text-primary);
  cursor: pointer;
  transition: background var(--ds-duration-fast);
}

.ds-dropdown__item:hover {
  background: var(--ds-bg-hover);
}

.ds-dropdown__item--active {
  color: var(--ds-brand-primary);
}

.ds-dropdown__divider {
  height: 1px;
  background: var(--ds-border-subtle);
  margin: var(--ds-space-1) 0;
}
```

**Accessibility:**
- `role="menu"` on container
- `role="menuitem"` on items
- Arrow keys for navigation
- Escape to close
- `aria-expanded` on trigger

---

### 8.34 Tag / Chip

```css
.ds-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--ds-space-1);
  padding: var(--ds-space-1) var(--ds-space-2);
  border-radius: var(--ds-radius-full);
  font-size: var(--ds-text-caption);
  font-weight: var(--ds-weight-semibold);
  background: var(--ds-bg-elevated);
  color: var(--ds-text-primary);
  border: 1px solid var(--ds-border-subtle);
}

.ds-tag--cyan    { color: var(--ds-brand-primary); background: rgba(0,245,255,0.1); }
.ds-tag--green   { color: var(--ds-status-success); background: var(--ds-status-success-bg); }
.ds-tag--gold    { color: var(--ds-status-warning); background: var(--ds-status-warning-bg); }
.ds-tag--red     { color: var(--ds-status-error); background: var(--ds-status-error-bg); }
.ds-tag--magenta { color: var(--ds-magenta-400); background: rgba(255,0,229,0.1); }

.ds-tag__close {
  cursor: pointer;
  opacity: 0.5;
  font-size: 10px;
}
.ds-tag__close:hover { opacity: 1; }
```

---

### 8.35 Empty State

```css
.ds-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--ds-space-12) var(--ds-space-6);
  text-align: center;
}

.ds-empty-state__icon {
  font-size: 48px;
  margin-bottom: var(--ds-space-4);
  opacity: 0.3;
}

.ds-empty-state__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-text-title);
  font-weight: var(--ds-weight-semibold);
  margin-bottom: var(--ds-space-2);
}

.ds-empty-state__description {
  font-size: var(--ds-text-body);
  color: var(--ds-text-secondary);
  max-width: 320px;
  line-height: 1.6;
}
```

---

### 8.36 Section Header

```css
.ds-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--ds-space-4);
}

.ds-section-header__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-text-small);
  font-weight: var(--ds-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ds-text-secondary);
}

.ds-section-header__action {
  font-size: var(--ds-text-small);
  color: var(--ds-brand-primary);
  cursor: pointer;
}
```

---

### 8.37 Scrollbar

```css
/* Standard scrollbar */
.ds-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.ds-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.ds-scrollbar::-webkit-scrollbar-thumb {
  background: var(--ds-border-default);
  border-radius: var(--ds-radius-md);
}

/* Accent scrollbar (transcript) */
.ds-scrollbar--accent::-webkit-scrollbar {
  width: 4px;
}
.ds-scrollbar--accent::-webkit-scrollbar-thumb {
  background: rgba(0, 245, 255, 0.2);
  border-radius: var(--ds-radius-xs);
}
```

---

### 8.38 Focus Ring (Global)

```css
.ds-focus-visible:focus-visible,
*:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}

/* Remove default outline, add custom */
button:focus-visible,
[role="button"]:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}
```

---

### 8.39 Particle Background (Canvas)

Specifications for the DawayirCanvas particle system:

| Property | Value |
|----------|-------|
| Count | 30 particles |
| Size range | 0.5–2.5px |
| Opacity range | 0.1–0.4 |
| Speed | random ±0.15px/frame |
| Color | `rgba(255, 255, 255, 0.5)` |
| Rendering | Canvas 2D `fillRect` |
| Frame rate | 24 FPS (TARGET_FPS) |

---

### 8.40 Circle Node (Canvas)

Specifications for the three interactive circles:

| Property | Token | Value |
|----------|-------|-------|
| Lerp speed (physics) | — | 0.08 |
| Color lerp speed | — | 0.16 |
| Pulse decay | — | 0.015/frame |
| Line dash | — | `[8, 6]` |
| Line width | — | 1px |
| Connection stroke | — | `rgba(255, 255, 255, 0.08)` |
| Outer glow alpha | — | 0.15 |
| Main circle alpha | — | 0.6 |
| Highlight dot alpha | — | 0.2 |
| Pulse ring offset | — | `pulse * 30` px |
| Outer glow offset | — | 6px |

**Initial Configuration:**

| Circle | Radius | Color | Velocity |
|--------|--------|-------|----------|
| Awareness (وعي) | 70px | `#00F5FF` | (0.2, 0.1) |
| Knowledge (علم) | 85px | `#00FF41` | (-0.15, 0.25) |
| Truth (حقيقة) | 95px | `#FF00E5` | (0.1, -0.2) |

---

## 9. Patterns

### 9.1 Glassmorphism

The signature visual pattern. Use for all floating panels.

```css
/* Recipe */
.glass {
  background: var(--ds-bg-surface);
  backdrop-filter: blur(var(--ds-blur-xl));
  -webkit-backdrop-filter: blur(var(--ds-blur-xl));
  border: 1px solid var(--ds-border-default);
  box-shadow: var(--ds-shadow-panel);
  border-radius: var(--ds-radius-3xl);
}
```

**When to use:** Overlays, panels, modals, transcript bubbles
**When NOT to use:** Inline content, cards within panels, small badges

### 9.2 Neon Glow

```css
/* Text glow */
.neon-text {
  color: var(--ds-brand-primary);
  text-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
}

/* Element glow */
.neon-border {
  border: 1px solid var(--ds-brand-primary);
  box-shadow: var(--ds-glow-cyan), inset 0 0 20px rgba(0, 245, 255, 0.05);
}
```

**When to use:** Active states, important metrics, CTA focus
**When NOT to use:** Decorative elements, body text, backgrounds

### 9.3 Gradient Text

```css
.gradient-text {
  background: var(--ds-gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**When to use:** Brand name, hero text
**When NOT to use:** Body text, labels, repeated elements

### 9.4 RTL-Aware Layout

```css
/* Use logical properties */
.rtl-aware {
  margin-inline-start: var(--ds-space-4);  /* NOT margin-left */
  padding-inline-end: var(--ds-space-3);   /* NOT padding-right */
  text-align: start;                       /* NOT left */
  border-inline-start: 2px solid cyan;     /* NOT border-left */
}
```

### 9.5 Responsive Panel → Bottom Sheet

```css
.responsive-panel {
  /* Desktop: left sidebar */
  position: absolute;
  top: 0;
  left: 0;
  width: 360px;
  height: 100vh;
}

@media (max-width: 768px) {
  .responsive-panel {
    /* Mobile: bottom sheet */
    top: auto;
    bottom: 0;
    left: 0;
    width: 100vw;
    height: auto;
    max-height: 60vh;
    border-radius: var(--ds-radius-2xl) var(--ds-radius-2xl) 0 0;
  }
}
```

### 9.6 Status Color Pattern

Consistent 3-token approach for all status states:

```css
/* Each status has: color, background, border */
.status-success {
  color: var(--ds-status-success);
  background: var(--ds-status-success-bg);
  border: 1px solid var(--ds-status-success-border);
}
```

### 9.7 Animated Entry Pattern

Use for elements that appear dynamically:

```css
.entry-animation {
  animation: ds-slide-in
    var(--ds-duration-slower)
    var(--ds-ease-spring);
}
```

---

## 10. Accessibility

### 10.1 Color Contrast

All text must meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).

| Check | Minimum | Dawayir Actual |
|-------|---------|---------------|
| Primary text on deep bg | 4.5:1 | 15.8:1 |
| Secondary text on deep bg | 4.5:1 | 5.2:1 |
| Inverse text on CTA | 4.5:1 | 11.4:1 |
| Status colors on deep bg | 3:1 | 6.1–12.3:1 |

### 10.2 Focus Management

- All interactive elements must show `:focus-visible` ring
- Ring: `2px solid var(--ds-border-focus)`, `2px offset`
- Modals: trap focus inside
- Panels: manage focus order with `tabindex`

### 10.3 Screen Reader Support

| Component | ARIA Role | Live Region |
|-----------|-----------|-------------|
| Status Badge | `status` | `aria-live="polite"` |
| Error Message | `alert` | `aria-live="assertive"` |
| Transcript | `log` | `aria-live="polite"` |
| Modal | `dialog` | — |
| Panel | `complementary` | — |
| Tabs | `tablist` / `tab` / `tabpanel` | — |
| Toggle | `switch` | — |
| Progress | `progressbar` | — |

### 10.4 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous |
| Enter/Space | Activate button/link |
| Escape | Close modal/dropdown |
| Arrow keys | Navigate tabs, menu items |
| Home/End | First/last item in list |

### 10.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 10.6 Arabic Accessibility

- `lang="ar"` on Arabic text containers
- `dir="rtl"` on Arabic sections
- Font minimum 12px for Arabic (complex script readability)
- Line height minimum 1.7 for Arabic text

---

## 11. Do's and Don'ts

### Colors

| Do | Don't |
|----|-------|
| Use semantic tokens (`--ds-text-primary`) | Reference primitives (`--ds-neutral-50`) |
| Use status tokens for feedback | Invent new status colors |
| Test contrast ratios | Assume dark-on-dark is readable |
| Use `--ds-bg-elevated` for subtle backgrounds | Use `rgba()` values directly |

### Typography

| Do | Don't |
|----|-------|
| Use the 9-level scale | Use arbitrary font sizes |
| Pair Outfit (headings) with Inter (body) | Mix display fonts in body text |
| Use Noto Kufi Arabic for Arabic content | Use Inter for Arabic text |
| Use weight 800 for CTA buttons | Use weight 900 outside brand name |
| Ensure Arabic has `line-height: 1.7` | Use `line-height: 1` for Arabic |

### Spacing

| Do | Don't |
|----|-------|
| Use 8px-based tokens | Use 5px, 7px, 9px (off-grid) |
| Scale: small inside, large outside | Use same spacing everywhere |
| Use `gap` for flex/grid spacing | Use margins on flex children |

### Components

| Do | Don't |
|----|-------|
| Use glassmorphism for overlays | Apply glass to every surface |
| Use neon glow for active states | Add glow to static elements |
| Animate entry (slide-up) | Animate everything continuously |
| Use `--ds-ease-spring` for CTA hover | Use `linear` for UI transitions |
| Show focus rings for keyboard users | Remove outlines for aesthetics |

### Layout

| Do | Don't |
|----|-------|
| Use logical properties (`margin-inline-start`) | Use physical (`margin-left`) |
| Desktop: sidebar, Mobile: bottom sheet | Force desktop layout on mobile |
| Use 12-column grid for structure | Use grid for micro-layout |
| Stack columns on mobile | Shrink columns below usability |

### Motion

| Do | Don't |
|----|-------|
| Respect `prefers-reduced-motion` | Ignore motion preferences |
| Use 200–400ms for transitions | Use >600ms (feels sluggish) |
| Use spring easing for CTAs | Use linear for button hover |
| Animate entry, not exit (for speed) | Block interaction during animation |

---

## 12. Developer Guide

### 12.1 Quick Start

```html
<!-- 1. Import the design system CSS -->
<link rel="stylesheet" href="./design-system/dawayir-ds.css" />

<!-- 2. Or import in your React app -->
```

```jsx
// In your App.jsx or index.jsx
import './design-system/dawayir-ds.css';
```

### 12.2 Using Tokens

Always reference CSS custom properties, never hardcode values.

```css
/* CORRECT */
.my-component {
  color: var(--ds-text-primary);
  padding: var(--ds-space-4);
  border-radius: var(--ds-radius-lg);
  background: var(--ds-bg-elevated);
}

/* WRONG */
.my-component {
  color: #f0f4ff;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
}
```

### 12.3 Using the Grid

```jsx
<div className="ds-grid">
  <div className="ds-col-3">Sidebar</div>
  <div className="ds-col-9">Content</div>
</div>

{/* Responsive */}
<div className="ds-grid">
  <div className="ds-col-4 ds-col-md-6 ds-col-sm-12">Card</div>
  <div className="ds-col-4 ds-col-md-6 ds-col-sm-12">Card</div>
  <div className="ds-col-4 ds-col-md-12 ds-col-sm-12">Card</div>
</div>
```

### 12.4 Component Usage Examples

#### Button

```jsx
{/* Primary */}
<button className="ds-btn-primary">
  ابدأ المحادثة
</button>

{/* Secondary */}
<button className="ds-btn-secondary">
  إعدادات
</button>

{/* Destructive */}
<button className="ds-btn-destructive">
  قطع الاتصال
</button>

{/* Icon */}
<button className="ds-btn-icon" aria-label="كتم الصوت">
  🔇
</button>

{/* Primary with loading */}
<button className="ds-btn-primary" disabled aria-busy="true">
  <span className="ds-spinner"></span>
  جاري الاتصال...
</button>
```

#### Status Badge

```jsx
<div className="ds-badge ds-badge--connected" role="status" aria-live="polite">
  <span className="ds-badge__dot" />
  متصل
</div>
```

#### Transcript

```jsx
<div className="ds-transcript" role="log" aria-live="polite">
  {/* User message */}
  <div className="ds-bubble ds-bubble--user" role="listitem">
    أهلاً، كيف حالك؟
  </div>

  {/* Agent message */}
  <div className="ds-bubble ds-bubble--agent" role="listitem">
    أهلاً! الحمد لله. إنت عامل إيه؟
  </div>
</div>
```

#### Modal

```jsx
<div className="ds-modal-backdrop">
  <div className="ds-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 className="ds-modal__header" id="modal-title">حفظ التقرير</h2>
    <p className="ds-modal__body">هل تريد حفظ التقرير الحالي؟</p>
    <div className="ds-modal__actions">
      <button className="ds-btn-secondary">إلغاء</button>
      <button className="ds-btn-primary">حفظ</button>
    </div>
  </div>
</div>
```

#### Metric

```jsx
<div className="ds-metrics-bar">
  <div className="ds-metric">
    <span className="ds-metric__label">COHERENCE</span>
    <span className="ds-metric__value ds-metric__value--positive">0.85</span>
  </div>
  <div className="ds-metric">
    <span className="ds-metric__label">ENGAGEMENT</span>
    <span className="ds-metric__value">0.72</span>
  </div>
</div>
```

### 12.5 Token Reference Cheatsheet

```
COLORS:
  --ds-brand-primary         Cyan (#00f5ff)
  --ds-bg-deep               App background
  --ds-bg-surface            Panel background
  --ds-bg-elevated           Card/button background
  --ds-bg-hover              Hover state
  --ds-text-primary          Main text
  --ds-text-secondary        Muted text
  --ds-border-default        Standard border
  --ds-status-{success|warning|error|info}     Status colors
  --ds-status-{success|warning|error|info}-bg  Status backgrounds

TYPOGRAPHY:
  --ds-font-display          Outfit (headings)
  --ds-font-body             Inter (body)
  --ds-font-arabic           Noto Kufi Arabic
  --ds-text-{nano|micro|caption|small|body|lead|title|heading|display}

SPACING:
  --ds-space-{0|1|2|3|4|5|6|7|8|10|12|16|20}
  Values: 0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80

RADIUS:
  --ds-radius-{none|xs|sm|md|lg|xl|2xl|3xl|full|circle}

SHADOWS:
  --ds-shadow-{none|sm|md|lg|xl|panel}
  --ds-glow-{cyan|cyan-strong|green|red}

MOTION:
  --ds-duration-{instant|fast|normal|moderate|slow|slower|deliberate}
  --ds-ease-{default|in|out|in-out|spring|smooth}

Z-INDEX:
  --ds-z-{base|raised|dropdown|sticky|overlay|modal|popover|toast|tooltip|max}
```

### 12.6 Migration from Legacy Tokens

Map old variables to new design system tokens:

| Legacy | New |
|--------|-----|
| `--cyan` | `--ds-brand-primary` |
| `--green` | `--ds-status-success` |
| `--magenta` | `--ds-brand-secondary` |
| `--gold` | `--ds-brand-accent` |
| `--bg-deep` | `--ds-bg-deep` |
| `--bg-mid` | `--ds-bg-mid` |
| `--panel-bg` | `--ds-bg-surface` |
| `--panel-border` | `--ds-border-default` |
| `--panel-glow` | `--ds-shadow-panel` |
| `--text-primary` | `--ds-text-primary` |
| `--text-secondary` | `--ds-text-secondary` |
| `--radius-panel` | `--ds-radius-3xl` |
| `--radius-btn` | `--ds-radius-lg` |

### 12.7 File Structure

```
design-system/
├── tokens.json          # Design tokens (DTCG format)
├── dawayir-ds.css       # CSS custom properties + utilities
└── DESIGN-SYSTEM.md     # This documentation
```

### 12.8 Naming Convention

All design system tokens follow this pattern:

```
--ds-{category}-{variant}

Examples:
  --ds-text-primary       category=text,    variant=primary
  --ds-space-4            category=space,   variant=4
  --ds-radius-lg          category=radius,  variant=lg
  --ds-shadow-panel       category=shadow,  variant=panel
  --ds-duration-fast      category=duration, variant=fast
```

All CSS classes follow BEM-inspired convention with `ds-` prefix:

```
.ds-{component}
.ds-{component}__{element}
.ds-{component}--{modifier}

Examples:
  .ds-badge
  .ds-badge__dot
  .ds-badge--connected
```

---

## Appendix: Design Token Format

The `tokens.json` file follows the [Design Tokens Community Group (DTCG)](https://design-tokens.github.io/community-group/format/) specification for interoperability with tools like:

- **Figma** (via Tokens Studio)
- **Style Dictionary** (build pipeline)
- **Storybook** (documentation)
- **Tailwind CSS** (config generation)

To generate platform-specific outputs:

```bash
# Using Style Dictionary
npx style-dictionary build --config sd.config.js

# Using Tokens Studio CLI
npx token-transformer tokens.json output.json
```

---

*Dawayir Design System v1.0.0 — Built for competition-grade Arabic voice AI interfaces.*
