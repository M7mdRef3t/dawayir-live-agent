import { describe, expect, it } from 'vitest';
import { detectCircleCommandClient } from './detectCircleCommandClient';

describe('detectCircleCommandClient', () => {
  it('detects Arabic grow command with named circle', () => {
    const result = detectCircleCommandClient('كبّر دائرة الوعي');
    expect(result).toEqual({
      id: 1,
      radius: 90,
      color: '#FFD700',
      action: 'grow',
    });
  });

  it('detects English change command with truth circle', () => {
    const result = detectCircleCommandClient('change truth color');
    expect(result).toEqual({
      id: 3,
      radius: 60,
      color: '#4169E1',
      action: 'change',
    });
  });

  it('returns null on non-command text', () => {
    expect(detectCircleCommandClient('hello world')).toBeNull();
  });
});
