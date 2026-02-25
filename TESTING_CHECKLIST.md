# 🧪 Comprehensive Testing Checklist
## Dawayir Live Agent - Pre-Submission Testing

**Date:** 24 February 2026
**Tester:** _____________
**Browser:** Edge / Chrome
**Environment:** Local / Cloud

---

## ✅ **Test Suite Overview**

| Category | Tests | Status |
|----------|-------|--------|
| **Camera Features** | 8 | ⏳ |
| **Voice Interaction** | 6 | ⏳ |
| **Tool Calling** | 4 | ⏳ |
| **Cloud Integration** | 5 | ⏳ |
| **UI/UX** | 7 | ⏳ |
| **Error Handling** | 5 | ⏳ |
| **Total** | **35** | **0/35** |

---

## 📸 **1. Camera Features (8 Tests)**

### **1.1 Pre-Session Camera**
- [ ] **Test:** Click "📸 Start Visual Pulse Check"
  - **Expected:** Browser asks for camera permission
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Grant camera permission
  - **Expected:** Live video preview appears immediately
  - **Expected:** "🎯 Take Snapshot" button visible
  - **Expected:** "❌ Close Camera" button visible
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Click "🎯 Take Snapshot"
  - **Expected:** Video freezes
  - **Expected:** Frozen image shown with "Your initial mindset:" heading
  - **Expected:** "🔄 Retake Snapshot" button appears
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Click "🔄 Retake Snapshot"
  - **Expected:** Camera reopens
  - **Expected:** Can capture new snapshot
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Click "❌ Close Camera" (without snapshot)
  - **Expected:** Camera closes
  - **Expected:** Button returns to "📸 Start Visual Pulse Check"
  - **Result:** ✅ / ❌ _____________

### **1.2 Live Session Camera Update**
- [ ] **Test:** Connect to session (use Shift+D for demo mode if needed)
  - **Expected:** "📸 Update Visual Context" button visible
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Click "📸 Update Visual Context"
  - **Expected:** Mini camera view opens
  - **Expected:** Live video visible in smaller container
  - **Expected:** "🎯 Capture" and "❌ Cancel" buttons visible
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Capture snapshot during session
  - **Expected:** Snapshot preview updates
  - **Expected:** New image replaces old one
  - **Result:** ✅ / ❌ _____________

---

## 🎤 **2. Voice Interaction (6 Tests)**

**Note:** Requires running backend with valid API key.

- [ ] **Test:** Click "Enter the Mental Space (with Vision)"
  - **Expected:** Button shows "Establishing Link..."
  - **Expected:** Connects to backend successfully
  - **Expected:** Status changes to "✨ Connection Secured"
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Browser asks for microphone permission
  - **Expected:** Mic permission requested
  - **Expected:** Mic: on (shown in footer)
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Speak into microphone
  - **Expected:** Waveform visualizer shows activity
  - **Expected:** Agent responds with voice
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Interrupt agent while speaking
  - **Expected:** Agent stops talking
  - **Expected:** Listens to your interruption
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Audio quality
  - **Expected:** Clear, no distortion
  - **Expected:** No echo or feedback
  - **Expected:** Latency < 2 seconds
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Egyptian Arabic persona
  - **Expected:** Agent responds in Egyptian Arabic
  - **Expected:** Warm, empathetic tone
  - **Result:** ✅ / ❌ _____________

---

## 🔧 **3. Tool Calling (4 Tests)**

- [ ] **Test:** Say something emotional (e.g., "أنا حاسس بقلق")
  - **Expected:** Agent calls `update_node` tool
  - **Expected:** One of the circles changes (size/color/position)
  - **Expected:** Tool count increments (shown in footer)
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Ask agent to highlight a specific domain
  - **Expected:** Agent calls `highlight_node`
  - **Expected:** Target circle glows/pulses
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Have a full conversation (3+ exchanges)
  - **Expected:** Agent calls `save_mental_map` at some point
  - **Expected:** No errors in console
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Canvas updates are smooth
  - **Expected:** No flickering
  - **Expected:** Animations are smooth (60fps)
  - **Expected:** Circles respond immediately to tool calls
  - **Result:** ✅ / ❌ _____________

---

## ☁️ **4. Cloud Integration (5 Tests)**

### **4.1 Backend Health**
- [ ] **Test:** Visit health endpoint
  - **URL:** `https://dawayir-live-agent-880073923613.europe-west1.run.app/health`
  - **Expected:** Returns "OK"
  - **Expected:** HTTP 200 status
  - **Result:** ✅ / ❌ _____________

