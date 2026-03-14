$file = "c:\Users\moham\Downloads\dawayir-live-agent\server\index.js"
$lines = [System.IO.File]::ReadAllLines($file, [System.Text.Encoding]::UTF8)

Write-Host "Total lines: $($lines.Length)"
Write-Host "Line 3317 (0-indexed 3316): $($lines[3316])"
Write-Host "Line 3318 (0-indexed 3317): $($lines[3317])"
Write-Host "Line 3319 (0-indexed 3318): $($lines[3318])"
Write-Host "Line 3355 (0-indexed 3354): $($lines[3354])"
Write-Host "Line 3356 (0-indexed 3355): $($lines[3355])"

# The corrupted block is lines 3318-3354 (1-indexed), i.e. 3317-3353 (0-indexed)
# Line 3318 starts: "        sendHybridStatus('starting', {"
# Line 3319 starts the garbage: "                        }"   <- belongs to onclose handler
# Lines 3320-3354 are the duplicated ensureUserAgentSession onclose content + duplicate processHybridControl header
# Lines 3355-3413 are correct (they have the proper processHybridControl)

# We need to replace lines 3317-3353 (0-indexed) with the correct 4 lines:
$correctReplacement = @(
    "        sendHybridStatus('starting', {",
    "            maxTurns: maxUserTurns,",
    "        });",
    "",
    "        const ready = await ensureUserAgentSession(lang);",
    "        if (!ready && hybridState.active) {",
    "            await stopHybridConversation('failed', {",
    "                message: lang === 'ar'",
    "                    ? 'تعذر فتح جلسة وكيل المستخدم الحي.'",
    "                    : 'Failed to open the live user-agent session.',",
    "            });",
    "            return;",
    "        }"
)

# Verify what we are replacing
Write-Host "`nLines to remove (3318-3354, 1-indexed):"
for ($i = 3317; $i -le 3353; $i++) {
    Write-Host "  [$($i+1)] $($lines[$i])"
}

Write-Host "`nFirst line after removal (3355, 1-indexed): $($lines[3354])"

# Build new content: lines before 3317 + correctReplacement + lines from 3354 onwards
$newLines = @()
$newLines += $lines[0..3316]          # Lines 1-3317 (0-indexed 0-3316)
$newLines += $correctReplacement       # Replacement
$newLines += $lines[3354..($lines.Length-1)]  # Lines 3355+ (0-indexed 3354+)

Write-Host "`nOriginal lines: $($lines.Length), New lines: $($newLines.Length)"
[System.IO.File]::WriteAllLines($file, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "File written successfully."
