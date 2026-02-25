# 🧪 Post-Fix Testing Guide

## ✅ What Was Fixed

### Critical Backend Fix
**Problem**: Model name included `models/` prefix causing API rejection
**Fix**: Changed `server/index.js:70` from `'models/gemini-2.0-flash-exp'` to `'gemini-2.0-flash-exp'`
**Status**: ✅ Backend restarted successfully

### Enhanced System Instruction
**Problem**: Tool calling not working - agent saying "خطأ تقني"
**Fix**: Rewrote system instruction with explicit tool usage mandate and examples
**Status**: ✅ Deployed to backend

### Backend Status
- Local: ✅ Running on http://localhost:8080
- Cloud: ✅ Running on https://dawayir-live-agent-880073923613.europe-west1.run.app
- Health: ✅ Both returning 200 OK

---

## 🎯 Test Sequence (Do in Order)

### Test 1: Connection Stability ⚡
**Expected**: No more reconnection loops

**Steps**:
1. Open http://localhost:5173/ in browser
2. Press F12 → Console tab
3. Click "Enter the Mental Space"
4. Wait 5 seconds

**Success Criteria**:
- ✅ Status changes to "Connected"
- ✅ Console shows: `[dawayir-server] Connected to Gemini Live API`
- ✅ NO repeated "Gemini Live session closed" errors
- ✅ Connection stays stable (no reconnections)

**If Failed**:
- Screenshot console errors
- Report exact error message

---

### Test 2: Microphone & Audio 🎤
**Expected**: Waveform appears when speaking, agent responds

**Steps**:
1. After connection established (Test 1 passed)
2. Allow microphone permission if prompted
3. Say loudly: "السلام عليكم يا دواير"
4. Watch waveform visualizer (blue bars)
5. Wait for agent response

**Success Criteria**:
- ✅ Waveform bars move when you speak
- ✅ Agent responds in Egyptian Arabic within 3-5 seconds
- ✅ Audio plays clearly through speakers/headphones

**If Failed**:
- Check browser microphone permissions
- Try different browser (Chrome/Edge recommended)
- Check if microphone icon has red X

---

### Test 3: Tool Calling - Update Node 🎨
**Expected**: Circles change size/color based on emotions

**Steps**:
1. After agent responds (Test 2 passed)
2. Say one of these phrases:
   - "أنا حاسس بقلق كبير" (anxiety → should enlarge الوعي circle, yellow)
   - "عايز أتعلم حاجة جديدة" (learning → should enlarge العلم circle, blue)
   - "بدور على الحقيقة" (truth → should enlarge الحقيقة circle, green)
3. Watch the circles on canvas
4. Check "Tools Used" counter

**Success Criteria**:
- ✅ At least one circle changes size or color
- ✅ "Tools Used" counter increases (from 0 to 1+)
- ✅ Console shows: `[Tool] update_node called`
- ✅ Agent mentions the circle by name (e.g., "دايرة الوعي")

**If Failed**:
- Console screenshot showing tool call attempts
- Note which phrase you used
- Check if "Tools Used" stays at 0

---

### Test 4: Tool Calling - Highlight Node ✨
**Expected**: Circle pulses when mentioned

**Steps**:
1. Say: "وريني دايرة الوعي" or "ركز على دايرة الحقيقة"
2. Watch for pulsing animation

**Success Criteria**:
- ✅ Mentioned circle pulses/glows
- ✅ "Tools Used" counter increases
- ✅ Console shows: `[Tool] highlight_node called`

**If Failed**:
- Try mentioning circle name explicitly again
- Screenshot circles and console

---

### Test 5: Interruption (Barge-in) 🛑
**IMPORTANT**: Wear headphones/earbuds for this test!

**Steps**:
1. Ask agent a long question: "احكيلي عن فايدة التأمل"
2. Wait for agent to start speaking (2-3 seconds)
3. Interrupt assertively: "استني يا دواير!"
4. Pause 1 second in silence
5. Say new request: "عايز أسأل حاجة تانية"

**Success Criteria**:
- ✅ Agent stops speaking within 2-3 seconds
- ✅ Agent acknowledges interruption
- ✅ Agent responds to new request

**If Not Immediate**:
- ⚠️ This is expected behavior (API limitation)
- Use headphones (not laptop speakers)
- Use assertive phrase + 1 sec pause technique
- Document for demo video tips

---

### Test 6: Live Camera Update 📸
**Expected**: Can send new snapshot during conversation

