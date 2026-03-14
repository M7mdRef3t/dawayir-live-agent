import React, { forwardRef } from 'react';

/**
 * TranscriptPanel — Live session transcript overlay.
 * Extracted from App.jsx for maintainability.
 */
const TranscriptPanel = forwardRef(({
  lang,
  t,
  transcript,
  isTranscriptVisible,
  setIsTranscriptVisible,
  getTranscriptSpeakerLabel,
}, transcriptEndRef) => (
  <section className={`transcript-container ${isTranscriptVisible ? 'open' : 'closed'}`} aria-label={lang === 'ar' ? 'الدردشة' : 'Live transcript'}>
    <button
      className="transcript-toggle-btn"
      onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
      aria-expanded={isTranscriptVisible}
      aria-controls="live-transcript"
      title={isTranscriptVisible
        ? (lang === 'ar' ? 'إخفاء المحادثة' : 'Hide transcript')
        : (lang === 'ar' ? 'إظهار المحادثة' : 'Show transcript')}
    >
      {isTranscriptVisible ? '▼ ' + t.liveChat : '💬 ' + t.liveChat}
    </button>

    <div className="transcript-overlay" style={{ display: isTranscriptVisible ? 'flex' : 'none' }}>
      <div
        className="transcript-messages"
        id="live-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {transcript.map((entry, idx) => (
          <div
            key={idx}
            className={`transcript-entry transcript-${entry.role}`}
            style={entry.cogColor ? {
              /* ── Feature ③: COGNITIVE TRANSCRIPT COLORING ── */
              borderLeft: entry.role === 'user' || entry.role === 'user_agent' ? `2px solid ${entry.cogColor}` : undefined,
              borderRight: entry.role === 'agent' ? `2px solid ${entry.cogColor}` : undefined,
              background: `${entry.cogColor}08`,
            } : undefined}
          >
            <span className="transcript-speaker">{getTranscriptSpeakerLabel(entry.role)}</span>
            <span className="transcript-time">{entry.time}</span>
            <span className="transcript-text">{entry.text}</span>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  </section>
));

TranscriptPanel.displayName = 'TranscriptPanel';

export default TranscriptPanel;
