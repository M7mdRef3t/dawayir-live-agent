# 🎬 Dawayir Demo Script - Gemini Live Agent Challenge

**Target Duration:** 3-4 minutes
**Goal:** Showcase "Live Agents" capabilities (Voice + Vision + Actions)
**Persona:** Warm Egyptian Coach (Dawayir)

---

## 🎥 Phase 1: The Hook (0:00 - 0:45)
**Action:** Open the app. Screen shows "Enter Mental Space".
**Narration:** "Meet Dawayir, a living mental clarity agent built with Gemini Live API."

**Interaction:**
1. Click **"Enter Mental Space"**.
2. **User:** "مساء الخير يا دوائر، أنا حاسس إن دماغي مشغولة أوي النهاردة."
3. **Agent (Voice):** "مساء النور يا صديقي. سلامتك من الدوشة. إيه اللي شاغل بالك بالتحديد؟"
4. **Visual:** The three circles (Awareness, Knowledge, Truth) appear floating gently.

## 🧠 Phase 2: The Core Loop (Voice & Visuals) (0:45 - 1:30)
**Action:** Show the circles reacting to conversation naturally.

**Interaction:**
1. **User:** "عندي شغل كتير ومش عارف أبدأ منين، حاسس بتوهان."
2. **Agent:** "التوهان ده طبيعي لما المهام تزيد. خلينا نكبر دايرة 'الوعي' شوية عشان نشوف الصورة أوضح. إيه أهم حاجة لازم تخلص دلوقتي؟"
3. **Visual:** The **"Awareness" (الوعي)** circle grows significantly (via `update_node` tool). The color shifts to a warmer, active tone.

## 👁️ Phase 3: Multimodal Vision (The "Wow" Factor) (1:30 - 2:30)
**Action:** Use the new **"👁️ Look at me"** button.

**Interaction:**
1. **User:** "بص عليا كده... باين عليا التعب؟"
2. **Action:** Click **"👁️ شوفني"** button.
3. **System:** Camera opens briefly -> Snapshot captured -> Sent to Gemini.
4. **Agent:** "يا خبر، شكلك مرهق فعلاً وعينيك دبلانة. بص، أنا هصغر دايرة 'العلم' شوية عشان مش وقت تحليل دلوقتي، وهكبر دايرة 'الحقيقة' عشان نواجه الواقع: أنت محتاج راحة حالاً."
5. **Visual:** 
   - **'Knowledge' (العلم)** shrinks (radius 35).
   - **'Truth' (الحقيقة)** grows (radius 90) and turns calm blue.

## 💾 Phase 4: Memory & Conclusion (2:30 - 3:30)
**Action:** Wrap up the session and demonstrate memory persistence.

**Interaction:**
1. **User:** "عندك حق. أنا هقوم أعمل قهوة وأفصل شوية."
2. **Agent:** "فكرة ممتازة. أنا حفظت الخريطة الذهنية دي عشان نكمل عليها المرة الجاية. يلا، قوم افصل وارجعلي لما تروق."
3. **Visual:** "Session Saved" notification or log appears (via `save_mental_map` tool).
4. **User:** Clicks **"End Session"**.

## 🚀 Closing (3:30 - 4:00)
**Screen:** Show the "Memory Bank" dashboard with the generated report.
**Narration:** "Dawayir uses Gemini 2.5 Flash on Google Cloud Run to create a real-time, multimodal feedback loop for mental wellness. It sees, hears, and visualizes your thoughts. Thank you."

---

## 🛠️ Technical Checklist for Demo
- [ ] Ensure backend is running on Cloud Run (or localhost tunnel for low latency).
- [ ] Use headphones to prevent echo (Gemini Live is sensitive).
- [ ] Have the "Look at me" button tested and ready.
- [ ] Speak clearly in Egyptian Arabic dialect.
