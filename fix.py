import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

search = """        bufferedTurnTextRef.current = `${bufferedTurnTextRef.current} ${textParts.join(' ')}`.trim();
        if (currentTurnModeRef.current === 'none' && ttsFallbackEnabledRef.current) {
          if (ttsDecisionTimeoutRef.current) {
            window.clearTimeout(ttsDecisionTimeoutRef.current);
          }
          ttsDecisionTimeoutRef.current = window.setTimeout(() => {
            if (currentTurnModeRef.current === 'none' && bufferedTurnTextRef.current.trim().length > 0) {
              currentTurnModeRef.current = 'tts';
              speakTextFallback(bufferedTurnTextRef.current.trim());
            }
            ttsDecisionTimeoutRef.current = null;
          }, 900);
        } else if (currentTurnModeRef.current === 'none' && !ttsFallbackEnabledRef.current) {
          // TTS disabled and no audio yet — release mic after a short wait
          // so conversation doesn't get stuck on text-only responses.
          if (ttsDecisionTimeoutRef.current) {
            window.clearTimeout(ttsDecisionTimeoutRef.current);
          }
          ttsDecisionTimeoutRef.current = window.setTimeout(() => {
            if (currentTurnModeRef.current === 'none' && isAgentSpeakingRef.current) {
              setIsAgentSpeaking(false);
              isAgentSpeakingRef.current = false;
            }
            ttsDecisionTimeoutRef.current = null;
          }, 1200);
        }"""

replace = """        bufferedTurnTextRef.current = `${bufferedTurnTextRef.current} ${textParts.join(' ')}`.trim();

        if (currentTurnModeRef.current === 'none') {
          // No audio yet — release mic after a short wait
          // so conversation doesn't get stuck on text-only responses.
          if (ttsDecisionTimeoutRef.current) {
            window.clearTimeout(ttsDecisionTimeoutRef.current);
          }
          ttsDecisionTimeoutRef.current = window.setTimeout(() => {
            if (currentTurnModeRef.current === 'none' && isAgentSpeakingRef.current) {
              setIsAgentSpeaking(false);
              isAgentSpeakingRef.current = false;
            }
            ttsDecisionTimeoutRef.current = null;
          }, 1200);
        }"""

if search in content:
    print("Found search block!")
    content = content.replace(search, replace)
    with open('client/src/App.jsx', 'w') as f:
        f.write(content)
else:
    print("Search block not found.")
