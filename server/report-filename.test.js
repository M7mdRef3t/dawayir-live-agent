import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidReportFilename } from './report-filename.js';

test('isValidReportFilename accepts generated report names', () => {
    assert.equal(isValidReportFilename('session_report_1700000000000.md'), true);
    assert.equal(isValidReportFilename('session_report_1.md'), true);
});

test('isValidReportFilename rejects path traversal and malformed values', () => {
    assert.equal(isValidReportFilename('../session_report_1.md'), false);
    assert.equal(isValidReportFilename('session_report_1.txt'), false);
    assert.equal(isValidReportFilename('session_report_1.md/../../secrets'), false);
    assert.equal(isValidReportFilename('session_report_%2Fsecret.md'), false);
    assert.equal(isValidReportFilename(' session_report_1.md'), false);
    assert.equal(isValidReportFilename('session_report_1.md '), false);
    assert.equal(isValidReportFilename(''), false);
    assert.equal(isValidReportFilename(null), false);
});
