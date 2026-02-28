import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

let capturedHandler = null;
const expressMock = mock.fn(() => ({
    use: mock.fn(),
    get: mock.fn((route, handler) => {
        if (route === '/api/reports') {
            capturedHandler = handler;
        }
    })
}));
expressMock.json = mock.fn();
expressMock.static = mock.fn();
mock.module('express', { defaultExport: expressMock });

let getFilesMock = mock.fn();
let bucketMock = mock.fn(() => ({ getFiles: getFilesMock, file: mock.fn() }));

class MockStorage {
    constructor(opts) {
        this.opts = opts;
    }
    bucket() {
        return bucketMock();
    }
}

mock.module('@google-cloud/storage', {
    namedExports: {
        Storage: MockStorage
    }
});

mock.module('dotenv', { defaultExport: { config: mock.fn() } });

class MockWebSocketServer {
    constructor() {}
    on() {}
}

mock.module('ws', { namedExports: { WebSocketServer: MockWebSocketServer, WebSocket: {} } });
mock.module('http', { namedExports: { createServer: mock.fn(() => ({ listen: mock.fn() })) } });
mock.module('@google/genai', {
    namedExports: {
        GoogleGenAI: class MockGenAI {
            constructor() {
                this.live = { connect: mock.fn() };
            }
        }
    }
});
mock.module('fs', {
    defaultExport: {
        readFileSync: mock.fn(() => JSON.stringify({ platform_name: 'test' })),
        existsSync: mock.fn(() => false)
    }
});

test('GET /api/reports endpoint', async (t) => {
    process.env.GEMINI_API_KEY = 'test_key';
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET = 'test_bucket';
    process.env.PORT = '0';

    await import('./index.js');

    assert.ok(capturedHandler, 'Route handler should be registered');

    await t.test('returns reports successfully', async () => {
        getFilesMock.mock.mockImplementation(async () => [[
            { name: 'session_report_1.md', metadata: { updated: '2023-01-01T00:00:00.000Z', size: 100 } },
            { name: 'session_report_2.md', metadata: { updated: '2023-01-02T00:00:00.000Z', size: 200 } }
        ]]);

        const req = {};
        const res = {
            json: mock.fn(),
            status: mock.fn(() => res)
        };

        await capturedHandler(req, res);

        assert.deepEqual(getFilesMock.mock.calls[0].arguments[0], { prefix: 'session_report_' });

        assert.equal(res.json.mock.calls.length, 1);
        const data = res.json.mock.calls[0].arguments[0];

        // Use the actual properties returned by the implementation in index.js
        assert.deepEqual(data, [
            { name: 'session_report_2.md', updated: '2023-01-02T00:00:00.000Z', size: 200 },
            { name: 'session_report_1.md', updated: '2023-01-01T00:00:00.000Z', size: 100 }
        ]);
    });

    await t.test('returns 500 when error occurs', async () => {
        getFilesMock.mock.mockImplementation(async () => {
            throw new Error('GCS error');
        });

        const req = {};
        const resObj = {
            json: mock.fn(),
            status: mock.fn(() => resObj)
        };

        await capturedHandler(req, resObj);

        assert.equal(resObj.status.mock.calls[0].arguments[0], 500);
        assert.deepEqual(resObj.json.mock.calls[0].arguments[0], { error: 'GCS error' });
    });
});
