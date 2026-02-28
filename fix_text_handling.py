import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

pattern = r"        if \(currentTurnModeRef\.current === 'none' && ttsFallbackEnabledRef\.current\) \{[\s\S]*?\} else if \(currentTurnModeRef\.current === 'none' && !ttsFallbackEnabledRef\.current\) \{[\s\S]*?            ttsDecisionTimeoutRef\.current = null;\n          \}, 1200\);\n        \}"

replacement = """        // No audio yet — release mic after a short wait
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
        }, 1200);"""

content = re.sub(pattern, replacement, content)

with open('client/src/App.jsx', 'w') as f:
    f.write(content)
