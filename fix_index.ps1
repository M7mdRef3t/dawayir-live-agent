$file = "c:\Users\moham\Downloads\dawayir-live-agent\server\index.js"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# The corruption: after flushBufferedHybridSpeakerPayloads the code jumps directly to
# voiceName: LIVE_USER_AGENT_VOICE instead of having the dawayir/user_agent branch logic.
# We fix by replacing the corrupted fragment with the correct code.

$badStart = "        flushBufferedHybridSpeakerPayloads(speaker, finalApprovedText);" + "`r`n" + "                                voiceName: LIVE_USER_AGENT_VOICE,"
$badStartAlt = "        flushBufferedHybridSpeakerPayloads(speaker, finalApprovedText);" + "`n" + "                                voiceName: LIVE_USER_AGENT_VOICE,"

$goodCode = @'
        flushBufferedHybridSpeakerPayloads(speaker, finalApprovedText);

        if (speaker === 'dawayir') {
            hybridState.pendingDawayirPrompt = '';
            if (hybridState.awaitingFinalDawayirTurn) {
                await stopHybridConversation('completed', {
                    turn: hybridState.userTurnCount,
                    maxTurns: hybridState.maxUserTurns,
                });
                return;
            }
            forwardDawayirLineToUserAgent(text);
            return;
        }

        if (speaker !== 'user_agent') {
            return;
        }

        hybridState.userTurnCount += 1;
        hybridState.pendingUserAgentPrompt = '';
        hybridState.pendingUserAgentTurn = 0;
        if (hybridState.userTurnCount >= hybridState.maxUserTurns) {
            hybridState.awaitingFinalDawayirTurn = true;
        }
        sendHybridStatus('running', {
            speaker: 'dawayir',
            turn: hybridState.userTurnCount,
            maxTurns: hybridState.maxUserTurns,
        });
        forwardUserAgentLineToDawayir(text);
    };

    const ensureUserAgentSession = async (lang = 'ar') => {
        if (userAgentSession && userAgentReady && userAgentLang === lang) {
            return true;
        }
        if (userAgentReadyPromise) {
            return userAgentReadyPromise;
        }

        if (userAgentSession && userAgentLang !== lang) {
            await closeUserAgentSession();
        }

        userAgentConnecting = true;
        userAgentReady = false;
        userAgentLang = lang === 'en' ? 'en' : 'ar';
        userAgentReadyPromise = new Promise((resolve) => {
            resolveUserAgentReady = resolve;
        });

        try {
            const liveSession = await ai.live.connect({
                model: pickLiveModel(),
                config: {
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: LIVE_USER_AGENT_VOICE,
'@

if ($content.Contains($badStart)) {
    $newContent = $content.Replace($badStart, $goodCode)
    [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "SUCCESS (CRLF variant): Corruption fixed."
} elseif ($content.Contains($badStartAlt)) {
    $newContent = $content.Replace($badStartAlt, $goodCode)
    [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "SUCCESS (LF variant): Corruption fixed."
} else {
    Write-Host "FAILED: Pattern not found. Searching for nearby context..."
    $idx = $content.IndexOf("flushBufferedHybridSpeakerPayloads(speaker, finalApprovedText);")
    if ($idx -ge 0) {
        Write-Host "Found flushBuffered at index $idx. Next 200 chars:"
        Write-Host $content.Substring($idx, [Math]::Min(200, $content.Length - $idx))
    }
}
