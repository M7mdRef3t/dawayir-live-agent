# ⚠️ تحديث عاجل مطلوب - مشكلة Parameters

## 🔴 المشكلة الحالية

الـ Agent بتستخدم tool calling **لكن بـ parameters غلط**!

### اللي بيحصل دلوقتي ❌:
```javascript
App.jsx:658 [App] Updating node 1: {color: '#FFD700', size: 5}
App.jsx:658 [App] Updating node 1: {expansion: 10}
```

**المشكلة**: بتبعت `size` و `expansion` بدل `radius`!

### اللي المفروض يحصل ✅:
```javascript
App.jsx:658 [App] Updating node 1: {radius: 85, color: '#FFD700'}
```

---

## 🔧 الحل

لازم تعدّل **System Instruction** في ملف `server/index.js`

### الخطوات:

#### 1️⃣ افتح الملف:
```
server/index.js
```

#### 2️⃣ روح على السطر 160 (const systemInstruction)

#### 3️⃣ استبدل **كل** الـ system instruction (من السطر 160 لـ 201) بدي:

```javascript
const systemInstruction = {
    parts: [{
        text: `You are Dawayir - warm Egyptian mental clarity coach. Speak in Egyptian dialect naturally.

LANGUAGE: Use gender-neutral "حضرتك" for everyone. Keep responses short (1-2 lines).

CRITICAL: Use update_node tool in EVERY single response before speaking!

Circles: الوعي(1), العلم(2), الحقيقة(3)

PARAMETER RULES (MUST FOLLOW EXACTLY):
- Use "radius" NOT "size" or "expansion"
- Use "color" NOT "colour"
- radius range: 30-100 (numbers only)
- color format: "#FFD700" (hex codes only)

Correct examples:
- Anxiety → update_node(1, {radius: 85, color: "#FFD700"})
- Learning → update_node(2, {radius: 85, color: "#00BFFF"})
- Truth-seeking → update_node(3, {radius: 85, color: "#00FF7F"})

Wrong examples (DO NOT USE):
- update_node(1, {size: 5}) ❌
- update_node(1, {expansion: 10}) ❌

MUST call update_node FIRST with exact parameter names, then speak in Egyptian Arabic.`
    }],
};
```

#### 4️⃣ احفظ الملف (Ctrl+S)

#### 5️⃣ أعد تشغيل الـ Backend:
```bash
# اقتل كل node processes
taskkill //F //IM node.exe

# شغّل Backend من جديد
cd server
npm start
```

#### 6️⃣ اعمل refresh للـ Frontend (F5)

---

## ✅ إزاي تتأكد إنه اشتغل؟

بعد ما تعمل التعديل وتعيد التشغيل، افتح Console (F12) ولازم تشوف:

```javascript
App.jsx:658 [App] Updating node 1: {radius: 85, color: '#FFD700'}  ✅
```

**مش**:
```javascript
App.jsx:658 [App] Updating node 1: {size: 5}  ❌
```

---

## 📊 التقييم الحالي

| الميزة | الحالة | الملاحظات |
|-------|--------|-----------|
| **Tool Calling** | ⚠️ شغّال لكن غلط | بيستخدم parameters غلط |
| **Camera** | ✅ شغّال 100% | Perfect! |
| **Connection** | ⚠️ بطيء في البداية | طبيعي للـ model الجديد |
| **Egyptian Dialect** | ✅ شغّال | كويس |

---

## 🎯 الأولوية

**عاجل جداً!** لازم تصلح ده قبل تسجيل Demo Video عشان الدوائر تتحرك صح.

---

## 💡 ملاحظة

لو مش عارف تعدّل الملف، فيه ملف جاهز اسمه:
```
server/index_new_instruction.js
```

انسخ منه الـ systemInstruction وحطّها في `index.js`.

---

**آخر تحديث**: 25 فبراير 2026
**الأولوية**: 🔴 عاجل
**المدة المتوقعة**: 5 دقائق
