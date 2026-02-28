import re

with open('client/src/App.jsx', 'r') as f:
    content = f.read()

# Pattern to find clearPendingTts
pattern = r"  const clearPendingTts = useCallback\(\(\) => \{\n    if \(ttsDecisionTimeoutRef\.current\) \{\n      window\.clearTimeout\(ttsDecisionTimeoutRef\.current\);\n      ttsDecisionTimeoutRef\.current = null;\n    \}\n    if \(pendingTtsTimeoutRef\.current\) \{\n      window\.clearTimeout\(pendingTtsTimeoutRef\.current\);\n      pendingTtsTimeoutRef\.current = null;\n    \}\n  \}, \[\]\);"

replacement = """  const clearPendingTts = useCallback(() => {
    if (ttsDecisionTimeoutRef.current) {
      window.clearTimeout(ttsDecisionTimeoutRef.current);
      ttsDecisionTimeoutRef.current = null;
    }
  }, []);"""

new_content = re.sub(pattern, replacement, content)

with open('client/src/App.jsx', 'w') as f:
    f.write(new_content)
