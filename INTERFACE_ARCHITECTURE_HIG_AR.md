# Interface Architecture Spec — Apple HIG Lens (Arabic)

## Context
- التطبيق: Voice-first Cognitive Clarity App (Dawayir)
- المنصة: Web App (Responsive: Mobile + Desktop)
- Persona الأساسي: موظف/صانع قرار مرهق ذهنيًا يريد خطوة واضحة قابلة للتنفيذ بسرعة

---

## 1) البنية والتنقل

## Information Architecture
1. الدخول الأول (Onboarding)
2. الرئيسية/الجلسة الحية (Home)
3. الاستكشاف والبحث (Search/Browse)
4. تفاصيل العناصر (Detail)
5. الملف الشخصي (Profile)
6. الإعدادات (Settings)
7. حالات النظام (Empty/Error)

## نمط التنقل
- Mobile:
1. Bottom Navigation: Home / Browse / Dashboard / Profile
2. Full-screen overlays: Session, Modal, Error Recovery
- Desktop:
1. Left Sidebar + Top Utility Bar
2. Right-side contextual panel for session feedback

## Happy Path
1. دخول التطبيق
2. اختيار اللغة + إذن الميكروفون (اختياري)
3. بدء الجلسة
4. الحصول على Truth Contract
5. إنهاء الجلسة
6. مراجعة التقدم في Dashboard
7. تنفيذ الإجراء خلال 24 ساعة

## مسارات بديلة
1. رفض الميكروفون -> Text mode fallback
2. انقطاع الشبكة -> Recover state + Retry
3. لا يوجد بيانات -> Empty + CTA واضح
4. فشل أداة/خدمة -> رسالة قصيرة + Retry + Back

---

## 2) الشاشات الأساسية (8 إلزامية)

## الشاشة 1 — Onboarding
- الهدف: الوصول لأول قيمة بأقل خطوات.
- Wireframe نصي:
1. Logo + Value line
2. Language toggle (AR/EN)
3. Permission card (Mic optional)
4. Primary CTA: "ابدأ الآن"
- المكونات:
1. Progress indicator
2. Primary/Secondary buttons
3. Permission card
- التفاعلات:
1. Next/Back
2. Skip permission
- الإيماءات:
1. Swipe للتنقل بين الشرائح
- الحالات:
1. Loading: verifying environment
2. Error: permission denied
3. Success: onboarding complete

## الشاشة 2 — Home / Dashboard
- الهدف: بدء الجلسة ومتابعة آخر نتيجة.
- Wireframe نصي:
1. Status header
2. Primary session CTA
3. Live cognitive canvas
4. Latest Truth Contract card
5. Recent sessions snapshot
- المكونات:
1. StatusBadge
2. Card
3. Button
4. Metrics chips
- التفاعلات:
1. Start/Stop session
2. Open latest contract
- الإيماءات:
1. Tap/Long press
- الحالات:
1. Empty: no sessions yet
2. Error: connection unavailable
3. Loading: session preparation
4. Success: active session

## الشاشة 3 — Search / Browse
- الهدف: الوصول السريع للتقارير/العقود/الجلسات.
- Wireframe نصي:
1. Search input
2. Filter chips
3. Result list
- المكونات:
1. Input
2. Chips
3. List items
- التفاعلات:
1. Live search
2. Filter + sort
- الإيماءات:
1. Pull-to-refresh (mobile)
- الحالات:
1. Empty: no matches
2. Error: fetch failed
3. Loading: skeleton list
4. Success: results loaded

## الشاشة 4 — Details
- الهدف: فهم عنصر واحد واتخاذ إجراء.
- Wireframe نصي:
1. Title + metadata
2. Body content
3. Action row (Mark done / Share / Back)
- المكونات:
1. Card blocks
2. Badge states
3. CTA buttons
- التفاعلات:
1. Complete contract
2. Copy/share
- الإيماءات:
1. Swipe back (mobile)
- الحالات:
1. Error: item not found
2. Loading: detail skeleton
3. Success: completion toast

## الشاشة 5 — Profile
- الهدف: عرض هوية المستخدم وتقدمه.
- Wireframe نصي:
1. Avatar + name
2. Progress stats
3. Privacy and account actions
- المكونات:
1. Avatar
2. Stat cards
3. Action list
- التفاعلات:
1. Edit profile
2. Export data
- الحالات:
1. Empty avatar
2. Error sync
3. Success save

## الشاشة 6 — Settings
- الهدف: تحكم واضح وآمن في التفضيلات.
- Wireframe نصي:
1. Language section
2. Audio section
3. Notifications section
4. Privacy section
5. Danger zone
- المكونات:
1. Switch
2. RadioGroup
3. Select
4. Alert
- التفاعلات:
1. Instant apply
2. Confirm on destructive actions
- الحالات:
1. Loading settings
2. Error save
3. Success persisted

## الشاشة 7 — Empty State
- الهدف: توجيه المستخدم بوضوح نحو الخطوة التالية.
- Wireframe نصي:
1. Illustration/icon
2. One-line explanation
3. Single CTA
- المكونات:
1. EmptyState card
2. Primary button
- التفاعلات:
1. Go to start flow
- الحالات:
1. Empty only (recoverable by CTA)

## الشاشة 8 — Error State
- الهدف: استعادة المسار بسرعة وهدوء.
- Wireframe نصي:
1. Short error title
2. Simple cause statement
3. Primary Retry + Secondary Back
- المكونات:
1. Error alert
2. Retry button
3. Secondary action
- التفاعلات:
1. Retry with backoff
2. Fallback navigation
- الحالات:
1. Network
2. Auth
3. Tool/runtime

---

## 3) قابلية الوصول (Accessibility)

## WCAG Checklist
1. Contrast >= 4.5:1 للنص العادي
2. Contrast >= 3:1 للنص الكبير وUI boundaries
3. Focus indicator واضح وثابت
4. Touch target >= 44x44
5. No color-only meaning
6. Logical heading hierarchy
7. Form labels + error messaging linked via ARIA

## VoiceOver / Screen Reader
1. كل IconButton لديه `aria-label`
2. حالات الحالة تستخدم `role="status"` أو `role="alert"` حسب الأهمية
3. ترتيب القراءة يتبع ترتيب المحتوى البصري المنطقي

## Dynamic Type
1. مقياس 9 مستويات (xs -> 4xl)
2. لا يتم قص النص عند 200% zoom
3. الحفاظ على line-height مناسب للقراءة

## Keyboard Navigation
1. Tab order صحيح
2. Escape يغلق Modals/Drawers
3. Enter/Space لتفعيل الإجراءات
4. Arrow keys داخل Radio/Tablists

---

## 4) ملاحظات المصمم (قرارات غير واضحة)
1. الميكروفون اختياري افتراضيًا لتقليل حاجز الدخول.
2. CTA واحد أساسي لكل شاشة لتقليل الحمل المعرفي.
3. الأخطاء دائمًا تقدم Recovery action واضحًا (Retry أولًا).
4. النجاح يُقاس بـ Action completion وليس مدة الجلسة.
5. RTL default مع دعم LTR لضمان اتساق عربي-إنجليزي.
