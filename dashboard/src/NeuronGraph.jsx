/**
 * dashboard/src/NeuronGraph.jsx
 *
 * Red de memoria del canal — visualización viva con física force-directed.
 *
 * Cada nodo = 1 video publicado. Las conexiones reflejan similitud REAL
 * basada en palabras clave compartidas (de parse_insights) — no regex
 * sobre el título. Cuando dos guiones comparten conceptos, sus nodos
 * se atraen y se mantienen cerca. Cuando no comparten nada, se repelen.
 *
 * Animación: Verlet integration con repulsión Coulomb + atracción Hooke +
 * gravedad sutil al centro. Los nodos NUNCA paran de moverse — drift
 * orgánico constante.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ── Colores según retención (verde alto, rojo bajo, cian sin datos) ────────────
function retentionColor(retention) {
  if (!retention || retention === 0) return '#64748b';
  if (retention >= 0.5)  return '#22c55e';
  if (retention >= 0.3)  return '#f59e0b';
  return '#ef4444';
}

function connectionColor(retentionA, retentionB) {
  if ((!retentionA || retentionA === 0) && (!retentionB || retentionB === 0)) {
    return '#00d4ff';
  }
  const r = Math.max(retentionA || 0, retentionB || 0);
  return retentionColor(r);
}

// ── Similitud entre 2 videos basada en parse_insights.keywords (Jaccard) ───────
function jaccardSimilarity(keywordsA, keywordsB) {
  if (!keywordsA?.length || !keywordsB?.length) return 0;
  const setA = new Set(keywordsA);
  const setB = new Set(keywordsB);
  let inter = 0;
  for (const k of setA) if (setB.has(k)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

// Heurística fallback cuando no hay keywords (palabras del tema)
function topicSimilarity(temaA, temaB) {
  const a = (temaA || '').toLowerCase();
  const b = (temaB || '').toLowerCase();
  if (!a || !b) return 0;
  const tokA = a.split(/[\s-_]+/).filter(w => w.length > 3);
  const tokB = b.split(/[\s-_]+/).filter(w => w.length > 3);
  return jaccardSimilarity(tokA, tokB);
}

// ── Resuelve keywords de un video buscando en parse_insights por projectId ────
function findKeywordsForVideo(video, parseInsights) {
  if (!parseInsights || !video?.tema) return null;
  const tema = video.tema.toLowerCase().split(' ')[0];
  for (const [projectId, insight] of Object.entries(parseInsights)) {
    if (projectId.toLowerCase().includes(tema)) return insight.keywords || null;
  }
  return null;
}

// ── Helper: Convertir hex a rgba para máxima compatibilidad de Canvas ─────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Hook de animación: layout estático distribuido + drift sinusoidal ─────────
// (Reemplaza el force-directed Verlet que con pocos nodos sin edges se
//  comportaba mal. Layout determinístico siempre visible + animación viva.)
function useForceSimulation(videos, parseInsights, canvasRef) {
  const stateRef = useRef({ nodes: [], edges: [], frame: 0 });
  const rafRef = useRef(null);
  const hoverRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  // Inicializa nodos y edges cuando cambian los videos
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Distribuimos los nodos con un patrón Phyllotaxis (Fibonacci spiral)
    // que da una distribución natural sin overlap, escalada al canvas.
    const N = videos.length;
    const golden = Math.PI * (3 - Math.sqrt(5));        // ángulo dorado ≈ 2.4 rad
    const maxR = Math.min(W, H) * 0.36;                  // radio efectivo del layout

    const nodes = videos.map((v, i) => {
      // Fibonacci-spiral coords: cada nodo i está a sqrt(i/N) * maxR del centro
      const t = (i + 0.5) / Math.max(N, 1);
      const r = Math.sqrt(t) * maxR + 40;                // +40 para que el primero no quede en el centro
      const angle = i * golden;
      const x0 = cx + Math.cos(angle) * r;
      const y0 = cy + Math.sin(angle) * r;

      // Limpiar y parsear las vistas numéricas seguras
      const safeViews = parseInt(String(v.views || "1").replace(/,/g, ''), 10) || 1;

      return {
        id:        v.video_id || v.tema || String(i),
        tema:      v.tema || 'Unknown',
        views:     v.views || 0,
        ctr:       v.ctr || 0,
        retention: v.retention || 0,
        hook:      v.hook_style || '',
        keywords:  findKeywordsForVideo(v, parseInsights) || [],
        // Posición home (drift suave alrededor de este punto)
        homeX:     x0,
        homeY:     y0,
        x:         x0,
        y:         y0,
        // Cada nodo tiene su propia frecuencia y amplitud de drift
        driftAmp:  16 + (i % 3) * 5,
        driftFx:   0.013 + (i % 4) * 0.003,
        driftFy:   0.011 + (i % 5) * 0.0025,
        phase:     i * 1.7,
        radius:    Math.max(14, Math.min(34, 14 + Math.sqrt(safeViews) * 0.6)),
        birthIdx:  i,
        isNew:     i >= videos.length - 3,
      };
    });

    // Edges: 3 capas de similitud — keywords (fuerte), hook_style (medio), proximidad (débil)
    // Garantiza que la red nunca quede en 0 sinapsis cuando hay >=2 videos.
    const edges = [];
    for (let i = 0; i < videos.length; i++) {
      for (let j = i + 1; j < videos.length; j++) {
        // Capa 1: keywords compartidas (parse_insights)
        let sim = jaccardSimilarity(nodes[i].keywords, nodes[j].keywords);
        if (sim > 0.05) {
          edges.push({ a: i, b: j, sim: Math.min(1, sim * 1.4), kind: 'keywords' });
          continue;
        }
        // Capa 2: mismo hook_style → 0.5
        if (nodes[i].hook && nodes[j].hook && nodes[i].hook === nodes[j].hook) {
          edges.push({ a: i, b: j, sim: 0.5, kind: 'hook' });
          continue;
        }
        // Capa 3: similitud de tema (palabra raíz compartida)
        sim = topicSimilarity(nodes[i].tema, nodes[j].tema);
        if (sim > 0.05) {
          edges.push({ a: i, b: j, sim, kind: 'tema' });
          continue;
        }
        // Capa 4: conexión débil por defecto entre nodos cercanos en el layout
        if (Math.abs(i - j) <= 2) {
          edges.push({ a: i, b: j, sim: 0.2, kind: 'proximidad' });
        }
      }
    }

    stateRef.current = { nodes, edges, frame: 0 };
  }, [videos, parseInsights, canvasRef]);

  // Animation loop
  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const state = stateRef.current;
    state.frame++;
    const f = state.frame;
    const nodes = state.nodes;
    const edges = state.edges;

    // Drift: cada nodo orbita suavemente alrededor de su home.
    for (const n of nodes) {
      n.x = n.homeX + Math.sin(f * n.driftFx + n.phase) * n.driftAmp;
      n.y = n.homeY + Math.cos(f * n.driftFy + n.phase * 0.7) * n.driftAmp;
    }

    // ── Render ────────────────────────────────────────────────────────────
    // Fondo oscuro
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Partículas sutiles de fondo
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 50; i++) {
      const px = (Math.sin(i * 1.9 + f * 0.004) * 0.5 + 0.5) * W;
      const py = (Math.cos(i * 2.7 + f * 0.003) * 0.5 + 0.5) * H;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Conexiones (con pulso suave)
    for (const e of edges) {
      const a = nodes[e.a];
      const b = nodes[e.b];
      const pulse = Math.sin(f * 0.04 + e.a * 0.5) * 0.15 + 0.85;
      const alpha = Math.min(1, e.sim * 1.6 + 0.35) * pulse;
      const color = connectionColor(a.retention, b.retention);
      
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = hexToRgba(color, alpha);
      ctx.lineWidth = Math.max(1, e.sim * 3.5 + 0.5);
      ctx.stroke();
    }

    // Nodos con glow + pulso
    for (const n of nodes) {
      const pulseFactor = 1 + Math.sin(f * 0.05 + n.birthIdx * 0.7) * 0.07;
      const color = retentionColor(n.retention);
      const isHover = hoverRef.current === n.id;
      const r = n.radius * pulseFactor * (isHover ? 1.15 : 1);

      // Glow
      const glowR = r * (isHover ? 3.2 : 2.4);
      const glowAlpha = isHover ? 0.4 : 0.18;
      const grd = ctx.createRadialGradient(n.x, n.y, r * 0.3, n.x, n.y, glowR);
      grd.addColorStop(0, hexToRgba(color, glowAlpha));
      grd.addColorStop(1, hexToRgba(color, 0));
      
      ctx.beginPath();
      ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Anillo exterior nuevo (último 3 videos)
      if (n.isNew) {
        const ringR = r * 1.4 + Math.sin(f * 0.08 + n.birthIdx) * 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba('#fef08a', 0.6); // Equivalente a #fef08a99
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Núcleo
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? color : hexToRgba(color, 0.82); // Equivalente a color + 'd0'
      ctx.fill();
      ctx.strokeStyle = '#0a0a1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Etiqueta NEW
      if (n.isNew) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEW', n.x, n.y - r - 8);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [canvasRef]);

  // Start/stop animation
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick, videos]);

  // Mouse interaction (hover tooltip)
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height / rect.height);

    let found = null;
    for (const n of stateRef.current.nodes) {
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy <= (n.radius + 10) ** 2) { found = n; break; }
    }

    hoverRef.current = found ? found.id : null;
    if (found) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, node: found });
    } else {
      setTooltip(null);
    }
  }, [canvasRef]);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    setTooltip(null);
  }, []);

  return { tooltip, handleMouseMove, handleMouseLeave };
}

// ── Componente exportado ──────────────────────────────────────────────────────
export default function NeuronGraph({ data }) {
  const canvasRef = useRef(null);

  const videos = data?.mejor_rendimiento || [];
  const parseInsights = data?.parse_insights || null;
  const edgeCount = (() => {
    if (!videos.length) return 0;
    // Aproximación: contar pares con similitud > 0.05 (mismo cálculo que el hook)
    let count = 0;
    for (let i = 0; i < videos.length; i++) {
      for (let j = i + 1; j < videos.length; j++) {
        const kwA = parseInsights ? findKeywordsForVideo(videos[i], parseInsights) : null;
        const kwB = parseInsights ? findKeywordsForVideo(videos[j], parseInsights) : null;
        let sim = jaccardSimilarity(kwA, kwB);
        if (sim === 0) sim = topicSimilarity(videos[i].tema, videos[j].tema);
        if (sim > 0.05) count++;
      }
    }
    return count;
  })();

  const { tooltip, handleMouseMove, handleMouseLeave } =
    useForceSimulation(videos, parseInsights, canvasRef);

  if (!videos.length) {
    return (
      <div style={{
        background: '#0a0a1a', borderRadius: 12, border: '1px solid #1e2a3a',
        padding: '40px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        minHeight: 200, justifyContent: 'center',
      }}>
        <div style={{ fontSize: 36 }}>🧠</div>
        <div style={{ color: '#334155', fontSize: 13 }}>Aún no hay videos sincronizados</div>
        <div style={{ color: '#1e3a5f', fontSize: 12 }}>
          Sube tu primer video y sincroniza con YouTube para ver la red crecer
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Contadores arriba izquierda */}
      <div style={{
        position: 'absolute', top: 14, left: 16, zIndex: 2,
        display: 'flex', gap: 8, alignItems: 'center',
        fontFamily: 'Inter, sans-serif', fontSize: 11,
      }}>
        <div style={{
          color: '#22c55e', background: '#22c55e18',
          border: '1px solid #22c55e44', padding: '3px 10px',
          borderRadius: 20, fontWeight: 600,
        }}>
          🧠 {videos.length} neuronas
        </div>
        <div style={{
          color: '#00d4ff', background: '#00d4ff18',
          border: '1px solid #00d4ff44', padding: '3px 10px',
          borderRadius: 20, fontWeight: 600,
        }}>
          ⚡ {edgeCount} sinapsis
        </div>
      </div>

      {/* Leyenda arriba derecha */}
      <div style={{
        position: 'absolute', top: 14, right: 16, zIndex: 2,
        display: 'flex', gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 10,
      }}>
        {[
          { color: '#22c55e', label: '≥50% ret.' },
          { color: '#f59e0b', label: '30-50%' },
          { color: '#ef4444', label: '<30%' },
          { color: '#64748b', label: 'sin datos' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span style={{ color: '#64748b' }}>{label}</span>
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={1200}
        height={500}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: '100%', height: 500, borderRadius: 12, display: 'block',
          border: '1px solid #1e2a3a', cursor: 'crosshair',
        }}
      />

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, 900),
          top:  Math.max(tooltip.y - 100, 8),
          background: '#0d1117ee',
          border: '1px solid ' + retentionColor(tooltip.node.retention) + '88',
          borderRadius: 8,
          padding: '10px 14px',
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          color: '#e2e8f0',
          pointerEvents: 'none',
          zIndex: 10,
          minWidth: 200,
          maxWidth: 280,
          boxShadow: '0 4px 20px #00000080',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#fff', fontSize: 13 }}>
            {tooltip.node.tema}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>👁 <strong>{tooltip.node.views.toLocaleString()}</strong> vistas</span>
            {tooltip.node.ctr > 0 && (
              <span>🎯 <strong style={{ color: '#00d4ff' }}>{(tooltip.node.ctr * 100).toFixed(1)}%</strong> CTR</span>
            )}
            {tooltip.node.retention > 0 && (
              <span>⏱ <strong style={{ color: retentionColor(tooltip.node.retention) }}>
                {(tooltip.node.retention * 100).toFixed(0)}%
              </strong> retención</span>
            )}
            {tooltip.node.hook && (
              <span style={{ color: '#64748b', marginTop: 4, fontSize: 11 }}>{tooltip.node.hook}</span>
            )}
            {tooltip.node.keywords?.length > 0 && (
              <span style={{ color: '#94a3b8', marginTop: 4, fontSize: 10, fontStyle: 'italic' }}>
                {tooltip.node.keywords.slice(0, 5).join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
