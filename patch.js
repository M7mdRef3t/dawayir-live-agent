const fs = require('fs');
const content = fs.readFileSync('server/index.js', 'utf8');

const targetFunction = `    const scheduleReconnect = async (reason = 'unknown') => {`;

const extractedFunctions = `    const handleTranscription = (sc) => {
        const inTx = sc.inputTranscription || sc.input_transcription;
        if (inTx?.text) {
            logInfo(\`[Transcription:in] "\${inTx.text}" (finished=\${inTx.finished})\`);
            // Forward transcription to client for debugging
            sendToClient({ debugTranscription: { type: 'input', text: inTx.text, finished: inTx.finished } });
            // Accumulate fragments instead of processing each one
            inputTranscriptBuffer += inTx.text;
            // Reset the flush timer on each new fragment
            if (inputTranscriptTimer) clearTimeout(inputTranscriptTimer);
            if (inTx.finished) {
                // Sentence complete — flush immediately
                flushInputTranscriptBuffer();
            } else {
                // Set a timeout to flush after silence
                inputTranscriptTimer = setTimeout(flushInputTranscriptBuffer, INPUT_TRANSCRIPT_FLUSH_MS);
            }
        }
        const outTx = sc.outputTranscription || sc.output_transcription;
        // When Gemini starts responding, user has stopped talking — flush input buffer
        if (outTx?.text && inputTranscriptBuffer.trim()) {
            if (inputTranscriptTimer) clearTimeout(inputTranscriptTimer);
            flushInputTranscriptBuffer();
        }
        if (outTx?.text) {
            logInfo(\`[Transcription:out] "\${outTx.text}" (finished=\${outTx.finished})\`);
            sendToClient({ debugTranscription: { type: 'output', text: outTx.text, finished: outTx.finished } });
        }
    };

    const handleToolCalls = (payload, toolCall) => {
        const functionCalls = toolCall.functionCalls || toolCall.function_calls || [];
        const serverTools = ['get_expert_insight', 'generate_session_report'];
        const visualTools = ['update_node', 'highlight_node'];
        const clientTools = functionCalls.filter(fc => !serverTools.includes(fc.name) && !visualTools.includes(fc.name));
        const serverOnlyTools = functionCalls.filter(fc => serverTools.includes(fc.name));
        const visualOnlyTools = functionCalls.filter(fc => visualTools.includes(fc.name));

        // Resolve server-side tools immediately
        if (serverOnlyTools.length > 0) {
            resolveServerToolCalls(serverOnlyTools, session);
        }

        if (visualOnlyTools.length > 0) {
            sendToClient({
                toolCall: {
                    functionCalls: visualOnlyTools.map(fc => ({
                        ...fc,
                        id: \`gemini_visual_\${fc.id || Date.now()}\`,
                    })),
                },
            });

            const visualResponses = visualOnlyTools.map(fc => ({
                id: fc.id,
                name: fc.name,
                response: { result: { ok: true } },
            }));

            try {
                session.sendToolResponse({ functionResponses: visualResponses });
                logInfo(\`[VISUAL] Resolved \${visualOnlyTools.length} visual tool(s) server-side\`);
            } catch (err) {
                logError('[VISUAL] Failed to send tool response:', err);
            }
        }

        // Forward remaining client tools
        const payloadWithoutTools = { ...payload };
        delete payloadWithoutTools.toolCall;
        delete payloadWithoutTools.tool_call;
        const hasNonToolPayload = Object.keys(payloadWithoutTools).length > 0;

        if (clientTools.length > 0) {
            const clientPayload = { ...payload };
            const clientToolCall = { ...(clientPayload.toolCall || clientPayload.tool_call) };
            clientToolCall.functionCalls = clientTools;
            clientToolCall.function_calls = clientTools;
            clientPayload.toolCall = clientToolCall;
            clientPayload.tool_call = clientToolCall;
            sendToClient(clientPayload);
        } else if (hasNonToolPayload) {
            sendToClient(payloadWithoutTools);
        }
    };

    const handleGeminiMessage = (message) => {
        if (reconnectAttempt > 0) {
            reconnectAttempt = 0;
            sendServerStatus('gemini_recovered');
        }
        serverMessageCount += 1;
        const payload = toCompatMessage(message);

        // Always log first 200 chars to debug no-response issue
        const payloadStr = JSON.stringify(payload);
        logInfo(\`Gemini msg #\${serverMessageCount} (\${payloadStr.length} bytes): \${payloadStr.substring(0, 200)}\`);

        // ---- Diagnostic: log serverContent sub-keys ----
        const sc = payload.serverContent || payload.server_content;
        if (sc) {
            const scKeys = Object.keys(sc).filter(k => sc[k] != null);
            if (scKeys.length > 0 && !scKeys.every(k => k === 'modelTurn' || k === 'model_turn')) {
                logInfo(\`[SC:keys] \${scKeys.join(', ')}\`);
            }

            // ---- Transcription-based command detection (fallback) ----
            handleTranscription(sc);
        }

        // Intercept server-side tool calls before forwarding.
        // Important: don't drop non-tool payload content.
        const toolCall = payload.toolCall || payload.tool_call;
        if (toolCall) {
            handleToolCalls(payload, toolCall);
            return;
        }

        sendToClient(payload);
    };

`;

const newContent = content.replace(targetFunction, extractedFunctions + targetFunction);

fs.writeFileSync('server/index.js', newContent);
console.log('Patch applied successfully.');