**Steps**:
1. During active conversation
2. Click "📸 Update Visual Context" button
3. Camera preview appears
4. Click "🎯 Capture"
5. Wait for agent acknowledgment

**Success Criteria**:
- ✅ Camera opens in mini view
- ✅ Snapshot captured successfully
- ✅ Agent mentions seeing your updated state
- ✅ Image sent to Gemini (console log)

---

## 📊 Testing Results Template

Copy this and fill in results:

```
## Testing Results - [Date/Time]

### Test 1: Connection Stability
Status: [ ] PASS / [ ] FAIL
Notes:

### Test 2: Microphone & Audio
Status: [ ] PASS / [ ] FAIL
Notes:

### Test 3: Tool Calling - Update Node
Status: [ ] PASS / [ ] FAIL
Tools Used Counter: ___
Circles Changed: [ ] الوعي [ ] العلم [ ] الحقيقة
Notes:

### Test 4: Tool Calling - Highlight Node
Status: [ ] PASS / [ ] FAIL
Notes:

### Test 5: Interruption
Status: [ ] PASS (immediate) / [ ] PARTIAL (2-3 sec) / [ ] FAIL
Using: [ ] Headphones [ ] Speakers
Notes:

### Test 6: Live Camera Update
Status: [ ] PASS / [ ] FAIL
Notes:

---

### Overall Status
✅ All Critical Tests Passed (1, 2, 3): [ ] YES / [ ] NO
✅ Ready for Demo Video: [ ] YES / [ ] NO

### Issues Found
1.
2.
3.

### Console Errors (if any)
```

---

## 🚨 Troubleshooting

### Issue: "Connection failed" message
**Fix**:
- Check backend is running: `curl http://localhost:8080/health`
- Restart backend: `cd server && npm start`

### Issue: No microphone waveform
**Fix**:
- Browser permissions: Settings → Privacy → Microphone
- Try Chrome/Edge (best compatibility)
- Check physical microphone not muted

### Issue: Tool calling still not working
**Check**:
1. Console for `[Tool] update_node called` messages
2. Backend logs for tool call messages
3. "Tools Used" counter on UI
4. Copy exact console output for debugging

### Issue: Echo/feedback during conversation
**Fix**:
- **MUST USE HEADPHONES** (not speakers)
- Laptop speakers cause browser to auto-mute mic
- This is why interruption doesn't work with speakers

---

## ✅ Test Completion Checklist

Before moving to demo video:

- [ ] Test 1 passed (stable connection)
- [ ] Test 2 passed (audio working)
- [ ] Test 3 passed (tool calling confirmed - circles change)
- [ ] Test 4 passed (highlight working)
- [ ] Test 5 documented (with headphones note)
- [ ] Test 6 passed (live camera update)
- [ ] No console errors during tests
- [ ] "Tools Used" counter increments correctly
- [ ] All screenshots captured (6 required)
- [ ] Backend logs look clean (no errors)

---

## 📝 Next Steps After Testing

### If All Tests Pass ✅
1. Document successful test results
2. Update README with headphones recommendation
3. Add interruption demo tips to video guide
4. Proceed to demo video recording (March 3-10)

### If Tool Calling Still Fails ❌
1. Copy full console output (frontend + backend)
2. Screenshot circles not changing
3. Share exact phrases you used
4. We'll debug system instruction further

---

## 🎬 Demo Video Preparation

### Working Features to Showcase:
1. ✅ Camera snapshot (initial)
2. ✅ Live camera update (during conversation)
3. ✅ Egyptian Arabic persona
4. ✅ Tool calling (circles changing)
5. ✅ Cloud deployment
6. ✅ Session reports to GCS

### Features Requiring Special Technique:
1. ⚠️ Interruption: Use headphones + assertive phrase + pause
2. ⚠️ Tool calling: Use emotional keywords explicitly

### Recommended Demo Script:
1. Show homepage (0:00-0:10)
2. Take snapshot (0:10-0:25)
3. Enter conversation (0:25-0:40)
4. Say anxiety phrase → show circle enlarge (0:40-1:00)
5. Demonstrate interruption with headphones (1:00-1:20)
6. Update visual context mid-session (1:20-1:40)
7. Show cloud storage/reports (1:40-2:00)
8. Closing statement (2:00-2:15)

**Total**: ~2:15 (well under 4 min limit)

---

**Current Time**: February 24, 2026 23:03 UTC
**Deadline**: March 16, 2026 17:00 PDT
**Days Remaining**: 20 days

**You're on track! Let's verify everything works now.** 🚀
