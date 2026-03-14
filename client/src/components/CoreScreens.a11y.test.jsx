import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingModal from './OnboardingModal';
import SettingsModal from './SettingsModal';
import DashboardView from './DashboardView';
import ErrorBoundary from './ErrorBoundary';

vi.mock('./NeuralGraph', () => ({ default: () => <div>NeuralGraph</div> }));
vi.mock('./CognitiveFingerprint', () => ({ default: () => <div>CognitiveFingerprint</div> }));
vi.mock('./CognitiveCoach', () => ({ default: () => <div>CognitiveCoach</div> }));
vi.mock('./GrowthArc', () => ({ default: () => <div>GrowthArc</div> }));
vi.mock('./SessionReplayPlayer', () => ({ default: () => <div>SessionReplayPlayer</div> }));
vi.mock('./SessionHighlightReel', () => ({ default: () => <div>SessionHighlightReel</div> }));
vi.mock('./SessionSignatureCard', () => ({ default: () => <div>SessionSignatureCard</div> }));
vi.mock('./JudgeModePanel', () => ({ default: () => <div>JudgeModePanel</div> }));

expect.extend(toHaveNoViolations);

function defaultAxeConfig() {
  return {
    rules: {
      // jsdom contrast checks are noisy; keep this covered in visual/manual audits.
      'color-contrast': { enabled: false },
    },
  };
}

describe('Core screens accessibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => [],
      text: async () => '',
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
    });
  });

  it('OnboardingModal has no axe violations', async () => {
    const steps = [{ title: 'مرحبا', body: 'ابدأ من هنا' }];
    const { container } = render(
      <OnboardingModal
        lang="ar"
        step={0}
        steps={steps}
        logoSrc="/logo.svg"
        onSkip={() => {}}
        onNext={() => {}}
      />,
    );
    expect(await axe(container, defaultAxeConfig())).toHaveNoViolations();
  });

  it('SettingsModal has no axe violations', async () => {
    const settings = {
      highContrast: false,
      reducedMotion: false,
      rememberOnboarding: true,
      fullScreenSession: false,
      fsShowMetrics: true,
      fsShowTimeline: true,
      fsShowAiState: true,
      fsShowControls: true,
    };
    const { container } = render(
      <SettingsModal
        lang="ar"
        settings={settings}
        selectedMicId=""
        onClose={() => {}}
        onLanguageChange={() => {}}
        onSettingsChange={() => {}}
        onMicChange={() => {}}
      />,
    );
    await waitFor(() => {
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
    });
    expect(await axe(container, defaultAxeConfig())).toHaveNoViolations();
  });

  it('DashboardView empty state has no axe violations', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const first = String(args?.[0] ?? '');
      if (first.includes('not wrapped in act')) return;
    });
    const { container } = render(
      <DashboardView
        onBack={() => {}}
        userKey="test-user"
        lang="ar"
        emptyLogoSrc="/logo.svg"
      />,
    );
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await axe(container, defaultAxeConfig())).toHaveNoViolations();
    errorSpy.mockRestore();
  });

  it('ErrorBoundary fallback has no axe violations', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Crasher() {
      throw new Error('boom');
    }
    const { container } = render(
      <ErrorBoundary lang="ar">
        <Crasher />
      </ErrorBoundary>,
    );
    expect(await axe(container, defaultAxeConfig())).toHaveNoViolations();
    errorSpy.mockRestore();
  });
});
