import WebSocket from 'ws';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';
const WS_URL = process.env.E2E_WS_URL || BASE_URL.replace(/^http/, 'ws');
const API_TOKEN = process.env.DWR_API_TOKEN || process.env.E2E_API_TOKEN || '';
const USER_KEY = process.env.E2E_USER_KEY || `e2e_${Date.now()}`;

const headers = {
  'Content-Type': 'application/json',
  ...(API_TOKEN ? { 'x-dawayir-auth': API_TOKEN } : {}),
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const ws = new WebSocket(`${WS_URL}?userKey=${encodeURIComponent(USER_KEY)}${API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ''}`);

  let wsReady = false;
  let wsUpdate = null;
  const wsPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout waiting for truthContractUpdate over WS')), 10000);
    ws.on('open', () => {
      wsReady = true;
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.truthContractUpdate?.action) {
          wsUpdate = msg.truthContractUpdate;
          clearTimeout(timeout);
          resolve(msg.truthContractUpdate);
        }
      } catch {}
    });
    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  for (let i = 0; i < 40 && !wsReady; i += 1) {
    await wait(100);
  }
  if (!wsReady) throw new Error('WS did not open');

  const action = `e2e-action-${Date.now()}`;
  const createRes = await fetch(`${BASE_URL}/api/cognitive-artifacts?userKey=${encodeURIComponent(USER_KEY)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      truthContract: {
        title: 'E2E Contract',
        action,
        anchor: 'e2e',
      },
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Create truth contract failed: HTTP ${createRes.status}`);
  }

  await wsPromise;
  if (!wsUpdate || wsUpdate.action !== action) {
    throw new Error('WS update action mismatch');
  }

  const doneRes = await fetch(`${BASE_URL}/api/cognitive-artifacts/truth-contract-complete?userKey=${encodeURIComponent(USER_KEY)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action }),
  });
  if (!doneRes.ok) {
    throw new Error(`Complete truth contract failed: HTTP ${doneRes.status}`);
  }

  const latestRes = await fetch(`${BASE_URL}/api/cognitive-artifacts/truth-contract/latest?userKey=${encodeURIComponent(USER_KEY)}`, {
    headers: API_TOKEN ? { 'x-dawayir-auth': API_TOKEN } : {},
  });
  if (!latestRes.ok) {
    throw new Error(`Fetch latest truth contract failed: HTTP ${latestRes.status}`);
  }
  const latestPayload = await latestRes.json();
  const latest = latestPayload?.truthContract;
  if (!latest || latest.action !== action || latest.status !== 'completed') {
    throw new Error(`Latest truth contract assertion failed: ${JSON.stringify(latestPayload)}`);
  }

  ws.close();
  console.log('E2E truth-contract flow passed');
}

run().catch((err) => {
  console.error('E2E truth-contract flow failed:', err.message);
  process.exit(1);
});
