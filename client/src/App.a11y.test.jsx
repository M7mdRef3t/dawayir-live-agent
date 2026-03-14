import React, { forwardRef, useImperativeHandle } from 'react';
import { render, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

expect.extend(toHaveNoViolations);

const noop = () => {};
const makeRef = (value = null) => ({ current: value });

vi.mock('./utils/cognitiveSync', () => ({
  getOrCreateUserKey: () => 'test-user',
}));

vi.mock('./features/session/toolCallHandler', () => ({
  processToolCalls: async () => {},
}));

vi.mock('./features/session/soundDesign', () => ({
  playTransitionSound: () => {},
  playInsightSound: () => {},
  playSessionCompleteSound: () => {},
}));

vi.mock('./components/DawayirCanvas', () => {
  return {
    default: forwardRef(function MockCanvas(_props, ref) {
      useImperativeHandle(ref, () => ({
        updateNode: noop,
        getNodes: () => [],
      }));
      return <div />;
    }),
  };
});

vi.mock('./components/ConnectProgressCard', () => ({ default: () => <div /> }));
vi.mock('./components/OnboardingModal', () => ({ default: () => <div /> }));
vi.mock('./components/EndSessionConfirmModal', () => ({ default: () => <div /> }));
vi.mock('./components/SettingsModal', () => ({ default: () => <div /> }));
vi.mock('./components/DashboardView', () => ({ default: () => <div /> }));
vi.mock('./components/Visualizer', () => ({ default: () => <div /> }));
vi.mock('./components/VoiceToneBadge', () => ({ default: () => <div /> }));
vi.mock('./components/BreathingGuide', () => ({ default: () => <div /> }));
vi.mock('./components/SacredPause', () => ({ default: () => <div /> }));
vi.mock('./components/EmotionalWeather', () => ({ default: () => <div /> }));
vi.mock('./components/MirrorSentence', () => ({ default: () => <div /> }));
vi.mock('./components/CognitiveVelocity', () => ({ default: () => <div /> }));
vi.mock('./components/ui/StatusBadge', () => ({ default: () => <div /> }));
vi.mock('./components/AchievementBar', () => ({ default: () => <div /> }));
vi.mock('./components/JourneyTimeline', () => ({ default: () => <div /> }));
vi.mock('./components/CognitiveDNACard', () => ({ default: () => <div /> }));
vi.mock('./components/CognitiveFingerprint', () => ({ default: () => <div /> }));
vi.mock('./components/CircleMeaningPanel', () => ({ default: () => <div /> }));
vi.mock('./components/CircleFirstShiftTooltip', () => ({ default: () => <div /> }));

vi.mock('./hooks/useCamera', () => ({
  useCamera: () => ({
    videoRef: makeRef(null),
    isCameraActive: false,
    capturedImage: null,
    cameraError: null,
    setCapturedImage: noop,
    startCamera: noop,
    stopCamera: noop,
    captureSnapshot: noop,
  }),
}));

vi.mock('./hooks/useAudioPipeline', () => ({
  useAudioPipeline: () => ({
    speakerContextRef: makeRef(null),
    currentTurnModeRef: makeRef(''),
    bufferedTurnTextRef: makeRef(''),
    bufferedUserAgentTurnTextRef: makeRef(''),
    lastAgentContentAtRef: makeRef(0),
    lastUserAgentContentAtRef: makeRef(0),
    lastModelAudioAtRef: makeRef(0),
    ttsDecisionTimeoutRef: makeRef(null),
    pendingTtsTimeoutRef: makeRef(null),
    ttsFallbackEnabledRef: makeRef(false),
    closeSpeakerContext: noop,
    clearPendingTts: noop,
    resetAgentTurnState: noop,
    stopTextToSpeechFallback: noop,
    speakTextFallback: noop,
    stopPlayback: noop,
    ensureSpeakerContext: noop,
    ensurePcmWorklet: async () => {},
    flushPcmChunks: noop,
    playPcmChunk: noop,
  }),
}));

vi.mock('./hooks/useMicrophone', () => ({
  useMicrophone: () => ({
    isMicActive: false,
    micTurnRef: makeRef(0),
    stopMicrophone: noop,
    sendRealtimeAudioChunk: noop,
    startMicrophone: async () => {},
  }),
}));

vi.mock('./hooks/useAutoDemo', () => ({
  useAutoDemo: () => ({
    autoDemoTimerRef: makeRef(null),
    clearAutoDemoTimer: noop,
    sleepForAutoDemo: async () => {},
    appendSyntheticUserTranscript: noop,
    sendSyntheticUserTextTurn: noop,
    stopSyntheticUserSpeech: noop,
    speakSyntheticUserLine: async () => {},
    waitForAutoDemoReady: async () => false,
    waitForAgentToSettle: async () => {},
    waitForManualUserTurn: async () => {},
    pauseMicForSyntheticDemo: async () => {},
    restoreMicAfterSyntheticDemo: noop,
    stopAutoDemo: noop,
  }),
}));

vi.mock('./hooks/useSessionReplay', () => ({
  useSessionReplay: () => ({
    sessionReplayRef: makeRef([]),
    sessionReplayStartedAtRef: makeRef(null),
    snapshotReplayNodes: () => [],
    resetSessionReplay: noop,
    captureReplayStep: noop,
  }),
}));

let shouldAutoConnect = false;
let scheduled = false;
vi.mock('./hooks/useConnection', () => ({
  useConnection: (args) => {
    if (shouldAutoConnect && !scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        args.setIsConnected(true);
        args.setStatus('Connected');
        args.goToView('live');
      });
    }
    return {
      connect: noop,
      disconnect: noop,
    };
  },
}));

vi.mock('./hooks/useSessionHotkeys', () => ({
  useSessionHotkeys: () => {},
}));

describe('App accessibility', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: noop,
        removeEventListener: noop,
        addListener: noop,
        removeListener: noop,
        dispatchEvent: () => false,
      })),
    });
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: noop,
    });
  });

  it('has no axe violations on initial view', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const first = String(args?.[0] ?? '');
      if (first.includes('not wrapped in act')) return;
    });
    shouldAutoConnect = false;
    scheduled = false;
    const { container } = render(<App />);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
        // <main> inside <div role="application"> is intentional for this app;
        // the axe rule expects top-level landmarks but Dawayir wraps
        // everything as an application landmark for screen reader behavior.
        'landmark-main-is-top-level': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
    errorSpy.mockRestore();
  });

  it('has no axe violations on live view', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const first = String(args?.[0] ?? '');
      if (first.includes('not wrapped in act')) return;
    });
    shouldAutoConnect = true;
    scheduled = false;
    const { container } = render(<App />);
    await waitFor(() => {
      expect(container.querySelector('main#main-canvas-content')).toBeTruthy();
    });
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
        'landmark-main-is-top-level': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
    errorSpy.mockRestore();
  });
});
