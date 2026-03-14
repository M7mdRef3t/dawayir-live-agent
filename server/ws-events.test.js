import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWsEventEnvelope } from './domains/realtime/ws-events.js';

test('buildWsEventEnvelope always includes event.requestId', () => {
    const payload = { state: 'gemini_connected' };
    const result = buildWsEventEnvelope({
        type: 'server_status',
        payload,
        requestId: 'req_123',
    });

    assert.equal(result.event.type, 'server_status');
    assert.equal(result.event.requestId, 'req_123');
    assert.deepEqual(result.event.payload, payload);
});

test('buildWsEventEnvelope supports legacy compatibility keys', () => {
    const payload = { state: 'running', turn: 1 };
    const result = buildWsEventEnvelope({
        type: 'hybrid_status',
        payload,
        requestId: 'req_456',
        legacyKey: 'hybridStatus',
    });

    assert.deepEqual(result.hybridStatus, payload);
    assert.equal(result.event.requestId, 'req_456');
});

test('buildWsEventEnvelope can disable legacy keys via includeLegacy=false', () => {
    const payload = { state: 'running', turn: 1 };
    const result = buildWsEventEnvelope({
        type: 'hybrid_status',
        payload,
        requestId: 'req_789',
        legacyKey: 'hybridStatus',
        includeLegacy: false,
    });

    assert.equal(result.hybridStatus, undefined);
    assert.deepEqual(result.event.payload, payload);
});
