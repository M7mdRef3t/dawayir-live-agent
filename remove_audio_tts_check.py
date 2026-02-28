import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

pattern = r"        // If TTS already started for this turn, ignore late model audio to avoid overlap\.\n        if \(currentTurnModeRef\.current !== 'tts'\) \{\n          currentTurnModeRef\.current = 'model';\n          clearPendingTts\(\);\n          for \(const blob of selectedAudioBlobs\) \{\n            if \(blob\?\.data\) \{\n              await playPcmChunk\(base64ToArrayBuffer\(blob\.data\), parsePcmSampleRate\(blob\.mimeType\)\);\n              setLastEvent\('audio_chunk'\);\n            \}\n          \}\n        \}"

replacement = """        clearPendingTts();
        for (const blob of selectedAudioBlobs) {
          if (blob?.data) {
            await playPcmChunk(base64ToArrayBuffer(blob.data), parsePcmSampleRate(blob.mimeType));
            setLastEvent('audio_chunk');
          }
        }"""

content = re.sub(pattern, replacement, content)

with open('client/src/App.jsx', 'w') as f:
    f.write(content)
