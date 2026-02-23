# Demo Video Production Guide
# Dawayir Live Agent - Google Gemini Live Agent Challenge

**Target Duration:** 3:00 to 3:45 (maximum 4:00)
**Required by:** March 16, 2026

---

## 🎯 Video Objectives

1. **Demonstrate the Live Agent** working in real-time
2. **Show interruption handling** (key competition requirement)
3. **Prove cloud deployment** (Google Cloud Run)
4. **Highlight unique features** (voice + visual tool calling)
5. **Make judges excited** about the project

---

## 📋 Pre-Recording Checklist

### Environment Setup
- [ ] **Stable internet connection** (test speed: >10 Mbps up/down)
- [ ] **Clean browser profile** (no extensions that might interfere)
- [ ] **Close sensitive tabs** (no personal info visible)
- [ ] **Disable notifications** (Windows/Mac notification center)
- [ ] **Clean desktop** (professional background, no clutter)
- [ ] **Good lighting** (if showing webcam, not required)
- [ ] **Quiet room** (no background noise)

### Software Setup
- [ ] **Recording software installed** (see recommendations below)
- [ ] **Microphone tested** (clear audio, no echo)
- [ ] **Screen resolution set** to 1920x1080
- [ ] **Backend running** (local or cloud, test first!)
- [ ] **Frontend running** (Vite dev server ready)

### Recording Software Recommendations

**Windows:**
- OBS Studio (free, professional)
- ShareX (free, simple)
- Camtasia (paid, excellent editing)
- Windows Game Bar (built-in, basic)

**Mac:**
- QuickTime Screen Recording (built-in)
- ScreenFlow (paid, excellent)
- OBS Studio (free, cross-platform)

**Linux:**
- OBS Studio
- SimpleScreenRecorder
- Kazam

**Settings:**
- Resolution: 1920x1080
- Frame rate: 30fps (or 60fps if smooth)
- Bitrate: 5-10 Mbps
- Audio: 44.1kHz, stereo, -12dB to -6dB levels

---

## 🎬 Recording Script (Follow PITCH_SCRIPT.md)

### Scene 1: Hook (0:00 - 0:20)
**Visual:** App homepage with circles visible, clean UI

**Voiceover Script:**
> "Most AI assistants respond in text, but your mental state is not text-only. It is dynamic and emotional. Dawayir turns that into a live, visible space."

**Camera Movement:**
- Start with full app view
- Slow zoom into canvas showing the three circles
- Highlight glassmorphism effects

**Duration:** 20 seconds

---

### Scene 2: What This Agent Does (0:20 - 0:55)
**Visual:** Show status badge, backend URL, debug line

**Voiceover Script:**
> "Dawayir is a Gemini Live Agent. You speak naturally, it responds with live audio, and it can call tools to modify your circle map in real time. Built with Google GenAI SDK and deployed on Google Cloud Run."

