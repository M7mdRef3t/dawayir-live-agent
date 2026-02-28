const fs = require('fs');

let content = fs.readFileSync('client/src/App.jsx', 'utf8');

const helpersCode = `
    const sendBootstrapPrompt = () => {
      bootstrapPromptSentRef.current = true;
      console.log('[App] Sending bootstrap prompt...');

      const parts = [];

      // Include camera snapshot if available so agent can greet based on appearance
      if (capturedImage) {
        const base64Data = capturedImage.split(',')[1];
        if (base64Data) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
          console.log('[App] Including camera snapshot in bootstrap prompt');
        }
      }

      const bootstrapText = lang === 'ar'
        ? (capturedImage
          ? 'دي صورتي دلوقتي. اقرأ حالتي النفسية من الصورة ونادي update_node عشان تغيّر radius وcolor لكل دايرة على حسب قرايتك. استخدم id وradius وcolor بس.'
          : 'يا صاحبي، ازيك؟')
        : (capturedImage
          ? 'This is my photo. Read my emotional state from the image and call update_node to change radius and color for each circle based on your reading. Use only id, radius, and color.'
          : 'Hey, how are you?');
      parts.push({ text: bootstrapText });

      wsRef.current.send(JSON.stringify({
        clientContent: { turns: [{ role: 'user', parts }], turnComplete: true }
      }));
    };

    const sendRestorePrompt = () => {
      const now = Date.now();
      if (now - lastRestorePromptAtRef.current < 6000) {
        restoreAfterGeminiReconnectRef.current = false;
        return true;
      }
      lastRestorePromptAtRef.current = now;
      // Send a minimal, invisible context restore — no "reconnection" language.
      // The model should just continue naturally without acknowledging the gap.
      const lastConv = sessionContextRef.current.length > 0
        ? sessionContextRef.current.slice(-3).join(' ... ')
        : '';
      const promptText = lastConv
        ? \`(كمّل من هنا بالظبط: "\${lastConv}")\`
        : '(كمّل الحوار.)';
      wsRef.current.send(JSON.stringify({
        clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true }
      }));
      restoreAfterGeminiReconnectRef.current = false;
      return false;
    };

    const scheduleMicStart = () => {
      micStartTimeoutRef.current = window.setTimeout(async () => {
        if (wsRef.current !== socket || wsRef.current?.readyState !== WebSocket.OPEN) {
          micStartTimeoutRef.current = null;
          return;
        }
        if (!setupCompleteRef.current || isMicActiveRef.current || !deferMicStartUntilFirstAgentReplyRef.current) {
          micStartTimeoutRef.current = null;
          return;
        }
        deferMicStartUntilFirstAgentReplyRef.current = false;
        try {
          await startMicrophone();
          setLastEvent('mic_autostart_timeout');
        } catch (error) {
          setStatus('Error');
          setErrorMessage(error.message);
          setLastEvent('mic_start_error');
        } finally {
          micStartTimeoutRef.current = null;
        }
      }, MIC_DEFER_TIMEOUT_MS);
    };
`;

const search1 = `    const socket = new WebSocket(backendUrl);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;

    socket.onopen = () => {`;

const replace1 = `    const socket = new WebSocket(backendUrl);
    socket.binaryType = 'arraybuffer';
    wsRef.current = socket;
` + helpersCode + `
    socket.onopen = () => {`;

content = content.replace(search1, replace1);

const search2 = `        try {
          if (wsRef.current?.readyState === WebSocket.OPEN && wsRef.current === socket) {
            const isReconnect = reconnectAttemptRef.current > 0;
            const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;

            if (!bootstrapPromptSentRef.current) {
              bootstrapPromptSentRef.current = true;
              console.log('[App] Sending bootstrap prompt...');

              const parts = [];

              // Include camera snapshot if available so agent can greet based on appearance
              if (capturedImage) {
                const base64Data = capturedImage.split(',')[1];
                if (base64Data) {
                  parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
                  console.log('[App] Including camera snapshot in bootstrap prompt');
                }
              }

              const bootstrapText = lang === 'ar'
                ? (capturedImage
                  ? 'دي صورتي دلوقتي. اقرأ حالتي النفسية من الصورة ونادي update_node عشان تغيّر radius وcolor لكل دايرة على حسب قرايتك. استخدم id وradius وcolor بس.'
                  : 'يا صاحبي، ازيك؟')
                : (capturedImage
                  ? 'This is my photo. Read my emotional state from the image and call update_node to change radius and color for each circle based on your reading. Use only id, radius, and color.'
                  : 'Hey, how are you?');
              parts.push({ text: bootstrapText });

              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts }], turnComplete: true }
              }));
            } else if (isReconnect || isGeminiReconnect) {
              const now = Date.now();
              if (now - lastRestorePromptAtRef.current < 6000) {
                restoreAfterGeminiReconnectRef.current = false;
                return;
              }
              lastRestorePromptAtRef.current = now;
              // Send a minimal, invisible context restore — no "reconnection" language.
              // The model should just continue naturally without acknowledging the gap.
              const lastConv = sessionContextRef.current.length > 0
                ? sessionContextRef.current.slice(-3).join(' ... ')
                : '';
              const promptText = lastConv
                ? \`(كمّل من هنا بالظبط: "\${lastConv}")\`
                : '(كمّل الحوار.)';
              wsRef.current.send(JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true }
              }));
              restoreAfterGeminiReconnectRef.current = false;
            }
          }

          micStartTimeoutRef.current = window.setTimeout(async () => {
            if (wsRef.current !== socket || wsRef.current?.readyState !== WebSocket.OPEN) {
              micStartTimeoutRef.current = null;
              return;
            }
            if (!setupCompleteRef.current || isMicActiveRef.current || !deferMicStartUntilFirstAgentReplyRef.current) {
              micStartTimeoutRef.current = null;
              return;
            }
            deferMicStartUntilFirstAgentReplyRef.current = false;
            try {
              await startMicrophone();
              setLastEvent('mic_autostart_timeout');
            } catch (error) {
              setStatus('Error');
              setErrorMessage(error.message);
              setLastEvent('mic_start_error');
            } finally {
              micStartTimeoutRef.current = null;
            }
          }, MIC_DEFER_TIMEOUT_MS);
        } catch (error) {
          setStatus('Error');
          setErrorMessage(error.message);
          setLastEvent('mic_start_error');
        }`;

const replace2 = `        try {
          if (wsRef.current?.readyState === WebSocket.OPEN && wsRef.current === socket) {
            const isReconnect = reconnectAttemptRef.current > 0;
            const isGeminiReconnect = restoreAfterGeminiReconnectRef.current;

            if (!bootstrapPromptSentRef.current) {
              sendBootstrapPrompt();
            } else if (isReconnect || isGeminiReconnect) {
              const shouldReturn = sendRestorePrompt();
              if (shouldReturn) return;
            }
          }

          scheduleMicStart();
        } catch (error) {
          setStatus('Error');
          setErrorMessage(error.message);
          setLastEvent('mic_start_error');
        }`;

content = content.replace(search2, replace2);

fs.writeFileSync('client/src/App.jsx', content);
