import React, { useState, useEffect, useCallback } from 'react';
import NeuronGraph from './NeuronGraph';

const API = 'http://localhost:5000';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  app: {
    display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif',
    backgroundColor: '#060910', color: '#e2e8f0', overflow: 'hidden',
  },
  sidebar: {
    width: 260, flexShrink: 0, backgroundColor: '#0d1117',
    borderRight: '1px solid #1e2a3a', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '18px 16px 14px', borderBottom: '1px solid #1e2a3a',
    fontSize: 13, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  projectList: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  projectItem: (active, isSelected) => ({
    padding: '10px 16px', cursor: 'pointer', userSelect: 'none',
    backgroundColor: isSelected ? '#0f2040' : 'transparent',
    borderLeft: isSelected ? '3px solid #00d4ff' : '3px solid transparent',
    transition: 'background 0.15s',
  }),
  projectName: (isSelected) => ({
    fontSize: 13, fontWeight: isSelected ? 700 : 400,
    color: isSelected ? '#e2e8f0' : '#94a3b8',
    marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }),
  projectMeta: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: (color) => ({
    fontSize: 10, padding: '1px 6px', borderRadius: 3,
    backgroundColor: color + '22', color: color, fontWeight: 600,
  }),
  newBtn: {
    margin: '10px 12px', padding: '8px 12px', cursor: 'pointer',
    backgroundColor: '#00d4ff', color: '#060910', border: 'none',
    borderRadius: 6, fontWeight: 700, fontSize: 12, letterSpacing: '0.05em',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar: {
    padding: '14px 24px', borderBottom: '1px solid #1e2a3a',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0d1117',
  },
  topbarTitle: { fontSize: 15, fontWeight: 700, color: '#e2e8f0' },
  topbarMeta: { fontSize: 12, color: '#64748b' },
  content: { flex: 1, overflowY: 'auto', padding: '24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  card: {
    backgroundColor: '#0d1117', border: '1px solid #1e2a3a',
    borderRadius: 10, padding: '20px',
  },
  cardTitle: { fontSize: 12, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', marginBottom: 14, textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 6,
    border: '1px solid #1e2a3a', backgroundColor: '#060910',
    color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: (h) => ({
    width: '100%', height: h, padding: '10px 12px', borderRadius: 6,
    border: '1px solid #1e2a3a', backgroundColor: '#060910',
    color: '#e2e8f0', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
    resize: 'vertical', boxSizing: 'border-box', outline: 'none',
  }),
  btn: (color, text = '#060910') => ({
    padding: '9px 18px', cursor: 'pointer', border: 'none', borderRadius: 6,
    backgroundColor: color, color: text, fontWeight: 700, fontSize: 12,
    letterSpacing: '0.04em',
  }),
  btnDisabled: {
    padding: '9px 18px', border: 'none', borderRadius: 6,
    backgroundColor: '#1e2a3a', color: '#475569', fontWeight: 700, fontSize: 12,
    cursor: 'not-allowed',
  },
  stepRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepNum: (done) => ({
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
    backgroundColor: done ? '#00d4ff22' : '#1e2a3a',
    color: done ? '#00d4ff' : '#475569',
    border: `1px solid ${done ? '#00d4ff' : '#1e2a3a'}`,
  }),
  stepLabel: (done) => ({ fontSize: 13, color: done ? '#e2e8f0' : '#64748b', fontWeight: done ? 600 : 400 }),
  statusBar: {
    padding: '10px 16px', backgroundColor: '#0a1628',
    borderTop: '1px solid #1e2a3a', fontSize: 12, color: '#94a3b8',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  dot: (color) => ({
    width: 7, height: 7, borderRadius: '50%', backgroundColor: color, flexShrink: 0,
  }),
  empty: {
    textAlign: 'center', color: '#334155', padding: '60px 20px',
  },
  activeBadge: {
    fontSize: 10, padding: '2px 8px', borderRadius: 10,
    backgroundColor: '#00d4ff22', color: '#00d4ff', fontWeight: 700,
    border: '1px solid #00d4ff44',
  },
  memSection: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16,
  },
  memTag: (color) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 12, marginRight: 6, marginBottom: 6,
    fontSize: 11, fontWeight: 600, backgroundColor: color + '22', color, border: `1px solid ${color}44`,
  }),
  perfRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 0', borderBottom: '1px solid #1e2a3a', fontSize: 12,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusDot({ done }) {
  return <div style={S.dot(done ? '#22c55e' : '#334155')} />;
}

function StepRow({ num, label, done }) {
  return (
    <div style={S.stepRow}>
      <div style={S.stepNum(done)}>{done ? '✓' : num}</div>
      <span style={S.stepLabel(done)}>{label}</span>
    </div>
  );
}

