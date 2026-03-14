import { WebSocket } from 'ws';
import { normalizeUserKey } from '../auth/token.js';

export const createSocketRegistry = () => {
  const userSockets = new Map();

  const register = (userKey, ws) => {
    const key = normalizeUserKey(userKey);
    if (!userSockets.has(key)) userSockets.set(key, new Set());
    userSockets.get(key).add(ws);
    return key;
  };

  const unregister = (userKey, ws) => {
    const key = normalizeUserKey(userKey);
    const bucket = userSockets.get(key);
    if (!bucket) return;
    bucket.delete(ws);
    if (bucket.size === 0) userSockets.delete(key);
  };

  const emitTruthContractUpdate = (userKey, truthContract) => {
    const key = normalizeUserKey(userKey);
    const bucket = userSockets.get(key);
    if (!bucket || !truthContract) return;
    const payload = JSON.stringify({ truthContractUpdate: truthContract });
    for (const client of bucket) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  return {
    register,
    unregister,
    emitTruthContractUpdate,
  };
};

