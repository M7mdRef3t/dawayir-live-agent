import React, { useState, useEffect, useRef } from 'react';
import DawayirCanvas from './components/DawayirCanvas';
import './App.css';

function App() {
  const [status, setStatus] = useState('Disconnected');
  const ws = useRef(null);
  const canvasRef = useRef(null);

  const connect = () => {
    setStatus('Connecting...');
    const backendUrl = 'ws://localhost:8080';
    ws.current = new WebSocket(backendUrl);

    ws.current.onopen = () => {
      setStatus('Connected to Gemini Live');
    };

    ws.current.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Gemini Message:', message);

        // Handle Tool Calls
        if (message.toolCall) {
          const { functionCalls } = message.toolCall;
          const responses = [];

          for (const call of functionCalls) {
            console.log(`Executing tool: ${call.name}`, call.args);

            if (call.name === 'update_node') {
              const { id, ...updates } = call.args;
              canvasRef.current.updateNode(id, updates);
              responses.push({
                name: call.name,
                response: { success: true, id },
                id: call.id
              });
            } else if (call.name === 'highlight_node') {
              const { id } = call.args;
              canvasRef.current.pulseNode(id);
              responses.push({
                name: call.name,
                response: { success: true, id },
                id: call.id
              });
            }
          }

          // Send tool response back
          if (responses.length > 0) {
            ws.current.send(JSON.stringify({
              toolResponse: { functionResponses: responses }
            }));
          }
        }
      } catch (err) {
        // Voice data is binary, skip JSON parsing
        if (!(event.data instanceof Blob)) {
          // console.error('Error parsing message:', err);
        }
      }
    };

    ws.current.onclose = () => {
      setStatus('Disconnected');
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setStatus('Error');
    };
  };

  return (
    <div className="App">
      <div className="overlay">
        <h1>Dawayir Live Agent</h1>
        <p>Status: <span className={status.toLowerCase()}>{status}</span></p>
        <div className="controls">
          <button onClick={connect} disabled={status === 'Connected to Gemini Live'}>
            {status === 'Connected to Gemini Live' ? 'Live Interaction Active' : 'Start Gemini Live Journey'}
          </button>
          {status === 'Connected to Gemini Live' && (
            <p className="hint">Try saying: "كبر دايرة العلم وغير لونها للأصفر"</p>
          )}
        </div>
      </div>
      <DawayirCanvas ref={canvasRef} />
    </div>
  );
}

export default App;
