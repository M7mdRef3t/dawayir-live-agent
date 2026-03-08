/**
 * FEATURE ⑰ — JOURNEY TIMELINE
 * "القصة الكاملة لرحلتك في سطر واحد"
 * First app that shows the cognitive arc as a visual story strip.
 *
 * Shows: [Node1 icon] ──── [transition] ──── [Node2 icon] ──── [Node3 icon]
 * with timestamps and labels. Appears in the session complete screen.
 */
import React from 'react';

const NODE_CONFIG = {
    1: { label_ar: 'وعي', label_en: 'Awareness', color: '#00F5FF', icon: '◉' },
    2: { label_ar: 'علم', label_en: 'Knowledge', color: '#00FF41', icon: '◈' },
    3: { label_ar: 'حقيقة', label_en: 'Truth', color: '#FF00E5', icon: '◆' },
};

function JourneyTimeline({ journeyPath = [1], transitionCount = 0, sessionDurationMs = 0, lang = 'ar' }) {
    if (!journeyPath || journeyPath.length === 0) return null;

    // Create unique waypoints (deduplicated sequence)
    const waypoints = journeyPath.reduce((acc, id) => {
        if (acc.length === 0 || acc[acc.length - 1] !== id) acc.push(id);
        return acc;
    }, []);

    const totalWaypoints = waypoints.length;
    const segmentDuration = sessionDurationMs > 0 && totalWaypoints > 1
        ? Math.round(sessionDurationMs / (totalWaypoints - 1) / 1000)
        : null;

    return (
        <div className="journey-timeline-wrap">
            <p className="journey-timeline-title">
                {lang === 'ar' ? '🗺️ خريطة رحلتك' : '🗺️ Your Journey Map'}
            </p>

            <div className="journey-timeline-track">
                {waypoints.map((nodeId, idx) => {
                    const cfg = NODE_CONFIG[nodeId] || NODE_CONFIG[1];
                    const isLast = idx === waypoints.length - 1;

                    return (
                        <React.Fragment key={`${nodeId}-${idx}`}>
                            {/* Node bubble */}
                            <div className="journey-node" style={{ '--node-color': cfg.color }}>
                                <div className="journey-node-icon">{cfg.icon}</div>
                                <div className="journey-node-label">
                                    {lang === 'ar' ? cfg.label_ar : cfg.label_en}
                                </div>
                                {idx === 0 && (
                                    <div className="journey-node-time">
                                        {lang === 'ar' ? 'البداية' : 'Start'}
                                    </div>
                                )}
                                {isLast && (
                                    <div className="journey-node-time" style={{ color: cfg.color }}>
                                        {lang === 'ar' ? 'النهاية' : 'End'}
                                    </div>
                                )}
                            </div>

                            {/* Connector line between nodes */}
                            {!isLast && (
                                <div className="journey-connector">
                                    <div className="journey-connector-line" />
                                    {segmentDuration && (
                                        <div className="journey-connector-time">
                                            ~{segmentDuration}{lang === 'ar' ? 'ث' : 's'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <p className="journey-timeline-sub">
                {lang === 'ar'
                    ? `${transitionCount} انتقال إدراكي خلال الجلسة`
                    : `${transitionCount} cognitive transition${transitionCount !== 1 ? 's' : ''} this session`}
            </p>
        </div>
    );
}

export default JourneyTimeline;
