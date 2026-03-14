import React, { useRef, useEffect, useState } from 'react';
import { playNeuralNodeSound } from '../features/session/soundDesign';

/**
 * NeuralTopicGraph — Native 2D Physics Engine for live thought visualization
 * 
 * Extracts keywords from the transcript as they stream in and builds a
 * spring-physics layout graph dynamically. 
 */
const Stopwords = {
  ar: new Set(['من', 'في', 'على', 'عن', 'الى', 'انا', 'او', 'لا', 'هل', 'كيف', 'ماذا', 'متى', 'اللي', 'عشان', 'بس', 'كده', 'لو', 'اني']),
  en: new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'in', 'of', 'that', 'i', 'it', 'for', 'you', 'but', 'with', 'as', 'my', 'this'])
};

const CIRCLE_COLORS = {
  awareness: { main: '#38B2D8', glow: 'rgba(56,178,216,0.4)' },
  knowledge: { main: '#2ECC71', glow: 'rgba(46,204,113,0.4)' },
  truth: { main: '#9B59B6', glow: 'rgba(155,89,182,0.4)' },
  agent: { main: '#FFB347', glow: 'rgba(255,179,71,0.4)' }, // AI responses
};

export default function NeuralTopicGraph({ transcript, lang = 'ar', reducedMotion = false }) {
  const canvasRef = useRef(null);
  const physicsRef = useRef({
    nodes: [],
    edges: [],
  });

  // Extract concepts dynamically from transcript changes
  useEffect(() => {
    if (!transcript || transcript.length === 0) return;

    const engine = physicsRef.current;
    
    // Process only the latest few turns to keep it smooth
    const recent = transcript.slice(-5);
    
    recent.forEach((turn, turnIdx) => {
      // Very naive keyword extraction for demo
      const words = turn.text
        .replace(/[#*\-_`>.,!?؟]/g, ' ')
        .split(/\s+/)
        .map(w => w.toLowerCase())
        .filter(w => w.length > 3 && !(Stopwords[lang] || Stopwords.en).has(w));

      // Limit to max 3 key verbs/nouns per turn to avoid clutter
      const selectedWords = words.slice(0, 3);
      
      const layer = turn.role === 'agent' ? 'agent' : 
                    turn.cogColor === '#38B2D8' ? 'awareness' :
                    turn.cogColor === '#2ECC71' ? 'knowledge' :
                    turn.cogColor === '#9B59B6' ? 'truth' : 'awareness';

      selectedWords.forEach((word) => {
        let node = engine.nodes.find(n => n.id === word);
        if (!node) {
          // Spawn new node
          node = {
            id: word,
            label: word,
            layer,
            weight: 1,
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
            vx: 0,
            vy: 0,
            createdAt: Date.now()
          };
          engine.nodes.push(node);
          playNeuralNodeSound(layer);
          
          // Connect to the previous node if it exists
          if (engine.nodes.length > 1) {
             const prev = engine.nodes[engine.nodes.length - 2];
             engine.edges.push({
               source: prev.id,
               target: node.id,
               strength: 0.1
             });
          }
        } else {
          // Strengthen existing node
          node.weight = Math.min(5, node.weight + 0.2);
          node.layer = layer; // update layer
        }
      });
    });

    // Prune old or weak nodes if graph gets too big (> 30)
    if (engine.nodes.length > 30) {
       // keep newest 30
       engine.nodes = engine.nodes.slice(-30);
       const validIds = new Set(engine.nodes.map(n => n.id));
       engine.edges = engine.edges.filter(e => validIds.has(e.source) && validIds.has(e.target));
    }

  }, [transcript, lang]);

  // Main physics rendering loop
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Physics constants
    const REPULSION = 1500;
    const SPRING_LENGTH = 100;
    const SPRING_K = 0.05;
    const DAMPING = 0.85;
    const CENTER_PULL = 0.01;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = () => {
      if (!canvasRef.current) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const engine = physicsRef.current;
      const W = canvas.width;
      const H = canvas.height;

      if (!reducedMotion) {
        // 1. Calculate Repulsion (Coulomb)
        for (let i = 0; i < engine.nodes.length; i++) {
          for (let j = i + 1; j < engine.nodes.length; j++) {
            const n1 = engine.nodes[i];
            const n2 = engine.nodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const distSq = dx*dx + dy*dy || 1;
            const dist = Math.sqrt(distSq);
            
            if (dist < 400) {
              const force = REPULSION / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx += fx; n1.vy += fy;
              n2.vx -= fx; n2.vy -= fy;
            }
          }
        }

        // 2. Calculate Springs (Hooke)
        engine.edges.forEach(edge => {
          const s = engine.nodes.find(n => n.id === edge.source);
          const t = engine.nodes.find(n => n.id === edge.target);
          if (!s || !t) return;
          
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const force = (dist - SPRING_LENGTH) * SPRING_K;
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          s.vx += fx; s.vy += fy;
          t.vx -= fx; t.vy -= fy;
        });

        // 3. Center gravity & update positions
        engine.nodes.forEach(n => {
          // Center pull
          n.vx += (W/2 - n.x) * CENTER_PULL;
          n.vy += (H/2 - n.y) * CENTER_PULL;
          
          // Apply damp
          n.vx *= DAMPING;
          n.vy *= DAMPING;
          
          // Update
          n.x += n.vx;
          n.y += n.vy;
          
          // Constrain to bounds softly
          if (n.x < 50) n.vx += 2;
          if (n.x > W - 50) n.vx -= 2;
          if (n.y < 50) n.vy += 2;
          if (n.y > H - 50) n.vy -= 2;
        });
      }

      // 4. Draw Edges
      engine.edges.forEach(edge => {
        const s = engine.nodes.find(n => n.id === edge.source);
        const t = engine.nodes.find(n => n.id === edge.target);
        if (!s || !t) return;
        
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        
        const grad = ctx.createLinearGradient(s.x, s.y, t.x, t.y);
        const sColor = CIRCLE_COLORS[s.layer]?.main || '#FFF';
        const tColor = CIRCLE_COLORS[t.layer]?.main || '#FFF';
        
        grad.addColorStop(0, sColor + '60');
        grad.addColorStop(1, tColor + '20');
        
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2 * edge.strength;
        ctx.stroke();
      });

      // 5. Draw Nodes
      engine.nodes.forEach(n => {
        const color = CIRCLE_COLORS[n.layer] || CIRCLE_COLORS.awareness;
        const radius = 8 + (n.weight * 3);
        
        // Born animation
        const age = Date.now() - n.createdAt;
        const scale = age < 500 ? (age / 500) : 1;
        const finalR = radius * scale;

        // Glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, finalR * 2.5);
        grd.addColorStop(0, color.glow);
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, finalR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, finalR, 0, Math.PI * 2);
        ctx.fillStyle = color.main + 'AA';
        ctx.fill();
        ctx.strokeStyle = color.main;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        if (n.weight > 1.2 || engine.nodes.length < 15) {
          ctx.font = `600 ${Math.max(12, 10 + n.weight)}px 'Outfit', sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 4;
          ctx.fillText(n.label, n.x, n.y - finalR - 8);
          ctx.shadowBlur = 0;
        }
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 5 }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
