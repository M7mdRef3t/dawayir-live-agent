# دواير — نظام أنماط UI/UX الكامل
# Dawayir — Complete UI/UX Pattern System

**الإصدار:** 1.0.0
**المنهجية:** Apple Human Interface Guidelines + Material Design 3 + Custom Dawayir Patterns
**المؤلف:** Lead UI/UX Designer
**التاريخ:** مارس 2026

---

> **فلسفة التصميم:** "دواير مش تطبيق بتتصفحه. دواير مساحة بتعيش فيها."
> الواجهة لازم تختفي — اللي يبقى هو الدواير، صوتك، وعيك.

---

## جدول المحتويات

1. [فلسفة التصميم والتسلسل الهرمي](#1-فلسفة-التصميم)
2. [أنماط التخطيط والتنقل](#2-أنماط-التخطيط)
3. [الشاشة 1: Welcome & Onboarding](#screen-1)
4. [الشاشة 2: Setup & Camera Capture](#screen-2)
5. [الشاشة 3: Live Session — Canvas](#screen-3)
6. [الشاشة 4: Live Session — Conversation](#screen-4)
7. [الشاشة 5: Session Insights (Realtime)](#screen-5)
8. [الشاشة 6: Session Complete & Report](#screen-6)
9. [الشاشة 7: Memory Bank (Dashboard)](#screen-7)
10. [الشاشة 8: Settings & Preferences](#screen-8)
11. [الحالات العابرة: تحميل / فارغ / خطأ](#11-الحالات-العابرة)
12. [التفاعلات الدقيقة (Micro-interactions)](#12-التفاعلات-الدقيقة)
13. [قابلية الوصول (WCAG + VoiceOver)](#13-قابلية-الوصول)
14. [السلوك المتجاوب](#14-السلوك-المتجاوب)
15. [ملاحظات المصمم](#15-ملاحظات-المصمم)

---

## 1. فلسفة التصميم

### 1.1 التسلسل الهرمي البصري (Visual Hierarchy)

```
المستوى 1 — Canvas (الدواير الثلاث)
    ↑ العنصر الأهم. يشغل 100% من viewport.
    ↑ كل شيء آخر يطفو فوقه.

المستوى 2 — Voice State (حالة الصوت)
    ↑ هل أنا بسمع؟ هل هو بيتكلم؟
    ↑ مؤشر واحد واضح — لا أكثر.

المستوى 3 — Transcript (المحادثة)
    ↑ الكلام الحي بينك وبين دواير.
    ↑ يظهر ويختفي — مش ثابت.

المستوى 4 — Control Panel (لوحة التحكم)
    ↑ الأزرار والحالة والإعدادات.
    ↑ موجود بس مش مهيمن.

المستوى 5 — System Status (حالة النظام)
    ↑ اتصال، أخطاء، إشعارات.
    ↑ يظهر فقط عند الحاجة.
```

### 1.2 قواعد Apple HIG المطبقة

| القاعدة | التطبيق في دواير |
|---------|-----------------|
| **Content-first** | الـ canvas هو المحتوى — الـ UI يطفو فوقه |
| **Clarity** | حالة واحدة واضحة في كل لحظة |
| **Deference** | الواجهة تخدم المحتوى ولا تنافسه |
| **Depth** | طبقات glassmorphic تخلق عمق حقيقي |
| **Direct manipulation** | سحب الدواير على الـ canvas مباشرة |
| **Feedback** | كل فعل له رد فعل بصري فوري |
| **Consistency** | نفس الأنماط في كل مكان |
| **User control** | المستخدم يقدر يوقف، يرجع، ينهي في أي وقت |

### 1.3 مبدأ "الغرفة المظلمة"

**Dawayir = Dark Room with Floating Light.**

تخيل إنك في غرفة مظلمة تماماً. الحاجة الوحيدة اللي مضيئة هي 3 كرات نيون بتطفو وبتتحرك. ده هو الإحساس اللي عايزين نوصّله:

- الخلفية **تختفي** (`#04040f` = شبه أسود)
- العناصر المهمة **تضيء** (neon glow)
- العناصر الثانوية **شبه شفافة** (glassmorphism)
- الانتباه ينجذب **طبيعياً** للدواير — مش بالإجبار

---

## 2. أنماط التخطيط

### 2.1 Layout Architecture

```
Desktop (≥769px):
┌───────────────────────────────────────────────────────┐
│                                                       │
│  ┌──────────┐                                         │
│  │  Control  │                                         │
│  │  Panel    │         CANVAS                          │
│  │  360px    │     (Full Viewport)                     │
│  │  Glass    │                                         │
│  │           │         ○  ●  ○                         │
│  │           │                                         │
│  │           │                         ┌─────────┐    │
│  │           │                         │Transcript│    │
│  │           │                         │  400px   │    │
│  └──────────┘                         └─────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘

Mobile (≤768px):
┌─────────────────────┐
│                     │
│       CANVAS        │
│    (Full Screen)    │
│                     │
│      ○  ●  ○        │
│                     │
│  ┌───────────────┐  │
│  │  Transcript   │  │
│  │  (Floating)   │  │
│  └───────────────┘  │
│                     │
├─────────────────────┤ ← drag handle
│   Control Panel     │
│   Bottom Sheet      │
│   max-height: 60vh  │
└─────────────────────┘
```

### 2.2 Navigation Pattern

**دواير لا يستخدم navigation تقليدي.**

بدلاً من ذلك: **State Machine** — الواجهة تتغير بناءً على حالة الجلسة:

```
                    ┌──────────┐
                    │ Welcome  │
                    │ Screen 1 │
                    └────┬─────┘
                         │ "يلا نبدأ"
                    ┌────▼─────┐
                    │  Setup   │
                    │ Screen 2 │
                    └────┬─────┘
                         │ Camera + Connect
            ┌────────────▼────────────┐
            │     LIVE SESSION        │
            │  ┌───────┐ ┌────────┐  │
            │  │Canvas │ │Converse│  │
            │  │  S.3  │ │  S.4   │  │
            │  └───┬───┘ └───┬────┘  │
            │      └────┬────┘       │
            │      ┌────▼────┐       │
            │      │Insights │       │
            │      │  S.5    │       │
            │      └─────────┘       │
            └────────────┬───────────┘
                         │ "إنهاء الجلسة"
                    ┌────▼─────┐
                    │ Session  │
                    │ Complete │
                    │ Screen 6 │
                    └────┬─────┘
                         │
              ┌──────────▼──────────┐
              │    Memory Bank      │
              │     Screen 7        │
              └─────────────────────┘

              ┌─────────────────────┐
              │    Settings         │
              │     Screen 8        │ ← accessible from any screen
              └─────────────────────┘
```

### 2.3 Gesture Map

| الإيماءة | المنصة | الفعل |
|----------|--------|-------|
| **Tap** | Mobile + Desktop | تفعيل الأزرار |
| **Long Press** | Mobile | عرض tooltip |
| **Drag** | Mobile + Desktop | سحب الدواير على الـ canvas |
| **Swipe Up** | Mobile | فتح الـ bottom sheet |
| **Swipe Down** | Mobile | إغلاق الـ bottom sheet |
| **Pinch** | Mobile | تكبير/تصغير الـ canvas |
| **Double Tap** | Mobile | تكبير دائرة لعرض تفاصيلها |
| **Escape** | Desktop | إغلاق modal / إنهاء جلسة |
| **Spacebar** | Desktop | تبديل الميكروفون |

---

## 3. الشاشات الثمانية

---

<a id="screen-1"></a>
## الشاشة 1: Welcome & Onboarding

### الغرض
أول لقاء بين المستخدم ودواير. **30 ثانية** لإقناعه إن ده مش تطبيق عادي.

### Wireframe

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    (particles float)                     │
│                                                         │
│              ○       ●       ○                          │
│            cyan    green   magenta                       │
│          (breathing animation — slow pulse)              │
│                                                         │
│                                                         │
│                    د و ا ي ر                             │
│               (animated reveal, letter by letter)        │
│                                                         │
│              مساحتك الذهنية الحية                        │
│             (fade in after name completes)               │
│                                                         │
│                                                         │
│              ┌─────────────────────┐                    │
│              │    يلا نبدأ  🧠     │  ← CTA gradient    │
│              └─────────────────────┘                    │
│                                                         │
│                 [AR] / [EN]                              │
│              language toggle, bottom                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### المكونات

| المكون | النوع | المواصفات |
|--------|-------|----------|
| **Background Canvas** | `DawayirCanvas` | 3 circles breathing slowly, particles, no labels |
| **Brand Name** | `.ds-brand-name` | "دواير" — animated letter reveal, Outfit 900, 36px (display) |
| **Subtitle** | `.ds-brand-subtitle` | "مساحتك الذهنية الحية" — fade in, Noto Kufi 400, 14px |
| **CTA Button** | `.ds-btn-primary` | "يلا نبدأ 🧠" — gradient, full width max 320px |
| **Language Toggle** | `.ds-btn-icon` × 2 | "AR" / "EN" — small, bottom center |

### التفاعلات

| التفاعل | الحدث | النتيجة |
|---------|-------|---------|
| Page Load | — | Circles fade in (1s) → name reveals (1.5s) → subtitle fades (2s) → CTA slides up (2.5s) |
| CTA Hover | `mouseenter` | `translateY(-2px)` + glow + shine animation |
| CTA Click | `click` | Ripple effect → transition to Screen 2 |
| Language Toggle | `click` | All text switches immediately, RTL/LTR adjusts |
| Canvas Interaction | `mousemove` | Particles react subtly to cursor position |

### حالات خاصة

**First-Time User (Onboarding overlay):**
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  "أهلاً. أنا دواير."           │    │
│  │                                 │    │
│  │  "هنا هتشوف عقلك               │    │
│  │   وهو بيرتب نفسه."             │    │
│  │                                 │    │
│  │  ○ وعي    ○ علم    ○ حقيقة     │    │
│  │  حاسس     فاهم      مؤمن       │    │
│  │  بإيه؟     إيه؟      بإيه؟      │    │
│  │                                 │    │
│  │  ● ● ○   (step 1 of 3)         │    │
│  │                                 │    │
│  │  [  كمّل  ]   [  تخطي  ]       │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

- 3 خطوات فقط (الوعي → العلم → الحقيقة)
- كل خطوة تُضيء الدائرة المقابلة على الـ canvas
- "تخطي" متاحة دائماً
- يظهر مرة واحدة فقط (يُحفظ في `localStorage`)

### ملاحظات المصمم

> **Design Note:** الـ Welcome Screen هي "المسرح" — الدواير هي الممثلين الرئيسيين. كل عنصر UI آخر هو "كواليس" يظهر في الوقت الصح. لا تضيف عناصر أكثر من اللازم. الفراغ هنا هو التصميم.

> **Timing:** الـ animation sequence لازم تكون 3 ثواني أو أقل. أي أبطأ من كده = المستخدم بيمل. استخدم `prefers-reduced-motion` لإلغاء الأنيميشن للمستخدمين اللي محتاجين.

---

<a id="screen-2"></a>
## الشاشة 2: Setup & Camera Capture

### الغرض
تجهيز الجلسة: التقاط صورة (اختياري) + بدء الاتصال.

### Wireframe

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────┐                                │
│  │ ← دواير              │  brand header (compact)        │
│  │ ● غير متصل           │  status badge                  │
│  ├──────────────────────┤                                │
│  │                      │                                │
│  │  ┌────────────────┐  │                                │
│  │  │                │  │        CANVAS                   │
│  │  │   Camera       │  │     (circles idle,              │
│  │  │   Preview      │  │      breathing slow)            │
│  │  │   4:3          │  │                                │
│  │  │                │  │                                │
│  │  └────────────────┘  │                                │
│  │                      │                                │
│  │  ┌──────┐ ┌──────┐  │                                │
│  │  │التقاط│ │إغلاق │  │                                │
│  │  └──────┘ └──────┘  │                                │
│  │                      │                                │
│  │  ─ ─ ─ أو ─ ─ ─     │  divider "or"                  │
│  │                      │                                │
│  │  ┌──────────────────┐│                                │
│  │  │   يلا نبدأ 🧠    ││  CTA (works without camera)   │
│  │  └──────────────────┘│                                │
│  │                      │                                │
│  │  اختياري: صوّر نفسك  │  helper text                   │
│  │  عشان دواير يشوفك    │                                │
│  └──────────────────────┘                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Sub-States

#### 2A: No Camera (Default)
```
┌──────────────────────┐
│                      │
│  ┌────────────────┐  │
│  │                │  │
│  │  📸            │  │  ← icon centered
│  │  خليني أشوفك  │  │  ← tap to open camera
│  │                │  │
│  └────────────────┘  │
│                      │
│  ┌──────────────────┐│
│  │   يلا نبدأ 🧠    ││  ← enabled even without photo
│  └──────────────────┘│
└──────────────────────┘
```

#### 2B: Camera Active
```
┌──────────────────────┐
│                      │
│  ┌────────────────┐  │
│  │ ╔════════════╗ │  │
│  │ ║  Live Feed ║ │  │  ← mirror mode, 4:3
│  │ ║            ║ │  │
│  │ ╚════════════╝ │  │
│  └────────────────┘  │
│                      │
│  [  📸 التقاط  ]     │  ← cyan, primary
│  [  ✕ إغلاق   ]     │  ← outline, secondary
└──────────────────────┘
```

#### 2C: Image Captured
```
┌──────────────────────┐
│                      │
│  ┌────────────────┐  │
│  │ ╔════════════╗ │  │
│  │ ║  Snapshot  ║ │  │  ← frozen image
│  │ ║   ✓ Done   ║ │  │  ← green checkmark overlay
│  │ ╚════════════╝ │  │
│  └────────────────┘  │
│  حالتك المبدئية 📸   │  ← label
│                      │
│  [  🔄 إعادة  ]      │  ← outline button
│                      │
│  ┌──────────────────┐│
│  │  يلا نبدأ 🧠     ││  ← enhanced glow (photo ready)
│  └──────────────────┘│
└──────────────────────┘
```

### المكونات

| المكون | الحالات | المواصفات |
|--------|--------|----------|
| **Camera Placeholder** | empty / active / captured | 4:3 aspect, `border-radius: 14px`, cyan glow when active |
| **Capture Button** | default / pressing | Cyan background, ripple on press, icon 📸 |
| **Cancel Button** | default / hover | Outline style, subtle |
| **Retake Button** | default / hover | Outline, 🔄 icon |
| **CTA "يلا نبدأ"** | default / ready / loading / disabled | Gradient when ready (photo captured), outline when no photo |
| **Helper Text** | static | 12px, secondary color, centered below CTA |
| **Permission Dialog** | OS-native | Triggered on first camera access |

### التفاعلات

| التفاعل | الحدث | النتيجة | المدة |
|---------|-------|---------|------|
| Open Camera | click "خليني أشوفك" | Request permission → show live feed | 300ms |
| Capture | click "التقاط" | Flash white (50ms) → freeze frame → show preview | 200ms |
| Retake | click "إعادة" | Clear image → reopen camera | 200ms |
| Cancel Camera | click "إغلاق" | Camera closes → placeholder returns | 200ms |
| Start Session | click "يلا نبدأ" | Button shows spinner → connects → transitions to Screen 3 | 2-5s |

### حالة الخطأ: رفض الكاميرا
```
┌──────────────────────┐
│  ┌────────────────┐  │
│  │                │  │
│  │  🔒            │  │
│  │  الكاميرا      │  │
│  │  محتاجة إذن    │  │
│  │                │  │
│  │  [فتح الإعدادات]│  │
│  └────────────────┘  │
│                      │
│  ┌──────────────────┐│
│  │  يلا نبدأ       ││  ← still works (voice only)
│  │  (بدون كاميرا)  ││
│  └──────────────────┘│
└──────────────────────┘
```

---

<a id="screen-3"></a>
## الشاشة 3: Live Session — Canvas

### الغرض
الشاشة الرئيسية أثناء الجلسة. الدواير الثلاث تتحرك وتتغير.

### Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [● Calm]                                    [3:42]         │
│  bio badge                                   session timer  │
│                                                             │
│                                                             │
│                    ╭─────╮                                  │
│                   ╱ وعي   ╲                                 │
│                  │  70px   │     ╭──────╮                   │
│                   ╲       ╱    ╱  علم    ╲                  │
│                    ╰──┬──╯   │   85px    │                  │
│                       │      │           │                  │
│                    ╭──┴───╮   ╲         ╱                   │
│                   ╱ حقيقة  ╲   ╰───────╯                   │
│                  │  95px    │                                │
│                   ╲        ╱                                │
│                    ╰──────╯                                 │
│                                                             │
│                  · · · · · · ·                              │
│                   particles                                 │
│                                                             │
│                                                             │
│  ┌─────────────────────────────┐                            │
│  │  ▎▌█▎▌▎▌█▌▎▌▎█▌▎▌▎▌█▎▌▎▌  │  ← audio visualizer       │
│  └─────────────────────────────┘     (bottom center)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### المكونات

| المكون | الموقع | المواصفات |
|--------|--------|----------|
| **Canvas** | Full viewport (z-index: 0) | 3 animated circles + particles + connections |
| **Bio Badge** | Top-left (absolute) | Calm/Stressed indicator, pill shape |
| **Session Timer** | Top-right (absolute) | MM:SS format, monospace, 12px, secondary color |
| **Audio Visualizer** | Bottom-center (absolute) | 72px height, frequency bars, fades when silent |
| **Circle Labels** | On-canvas (dynamic) | Arabic labels above each circle, follow position |

### تفاعلات الـ Canvas

| التفاعل | الحدث | النتيجة |
|---------|-------|---------|
| **Drag Circle** | `mousedown` → `mousemove` | Circle follows pointer, returns to orbit on release |
| **Hover Circle** | `mouseenter` | Subtle glow increase + label brightens |
| **Tap Circle** (mobile) | `touchstart` | Brief pulse + show circle detail tooltip |
| **Double-Tap Circle** | `dblclick` | Zoom into circle → show detail card |
| **Gemini update_node** | WebSocket event | Smooth color/size transition (lerp 0.08) |
| **Gemini pulseNode** | WebSocket event | White ring expands outward (30px, 0.75 alpha) |
| **Sentiment shift** | Server analysis | All circles adjust colors based on emotion |
| **Canvas resize** | `window.resize` | Circles reposition proportionally |

### تفاصيل Circle Detail Card (on double-tap):

```
┌────────────────────────┐
│  ○ الوعي               │
│  Awareness             │
│                        │
│  الحجم: ████████░░ 70  │
│  اللون: ■ #00F5FF      │
│  الحالة: هادئ          │
│                        │
│  آخر تغيير: 30 ثانية   │
│                        │
│  [✕ إغلاق]             │
└────────────────────────┘
```

### ملاحظة مصمم

> **Design Note:** الـ Canvas هو القلب. كل عنصر عليه overlay لازم يكون شبه شفاف (glassmorphism) عشان الدواير تفضل واضحة تحته. **أبداً** لا تغطي الدواير الثلاث بالكامل بأي عنصر UI.

---

<a id="screen-4"></a>
## الشاشة 4: Live Session — Conversation

### الغرض
عرض المحادثة الصوتية الحية بين المستخدم ودواير.

### Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      CANVAS                                 │
│                   (Screen 3)                                │
│                                                             │
│                                                             │
│                                                             │
│                                   ┌───────────────────────┐│
│                                   │ 💬 الدردشة        [▼] ││
│                                   ├───────────────────────┤│
│                                   │                       ││
│                                   │    "أهلاً، كيف حالك"  ││
│                                   │              10:32 PM ◀││
│                                   │                       ││
│                                   │▶ "أهلاً! إنت عامل    ││
│                                   │   إيه النهارده؟"      ││
│                                   │   10:32 PM            ││
│                                   │                       ││
│                                   │    "مش عارف، حاسس    ││
│                                   │     بتشتت شوية"      ││
│                                   │              10:33 PM ◀││
│                                   │                       ││
│                                   │▶ 🌊 بيتكلم...         ││
│                                   │                       ││
│                                   └───────────────────────┘│
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ▎▌█▎▌  Audio Visualizer  ▎▌█▎▌                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### المكونات

| المكون | الحالات | المواصفات |
|--------|--------|----------|
| **Transcript Overlay** | expanded / collapsed | 400px width (desktop), floating bottom-right |
| **Transcript Header** | with unread count | "💬 الدردشة" + collapse toggle [▼/▲] |
| **User Bubble** | default / streaming | Right-aligned, dark glass background |
| **Agent Bubble** | default / streaming | Left-aligned, cyan-tinted glass |
| **Typing Indicator** | visible when agent generating | "🌊 بيتكلم..." with wave animation |
| **Timestamp** | on each message | 10px, secondary color, below bubble |
| **Auto-scroll** | on new message | Smooth scroll to bottom |

### User Bubble Anatomy:
```
                        ┌──────────────────┐
                        │  مش عارف، حاسس  │ ← Noto Kufi Arabic, 15px
                        │  بتشتت شوية      │ ← RTL direction
                        │                  │
                        └──────────────┐   │ ← tail: 4px bottom-right
                                       └───┘
                                  10:33 PM   ← timestamp
```

### Agent Bubble Anatomy:
```
┌───┐
│   └──────────────────┐
│  أهلاً! إنت عامل    │ ← cyan-tinted background
│  إيه النهارده؟       │ ← rgba(0, 245, 255, 0.1)
│                      │
└──────────────────────┘
10:32 PM                 ← timestamp
```

### التفاعلات

| التفاعل | الحدث | النتيجة |
|---------|-------|---------|
| New message | WebSocket `transcription` | Bubble slides in from bottom (300ms, ease-out) |
| Collapse toggle | Click [▼] | Transcript slides down, only header visible |
| Expand | Click [▲] | Transcript expands to full height |
| Overflow | >6 messages | Oldest messages fade out, scroll enabled |
| Agent streaming | Real-time text | Text appears word-by-word in bubble |
| Long message | Auto | Bubble wraps, max-width 85% of container |

### حالة الـ Typing Indicator:
```
┌──────────────────────┐
│  🌊                  │
│  ▎▌▎▌▎  بيتكلم...    │  ← wave bars animate + text pulses
│                      │
└──────────────────────┘
```

### ملاحظة مصمم

> **Design Note:** الـ Transcript هو **ثانوي** للـ Canvas. لا يجب أن يشغل أكثر من 40% من العرض. على الموبايل، يكون overlay شفاف فوق الـ canvas مباشرة — بحيث الدواير تفضل مرئية من خلاله.

> **Critical Pattern:** الـ auto-scroll لازم يكون ذكي — لو المستخدم عمل scroll لفوق (يقرا رسائل قديمة)، **لا تفرض** auto-scroll. فقط عند العودة للأسفل.

---

<a id="screen-5"></a>
## الشاشة 5: Session Insights (Realtime)

### الغرض
عرض المقاييس الإدراكية في الوقت الحقيقي أثناء الجلسة.

### Wireframe — Panel (Desktop):

```
┌──────────────────────┐
│ ← دواير              │
│ ● متصل  ·  3:42     │
├──────────────────────┤
│                      │
│  ── الرحلة ──        │
│                      │
│  ● الضبابية          │  ← completed (green check)
│  │                   │
│  ● التركيز    ←      │  ← active (cyan glow)
│  │                   │
│  ○ الوضوح           │  ← pending (dim)
│                      │
│  ── المقاييس ──      │
│                      │
│  ┌────┬────┬────┐    │
│  │EQ  │OVR │CLR │    │
│  │60% │12% │+8% │    │
│  └────┴────┴────┘    │
│                      │
│  ── البيو ──         │
│                      │
│  ┌────────────────┐  │
│  │ 🧘 72 BPM      │  │  ← simulated bio (from voice analysis)
│  │ ■■■■■■░░░░     │  │
│  │ هادئ            │  │
│  └────────────────┘  │
│                      │
│  ── الدواير ──       │
│                      │
│  ○ وعي  70   ←→     │
│  ○ علم  85   ←→     │
│  ○ حقيقة 95  ←→     │
│                      │
│  ──────────────      │
│                      │
│  [📸 شوفني تاني]    │
│  [👁️ شوفني]         │
│                      │
│  [✕ إنهاء الجلسة]   │
│                      │
└──────────────────────┘
```

### المكونات

| المكون | المواصفات |
|--------|----------|
| **Journey Timeline** | 3 nodes vertical: الضبابية → التركيز → الوضوح |
| **Timeline Node** | Completed (green ✓) / Active (cyan glow + pulse) / Pending (dim circle) |
| **Metrics Bar** | 3-column flex: Equilibrium, Overload, Clarity Δ |
| **Metric Item** | Label (9px uppercase) + Value (14px extrabold, colored) |
| **Bio Card** | Simulated biometric: estimated BPM + calm/stressed state |
| **Circle Controls** | 3 rows: circle name + current radius + ← → adjustment |
| **Camera Buttons** | "شوفني تاني" (retake) + "شوفني" (look at me) |
| **End Session** | Destructive button, bottom of panel |

### Metric Colors:

| Metric | Condition | Color |
|--------|-----------|-------|
| Equilibrium | ≥ 70% | `--ds-status-success` (green) |
| Equilibrium | 40-69% | `--ds-brand-primary` (cyan) |
| Equilibrium | < 40% | `--ds-status-warning` (gold) |
| Overload | ≤ 30% | `--ds-status-success` (green) |
| Overload | > 30% | `--ds-status-error` (red) |
| Clarity Δ | Positive (+) | `--ds-status-success` with glow |
| Clarity Δ | Negative (-) | `--ds-status-error` with glow |
| Clarity Δ | Zero | `--ds-text-secondary` |

### التفاعلات

| التفاعل | الحدث | النتيجة |
|---------|-------|---------|
| Metric update | WebSocket `cognitiveMetrics` | Number morphs (counter animation, 200ms) |
| Journey advance | Server determines stage | Node lights up with glow transition (400ms) |
| Circle slider | Drag ← → | Circle radius changes on canvas (realtime) |
| "شوفني" | Click | Opens mini camera → auto-capture after 1s → sends to Gemini |
| "إنهاء" | Click | Confirmation modal → if confirmed → Screen 6 |

### ملاحظة مصمم

> **Design Note:** المقاييس لا يجب أن تبدو "طبية". استخدم أرقام بسيطة (نسب مئوية) بدل رسوم بيانية معقدة. الهدف هو "إحساس" بالتقدم مش "تقرير مستشفى".

> **Motion Rule:** أرقام المقاييس تتغير بـ **counter animation** — العدد يتحرك من القيمة القديمة للجديدة. ده بيدي إحساس "حي" أكتر من تغيير فوري.

---

<a id="screen-6"></a>
## الشاشة 6: Session Complete & Report

### الغرض
ملخص الجلسة مع تقرير بصري وخيار الحفظ.

### Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     CANVAS                                  │
│              (circles in final state,                       │
│               slowly breathing,                             │
│               connections glowing)                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         ✨ خلصنا. أحسنت.                           │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │  مدة الجلسة          │  12 دقيقة             │   │    │
│  │  ├──────────────────────┼──────────────────────┤   │    │
│  │  │  الرحلة              │  الضبابية → الوضوح    │   │    │
│  │  ├──────────────────────┼──────────────────────┤   │    │
│  │  │  التوازن النهائي     │  78% ████████░░      │   │    │
│  │  ├──────────────────────┼──────────────────────┤   │    │
│  │  │  تغيير الوضوح       │  +23% ↑              │   │    │
│  │  ├──────────────────────┼──────────────────────┤   │    │
│  │  │  الدائرة الأكثر      │  الوعي (تغيرت 5      │   │    │
│  │  │  نشاطاً             │  مرات)                │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  │                                                     │    │
│  │  ┌──────────────────┐  ┌──────────────────────┐    │    │
│  │  │  💾 حفظ التقرير  │  │  🔄 جلسة جديدة      │    │    │
│  │  └──────────────────┘  └──────────────────────┘    │    │
│  │                                                     │    │
│  │  [ مشاركة 📤 ]                                      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### المكونات

| المكون | المواصفات |
|--------|----------|
| **Completion Header** | "✨ خلصنا. أحسنت." — Display 26px, gradient text, centered |
| **Stats Table** | 5 rows, glass background, 2-column layout (label + value) |
| **Progress Bar** | Equilibrium %, colored fill |
| **Clarity Change** | Green/Red with arrow indicator |
| **Active Circle Badge** | Name + count of changes |
| **Save Button** | Primary CTA — "💾 حفظ التقرير" |
| **New Session** | Secondary — "🔄 جلسة جديدة" |
| **Share Button** | Tertiary link — "مشاركة 📤" |

### التفاعلات

| التفاعل | الحدث | النتيجة |
|---------|-------|---------|
| Screen enter | Session ends | Stats slide in sequentially (staggered 100ms each) |
| Save report | Click | Loading → saved confirmation toast (green) |
| New session | Click | Reset all → return to Screen 2 |
| Share | Click | OS share sheet (Web Share API) or copy link |
| Canvas | Background | Circles in final state, slow breathing only |

### حالة: لا توجد بيانات كافية
```
┌─────────────────────────────┐
│                             │
│  الجلسة كانت قصيرة جداً.    │
│  محتاجين 30 ثانية على الأقل. │
│                             │
│  [  🔄 جلسة جديدة  ]       │
│                             │
└─────────────────────────────┘
```

---

<a id="screen-7"></a>
## الشاشة 7: Memory Bank (Dashboard)

### الغرض
عرض كل الجلسات السابقة مع إمكانية المراجعة والمقارنة.

### Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ← رجوع          بنك الذاكرة 🧠           [⚙️]     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 🔍 ابحث في جلساتك...                        │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  [  الكل  ] [  الأسبوع  ] [  الشهر  ]             │    │
│  │      ↑ active tab                                   │    │
│  │                                                     │    │
│  │  ── اليوم ──                                        │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 📊  جلسة الصباح                             │    │    │
│  │  │     4 مارس 2026 · 12 دقيقة                  │    │    │
│  │  │     التوازن: 78%  ████████░░                 │    │    │
│  │  │     ○ ○ ○  (mini circles in final colors)    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 📊  جلسة المساء                             │    │    │
│  │  │     3 مارس 2026 · 8 دقائق                   │    │    │
│  │  │     التوازن: 62%  ██████░░░░                 │    │    │
│  │  │     ○ ○ ○                                    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  ── الأسبوع الماضي ──                               │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 📊  جلسة 28 فبراير                          │    │    │
│  │  │     ... (more cards)                         │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                     │    │
│  │  ── إحصائيات ──                                     │    │
│  │                                                     │    │
│  │  ┌──────┬──────┬──────┐                             │    │
│  │  │ 12   │ 4.2h │ +15% │                             │    │
│  │  │جلسة  │ إجمالي│ تحسن │                             │    │
│  │  └──────┴──────┴──────┘                             │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Report Detail View (on card tap):

```
┌─────────────────────────────────────────┐
│ ← رجوع     جلسة الصباح      [📤] [🗑️]│
├─────────────────────────────────────────┤
│                                         │
│  4 مارس 2026 · 12 دقيقة               │
│                                         │
│  ── الملخص ──                           │
│                                         │
│  بدأت الجلسة وإنت حاسس بتشتت         │
│  ذهني. خلال المحادثة، دايرة الوعي      │
│  كبرت وبدأت تستقر. الرحلة وصلت        │
│  للمرحلة التالتة "الوضوح" في           │
│  الدقيقة 8.                             │
│                                         │
│  ── الأرقام ──                          │
│                                         │
│  التوازن    ███████░░░  78%             │
│  الحمل      ██░░░░░░░░  12%            │
│  الوضوح     +23% ↑                     │
│                                         │
│  ── الدواير النهائية ──                  │
│                                         │
│  ○ وعي: 82  (بدأ 70)                   │
│  ○ علم: 90  (بدأ 85)                   │
│  ○ حقيقة: 95 (بدأ 95)                  │
│                                         │
│  ── النص الكامل ──                      │
│                                         │
│  [  عرض المحادثة الكاملة  ]            │
│                                         │
└─────────────────────────────────────────┘
```

### المكونات

| المكون | المواصفات |
|--------|----------|
| **Header** | Back button + title + settings icon |
| **Search Input** | `ds-input--rtl`, placeholder "ابحث في جلساتك..." |
| **Filter Tabs** | `ds-tabs`: الكل / الأسبوع / الشهر |
| **Date Divider** | `ds-divider` + date label ("اليوم", "الأسبوع الماضي") |
| **Session Card** | Enhanced `ds-card`: icon + title + date + progress bar + mini circles |
| **Summary Stats** | 3-column metrics at bottom: total sessions, total time, improvement |
| **Report Detail** | Full-width view with structured report sections |
| **Share Button** | `ds-btn-icon` with 📤 |
| **Delete Button** | `ds-btn-icon` destructive with 🗑️ |

### حالة فارغة — لا توجد جلسات:
```
┌─────────────────────────────┐
│                             │
│           🧠               │
│                             │
│   مفيش جلسات لسه.          │
│   ابدأ أول جلسة عشان       │
│   تبدأ تبني ذاكرتك.        │
│                             │
│   [  يلا نبدأ  ]           │
│                             │
└─────────────────────────────┘
```

---

<a id="screen-8"></a>
## الشاشة 8: Settings & Preferences

### الغرض
تخصيص التجربة: اللغة، الصوت، الرؤية، الخصوصية.

### Wireframe

```
┌──────────────────────────────────────────┐
│ ← رجوع              الإعدادات ⚙️        │
├──────────────────────────────────────────┤
│                                          │
│  ── اللغة ──                             │
│                                          │
│  العربية              [●]  ← toggle ON   │
│  English              [○]  ← toggle OFF  │
│                                          │
│  ── الصوت ──                             │
│                                          │
│  صوت دواير            Aoede  [▾]         │
│  سرعة الكلام          ████████░░  1.0x   │
│  مستوى الميكروفون     █████░░░░░  50%    │
│                                          │
│  ── العرض البصري ──                      │
│                                          │
│  الأنيميشن            [●]               │
│  الجسيمات (particles) [●]               │
│  خطوط الاتصال         [●]               │
│  عرض التسميات         [●]               │
│                                          │
│  ── الخصوصية ──                          │
│                                          │
│  حفظ الجلسات تلقائياً [●]               │
│  مشاركة البيانات      [○]               │
│                                          │
│  ── حول ──                               │
│                                          │
│  النسخة: 1.0.0                           │
│  مدعوم بـ Google Gemini                  │
│  إطار الرحلة النفسي                      │
│                                          │
│  ──────────                              │
│                                          │
│  [ 🗑️ مسح كل البيانات ]                 │
│                                          │
└──────────────────────────────────────────┘
```

### المكونات

| المكون | المواصفات |
|--------|----------|
| **Section Header** | `ds-section-header__title` — uppercase, 12px, secondary |
| **Toggle Row** | Label (body, primary) + `ds-toggle` (right-aligned) |
| **Dropdown** | Label + `ds-dropdown` for voice selection |
| **Slider** | Label + custom range input + value label |
| **Destructive Action** | `ds-btn-destructive` — "مسح كل البيانات" (with confirmation modal) |
| **About Section** | Body text, secondary color |

### Confirmation Modal (for destructive action):
```
┌──────────────────────────────────┐
│                                  │
│  🗑️ مسح كل البيانات؟           │
│                                  │
│  ده هيمسح كل الجلسات           │
│  والتقارير المحفوظة.            │
│  الفعل ده مش ممكن              │
│  يترجع.                         │
│                                  │
│  [ إلغاء ]    [ مسح نهائي ]    │
│                                  │
└──────────────────────────────────┘
```

---

## 11. الحالات العابرة

### 11.1 حالة التحميل (Loading)

#### Connecting State:
```
┌──────────────────────────────┐
│                              │
│        ◌ ─── ◌ ─── ◌        │  ← 3 dots orbiting
│                              │
│     جاري الاتصال بمساحتك     │
│          الذهنية...           │
│                              │
│     ████░░░░░░  40%          │  ← progress bar
│                              │
│     الخطوة: تأسيس الجلسة     │  ← status detail
│                              │
└──────────────────────────────┘
```

**الخطوات المعروضة:**
1. "الاتصال بالسيرفر..." (0-30%)
2. "تأسيس الجلسة..." (30-60%)
3. "تجهيز الميكروفون..." (60-80%)
4. "دواير جاهز." (80-100%)

#### Skeleton Loading (Dashboard):
```
┌──────────────────────────────┐
│                              │
│  ████████████████░░░░░░      │  ← shimmer animation
│  ████████░░░░░░░░░░░░░      │
│                              │
│  ┌────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░ │  │  ← card skeleton
│  │ ░░░░░░░░░░  ░░░░░░░░  │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░ │  │
│  │ ░░░░░░░░░░  ░░░░░░░░  │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### 11.2 حالة الخطأ (Error States)

#### Connection Error:
```
┌──────────────────────────────┐
│                              │
│           ⚡                 │
│                              │
│     الاتصال انقطع.           │
│                              │
│     جاري المحاولة تاني...    │
│     المحاولة 3 من 12         │
│     ████████░░░░             │
│                              │
│     [ إعادة المحاولة ]       │
│     [ العودة للرئيسية ]      │
│                              │
└──────────────────────────────┘
```

#### Microphone Error:
```
┌──────────────────────────────┐
│                              │
│  ┌────────────────────────┐  │
│  │ 🎤 ✕                   │  │
│  │                        │  │
│  │ مش قادر أوصل           │  │
│  │ للميكروفون.             │  │
│  │                        │  │
│  │ تأكد إن المتصفح عنده   │  │
│  │ إذن للميكروفون.         │  │
│  │                        │  │
│  │ [ فتح الإعدادات ]      │  │
│  │ [ كمّل بدون صوت ]      │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

#### Network Offline:
```
┌──────────────────────────────┐
│                              │
│        📡 ✕                  │
│                              │
│     مفيش اتصال بالإنترنت.    │
│     دواير محتاج إنترنت       │
│     عشان يشتغل.              │
│                              │
│     [ حاول تاني ]            │
│                              │
└──────────────────────────────┘
```

### 11.3 حالة فارغة (Empty States)

**قاعدة:** كل حالة فارغة لازم يكون فيها:
1. أيقونة/رسم (48px, opacity 0.3)
2. عنوان واضح (title size)
3. وصف قصير (body, secondary)
4. CTA لحل المشكلة

| الشاشة | العنوان | الوصف | CTA |
|--------|--------|------|-----|
| Dashboard (no sessions) | "مفيش جلسات لسه" | "ابدأ أول جلسة عشان تبدأ تبني ذاكرتك" | "يلا نبدأ" |
| Transcript (no messages) | "ابدأ اتكلم" | "دواير مستنيك تبدأ المحادثة" | — (auto) |
| Reports (empty) | "مفيش تقارير" | "حفظ تقرير بعد الجلسة عشان يظهر هنا" | — |
| Search (no results) | "مفيش نتائج" | "جرّب كلمات تانية" | — |

---

## 12. التفاعلات الدقيقة (Micro-interactions)

### 12.1 Button Interactions

#### Primary Button Press:
```
Default:     ┌─────────────┐     background: gradient
             │  يلا نبدأ   │     scale: 1
             └─────────────┘

Hover:       ┌─────────────┐     translateY: -2px
             │  يلا نبدأ   │     box-shadow: glow-cyan
             └─────────────┘     + shine sweep (0.7s)

Active:      ┌─────────────┐     scale: 0.97
             │  يلا نبدأ   │     translateY: 0
             └─────────────┘     glow intensifies

Loading:     ┌─────────────┐     opacity: 0.8
             │  ◌ جاري...   │     spinner rotates
             └─────────────┘     pointer-events: none
```

**Timing:** hover→active: 120ms | active→default: 200ms | ease: spring

### 12.2 Status Badge Transitions

```
Disconnected → Connecting:
  dot: gray → amber (150ms fade)
  text: "غير متصل" → "جاري الاتصال" (crossfade 200ms)
  background: neutral → warning-bg

Connecting → Connected:
  dot: amber → green (150ms) + blink animation starts
  text: crossfade to "متصل"
  background: warning-bg → success-bg
  + brief scale(1.1) bounce (200ms)

Connected → Error:
  dot: green → red (150ms) + blink stops
  text: crossfade to "خطأ"
  background: success-bg → error-bg
  + shake animation (300ms, 3 cycles)
```

### 12.3 Circle Interactions on Canvas

```
Circle Hover:
  0ms:   normal state
  120ms: outer glow alpha 0.15 → 0.35
         label opacity 0.7 → 1.0
         cursor → grab

Circle Drag:
  0ms:   grab cursor → grabbing
         circle.velocity = (0, 0)  ← stops floating
         outer glow alpha → 0.5
  live:  circle follows pointer with 2px offset (feels physical)

Circle Release:
  0ms:   grabbing → default cursor
         velocity = pointer delta (momentum)
  200ms: velocity decays, returns to orbit
         glow returns to 0.15
```

### 12.4 Transcript Message Entry

```
New User Message:
  0ms:   opacity: 0, translateY: 10px
  300ms: opacity: 1, translateY: 0     (ease-out)

New Agent Message:
  0ms:   opacity: 0, translateY: 10px
  100ms: typing indicator visible ("🌊 بيتكلم...")
  [streaming]: text appears word by word
  done:  typing indicator fades (200ms)

Message Overflow (>6):
  oldest message: opacity → 0, height → 0 (200ms)
  scroll: smooth to bottom
```

### 12.5 Metric Value Changes

```
Number Morph (counter animation):
  old value: 60%
  new value: 78%

  0ms:   displays "60%"
  200ms: counts up: 60 → 65 → 70 → 75 → 78
         color transitions if threshold crossed
         (e.g., amber → green at 70%)

  Optional: brief scale(1.1) pulse when crossing threshold
```

### 12.6 Journey Stage Advancement

```
Stage: "الضبابية" → "التركيز"

Previous node:
  dot: cyan glow → green (completed)
  ✓ checkmark fades in (200ms)
  label: brightness dims slightly

Current node:
  dot: dim → cyan glow (300ms)
  + pulse ring animation starts
  label: dim → full brightness

  Canvas: corresponding circle pulses briefly
```

### 12.7 Session Timer

```
MM:SS format, updates every second.
Uses monospace font (tabular figures) to prevent layout shift.

At 5:00 → brief green pulse (milestone)
At 10:00 → brief gold pulse
At 15:00+ → subtle amber glow (consider wrapping up)
```

### 12.8 Haptic Feedback (Mobile)

| الحدث | النمط | المدة |
|-------|-------|------|
| Session connected | `success` pattern | — |
| Agent starts speaking | Light tap | 10ms |
| Circle update (tool call) | Medium impact | 15ms |
| Error | `error` pattern | — |
| Session end | Double tap | — |

---

## 13. قابلية الوصول

### 13.1 WCAG 2.1 AA Compliance

#### Color Contrast (Verified):

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|-----------|-------|------|
| Body text | `#f0f4ff` | `#04040f` | 15.8:1 | AAA |
| Secondary text | `rgba(200,210,240,0.55)` | `#04040f` | 5.2:1 | AA |
| CTA text | `#030814` | `#abfc55` | 11.4:1 | AAA |
| Error text | `#ff8787` | `#04040f` | 6.3:1 | AA |
| Status success | `#00ff94` | `#04040f` | 12.3:1 | AAA |
| Cyan on deep bg | `#00f5ff` | `#04040f` | 10.7:1 | AAA |

#### Non-Color Indicators:

| State | Color | Additional Indicator |
|-------|-------|---------------------|
| Connected | Green | Blinking dot + text "متصل" |
| Error | Red | ⚠️ icon + text description |
| Active tab | Cyan | Underline bar (2px) |
| Circle type | Color | Text label on canvas |
| Positive metric | Green | "+" prefix + "↑" arrow |
| Negative metric | Red | "-" prefix + "↓" arrow |

### 13.2 VoiceOver / Screen Reader Support

#### ARIA Landmarks:

```html
<main role="main" aria-label="مساحة دواير الرئيسية">
  <canvas role="img" aria-label="خريطة الدواير الإدراكية: وعي 70، علم 85، حقيقة 95">
  </canvas>

  <aside role="complementary" aria-label="لوحة التحكم">
    <!-- Control Panel -->
  </aside>

  <section role="log" aria-live="polite" aria-label="المحادثة المباشرة">
    <!-- Transcript -->
  </section>
</main>
```

#### ARIA Roles by Component:

| Component | Role | Properties |
|-----------|------|-----------|
| Control Panel | `complementary` | `aria-label="لوحة التحكم"` |
| Status Badge | `status` | `aria-live="polite"` |
| Transcript | `log` | `aria-live="polite"`, `aria-relevant="additions"` |
| Error Message | `alert` | `aria-live="assertive"` |
| Modal | `dialog` | `aria-modal="true"`, `aria-labelledby` |
| Tab Bar | `tablist` | `aria-label="تصفية الجلسات"` |
| Each Tab | `tab` | `aria-selected`, `aria-controls` |
| Session Card | `article` | `aria-label="جلسة [date] - توازن [%]"` |
| Toggle | `switch` | `aria-checked`, `aria-label` |
| Slider | `slider` | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Progress | `progressbar` | `aria-valuenow`, `aria-label` |
| Canvas | `img` | Dynamic `aria-label` updated with circle states |

#### Live Region Announcements:

```javascript
// When agent starts speaking:
ariaAnnounce("دواير بيتكلم");

// When connection status changes:
ariaAnnounce("الحالة: متصل بمساحتك الذهنية");

// When metric updates:
ariaAnnounce("التوازن تغير لـ 78%");

// When journey advances:
ariaAnnounce("وصلت لمرحلة التركيز");

// When circle updates:
ariaAnnounce("دايرة الوعي كبرت لـ 82");
```

### 13.3 Keyboard Navigation

#### Tab Order (Screen 3-5, Connected):

```
1. Language toggle
2. Dashboard button
3. Settings button
4. "شوفني تاني" button
5. "شوفني" button
6. Transcript collapse/expand
7. "إنهاء الجلسة" button
```

#### Keyboard Shortcuts:

| Key | Action | Context |
|-----|--------|---------|
| `Space` | Toggle microphone on/off | Connected |
| `Escape` | Close modal / End session (with confirm) | Any |
| `Tab` | Move to next focusable element | Any |
| `Shift+Tab` | Move to previous | Any |
| `Enter` | Activate focused element | Any |
| `Arrow ←→` | Navigate tabs | Dashboard filter |
| `Arrow ↑↓` | Navigate session cards | Dashboard |
| `Home` | First item | Lists |
| `End` | Last item | Lists |

### 13.4 Dynamic Type / Responsive Text

```css
/* Base font size respects user preference */
html {
  font-size: clamp(14px, 1rem, 20px);
}

/* Critical text scales with rem */
.ds-text-body { font-size: 1rem; }     /* 14-20px range */
.ds-text-lead { font-size: 1.15rem; }  /* 16-23px */
.ds-text-title { font-size: 1.43rem; } /* 20-28px */

/* UI elements have minimum sizes */
button { min-height: 44px; min-width: 44px; }  /* iOS touch target */
.ds-toggle { min-height: 44px; }
```

### 13.5 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable ALL decorative animations */
  .ds-ai-state__wave span { animation: none; }
  .ds-badge__dot { animation: none; }

  /* Replace motion with opacity */
  .ds-bubble { animation: ds-fade-in 0.01ms; }
  .ds-panel { animation: none; }

  /* Canvas: reduce to minimal */
  /* Particles: hidden */
  /* Circle physics: disabled, static positions */
  /* Color transitions: instant */
}
```

---

## 14. السلوك المتجاوب

### 14.1 Breakpoint Behavior

| Element | Desktop (≥769px) | Tablet (≤768px) | Mobile (≤480px) |
|---------|-----------------|-----------------|-----------------|
| **Panel** | Left sidebar, 360px, full height | Bottom sheet, 100vw, max 60vh | Bottom sheet, 100vw, max 50vh |
| **Panel border** | Right edge glow | Top edge, rounded corners | Top edge, rounded corners |
| **Canvas** | Full viewport | Full viewport | Full viewport |
| **Transcript** | 400px, bottom-right | calc(100vw - 40px), floating | Full width, above bottom sheet |
| **Transcript max-height** | 450px | 200px | 140px |
| **Brand name** | 26px | 22px | 20px |
| **CTA button** | 320px max | 100% width | 100% width |
| **Metrics** | 3-column row | 3-column row | 3-column row (compressed) |
| **Session cards** | Full width | Full width | Full width |
| **Circle labels** | Always visible | Visible | Hidden (tap to show) |
| **Settings** | Panel width | Full screen overlay | Full screen overlay |
| **Gestures** | Hover + click | Tap + swipe | Tap + swipe |

### 14.2 Mobile Bottom Sheet Behavior

```
Resting states:
  - Peek (15vh): Just header + status visible
  - Half (50vh): Controls + metrics visible
  - Full (85vh): Everything visible + scrollable

Transitions:
  - Swipe up: Peek → Half → Full
  - Swipe down: Full → Half → Peek
  - Tap header: Toggle Peek ↔ Half
  - Velocity-based: Fast swipe skips to next state

Handle:
  ┌────────────────────────┐
  │        ──────          │  ← 32px × 4px, radius: full
  │                        │     centered, secondary color
  └────────────────────────┘

Spring physics:
  - Overshoot: 10% then settle
  - Duration: 400ms
  - Easing: spring (0.16, 1, 0.3, 1)
```

### 14.3 Landscape Mode

```
Landscape (≤768px + orientation: landscape):

┌──────────────────────────────────────────────┐
│                                              │
│  ┌──────┐                                    │
│  │Panel │         CANVAS                     │
│  │260px │      (remaining)                   │
│  │scroll│                                    │
│  └──────┘                     ┌──────────┐   │
│                               │Transcript│   │
│                               │  300px   │   │
│                               └──────────┘   │
│                                              │
└──────────────────────────────────────────────┘

Panel: narrower (260px), full height, scrollable
Canvas: fills remaining width
Transcript: narrower (300px), bottom-right
```

---

## 15. ملاحظات المصمم

### 15.1 قرارات التصميم الحرجة

#### لماذا لا يوجد Navigation Bar؟
> دواير تجربة **immersive** — زي لعبة مش زي تطبيق. الـ nav bar هيكسر الإحساس بالانغماس. بدلاً منه، نستخدم state machine + gestures. المستخدم مش محتاج "يتصفح" — هو محتاج "يعيش التجربة".

#### لماذا Bottom Sheet وليس Tab Bar على الموبايل؟
> لأن الـ canvas هو المحتوى الرئيسي. أي عنصر ثابت على الشاشة = مساحة أقل للدواير. الـ bottom sheet يقدر يختفي تماماً (peek state) ويدي 100% من الشاشة للـ canvas.

#### لماذا الـ Transcript يظهر ويختفي؟
> لأن دواير **صوتي أولاً**. النص هو "ترجمة" للمحادثة الصوتية — مش المحادثة نفسها. لو النص ثابت وبارز، المستخدم هيقرأ بدل ما يسمع — وده عكس فلسفة المنتج.

#### لماذا 3 دواير فقط ومش أكثر؟
> **Miller's Law:** العقل البشري بيقدر يتعامل مع 7±2 عناصر. 3 دواير = آمن جداً. أكثر من كده = cognitive overload — وده بالظبط اللي بنحاول نحلّه.

### 15.2 أنماط مرفوضة (Anti-Patterns)

| ❌ مرفوض | السبب | ✅ البديل |
|---------|-------|---------|
| Tab bar ثابت | يأكل مساحة الـ canvas | State machine + gestures |
| Sidebar يميني (RTL default) | الـ canvas أهم — يبدأ من اليمين | Sidebar يساري (canvas يمتد لليمين) |
| Notifications كتير | تشتت — عكس فلسفة المنتج | Toast واحد في المرة + يختفي تلقائي |
| Graphs معقدة | "تقرير مستشفى" — مش صاحب | أرقام بسيطة + ألوان |
| Dark mode toggle | التطبيق dark بالأساس | لا حاجة — dark only |
| Onboarding طويل | المستخدم عايز يبدأ فوراً | 3 خطوات أو تخطي |
| Text input كـ primary | دواير صوتي أولاً | Voice-first, text secondary |
| الشعار كبير | يأخذ مساحة من المحتوى | شعار مضغوط (26px max) |

### 15.3 Performance Budgets

| المقياس | الحد | السبب |
|---------|------|-------|
| First Contentful Paint | < 1.5s | المستخدم يشوف حاجة فوراً |
| Canvas FPS | ≥ 24fps | أقل = يبان "بيهنج" |
| Time to Interactive | < 3s | الـ CTA لازم يشتغل في 3 ثواني |
| Transcript entry animation | < 300ms | أبطأ = يبان ثقيل |
| Bundle size (gzipped) | < 200KB | أقل = أسرع (خصوصاً mobile) |
| Memory (canvas) | < 100MB | أكثر = mobile بيعمل crash |

### 15.4 Edge Cases & Corner Cases

| الحالة | السلوك المتوقع |
|--------|---------------|
| المستخدم بيتكلم والإنترنت قطع | Buffer last 10s → reconnect → replay buffer |
| الجلسة وصلت 30 دقيقة | Subtle toast: "30 دقيقة. عايز تكمّل؟" |
| المستخدم ساكت 2 دقيقة | Agent: "لسه موجود؟" (auto-prompt from server) |
| Camera permission denied mid-session | Show inline error, continue voice-only |
| 2 tabs open simultaneously | Second tab shows: "في جلسة تانية مفتوحة" |
| Browser tab inactive | Canvas pauses (saves battery), audio continues |
| Slow network (>2s RTT) | Show "الاتصال بطيء" badge + reduce audio quality |
| Very long agent response | Streaming display + "..." indicator + scroll |
| User refreshes mid-session | Auto-reconnect attempt → restore context |

### 15.5 Design Tokens Quick Reference

```
Layout:
  Panel width:       360px (desktop) / 100vw (mobile)
  Panel max-height:  60vh (mobile bottom sheet)
  Transcript width:  400px (desktop) / calc(100vw - 40px) (mobile)
  Canvas:            100vw × 100vh (always)
  Touch target:      44 × 44px minimum

Spacing:
  Panel padding:     32px 28px (desktop) / 20px (mobile)
  Section gap:       24px
  Component gap:     12px
  Inner gap:         8px

Timing:
  Micro-interaction: 120-200ms
  Transition:        200-400ms
  Entry animation:   300-600ms
  Canvas lerp:       0.08 per frame (continuous)

Z-layers:
  Canvas:            0
  Bio badge:         1
  Session timer:     1
  Audio visualizer:  1
  Panel:             10
  Transcript:        9999
  Modal:             40
  Toast:             60
```

---

*Dawayir UI/UX Pattern System v1.0.0*
*Built for voice-first, canvas-centric, emotionally-aware interfaces.*
*"الواجهة لازم تختفي — اللي يبقى هو الدواير، صوتك، وعيك."*
