import React from 'react';

// ══════════════════════════════════════════════════
// ERROR BOUNDARY — Graceful Failure Container
// Prevents a crash in one component from crashing
// the entire application. Particularly important for
// DawayirCanvas and DashboardView which have complex
// state and rendering logic.
//
// Design: Shows a minimal, non-alarming UI when a
// component tree crashes. Uses the same design language.
// ══════════════════════════════════════════════════

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `[ErrorBoundary:${this.props.name || 'unknown'}]`,
      error,
      errorInfo?.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default minimal fallback — non-alarming, matches Dawayir aesthetic
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '24px',
            minHeight: this.props.minHeight || '120px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px',
              margin: 0,
              textAlign: 'center',
            }}
          >
            {this.props.lang === 'ar'
              ? '... حصلت مشكلة بسيطة. جرّب تاني'
              : '... Something went wrong. Try again'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: 'rgba(56, 178, 216, 0.08)',
              border: '1px solid rgba(56, 178, 216, 0.25)',
              borderRadius: '20px',
              color: 'rgba(56, 178, 216, 0.85)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '12px',
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {this.props.lang === 'ar' ? 'حاول تاني' : 'Retry'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
