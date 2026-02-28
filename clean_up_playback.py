import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

# Clean up stopPlayback
content = re.sub(r"  const stopPlayback = useCallback\(\(\) => \{\n    stopTextToSpeechFallback\(\);\n", r"  const stopPlayback = useCallback(() => {\n", content)
content = re.sub(r"  \}, \[stopTextToSpeechFallback\]\);", r"  }, []);", content)

# Clean up playPcmChunk
content = re.sub(r"    async \(arrayBuffer\) => \{\n      if \(!arrayBuffer \|\| arrayBuffer\.byteLength === 0\) return;\n\n      stopTextToSpeechFallback\(\);\n", r"    async (arrayBuffer) => {\n      if (!arrayBuffer || arrayBuffer.byteLength === 0) return;\n\n", content)
content = re.sub(r"    \[flushPcmChunks, stopTextToSpeechFallback\]", r"    [flushPcmChunks]", content)

with open('client/src/App.jsx', 'w') as f:
    f.write(content)
