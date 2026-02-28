1. Remove all logic related to text-to-speech (TTS) fallback mechanism since it is deprecated and no longer needed.
   - Remove `ttsFallbackEnabledRef`.
   - Remove `currentTurnModeRef`.
   - Remove `ttsDecisionTimeoutRef`.
   - Remove `pendingTtsTimeoutRef`.
   - Remove `speakTextFallback` and `stopTextToSpeechFallback` functions.
   - Clean up inside `clearPendingTts` or remove it.
   - Clean up inside `resetAgentTurnState`.
   - Clean up the `App.jsx` deeply nested condition around `currentTurnModeRef` and `ttsFallbackEnabledRef`.
   - Replace the `ttsFallbackEnabledRef` check with just releasing the mic check since TTS fallback is removed, meaning we always just do the wait and release mic if no audio yet so the conversation doesn't get stuck on text-only responses.

2. Run linter and tests (pre-commit steps) to make sure everything works smoothly.
3. Submit a PR outlining the changes.