**What to Show:**
- Point to backend URL (show it's cloud: europe-west1.run.app)
- Show debug line briefly
- Show "Start Gemini Live Journey" button

**Duration:** 35 seconds

---

### Scene 3: Live Interaction + Tool Call (0:55 - 1:45)
**Visual:** Real-time demonstration of voice interaction

**Action:**
1. Click "Start Gemini Live Journey"
2. Grant microphone permission (show briefly)
3. Wait for "Connected to Gemini Live" status
4. Speak clearly: **"Make the Truth circle larger and turn it yellow"**
5. Wait for agent response (voice)
6. Show circle mutation happening

**Voiceover (while demo happens):**
> "This is not a static response. The agent changes the environment using function calls. Watch as I ask it to modify the Truth circle."

**What Must Be Visible:**
- ✅ Status changing to "Connected"
- ✅ Waveform showing audio input
- ✅ Agent voice response playing
- ✅ Circle #3 (Truth) growing and changing to yellow
- ✅ Tool counter incrementing in debug line

**Duration:** 50 seconds

**⚠️ Critical:** This is the CORE demo. Practice this multiple times!

---

### Scene 4: Interruption Test (1:45 - 2:25)
**Visual:** Demonstrate interruption handling

**Action:**
1. Ask a question that triggers longer response: "Tell me about the Awareness circle"
2. Let agent start speaking
3. **Interrupt mid-sentence:** "Stop, focus on Science instead"
4. Show agent pivoting immediately

**Voiceover:**
> "Low-latency interruption handling is a core requirement for Live Agents. Watch how the agent stops and pivots when I interrupt."

**What Must Be Visible:**
- ✅ Agent speaking (waveform active)
- ✅ Interruption happening (you speaking over agent)
- ✅ Agent stopping immediately
- ✅ New response addressing Science circle
- ✅ Possible highlight or update on Science circle

**Duration:** 40 seconds

**💡 Tip:** This demonstrates the "Live" aspect—very important for judges!

---

### Scene 5: Resilience Proof (2:25 - 2:55)
**Visual:** Optional but impressive—show reconnect behavior

**Action (choose one):**
1. **Option A:** Briefly disconnect network, show bounded retries, reconnect
2. **Option B:** Show multiple successful interactions without breaking
3. **Option C:** Click disconnect button, then reconnect successfully

**Voiceover:**
> "The client uses bounded reconnect attempts and clear fallback messaging, so failures are visible and recoverable. This ensures production-grade reliability."

**What to Show:**
- Debug line showing retry attempts (if disconnected)
- Clear error messaging (if applicable)
- Successful recovery
- OR: smooth multi-turn conversation without issues

**Duration:** 30 seconds

**Note:** Can be shortened if time is tight—not as critical as interruption demo

---

### Scene 6: Cloud Proof (2:55 - 3:20)
**Visual:** Switch to Google Cloud Console

**Action:**
1. Open new tab → Google Cloud Console
2. Navigate to Cloud Run → Services
3. Show `dawayir-live-agent` service
4. Show service URL
5. Show health endpoint (optional: curl in terminal)

**Voiceover:**
> "The backend is deployed on Google Cloud Run and proxies real-time WebSocket traffic to Gemini Live using the Google GenAI SDK. Here's the running service in the Google Cloud Console."

**What Must Be Visible:**
- ✅ Cloud Run service page
- ✅ Service name: dawayir-live-agent
- ✅ URL: https://dawayir-live-agent-880073923613.europe-west1.run.app
- ✅ Status: Running/Healthy
- ✅ Region: europe-west1

**Duration:** 25 seconds

---

### Scene 7: Close (3:20 - 3:45)
**Visual:** Return to app, show it working smoothly, or show GitHub repo

**Voiceover:**
> "Dawayir demonstrates a practical future for live, multimodal coaching agents: spoken, interruptible, and world-changing in real time. Built with Google GenAI SDK, Gemini Live API, and deployed on Google Cloud. All code is open source on GitHub. Thank you!"

**What to Show:**
- App still running smoothly
- GitHub repository (optional: show README briefly)
- Architecture diagram (optional: 2-3 seconds)

**Duration:** 25 seconds

**End Screen (optional 5 seconds):**
- Project name: Dawayir Live Agent
- GitHub: github.com/M7mdRef3t/dawayir-live-agent
- Built for: Google Gemini Live Agent Challenge

---

## 🎤 Voice-Over Tips

### Delivery
- **Speak clearly and confidently**
- **Moderate pace** (not too fast, not too slow)
- **Enthusiastic but professional** tone
- **Pause briefly** after key points
- **Emphasize** important features (interruption, tool calling, cloud)

### Audio Quality
- Use a decent microphone (not laptop mic if possible)
- Record in quiet room
- Speak 6-12 inches from mic
- Avoid "popping" sounds (p, b, t)
- Monitor levels: -12dB to -6dB (not clipping!)

### Practice
- **Rehearse 3-5 times** before recording
- Time yourself (aim for 3:30, max 3:50)
- Record practice run and review
- Adjust pacing based on timing

---

## 🎥 Recording Tips

### Multiple Takes
- **Record 2-3 full takes** minimum
- Don't stop if you make small mistake—finish the take
- Review each take before deleting
- Choose best take or combine best parts

### What to Avoid
- Long silences (dead air)
- Ums, uhs, filler words
- Mouse cursor wandering aimlessly
- Clicking around without purpose
- Visible personal information
- API keys or secrets on screen

### What to Include
- Smooth transitions between scenes
- Clear demonstration of each feature
- Visible proof of cloud deployment
- Working features (not errors!)

---

## ✂️ Post-Production Editing

### Required Edits
1. **Trim** dead air at start/end
2. **Cut** long pauses or mistakes
3. **Ensure** total duration < 4:00 minutes
4. **Export** in MP4 format (H.264 codec)

### Optional Enhancements
1. **Title Card** (5 seconds at start):
   - "Dawayir Live Agent"
   - "Google Gemini Live Agent Challenge"
   - Your name/team name

2. **Captions/Subtitles**:
   - Highly recommended for accessibility
   - Use YouTube auto-captions + manual review
   - Or add hardcoded subtitles in editor

3. **Music**:
   - Soft background music (very low volume)
   - Ensure it doesn't distract from voiceover
   - Use royalty-free music only

4. **Transitions**:
   - Simple cuts (no fancy effects needed)
   - Optional fade between major scenes

5. **Highlight Important Moments**:
   - Zoom in when tool call happens
   - Circle or highlight UI elements briefly
   - Don't overdo effects!

### Editing Software

**Free:**
- DaVinci Resolve (professional, free)
- Shotcut
- OpenShot
- iMovie (Mac)

**Paid:**
- Adobe Premiere Pro
- Final Cut Pro (Mac)
- Camtasia

---

## 📤 Export Settings

### Video
- **Format:** MP4 (H.264)
- **Resolution:** 1920x1080 (1080p)
- **Frame Rate:** 30fps (match recording)
- **Bitrate:** 8-15 Mbps (CBR or VBR)
- **Codec:** H.264 (most compatible)

### Audio
- **Codec:** AAC
- **Sample Rate:** 44.1kHz or 48kHz
- **Bitrate:** 192kbps (stereo)
- **Channels:** Stereo

### File Size
- Target: 50-200 MB for 3-4 minute video
- Maximum: 500 MB (for upload platforms)

---

## 🌐 Upload & Hosting

### Primary: YouTube
1. Upload to YouTube (your account)
2. Set visibility: **Unlisted** (safer) or Public
3. Title: "Dawayir Live Agent - Google Gemini Live Agent Challenge Demo"
4. Description:
```
Dawayir is a real-time Live Agent built for the Google Gemini Live Agent Challenge.

Features:
✅ Real-time voice interaction using Gemini Live API
✅ Interruption handling
✅ Dynamic visual state manipulation via function calling
✅ Egyptian Arabic language support
✅ Deployed on Google Cloud Run

Built with Google GenAI SDK + Gemini 2.0 Flash

GitHub: https://github.com/M7mdRef3t/dawayir-live-agent
Competition: https://geminiliveagentchallenge.devpost.com/

#GeminiLiveAgentChallenge #GeminiAI #GoogleCloud
```

5. Tags: GeminiAI, GoogleCloud, LiveAgents, AI, Gemini, Competition
6. Thumbnail: Upload custom thumbnail (screenshot of app)
7. Get shareable link

### Backup: Vimeo or Google Drive
- Upload same video to Vimeo (unlisted)
- OR: Upload to Google Drive, set sharing to "Anyone with link"
- Keep backup in case YouTube link breaks

### Test the Link
- Open in incognito/private window
- Verify video plays without login
- Check quality and audio
- Ensure < 4 minutes duration shown

---

## ✅ Pre-Upload Checklist

### Content Review
- [ ] All required scenes included (7 scenes)
- [ ] Interruption demo clearly visible
- [ ] Cloud deployment proof shown
- [ ] Tool calling demonstrated successfully
- [ ] Total duration < 4:00 minutes
- [ ] Audio clear and audible throughout
- [ ] No visible errors or crashes in demo

### Quality Review
- [ ] Video resolution 1080p
- [ ] No stuttering or lag in video
- [ ] Audio synchronized with video
- [ ] No background noise or echo
- [ ] Professional appearance

### Security Review
- [ ] No API keys visible
- [ ] No personal information on screen
- [ ] No sensitive tabs or windows
- [ ] No private data in screenshots

### Technical Review
- [ ] MP4 format (H.264)
- [ ] File size reasonable (< 500 MB)
- [ ] Compatible with YouTube/Vimeo
- [ ] Playable on all devices

---

## 📊 Final Quality Gates

### Must-Pass Criteria
1. ✅ **Duration:** 2:30 to 4:00 minutes (NOT over 4:00!)
2. ✅ **Demonstrates Live Agent:** Voice interaction clearly shown
3. ✅ **Shows Interruption:** User interrupts agent mid-speech
4. ✅ **Shows Tool Calling:** Circle changes based on voice command
5. ✅ **Cloud Proof:** Google Cloud Run service visible
6. ✅ **Audio Quality:** Clear voiceover, no background noise
7. ✅ **Video Quality:** Smooth, no lag, professional

### Should-Pass Criteria
1. ✅ Confident, enthusiastic delivery
2. ✅ Smooth transitions between scenes
3. ✅ All features work without errors
4. ✅ Professional appearance (clean UI, no clutter)
5. ✅ Captions/subtitles included (accessibility)

### Nice-to-Have
1. ✅ Engaging introduction
2. ✅ Background music (subtle)
3. ✅ Custom thumbnail
4. ✅ Title card
5. ✅ Multiple language support shown (Arabic + English)

---

## 🚨 Common Mistakes to Avoid

1. **Too Long:** Video over 4 minutes = disqualified!
2. **Too Quiet:** Audio too soft or mumbly
3. **Too Fast:** Speaking too quickly, rushing through demo
4. **No Interruption:** Forgetting to demo interruption handling
5. **Broken Demo:** Features don't work during recording
6. **Visible Secrets:** API keys or personal info on screen
7. **Poor Quality:** Low resolution, laggy video
8. **No Cloud Proof:** Forgetting to show Google Cloud deployment
9. **Dead Air:** Long silences with nothing happening
10. **No Testing:** Uploading without watching final video

---

## 📅 Production Timeline

### Week 1: Preparation (Mar 3-5)
- [ ] Finalize script (based on PITCH_SCRIPT.md)
- [ ] Set up recording environment
- [ ] Test all features (run acceptance suite)
- [ ] Practice 3-5 dry runs
- [ ] Time yourself, adjust pacing

### Week 2: Recording (Mar 6-7)
- [ ] Record Take 1
- [ ] Review and note improvements
- [ ] Record Take 2
- [ ] Record Take 3 (if needed)
- [ ] Select best take

### Week 3: Editing (Mar 8-9)
- [ ] Import into editor
- [ ] Trim and cut
- [ ] Add title card (optional)
- [ ] Add captions (recommended)
- [ ] Export final video

### Week 4: Upload (Mar 10)
- [ ] Upload to YouTube
- [ ] Upload backup to Vimeo/Drive
- [ ] Test links
- [ ] Add to DEVPOST_SUBMISSION.md
- [ ] Final review

### Buffer: Mar 11-15
- [ ] Keep time for re-recording if needed
- [ ] Address any feedback
- [ ] Final quality check

---

## 🎯 Success Metrics

**Your video is ready when:**
- ✅ You can watch it 3 times without cringing
- ✅ A friend/colleague says "that's impressive!"
- ✅ All features work perfectly in the recording
- ✅ Duration is 3:00 to 3:45 (with buffer under 4:00)
- ✅ You would hire this agent based on the demo
- ✅ YouTube link plays without issues

---

## 📞 Emergency Backup Plan

### If Demo Breaks During Recording
1. **Don't panic** - this is why we do multiple takes
2. **Stop recording gracefully**
3. **Check:** Backend running? API key valid? Network stable?
4. **Use DEMO_CHECKLIST.md** to diagnose
5. **Fix issue**
6. **Wait 5 minutes to calm down**
7. **Record again**

### If You Run Out of Time
**Minimum Viable Video (2:30 duration):**
1. Quick intro (15 sec)
2. Voice interaction + tool call (60 sec)
3. Interruption demo (30 sec)
4. Cloud proof (20 sec)
5. Closing (25 sec)

Cut: Resilience proof, detailed explanations

---

## 🏆 Pro Tips for Winning Video

1. **Show, Don't Tell:** Less talking, more demonstrating
2. **Energy:** Speak with enthusiasm (judges watch many videos!)
3. **Unique Feature:** Emphasize Arabic support + visual tool calling
4. **Reliability:** Show it works smoothly, no bugs
5. **Cloud Native:** Make Google Cloud deployment very clear
6. **Innovation:** Highlight what makes Dawayir different
7. **Polish:** Professional editing shows attention to detail
8. **Accessibility:** Captions show you care about users
9. **Story:** Tell why mental clarity coaching matters
10. **Call to Action:** End with GitHub link, invite to try it

---

**Ready to create an award-winning demo video! 🎬🏆**

**Remember:** The video is often the FIRST thing judges see. Make it count!
