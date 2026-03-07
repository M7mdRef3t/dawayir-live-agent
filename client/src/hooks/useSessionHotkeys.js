import { useEffect } from 'react';

export function useSessionHotkeys({
  appView,
  isConnected,
  showEndSessionConfirm,
  showSettings,
  showOnboarding,
  setShowEndSessionConfirm,
  setShowSettings,
  dismissOnboarding,
  setIsTranscriptVisible,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName || '';
      const isTyping = /INPUT|TEXTAREA|SELECT/.test(tagName);

      if (event.key === 'Escape') {
        if (showEndSessionConfirm) {
          setShowEndSessionConfirm(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (showOnboarding) {
          dismissOnboarding();
          return;
        }
        setIsTranscriptVisible(false);
      }

      if (isTyping) return;

      if (event.code === 'Space' && appView === 'live' && isConnected) {
        event.preventDefault();
        setIsTranscriptVisible((current) => !current);
      }

      if ((event.key === 'm' || event.key === 'M') && appView === 'live' && isConnected) {
        setIsTranscriptVisible((current) => !current);
      }

      if ((event.key === 's' || event.key === 'S') && !isConnected) {
        setShowSettings((current) => !current);
      }
    };

    const handleBeforeUnload = (event) => {
      if (!isConnected) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    appView,
    dismissOnboarding,
    isConnected,
    setIsTranscriptVisible,
    setShowEndSessionConfirm,
    setShowSettings,
    showEndSessionConfirm,
    showOnboarding,
    showSettings,
  ]);
}
