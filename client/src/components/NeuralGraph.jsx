import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * NeuralGraph — Post-Session Interactive Neural Network Visualization
 * 
 * Represents the user's cognitive journey as an interconnected network of concepts.
 * Nodes are colored by their dominant circle (Awareness/Knowledge/Truth).
 * Edges show conceptual connections discovered during the session.
 * 
 * This is the "Cognitive Awareness System" — the fusion of:
 *   1. الدوائر الثلاث (Emotion Scheduler) → assigns each concept to a cognitive layer
 *   2. الشبكة العصبية (Neural Graph) → visualizes how concepts interconnect
 */

const CIRCLE_COLORS = {
    awareness: { main: '#00F5FF', glow: 'rgba(0,245,255,0.3)', label: 'الوعي', labelEn: 'Awareness' },
    knowledge: { main: '#00FF41', glow: 'rgba(0,255,65,0.3)', label: 'العلم', labelEn: 'Knowledge' },
    truth: { main: '#FF00E5', glow: 'rgba(255,0,229,0.3)', label: 'الحقيقة', labelEn: 'Truth' },
};

// Generate a demo neural graph from session report content
function extractNodes(content, lang) {
    if (!content || content.trim().length === 0) return generateDefaultGraph(lang);

    // Parse keywords from the report content
    const words = content
        .replace(/[#*\-_`>]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4)
        .map(w => w.replace(/[^a-zأ-ي\u0600-\u06FF]/gi, '').toLowerCase())
        .filter(Boolean);

    // Count frequencies
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    // Take top concepts
    const topWords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word]) => word);

    if (topWords.length < 3) return generateDefaultGraph(lang);

    // Assign each word to a cognitive layer based on position in report
    const layers = ['awareness', 'knowledge', 'truth'];
    return topWords.map((word, i) => ({
        id: i,
        label: word,
        layer: layers[i % 3],
        weight: 1 + Math.random() * 1.5,
        connections: [],
    }));
}

function generateDefaultGraph(lang) {
    const isAr = lang === 'ar';
    return [
        { id: 0, label: isAr ? 'الضغط' : 'stress', layer: 'awareness', weight: 2.0 },
        { id: 1, label: isAr ? 'العمل' : 'work', layer: 'awareness', weight: 1.5 },
        { id: 2, label: isAr ? 'التأمل' : 'reflection', layer: 'knowledge', weight: 1.8 },
        { id: 3, label: isAr ? 'الأسرة' : 'family', layer: 'awareness', weight: 1.3 },
        { id: 4, label: isAr ? 'التحليل' : 'analysis', layer: 'knowledge', weight: 2.0 },
        { id: 5, label: isAr ? 'الحلول' : 'solutions', layer: 'knowledge', weight: 1.6 },
        { id: 6, label: isAr ? 'الوضوح' : 'clarity', layer: 'truth', weight: 2.2 },
        { id: 7, label: isAr ? 'القرار' : 'decision', layer: 'truth', weight: 1.9 },
        { id: 8, label: isAr ? 'الأهداف' : 'goals', layer: 'truth', weight: 1.4 },
    ];
}

function buildEdges(nodes) {
    const edges = [];
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
        // Connect to 2-3 nearby nodes
        const connections = Math.floor(2 + Math.random() * 2);
        for (let c = 0; c < connections; c++) {
            const j = (i + 1 + Math.floor(Math.random() * (n - 2))) % n;
            if (j !== i && !edges.find(e => (e.from === i && e.to === j) || (e.from === j && e.to === i))) {
                edges.push({ from: i, to: j, strength: 0.3 + Math.random() * 0.7 });
            }
        }
    }
    return edges;
}

function layoutNodes(nodes, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    const n = nodes.length;

    // Arrange in concentric layout by layer
    const byLayer = {
        awareness: nodes.filter(n => n.layer === 'awareness'),
        knowledge: nodes.filter(n => n.layer === 'knowledge'),
        truth: nodes.filter(n => n.layer === 'truth'),
    };

    const layerRadii = { awareness: 0.72, knowledge: 0.45, truth: 0.22 };
    const positioned = [];

    Object.entries(byLayer).forEach(([layer, layerNodes]) => {
        const r = Math.min(cx, cy) * layerRadii[layer];
        layerNodes.forEach((node, i) => {
            const angle = (i / layerNodes.length) * Math.PI * 2 - Math.PI / 2;
            positioned.push({
                ...node,
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r,
            });
        });
    });

    return positioned;
}

