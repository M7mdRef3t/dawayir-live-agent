import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

# Pattern for stopTextToSpeechFallback
stop_pattern = r"  const stopTextToSpeechFallback = useCallback\(\(\) => \{[\s\S]*?\}, \[clearPendingTts\]\);\n\n"
content = re.sub(stop_pattern, "", content)

# Pattern for speakTextFallback
speak_pattern = r"  const speakTextFallback = useCallback\(\(text\) => \{[\s\S]*?\}, \[stopTextToSpeechFallback\]\);\n\n"
content = re.sub(speak_pattern, "", content)

with open('client/src/App.jsx', 'w') as f:
    f.write(content)
