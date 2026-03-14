# Accessibility Audit — Dawayir Live Screen (Web)

## Scope
- Screen: Live Session + Setup entry points in `client/src/App.jsx`
- Platform: Web
- Method: Code audit against Perceivable / Operable / Understandable / Robust

---

## نتيجة سريعة
- Perceivable: ✅ يجتاز (مع تحذيرات طفيفة)
- Operable: ⚠️ تحذير
- Understandable: ✅ يجتاز
- Robust: ⚠️ تحذير

---

## Perceivable

### ✅ Pass
1. صور زخرفية تستخدم `aria-hidden` أو `alt=""` بشكل صحيح في أغلب الحالات.
2. Live transcript يستخدم `role="log"` و `aria-live="polite"`.
3. عناصر الحالة الديناميكية تستخدم `role="status"` في نقاط مهمة.

### ⚠️ Warning
#### مشكلة 1: اعتماد بصري قوي على اللون لبعض الحالات
- الأثر: مستخدمو عمى الألوان قد لا يميّزون بعض حالات النجاح/التحذير.
- الكود المعطوب (نمط شائع):
```css
.state-badge--warning { color: #F59E0B; }
```
- الكود الصحيح:
```jsx
<span className="state-badge state-badge--warning">
  <span aria-hidden="true">!</span>
  <span>تحذير</span>
</span>
```

---

## Operable

### ✅ Pass
1. Skip link موجود للوصول السريع للمحتوى الرئيسي.
2. معظم الأزرار عناصر `button` فعلية وليست `div` قابلة للنقر.

### ⚠️ Warning
#### مشكلة 2: أزرار لغة شاشة البداية كانت بدون `aria-label` واضح
- الأثر: قارئ الشاشة يقرأ نص مختصر غير كافٍ مثل "AR/EN".
- الكود المعطوب:
```jsx
<button className="icon-btn lang-toggle" onClick={() => setLang('ar')}>AR</button>
```
- الكود الصحيح (تم تطبيقه):
```jsx
<button
  aria-label="Switch to Arabic"
  title="Arabic"
  className="icon-btn lang-toggle"
  onClick={() => setLang('ar')}
>
  AR
</button>
```

#### مشكلة 3: تحقق مستمر مطلوب على touch targets
- الأثر: صعوبة اللمس الدقيق على الشاشات الصغيرة إذا انخفض الحجم عن 44x44.
- الكود المعطوب:
```css
.icon-btn { width: 32px; height: 32px; }
```
- الكود الصحيح:
```css
.icon-btn { min-width: 44px; min-height: 44px; }
```

---

## Understandable

### ✅ Pass
1. رسائل الحالة قصيرة ومباشرة.
2. نمط Recovery موجود (Retry/Back) في حالات الأعطال الأساسية.
3. الاتساق اللغوي مقبول (AR/EN).

---

## Robust

### ⚠️ Warning
#### مشكلة 4: استخدام `role="application"` على الحاوية الرئيسية
- الأثر: قد يغيّر سلوك قارئ الشاشة بشكل يضر التنقل القياسي.
- الكود المعطوب:
```jsx
<div role="application" ...>
```
- الكود الصحيح (تم تطبيقه):
```jsx
<div ...>
```

### ✅ Pass
1. Modal يستخدم `role="dialog"` + `aria-modal`.
2. حقول الإدخال الأساسية تستخدم `aria-invalid` و`aria-describedby`.

---

## ملخص الإصلاحات المطبقة
1. إزالة `role="application"` من جذر التطبيق.
2. إضافة `aria-label` و`title` واضحين لأزرار تبديل اللغة في شاشة البداية.

---

## توصيات لاحقة (Priority)
- P1: مراجعة contrast آلية على جميع تركيبات النص/الخلفية الديناميكية.
- P1: فحص tab order شامل أثناء overlays والجلسة الحية.
- P2: إضافة اختبار accessibility smoke خاص بالشاشة الحية (keyboard + live regions).
