# Screenshot 6 Workaround - Live Camera Update

## Problem
We need Screenshot 6 showing the "Update Visual Context" button during a connected session, but connecting requires a running backend.

## Solution: Mock Connected State

### Option A: Quick CSS Trick (Easiest)

1. Open the app in browser: `http://localhost:5173/`
2. Open DevTools (F12)
3. In Console, paste this:

```javascript
// Mock connected state
document.querySelector('.primary-btn').click(); // Click connect
```

Wait, that won't work without backend...

### Option B: Create a Temporary "Screenshot Mode"

Add this button to the UI temporarily:

1. Find the "Enter the Mental Space" button
2. Add a temporary button that sets `isConnected = true` without actually connecting

Let me create a simple patch...

### Option C: Use Existing Screenshots + Photoshop

If we can't get the backend running:
1. Take Screenshot 4 (connected state) from an earlier working session
2. Manually add the camera UI elements in an image editor
3. Not ideal but works for demo purposes

### Option D: Just Run Backend (Best Solution)

The proper way:

1. Make sure you have `.env` in `server/` folder:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=8080
   ```

2. Run backend:
   ```bash
   cd server
   npm start
   ```

3. Run frontend:
   ```bash
   cd client
   npm run dev
   ```

4. Connect and take screenshot

---

## Current Status

- Screenshot 2: ✅ Camera Active (Pre-session)
- Screenshot 3: ✅ Snapshot Captured
- Screenshot 6: ⏳ Pending (needs connected state)

---

## Alternative: Skip Screenshot 6

Screenshot 6 is a "bonus" feature (live camera update). We can:
- Skip it for now
- Document the feature in README
- Show it in the demo video instead
- Judges will understand from the code that it exists