### **4.2 WebSocket Connection**
- [ ] **Test:** Open DevTools → Network → WS tab
  - **Expected:** WebSocket connection established
  - **Expected:** Status: 101 Switching Protocols
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Check connection URL
  - **Expected:** Points to Cloud Run backend (wss://...)
  - **Result:** ✅ / ❌ _____________

### **4.3 Cloud Storage (if accessible)**
- [ ] **Test:** Check if mental maps are saved
  - **Expected:** JSON files in GCS bucket
  - **Result:** ✅ / ❌ / N/A _____________

- [ ] **Test:** Check if session reports are generated
  - **Expected:** Markdown files in GCS
  - **Result:** ✅ / ❌ / N/A _____________

---

## 🎨 **5. UI/UX (7 Tests)**

### **5.1 Visual Design**
- [ ] **Test:** Homepage appearance
  - **Expected:** Glassmorphism effects visible
  - **Expected:** Three circles (الحقيقة, الوعي, العلم) rendered
  - **Expected:** Smooth animations on load
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Responsive design (resize browser)
  - **Expected:** Layout adjusts gracefully
  - **Expected:** Buttons remain accessible
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Dark theme consistency
  - **Expected:** All elements readable on dark background
  - **Expected:** Colors harmonious
  - **Result:** ✅ / ❌ _____________

### **5.2 Buttons & Interactions**
- [ ] **Test:** All buttons have hover effects
  - **Expected:** Visual feedback on hover
  - **Expected:** Cursor changes to pointer
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Loading states
  - **Expected:** Spinner shown during connection
  - **Expected:** "Establishing Link..." text visible
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Status indicators
  - **Expected:** "Disconnected" (red dot) when not connected
  - **Expected:** "Connected" (green) when active
  - **Result:** ✅ / ❌ _____________

### **5.3 Accessibility**
- [ ] **Test:** Keyboard navigation
  - **Expected:** Can tab through buttons
  - **Expected:** Enter key activates buttons
  - **Result:** ✅ / ❌ _____________

---

## ⚠️ **6. Error Handling (5 Tests)**

### **6.1 Camera Errors**
- [ ] **Test:** Deny camera permission
  - **Expected:** Error message shown: "Camera permission denied..."
  - **Expected:** App still usable (can proceed without camera)
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Camera in use by another app
  - **Expected:** Graceful error message
  - **Expected:** Option to retry
  - **Result:** ✅ / ❌ / N/A _____________

### **6.2 Connection Errors**
- [ ] **Test:** Backend not reachable (stop backend if testing locally)
  - **Expected:** Connection fails gracefully
  - **Expected:** Error message shown
  - **Expected:** Reconnect option available
  - **Result:** ✅ / ❌ _____________

- [ ] **Test:** Disconnect during conversation
  - **Expected:** Reconnect attempted automatically
  - **Expected:** Retry count shown in footer
  - **Expected:** Max 3 attempts before giving up
  - **Result:** ✅ / ❌ _____________

### **6.3 Microphone Errors**
- [ ] **Test:** Deny microphone permission
  - **Expected:** Error message shown
  - **Expected:** Cannot connect without mic
  - **Result:** ✅ / ❌ _____________

---

## 📊 **Console Checks**

Open DevTools (F12) → Console:

- [ ] **No JavaScript errors** (except expected warnings)
- [ ] **Camera logs visible:** `[Camera] Starting camera...` etc.
- [ ] **WebSocket logs visible:** `[WS] Connected` etc.
- [ ] **Tool call logs visible:** `[Tool] update_node called` etc.

**Console Output Sample:**
```
[Camera] Starting camera...
[Camera] Permission granted...
[Camera] ✅ Camera activated successfully
[WS] Connecting to wss://...
[WS] Connected
[Gemini] Session started
[Tool] update_node called with params: {...}
```

**Any Errors?** _____________

---

## 🌐 **Cross-Browser Testing**

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Edge | Latest | ⏳ | Primary target |
| Chrome | Latest | ⏳ | Should work identical |
| Firefox | Latest | ⏳ | May need testing |
| Safari | Latest | ⏳ | MacOS only |

---

## 📱 **Mobile Testing (Optional)**

- [ ] **Test on Android Chrome**
  - **Expected:** Camera works
  - **Expected:** Voice works
  - **Result:** ✅ / ❌ / N/A

- [ ] **Test on iOS Safari**
  - **Expected:** Camera works
  - **Expected:** Voice works
  - **Result:** ✅ / ❌ / N/A

---

## 🐛 **Bugs Found**

| # | Bug Description | Severity | Status |
|---|----------------|----------|--------|
| 1 | _______________ | High/Med/Low | Open/Fixed |
| 2 | _______________ | High/Med/Low | Open/Fixed |
| 3 | _______________ | High/Med/Low | Open/Fixed |

---

## ✅ **Sign-Off**

**Tested By:** _____________
**Date:** _____________
**Overall Status:** Pass / Fail / Needs Work

**Tests Passed:** _____ / 35
**Critical Issues:** _____
**Ready for Demo Video:** Yes / No

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🚀 **Next Steps After Testing**

- [ ] Fix any critical bugs
- [ ] Re-test failed scenarios
- [ ] Update README if workflow changed
- [ ] Proceed to demo video recording

---

**Testing Complete!** 🎉

_This checklist ensures Dawayir is demo-ready and submission-worthy._