const NeuralGraph = ({ reportContent = '', lang = 'ar', animate = true }) => {
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const progressRef = useRef(0);

    const rawNodes = useMemo(() => extractNodes(reportContent, lang), [reportContent, lang]);
    const edges = useMemo(() => buildEdges(rawNodes), [rawNodes]);

    const getLayout = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return [];
        return layoutNodes(rawNodes, canvas.width, canvas.height);
    }, [rawNodes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const nodes = layoutNodes(rawNodes, rect.width, rect.height);

        const draw = (progress) => {
            ctx.clearRect(0, 0, rect.width, rect.height);

            // Draw edges
            edges.forEach(edge => {
                const from = nodes[edge.from];
                const to = nodes[edge.to];
                if (!from || !to) return;
                const fromColor = CIRCLE_COLORS[from.layer];
                const toColor = CIRCLE_COLORS[to.layer];

                // Animated edge drawing
                const edgeProgress = Math.min(1, progress * 2);
                const mx = from.x + (to.x - from.x) * edgeProgress;
                const my = from.y + (to.y - from.y) * edgeProgress;

                const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
                grad.addColorStop(0, fromColor.main + '60');
                grad.addColorStop(1, toColor.main + '30');

                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(mx, my);
                ctx.strokeStyle = grad;
                ctx.lineWidth = edge.strength * 1.5;
                ctx.setLineDash([4, 4]);
                ctx.lineDashOffset = -progress * 20;
                ctx.stroke();
                ctx.setLineDash([]);
            });

            // Draw nodes
            nodes.forEach((node, i) => {
                const color = CIRCLE_COLORS[node.layer];
                const nodeProgress = Math.min(1, (progress - i * 0.05) * 3);
                if (nodeProgress <= 0) return;

                const r = 18 * (node.weight / 2) * nodeProgress;
                const isHovered = hoveredNode === i;
                const isSelected = selectedNode === i;
                const scale = isHovered ? 1.3 : isSelected ? 1.2 : 1;
                const finalR = r * scale;

                // Glow
                const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, finalR * 2.5);
                grd.addColorStop(0, color.glow);
                grd.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(node.x, node.y, finalR * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = grd;
                ctx.fill();

                // Node body
                ctx.beginPath();
                ctx.arc(node.x, node.y, finalR, 0, Math.PI * 2);
                ctx.fillStyle = `${color.main}88`;
                ctx.fill();
                ctx.strokeStyle = color.main;
                ctx.lineWidth = isSelected ? 2.5 : 1.5;
                ctx.stroke();

                // Pulse ring for selected
                if (isSelected) {
                    const pulseR = finalR + 8 + Math.sin(progress * 5) * 4;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
                    ctx.strokeStyle = `${color.main}55`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // Label
                const fontSize = Math.max(9, Math.min(13, finalR * 0.7));
                ctx.font = `600 ${fontSize}px 'Outfit', sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, node.x, node.y);
            });
        };

        if (animate) {
            const startTime = Date.now();
            const duration = 1500;
            const loop = () => {
                const elapsed = Date.now() - startTime;
                progressRef.current = Math.min(1, elapsed / duration);
                draw(progressRef.current);
                if (progressRef.current < 1) {
                    animFrameRef.current = requestAnimationFrame(loop);
                } else {
                    // Keep drawing for pulse effects
                    const pulse = () => {
                        progressRef.current += 0.016;
                        draw(progressRef.current);
                        animFrameRef.current = requestAnimationFrame(pulse);
                    };
                    pulse();
                }
            };
            loop();
        } else {
            draw(1);
        }

        return () => cancelAnimationFrame(animFrameRef.current);
    }, [rawNodes, edges, animate, hoveredNode, selectedNode]);

    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const nodes = layoutNodes(rawNodes, rect.width, rect.height);
        const hit = nodes.findIndex(n => {
            const r = 18 * (n.weight / 2) * 1.5;
            return Math.hypot(mx - n.x, my - n.y) < r;
        });
        setHoveredNode(hit >= 0 ? hit : null);
        canvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
    }, [rawNodes]);

    const handleClick = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const nodes = layoutNodes(rawNodes, rect.width, rect.height);
        const hit = nodes.findIndex(n => {
            const r = 18 * (n.weight / 2) * 1.5;
            return Math.hypot(mx - n.x, my - n.y) < r;
        });
        setSelectedNode(hit >= 0 ? hit : null);
    }, [rawNodes]);

    const selectedNodeData = selectedNode !== null
        ? layoutNodes(rawNodes, 300, 220)[selectedNode]
        : null;

    return (
        <div className="neural-graph-wrapper" style={{ position: 'relative', width: '100%' }}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ width: '100%', height: '220px', display: 'block', borderRadius: '12px' }}
            />

            {/* Legend */}
            <div className="neural-graph-legend">
                {Object.entries(CIRCLE_COLORS).map(([key, c]) => (
                    <div key={key} className="neural-legend-item">
                        <span style={{ background: c.main, width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginInlineEnd: 5 }} />
                        <span style={{ color: '#fff', fontSize: 11, opacity: 0.7 }}>{lang === 'ar' ? c.label : c.labelEn}</span>
                    </div>
                ))}
            </div>

            {/* Tooltip for selected node */}
            {selectedNodeData && (
                <div className="neural-node-tooltip" style={{
                    position: 'absolute',
                    top: 8,
                    insetInlineEnd: 8,
                    background: 'rgba(4,4,15,0.92)',
                    border: `1px solid ${CIRCLE_COLORS[selectedNodeData.layer].main}55`,
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#fff',
                    backdropFilter: 'blur(8px)',
                    zIndex: 10,
                    maxWidth: 140,
                }}>
                    <div style={{ fontWeight: 700, color: CIRCLE_COLORS[selectedNodeData.layer].main }}>
                        {lang === 'ar'
                            ? CIRCLE_COLORS[selectedNodeData.layer].label
                            : CIRCLE_COLORS[selectedNodeData.layer].labelEn}
                    </div>
                    <div style={{ marginTop: 4, opacity: 0.85 }}>{selectedNodeData.label}</div>
                    <div style={{ marginTop: 4, opacity: 0.5, fontSize: 10 }}>
                        {lang === 'ar' ? `وزن: ${(selectedNodeData.weight * 50).toFixed(0)}%` : `Weight: ${(selectedNodeData.weight * 50).toFixed(0)}%`}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NeuralGraph;