// ── New Project Form ──────────────────────────────────────────────────────────
function NewProjectPanel({ onCreated, setStatus }) {
  const [name,   setName]   = useState('');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [topicForPrompt, setTopicForPrompt] = useState('');
  const [enrichedPrompt, setEnrichedPrompt] = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !script.trim()) return;
    setLoading(true);
    setStatus('Procesando guion con IA...');
    try {
      const res  = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rawScript: script }),
      });
      const data = await res.json();
      setStatus(`✅ ${data.message} — ${data.paragraphCount} párrafos extraídos`);
      setName('');
      setScript('');
      onCreated(data.projectId);
    } catch (err) {
      setStatus('❌ Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  const generateEnrichedPrompt = async () => {
    setLoadingPrompt(true);
    setStatus('🧠 Inyectando aprendizaje del canal en el prompt base...');
    try {
      const res = await fetch(`${API}/api/prompt/enriched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tema: topicForPrompt.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail);
      setEnrichedPrompt(data.content);
      setStatus('✅ Prompt enriquecido listo. Copialo y pegalo en Claude/ChatGPT.');
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoadingPrompt(false);
    }
  };

  const copyPrompt = () => {
    if (!enrichedPrompt) return;
    navigator.clipboard.writeText(enrichedPrompt).then(
      () => setStatus('📋 Prompt enriquecido copiado'),
      () => setStatus('❌ No se pudo copiar')
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Paso 0: Generador de prompt con aprendizaje ──────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>🧠 Paso 0 — Prompt enriquecido con aprendizaje del canal</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
          Genera una versión de <code style={{ color: '#00d4ff' }}>prompt.txt</code> con los insights del canal inyectados:
          temas ya cubiertos (no repetir), hooks ganadores, recomendaciones. Copialo y pegalo en Claude/ChatGPT para
          que el guion nuevo aproveche todo lo aprendido.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            style={{ ...S.input, flex: 1 }}
            placeholder="(Opcional) Tema del próximo video — ej: 'Yahoo - la arquitectura monolítica'"
            value={topicForPrompt}
            onChange={e => setTopicForPrompt(e.target.value)}
          />
          <button
            style={loadingPrompt ? S.btnDisabled : S.btn('#8b5cf6', '#fff')}
            onClick={generateEnrichedPrompt}
            disabled={loadingPrompt}
          >
            {loadingPrompt ? 'Generando...' : '🧠 Generar prompt'}
          </button>
        </div>
        {enrichedPrompt && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button style={{ ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 11 }} onClick={copyPrompt}>
                📋 Copiar prompt
              </button>
            </div>
            <div style={{
              maxHeight: 280, overflowY: 'auto',
              padding: '12px 16px', backgroundColor: '#060910',
              border: '1px solid #1e2a3a', borderRadius: 6,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.5,
            }}>
              {enrichedPrompt}
            </div>
          </div>
        )}
      </div>

      {/* ── Paso 1: Crear proyecto pegando guion ─────────────────────────── */}
      <div style={S.card}>
        <div style={S.cardTitle}>Paso 1 — Nuevo proyecto</div>
        <div style={{ marginBottom: 10 }}>
          <input
            style={S.input}
            placeholder="Nombre del proyecto (ej: Historia de Flash)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <textarea
          style={S.textarea(280)}
          placeholder="Pega aquí el guion completo que te entregó Claude..."
          value={script}
          onChange={e => setScript(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          {loading
            ? <button style={S.btnDisabled} disabled>Procesando...</button>
            : <button style={S.btn('#00d4ff')} onClick={handleCreate}>
                Extraer guion
              </button>
          }
        </div>
      </div>
    </div>
  );
}

// ── Project Detail ────────────────────────────────────────────────────────────
function ProjectDetail({ project, onRefresh, setStatus, memory }) {
  const [loadingAudio,       setLoadingAudio]       = useState(false);
  const [loadingPlan,        setLoadingPlan]        = useState(false);
  const [loadingMedia,       setLoadingMedia]       = useState(false);
  const [loadingActivate,    setLoadingActivate]    = useState(false);
  const [loadingReparse,     setLoadingReparse]     = useState(false);
  const [loadingSmartReparse,setLoadingSmartReparse] = useState(false);
  const [loadingWordTiming,  setLoadingWordTiming]  = useState(false);
  const [hasWordTiming,      setHasWordTiming]      = useState(false);
  const [loadingMetadata,    setLoadingMetadata]    = useState(false);
  const [metadataContent,    setMetadataContent]    = useState(null);

  // States for comments analysis
  const [commentsReport, setCommentsReport] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const matchedVideo = memory?.mejor_rendimiento?.find(v => {
    return project.id.toLowerCase().startsWith(v.tema.toLowerCase()) || 
           v.tema.toLowerCase().startsWith(project.id.split('-')[0]);
  });

  // Comprobar si ya existe word-timing.json para este proyecto
  useEffect(() => {
    fetch(`${API}/api/active-project`)
      .then(res => res.json())
      .then(data => setHasWordTiming(Array.isArray(data.wordTiming) && data.wordTiming.length > 0))
      .catch(() => setHasWordTiming(false));
  }, [project.id]);

  // Cargar yt-metadata si ya existe
  useEffect(() => {
    setMetadataContent(null);
    fetch(`${API}/api/projects/${project.id}/yt-metadata`)
      .then(res => res.json())
      .then(data => { if (data.exists) setMetadataContent(data.content); })
      .catch(() => {});
  }, [project.id]);

  useEffect(() => {
    setCommentsReport(null);
    if (matchedVideo) {
      fetch(`${API}/api/projects/${project.id}/comments-analysis?videoId=${matchedVideo.video_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            setCommentsReport(data.report);
          }
        })
        .catch(err => console.error('Error cargando análisis de comentarios:', err));
    }
  }, [project.id, matchedVideo]);

  const analyzeComments = async () => {
    if (!matchedVideo) return;
    setLoadingComments(true);
    setStatus('💬 Descargando y analizando comentarios de YouTube con Claude...');
    try {
      const res = await fetch(`${API}/api/projects/${project.id}/analyze-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: matchedVideo.video_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCommentsReport(data.report);
      setStatus('✅ Análisis de comentarios completado');
    } catch (err) {
      setStatus(`❌ Error analizando comentarios: ${err.message}`);
    } finally {
      setLoadingComments(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### **Autor**') || trimmed.startsWith('### **Usuario**') || trimmed.startsWith('### Autor:')) {
        return <h4 key={idx} style={{ color: '#8b5cf6', marginTop: 16, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{line.replace(/^###\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} style={{ color: '#e2e8f0', marginTop: 14, marginBottom: 6, fontSize: 14, fontWeight: 700 }}>{line.replace(/^###\s*/, '')}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} style={{ color: '#00d4ff', marginTop: 20, marginBottom: 8, fontSize: 15, fontWeight: 700, borderBottom: '1px solid #1e2a3a', paddingBottom: 4 }}>{line.replace(/^##\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('#')) {
        return <h2 key={idx} style={{ color: '#fff', marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 800 }}>{line.replace(/^#\s*/, '')}</h2>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return <li key={idx} style={{ color: '#94a3b8', fontSize: 13, marginLeft: 16, marginBottom: 4 }}>{line.replace(/^[-*]\s*/, '')}</li>;
      }
      if (trimmed.startsWith('>')) {
        return (
          <blockquote key={idx} style={{ borderLeft: '3px solid #8b5cf6', paddingLeft: 12, margin: '8px 0', color: '#cbd5e1', fontStyle: 'italic', fontSize: 13, backgroundColor: '#8b5cf60a', padding: '8px 12px', borderRadius: 4 }}>
            {line.replace(/^>\s*/, '')}
          </blockquote>
        );
      }
      if (trimmed === '---') {
        return <hr key={idx} style={{ border: 'none', borderTop: '1px solid #1e2a3a', margin: '16px 0' }} />;
      }
      return <p key={idx} style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 8px 0', lineHeight: 1.5 }}>{line}</p>;
    });
  };

  const smartReparse = async () => {
    setLoadingSmartReparse(true);
    setStatus('🧠 Fragmentando con Claude (puede tardar ~30s)...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/smart-reparse`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`✅ ${data.message} — ${data.paragraphCount} fragmentos cortos`);
      onRefresh();
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoadingSmartReparse(false);
    }
  };

  const reparse = async () => {
    setLoadingReparse(true);
    setStatus('Re-procesando guion con parser determinista...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/reparse`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`✅ ${data.message} — ${data.paragraphCount} párrafos extraídos`);
      onRefresh();
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoadingReparse(false);
    }
  };

  const generateAudio = async () => {
    setLoadingAudio(true);
    setStatus('Generando audios y timings (puede tardar varios minutos)...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/generate-audio`, { method: 'POST' });
      const data = await res.json();
      setStatus(`✅ ${data.message}`);
      onRefresh();
    } catch (err) {
      setStatus('❌ Error generando audio');
    } finally {
      setLoadingAudio(false);
    }
  };

  const generateWordTiming = async () => {
    setLoadingWordTiming(true);
    setStatus('🎙️ Faster-Whisper analizando audio (puede tardar 1-3 min)...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/whisper-timing`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail);
      setHasWordTiming(true);
      setStatus('✅ word-timing.json generado — sincronización por palabra lista');
    } catch (err) {
      setStatus(`❌ Error en Whisper: ${err.message}`);
    } finally {
      setLoadingWordTiming(false);
    }
  };

  const generatePlan = async () => {
    setLoadingPlan(true);
    setStatus('Analizando guion con LLM y generando scene-plan.json...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/scene-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`✅ ${data.message}`);
      onRefresh();
    } catch (err) {
      setStatus(`❌ Error generando scene-plan: ${err.message}`);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchMedia = async () => {
    setLoadingMedia(true);
    setStatus('Descargando imágenes y videos desde Pexels...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/fetch-media`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(`✅ ${data.message}`);
      onRefresh();
    } catch (err) {
      setStatus(`❌ Error descargando media: ${err.message}`);
    } finally {
      setLoadingMedia(false);
    }
  };

  const generateMetadata = async () => {
    setLoadingMetadata(true);
    setStatus('📺 Generando metadata YouTube con Claude (Capítulos, descripción, hashtags)...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/generate-yt-metadata`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail);
      setMetadataContent(data.content);
      setStatus(`✅ yt-metadata.txt generado correctamente`);
      onRefresh();
    } catch (err) {
      setStatus(`❌ Error generando metadata: ${err.message}`);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const copyMetadata = () => {
    if (!metadataContent) return;
    navigator.clipboard.writeText(metadataContent).then(
      () => setStatus('📋 Metadata copiada al portapapeles'),
      () => setStatus('❌ No se pudo copiar')
    );
  };

  const activate = async () => {
    setLoadingActivate(true);
    setStatus('Activando proyecto en Remotion...');
    try {
      const res  = await fetch(`${API}/api/projects/${project.id}/activate`, { method: 'POST' });
      const data = await res.json();
      setStatus(`✅ ${data.message} — refresca Remotion Studio para ver los cambios`);
      onRefresh();
    } catch (err) {
      setStatus('❌ Error activando proyecto');
    } finally {
      setLoadingActivate(false);
    }
  };

  const readyToActivate = project.hasGuion && project.hasMedia;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{project.id}</h2>
        {project.active && <span style={S.activeBadge}>ACTIVO EN REMOTION</span>}
        {!project.active && readyToActivate && (
          <button
            style={loadingActivate ? S.btnDisabled : S.btn('#8b5cf6', '#fff')}
            onClick={activate}
            disabled={loadingActivate}
          >
            {loadingActivate ? 'Activando...' : '▶ Activar en Remotion'}
          </button>
        )}
      </div>

      {/* Steps overview */}
      <div style={{ ...S.card, padding: '16px 20px' }}>
        <div style={S.cardTitle}>Estado del pipeline</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <StepRow num="1" label={`Guion extraído — ${project.paragraphCount} párrafos`} done={project.hasGuion} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={loadingReparse ? S.btnDisabled : { ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 11 }}
              onClick={reparse}
              disabled={loadingReparse}
              title="Re-extraer el guion usando el parser determinista"
            >
              {loadingReparse ? '...' : 'Re-parsear'}
            </button>
            <button
              style={loadingSmartReparse ? S.btnDisabled : { ...S.btn('#8b5cf622', '#8b5cf6'), fontSize: 11, border: '1px solid #8b5cf644' }}
              onClick={smartReparse}
              disabled={loadingSmartReparse}
              title="Fragmentar inteligentemente con Claude (~45 palabras por escena)"
            >
              {loadingSmartReparse ? '🧠...' : '🧠 Smart'}
            </button>
          </div>
        </div>
        <StepRow num="2" label="Audio generado y timings calculados"           done={project.hasTiming} />
        <StepRow num="3" label="Plan de escenas generado (opcional, legacy)"   done={project.hasPlan} />
        <StepRow num="4" label="Imágenes y videos descargados (Pexels)"        done={project.hasMedia} />
        <StepRow num="5" label="Metadata YouTube generada (yt-metadata.txt)"   done={project.hasMetadata} />
        <StepRow num="6" label="Proyecto activo en Remotion Studio"            done={project.active} />
      </div>

      <div style={S.grid}>

        {/* Step 2 — Audio */}
        <div style={S.card}>
          <div style={S.cardTitle}>Paso 2 — Generar voces</div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
            Convierte cada párrafo del guion en audio MP3 y calcula sus timings exactos.
          </p>
          {project.hasTiming
            ? <div style={{ color: '#22c55e', fontSize: 13 }}>✓ Audio y timings listos</div>
            : (
              <button
                style={project.hasGuion
                  ? (loadingAudio ? S.btnDisabled : S.btn('#f59e0b'))
                  : S.btnDisabled}
                onClick={generateAudio}
                disabled={!project.hasGuion || loadingAudio}
              >
                {loadingAudio ? 'Generando...' : 'Generar voces + timings'}
              </button>
            )
          }
          {/* Word Timing — aparece solo cuando hay audio generado */}
          {project.hasTiming && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e2a3a' }}>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                🎙️ <strong style={{ color: '#94a3b8' }}>Word Timing</strong> — sincronización milimétrica
              </div>
              {hasWordTiming
                ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: '#22c55e', fontSize: 12 }}>✓ word-timing.json listo</div>
                    <button
                      style={loadingWordTiming ? S.btnDisabled : { ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 10 }}
                      onClick={generateWordTiming}
                      disabled={loadingWordTiming}
                      title="Regenerar timestamps por palabra"
                    >
                      {loadingWordTiming ? '...' : '↺ Regenerar'}
                    </button>
                  </div>
                )
                : (
                  <button
                    style={loadingWordTiming ? S.btnDisabled : S.btn('#8b5cf622', '#8b5cf6', '1px solid #8b5cf644')}
                    onClick={generateWordTiming}
                    disabled={loadingWordTiming}
                  >
                    {loadingWordTiming ? '🎙️ Analizando audio...' : '🎙️ Generar Word Timing'}
                  </button>
                )
              }
            </div>
          )}
        </div>

        {/* Step 3 — Scene plan */}
        <div style={S.card}>
          <div style={S.cardTitle}>Paso 3 — Plan de escenas</div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
            El LLM analiza cada párrafo y decide: layout, query de Pexels, headline, keywords y data side-content.
          </p>
          <button
            style={project.hasTiming
              ? (loadingPlan ? S.btnDisabled : S.btn('#00d4ff'))
              : S.btnDisabled}
            onClick={generatePlan}
            disabled={!project.hasTiming || loadingPlan}
          >
            {loadingPlan
              ? 'Analizando...'
              : project.hasPlan ? 'Regenerar plan' : 'Generar plan'}
          </button>
          {project.hasPlan && <div style={{ color: '#22c55e', fontSize: 12, marginTop: 8 }}>✓ scene-plan.json listo</div>}
        </div>

        {/* Step 4 — Fetch media */}
        <div style={S.card}>
          <div style={S.cardTitle}>Paso 4 — Descargar imágenes/videos</div>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
            Descarga desde Pexels los medios. Lee los elementos pexels_image del guion (o scene-plan.json si existe). Idempotente.
          </p>
          <button
            style={project.hasGuion
              ? (loadingMedia ? S.btnDisabled : S.btn('#8b5cf6', '#fff'))
              : S.btnDisabled}
            onClick={fetchMedia}
            disabled={!project.hasGuion || loadingMedia}
          >
            {loadingMedia ? 'Descargando...' : project.hasMedia ? 'Re-descargar faltantes' : 'Descargar media'}
          </button>
          {project.hasMedia && <div style={{ color: '#22c55e', fontSize: 12, marginTop: 8 }}>✓ Media en images/ y videos/</div>}
        </div>

      </div>

      {/* Step 5 — YouTube Metadata */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={S.cardTitle}>📺 Paso 5 — Metadata YouTube (título, descripción, hashtags)</div>
          {metadataContent && (
            <button
              style={{ ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 11 }}
              onClick={copyMetadata}
            >
              📋 Copiar
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 0 }}>
          Claude analiza el guion + memoria del canal y genera: título optimizado para CTR, descripción con capítulos (timestamps reales), hashtags, etiquetas SEO y concepto de miniatura. Listo para pegar en YouTube.
        </p>
        <button
          style={project.hasGuion
            ? (loadingMetadata ? S.btnDisabled : S.btn('#ef4444', '#fff'))
            : S.btnDisabled}
          onClick={generateMetadata}
          disabled={!project.hasGuion || loadingMetadata}
        >
          {loadingMetadata ? 'Generando...' : (metadataContent ? '🔄 Regenerar metadata' : '🎬 Generar metadata YouTube')}
        </button>
        {metadataContent && (
          <div style={{
            marginTop: 16, maxHeight: 400, overflowY: 'auto',
            padding: '14px 18px', backgroundColor: '#060910', border: '1px solid #1e2a3a',
            borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: 1.5,
          }}>
            {metadataContent}
          </div>
        )}
      </div>

      {/* Step 6 — YouTube Comments Analysis */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={S.cardTitle}>💬 Comunidad — Análisis de Comentarios (YouTube)</div>
          {matchedVideo && (
            <button
              style={loadingComments ? S.btnDisabled : S.btn('#8b5cf6', '#fff')}
              onClick={analyzeComments}
              disabled={loadingComments}
            >
              {loadingComments ? 'Analizando...' : (commentsReport ? '🔄 Volver a Analizar' : '🔍 Analizar Comentarios')}
            </button>
          )}
        </div>

        {!matchedVideo ? (
          <div style={{ color: '#64748b', padding: '16px', backgroundColor: '#1e2a3a22', borderRadius: 8, border: '1px dashed #1e2a3a', fontSize: 13, lineHeight: 1.5 }}>
            ⚠️ Este proyecto aún no ha sido sincronizado con un video publicado en YouTube.
            <br />
            Para poder analizar sus comentarios, sube el video a YouTube, agrégalo a tu canal y haz clic en el botón morado <strong>"Sincronizar YouTube"</strong> en el Dashboard de inicio.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, padding: '10px 14px', backgroundColor: '#1e2a3a44', borderRadius: 6, fontSize: 12, border: '1px solid #1e2a3a' }}>
              <div>Video ID: <strong style={{ color: '#e2e8f0' }}>{matchedVideo.video_id}</strong></div>
              <div>Vistas: <strong style={{ color: '#e2e8f0' }}>{matchedVideo.views.toLocaleString()}</strong></div>
              <div>Likes: <strong style={{ color: '#e2e8f0' }}>{matchedVideo.likes}</strong></div>
              {matchedVideo.ctr > 0 && <div>CTR: <strong style={{ color: '#00d4ff' }}>{(matchedVideo.ctr * 100).toFixed(1)}%</strong></div>}
              {matchedVideo.retention > 0 && <div>Retención: <strong style={{ color: '#22c55e' }}>{(matchedVideo.retention * 100).toFixed(0)}%</strong></div>}
            </div>

            {commentsReport ? (
              <div style={{ maxHeight: 500, overflowY: 'auto', padding: '16px 20px', backgroundColor: '#090d16', borderRadius: 8, border: '1px solid #1e2a3a' }}>
                {renderMarkdown(commentsReport)}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                Haz clic en el botón superior para descargar los comentarios actuales de este video desde YouTube y recibir el informe analítico de Claude con sugerencias de respuestas para copiar.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Channel Memory Panel ─────────────────────────────────────────────────────
function ChannelMemoryPanel({ memory, onSync, isSyncing }) {
  if (!memory) return (
    <div style={{ ...S.card, textAlign: 'center', color: '#334155', fontSize: 13 }}>
      Cargando memoria del canal...
    </div>
  );

  const topPerf = [...(memory.mejor_rendimiento || [])]
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em',
          textTransform: 'uppercase' }}>
          🧠 Memoria del Canal
        </div>
        <button
          style={isSyncing ? S.btnDisabled : S.btn('#8b5cf6', '#fff')}
          onClick={onSync}
          disabled={isSyncing}
        >
          {isSyncing ? '🔄 Sincronizando...' : '🔄 Sincronizar YouTube'}
        </button>
      </div>

      <div style={S.memSection}>

        {/* Temas usados */}
        <div style={S.card}>
          <div style={S.cardTitle}>Temas cubiertos ({memory.temas_usados?.length || 0})</div>
          {(memory.temas_usados || []).map(t => (
            <span key={t} style={S.memTag('#00d4ff')}>{t}</span>
          ))}
          {memory.temas_usados?.length === 0 && (
            <div style={{ color: '#334155', fontSize: 12 }}>Sin temas aún</div>
          )}
        </div>

        {/* Hook styles */}
        <div style={S.card}>
          <div style={S.cardTitle}>Hook styles usados ({memory.estilo_hooks?.length || 0})</div>
          {(memory.estilo_hooks || []).map(h => (
            <span key={h} style={S.memTag('#8b5cf6')}>{h}</span>
          ))}
          {memory.estilo_hooks?.length === 0 && (
            <div style={{ color: '#334155', fontSize: 12 }}>Sin hooks registrados aún</div>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: '#475569' }}>
            Total videos: <strong style={{ color: '#e2e8f0' }}>{memory.total_videos || 0}</strong>
            {memory.ultima_publicacion && (
              <span style={{ marginLeft: 10 }}>
                Último: {new Date(memory.ultima_publicacion).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rendimiento */}
      {topPerf.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Rendimiento por video</div>
          {topPerf.map(v => (
            <div key={v.video_id} style={S.perfRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
                  {v.tema}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {v.hook_style}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, flexShrink: 0, marginLeft: 12 }}>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                  👁 <strong style={{ color: '#e2e8f0' }}>{v.views.toLocaleString()}</strong>
                </span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>
                  👍 <strong style={{ color: '#e2e8f0' }}>{v.likes}</strong>
                </span>
                {v.retention > 0 && (
                  <span style={{ color: v.retention >= 0.6 ? '#22c55e' : '#f59e0b', fontSize: 11, fontWeight: 700 }}>
                    {(v.retention * 100).toFixed(0)}% ret.
                  </span>
                )}
                {v.ctr > 0 && (
                  <span style={{ color: '#00d4ff', fontSize: 11, fontWeight: 700 }}>
                    {(v.ctr * 100).toFixed(1)}% CTR
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [projects,      setProjects]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [showNew,       setShowNew]       = useState(false);
  const [status,        setStatus]        = useState('Listo');
  const [statusType,    setStatusType]    = useState('idle'); // idle | ok | err | loading
  const [memory,        setMemory]        = useState(null);
  const [loadingSync,   setLoadingSync]   = useState(false);
  const [renderEngine,  setRenderEngine]  = useState(
    () => localStorage.getItem('render_engine') || 'remotion'
  );
  const [insights,      setInsights]      = useState(null);

  const ENGINES = [
    { id: 'remotion',    label: 'Remotion',    sublabel: 'React + TypeScript', icon: '⚗️', activo: true  },
    { id: 'hyperframes', label: 'HyperFrames', sublabel: 'HTML + GSAP — HeyGen', icon: '🎦', activo: false, badge: 'Próximamente' },
  ];

  const selectEngine = (id) => {
    const engine = ENGINES.find(e => e.id === id);
    if (!engine || !engine.activo) return;
    setRenderEngine(id);
    localStorage.setItem('render_engine', id);
  };

  const loadProjects = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/projects`);
      const data = await res.json();
      setProjects(data);
      // refresh selected project data
      if (selected) {
        const updated = data.find(p => p.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (_) {
      setStatus('⚠ No se pudo conectar al servidor (puerto 5000)');
    }
  }, [selected]);

  const loadMemory = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/memory`);
      const data = await res.json();
      setMemory(data);
    } catch (_) {}
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/memory/insights`);
      const data = await res.json();
      setInsights(data);
    } catch (_) {}
  }, []);

  const syncMemory = async () => {
    setLoadingSync(true);
    setSt('🔄 Sincronizando estadísticas y retención desde YouTube...');
    try {
      const res = await fetch(`${API}/api/memory/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSt('✅ Canal sincronizado y memoria actualizada correctamente.');
        await loadMemory();
        await loadInsights();
      } else {
        setSt(`❌ Error al sincronizar: ${data.error || 'error desconocido'}`);
      }
    } catch (e) {
      setSt(`❌ Error de conexión al sincronizar canal: ${e.message}`);
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadMemory();
    loadInsights();
  }, []);



  // Wrap setStatus to also set type
  const setSt = (msg) => {
    setStatus(msg);
    if (msg.startsWith('✅')) setStatusType('ok');
    else if (msg.startsWith('❌') || msg.startsWith('⚠')) setStatusType('err');
    else setStatusType('loading');
  };

  const onProjectCreated = async (id) => {
    await loadProjects();
    setShowNew(false);
    // auto-select new project
    const res  = await fetch(`${API}/api/projects/${id}`);
    const data = await res.json();
    setSelected(data);
  };

  const onRefresh = async () => {
    await loadProjects();
    if (selected) {
      const res  = await fetch(`${API}/api/projects/${selected.id}`);
      const data = await res.json();
      setSelected(data);
    }
  };

  const selectProject = async (p) => {
    setShowNew(false);
    const res  = await fetch(`${API}/api/projects/${p.id}`);
    const data = await res.json();
    setSelected(data);
  };

  const statusColor = statusType === 'ok' ? '#22c55e' : statusType === 'err' ? '#ef4444' : '#f59e0b';

  return (
    <div style={S.app}>

      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>Código Muerto</div>
        <button style={S.newBtn} onClick={() => { setShowNew(true); setSelected(null); }}>
          + Nuevo proyecto
        </button>
        <div style={S.projectList}>
          {projects.length === 0 && (
            <div style={{ padding: '20px 16px', fontSize: 12, color: '#334155' }}>
              Sin proyectos aún
            </div>
          )}
          {projects.map(p => (
            <div
              key={p.id}
              style={S.projectItem(p.active, selected?.id === p.id)}
              onClick={() => selectProject(p)}
            >
              <div style={S.projectName(selected?.id === p.id)}>{p.id}</div>
              <div style={S.projectMeta}>
                {p.hasGuion   && <span style={S.badge('#00d4ff')}>guion</span>}
                {p.hasTiming  && <span style={S.badge('#f59e0b')}>audio</span>}
                {p.hasPlan    && <span style={S.badge('#00d4ff')}>plan</span>}
                {p.hasMedia   && <span style={S.badge('#8b5cf6')}>media</span>}
                {p.active     && <span style={S.badge('#22c55e')}>activo</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2a3a', fontSize: 11, color: '#334155' }}>
          Remotion Studio: :3000<br />
          Backend: :5000
        </div>
      </div>

      {/* Main area */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div>
            <div style={S.topbarTitle}>
              {showNew ? 'Nuevo Proyecto' : selected ? selected.id : 'Dashboard'}
            </div>
            <div style={S.topbarMeta}>
              {projects.length} proyecto{projects.length !== 1 ? 's' : ''} · Pipeline de automatización
            </div>
          </div>
          {selected && !showNew && (
            <button
              style={{ ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 11 }}
              onClick={onRefresh}
            >
              Actualizar
            </button>
          )}
        </div>

        <div style={S.content}>
          {showNew && (
            <NewProjectPanel onCreated={onProjectCreated} setStatus={setSt} />
          )}
          {!showNew && selected && (
            <ProjectDetail project={selected} onRefresh={onRefresh} setStatus={setSt} memory={memory} />
          )}
          {!showNew && !selected && (
            <div>
              {/* ── Selector de motor de renderizado ──────────────────────────── */}
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={S.cardTitle}>🎬 Motor de Renderizado</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {ENGINES.map(engine => (
                    <div
                      key={engine.id}
                      onClick={() => selectEngine(engine.id)}
                      style={{
                        position: 'relative',
                        flex: 1,
                        padding: '14px 16px',
                        borderRadius: 8,
                        border: renderEngine === engine.id
                          ? '2px solid #00d4ff'
                          : '2px solid #1e2a3a',
                        background: renderEngine === engine.id ? '#00d4ff0a' : '#060910',
                        cursor: engine.activo ? 'pointer' : 'not-allowed',
                        opacity: engine.activo ? 1 : 0.45,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      {engine.badge && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: '#1e2a3a', color: '#64748b', border: '1px solid #334155',
                        }}>
                          {engine.badge}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${renderEngine === engine.id ? '#00d4ff' : '#334155'}`,
                          background: renderEngine === engine.id ? '#00d4ff' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {renderEngine === engine.id && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#060910' }} />
                          )}
                        </div>
                        <div style={{ fontSize: 14 }}>{engine.icon}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: engine.activo ? '#e2e8f0' : '#475569' }}>
                            {engine.label}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                            {engine.sublabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...S.empty, padding: '16px 0 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
                  Selecciona un proyecto o crea uno nuevo
                </div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 6 }}>
                  Guion → Audio → Plan → Media → Remotion
                </div>
              </div>

              <ChannelMemoryPanel memory={memory} onSync={syncMemory} isSyncing={loadingSync} />

              {/* ── Red de Memoria Neuronal ──────────────────────────────── */}
              <div style={{ ...S.card, marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={S.cardTitle}>🧠 Red de Memoria del Canal</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>
                    Hover sobre un nodo para ver sus métricas · Nodos conectados = guiones con palabras clave compartidas
                  </div>
                </div>
                <NeuronGraph data={memory} />
              </div>

              {/* ── Panel de Insights derivados ──────────────────────────── */}
              {insights && (
                <div style={{ ...S.card, marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={S.cardTitle}>💡 Insights Aprendidos</div>
                    <div style={{ fontSize: 11, color: '#334155' }}>
                      Derivado de {insights.total_videos} videos y {insights.total_projects} proyectos
                    </div>
                  </div>

                  {/* Recomendaciones (lo más accionable arriba) */}
                  {insights.recommendations?.length > 0 && (
                    <div style={{
                      marginBottom: 16, padding: '14px 18px',
                      background: '#1e2a3a33', border: '1px solid #00d4ff22',
                      borderRadius: 8,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: '#00d4ff',
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
                      }}>
                        Recomendaciones para tu próximo video
                      </div>
                      {insights.recommendations.map((r, i) => (
                        <div key={i} style={{
                          fontSize: 13, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.5,
                        }}>{r}</div>
                      ))}
                    </div>
                  )}

                  {/* Grid 2 columnas: hooks y motion graphics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Hook patterns ganadores */}
                    {insights.best_hook_patterns?.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: '#64748b',
                          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                          🪝 Hooks por rendimiento
                        </div>
                        {insights.best_hook_patterns.slice(0, 5).map(h => (
                          <div key={h.pattern} style={{
                            padding: '6px 0', borderBottom: '1px solid #1e2a3a',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          }}>
                            <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1, marginRight: 8 }}>
                              {h.pattern}
                            </span>
                            <span style={{ fontSize: 11, color: '#00d4ff', fontWeight: 700 }}>
                              {h.avg_views.toLocaleString()} v
                            </span>
                            <span style={{ fontSize: 10, color: '#475569', marginLeft: 6 }}>
                              ×{h.uses}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Motion graphics ganadores */}
                    {insights.visual_winners?.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: '#64748b',
                          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                          🎨 Motion graphics ganadores
                        </div>
                        {insights.visual_winners.slice(0, 5).map(v => (
                          <div key={v.element} style={{
                            padding: '6px 0', borderBottom: '1px solid #1e2a3a',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          }}>
                            <span style={{ fontSize: 12, color: '#e2e8f0', flex: 1, marginRight: 8 }}>
                              {v.element}
                            </span>
                            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                              {v.avg_views.toLocaleString()} v
                            </span>
                            <span style={{ fontSize: 10, color: '#475569', marginLeft: 6 }}>
                              ×{v.samples}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Color moods */}
                    {insights.mood_performance?.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: '#64748b',
                          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                          🎭 Color moods
                        </div>
                        {insights.mood_performance.map(m => (
                          <div key={m.mood} style={{
                            padding: '6px 0', borderBottom: '1px solid #1e2a3a',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          }}>
                            <span style={{ fontSize: 12, color: '#e2e8f0' }}>{m.mood}</span>
                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                              {m.avg_views.toLocaleString()} v
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Temas agotados */}
                    {insights.topics_agotados?.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: '#64748b',
                          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                        }}>
                          🚫 Temas ya cubiertos
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {insights.topics_agotados.map(t => (
                            <span key={t} style={{
                              fontSize: 10, padding: '2px 8px',
                              background: '#475569', color: '#cbd5e1',
                              borderRadius: 12, opacity: 0.7,
                            }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Status bar */}
        <div style={S.statusBar}>
          <div style={S.dot(statusColor)} />
          <span>{status}</span>
        </div>
      </div>

    </div>
  );
}
