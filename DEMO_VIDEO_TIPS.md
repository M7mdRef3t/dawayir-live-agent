# 🎬 Demo Video Recording Tips

## 🎯 Critical Success Factors

### Equipment Setup
- ✅ **MUST USE HEADPHONES/EARBUDS** - prevents echo, enables interruption
- ✅ Use external microphone if available (clearer audio)
- ✅ Good lighting for camera snapshot demonstration
- ✅ Clean browser (close unnecessary tabs)
- ✅ Full screen recording (1920x1080 recommended)

---

## 🗣️ Demonstrating Interruption (Barge-in)

### The Technique That Works
This is the **scientifically tested** method for showing interruption in your demo:

1. **Ask Long Question**: "احكيلي عن فايدة التأمل" (Tell me about benefits of meditation)
2. **Wait 2-3 seconds**: Let agent start speaking
3. **Interrupt Assertively**: "استني يا دواير!" (Wait, Dawayir!)
4. **Pause 1 Second**: Complete silence for VAD confirmation
5. **New Request**: "عايز أسأل حاجة تانية" (I want to ask something else)

### Why This Works
- **Headphones**: Prevents browser from auto-muting mic (echo cancellation)
- **Assertive Phrase**: Clear speech signal for Voice Activity Detection
- **1 Second Pause**: Gives Gemini time to confirm interruption intent
- **Continuation**: Shows agent actually responded to interruption

### What NOT to Do
- ❌ Don't use laptop speakers (mic will auto-mute)
- ❌ Don't interrupt with quiet/hesitant speech
- ❌ Don't continue talking immediately (pause needed)
- ❌ Don't expect instant response (2-3 sec is normal for API)

### Demo Video Narration
> "Notice I'm wearing headphones - this is important for interruption handling. Watch as I interrupt the agent mid-sentence... [demonstrate technique] ...and the agent adapts to my new request."

---

## 🎨 Demonstrating Tool Calling

### Guaranteed Phrases (Use These!)
These phrases have been tested to trigger tool calling:

**For الوعي (Awareness) - Yellow, Enlarged:**
- "أنا حاسس بقلق كبير" (I feel great anxiety)
- "عندي توتر ومش عارف أركز" (I have stress and can't focus)

**For العلم (Science) - Blue, Enlarged:**
- "عايز أتعلم حاجة جديدة" (I want to learn something new)
- "محتاج معلومات عن موضوع معين" (I need information about a topic)

**For الحقيقة (Truth) - Green, Enlarged:**
- "بدور على الحقيقة" (I'm searching for truth)
- "عايز أفهم نفسي أكتر" (I want to understand myself more)

### Camera Angles
1. **Full Screen View**: Show entire interface with circles visible
2. **Zoom In on Circles** (optional): If circles change is subtle
3. **Show "Tools Used" Counter**: Highlight counter incrementing

### Demo Video Narration
> "Watch the circles as I express emotion. When I say 'I feel great anxiety'... [pause] ...see how the Awareness circle enlarges and turns yellow? The agent is using real-time function calling to manipulate the visual canvas based on my emotional state. Notice the 'Tools Used' counter increased to 1."

---

## 📸 Demonstrating Live Camera Update

### The Flow
1. **Show Active Conversation**: Establish you're mid-session
2. **Point Out Button**: "During this conversation, I can update my visual context"
3. **Click Button**: "📸 Update Visual Context"
4. **Camera Opens**: Show mini preview appearing
5. **Capture**: Click "🎯 Capture"
6. **Agent Response**: Wait for agent to acknowledge new image

### Demo Video Narration
> "One unique feature of Dawayir is live visual updates. Even during an active conversation, I can send a new snapshot of my current state. The agent sees this updated image and can adapt its coaching based on my current facial expressions and emotional state."

---

## ⏱️ Timing Your Demo (< 4 Minutes!)

### Recommended Structure (2:30 total)

**Segment 1: Introduction (0:00-0:20)**
- Show homepage
- Brief explanation: "This is Dawayir, a multimodal mental clarity agent"
- Mention key features: "voice, vision, and living visual canvas"

**Segment 2: Camera Snapshot (0:20-0:40)**
- Click "Start Visual Pulse Check"
- Show camera preview
- Click "Take Snapshot"
- Show confirmation screen
- Narrate: "The agent can see my initial emotional state"

**Segment 3: Voice Connection (0:40-1:00)**
- Click "Enter the Mental Space"
- Show connection
- Greet agent: "السلام عليكم"
- Show agent response
- Highlight waveform visualizer

**Segment 4: Tool Calling Demo (1:00-1:30)**
- Say anxiety phrase
- **PAUSE and WAIT** - let circles change
- Point out visual change
- Highlight "Tools Used" counter
- Show console logs (optional)

**Segment 5: Interruption Demo (1:30-1:50)**
- Mention headphones
- Ask long question
- Demonstrate interruption technique
- Show agent adapting

**Segment 6: Live Camera Update (1:50-2:10)**
- Click "Update Visual Context"
- Show mini camera flow
- Agent acknowledges update

**Segment 7: Cloud/Conclusion (2:10-2:30)**
- Show session reports option
- Mention GCS storage
- Closing statement
- Competition hashtag

---

## 🎥 Recording Checklist

### Pre-Recording
- [ ] Backend running (`npm start` in server/)
- [ ] Frontend running (`npm run dev` in client/)
- [ ] Browser console open (F12) for technical credibility
- [ ] Good lighting (if showing face in snapshot)
- [ ] Headphones connected and working
- [ ] Microphone tested
- [ ] Screen recorder ready (OBS, Camtasia, etc.)
- [ ] Script/notes nearby (but don't read verbatim)
- [ ] Test run completed once

### During Recording
- [ ] Speak clearly and confidently
- [ ] PAUSE after each major action (let UI update)
- [ ] Don't rush tool calling demo (circles need time to change)
- [ ] Show "Tools Used" counter incrementing
- [ ] Mention you're using headphones during interruption demo
- [ ] Keep energy up (enthusiasm matters!)

### Post-Recording
- [ ] Trim dead air/mistakes
- [ ] Add title card: "Dawayir (دوائر) - Gemini Live Agent Challenge"
- [ ] Add captions/subtitles if speaking Arabic (accessibility++)
- [ ] Add text overlay for key features (optional but professional)
- [ ] Final duration: < 4 minutes (strict requirement!)
- [ ] Export in high quality (1080p, 30fps minimum)
- [ ] Upload to YouTube as **Unlisted** (not Private - Devpost needs access)

---

## 💡 Pro Tips

### Editing Tricks
1. **Speed Up Wait Times**: If waiting for agent response, speed up 1.5x until response starts
2. **Picture-in-Picture**: Show your face reacting to agent (builds connection)
3. **Text Overlays**: Highlight tool calls, circle changes with annotations
4. **Background Music**: Soft ambient music (low volume, don't overpower voice)

### Narration Style
- **Enthusiastic but Professional**: You're excited about tech, not selling snake oil
- **Explain Why, Not Just What**: "This matters because..."
- **Technical Credibility**: Show console, mention SDK, reference architecture
- **Concise**: Every second counts - no fluff

### Common Mistakes to Avoid
- ❌ Rambling introduction (get to the demo fast!)
- ❌ Not waiting for visual changes (circles take 1-2 seconds)
- ❌ Forgetting to mention headphones (judges will wonder why interruption is slow)
- ❌ Not showing "Tools Used" counter (proof tool calling works!)
- ❌ Video too long (>4 min = disqualified!)
- ❌ Uploading as "Private" on YouTube (use Unlisted!)

---

## 🏆 What Judges Want to See

### Technical Excellence (40%)
- ✅ Working Gemini Live API integration
- ✅ Real-time tool calling (show console logs)
- ✅ Cloud deployment proof (mention Cloud Run)
- ✅ Stable connection (no errors during demo)

### Innovation (30%)
- ✅ Unique features (live camera update, mental canvas)
- ✅ Cultural accessibility (Egyptian Arabic)
- ✅ Novel interaction model (not just chat)

### User Experience (20%)
- ✅ Smooth interactions
- ✅ Intuitive UI
- ✅ Visual polish (glassmorphism, animations)

### Presentation (10%)
- ✅ Clear explanation
- ✅ Professional video quality
- ✅ Engaging narrative
- ✅ Proper timing

---

## 📋 Final Quality Checklist

Before uploading to Devpost:

- [ ] Video shows working product (no bugs visible)
- [ ] Audio clear (no background noise)
- [ ] All key features demonstrated
- [ ] Tool calling visibly works (circles change)
- [ ] Interruption technique explained
- [ ] Live camera update shown
- [ ] Cloud/GCS mentioned
- [ ] Duration < 4 minutes
- [ ] YouTube link accessible (Unlisted, not Private)
- [ ] Title includes "Gemini Live Agent Challenge"
- [ ] Description includes repo link

---

## 🎬 Sample Script Template

```
[TITLE CARD: Dawayir - Gemini Live Agent Challenge]

Hi, I'm [Name], and this is Dawayir - a multimodal AI agent that goes beyond
traditional chatbots. Instead of text boxes, Dawayir creates a living mental
space using voice, vision, and real-time visual transformations.

[SHOW HOMEPAGE]

Let me show you how it works. First, Dawayir can see. I'll activate the camera
and take a snapshot of my initial emotional state.

[DEMONSTRATE CAMERA]

Now I'll enter the conversation. Notice the glassmorphic circles - these represent
mental domains that will transform based on what I share.

[DEMONSTRATE CONNECTION]

Watch what happens when I express emotion in Egyptian Arabic...

[SAY ANXIETY PHRASE - PAUSE - SHOW CIRCLES CHANGING]

See how the Awareness circle enlarged and turned yellow? That's real-time function
calling - the Gemini agent is using tools to physically manipulate the UI based on
my emotional state. The "Tools Used" counter confirms this.

[DEMONSTRATE INTERRUPTION]

One powerful feature is interruption handling. I'm wearing headphones for this.
Watch as I interrupt the agent mid-sentence...

[DEMONSTRATE TECHNIQUE]

And now for something unique - I can update my visual context even during the
conversation...

[DEMONSTRATE LIVE CAMERA UPDATE]

Behind the scenes, this is running on Google Cloud Run, using the Gemini 2.0
Flash Live API, with session reports stored on Google Cloud Storage for
long-term memory.

Dawayir proves that AI agents should be multimodal by design - seeing, hearing,
and visualizing your mental state in real-time.

Thank you for watching! Check out the code on GitHub and follow the journey
with #GeminiLiveAgentChallenge.

[END CARD: GitHub link, hashtag]
```

---

**Remember**: The demo doesn't need to be perfect. It needs to be clear, concise, and convincing. Show the working product, explain what makes it special, and keep it under 4 minutes.

**You've built something genuinely innovative. Now just show it off!** 🚀

---

_Last Updated: February 24, 2026_
_Optimized for Google Gemini Live Agent Challenge judging criteria_
