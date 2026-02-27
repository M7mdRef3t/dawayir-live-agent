# Sentinel Journal
## 2026-02-27 - [CRITICAL] Path Traversal in File Download
**Vulnerability:** The `/api/reports/:filename` endpoint allowed fetching any file from the configured GCS bucket using arbitrary filenames, potential for enumeration or accessing unintended objects if bucket permissions were loose.
**Learning:** Even with cloud storage, direct parameter-to-key mapping requires strict validation.
**Prevention:** Whitelist allow-listed patterns (like `^session_report_\d+\.md$`) instead of blacklisting characters.
