import React, { useState, useEffect, useCallback } from 'react';

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

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Nuevo proyecto</div>
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
  );
}

// ── Project Detail ────────────────────────────────────────────────────────────
function ProjectDetail({ project, onRefresh, setStatus }) {
  const [loadingAudio,    setLoadingAudio]    = useState(false);
  const [loadingPlan,     setLoadingPlan]     = useState(false);
  const [loadingMedia,    setLoadingMedia]    = useState(false);
  const [loadingActivate, setLoadingActivate] = useState(false);
  const [loadingReparse,  setLoadingReparse]  = useState(false);

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

  const readyToActivate = project.hasPlan && project.hasMedia;

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StepRow num="1" label={`Guion extraído — ${project.paragraphCount} párrafos`} done={project.hasGuion} />
          <button
            style={loadingReparse ? S.btnDisabled : { ...S.btn('#1e2a3a', '#94a3b8'), fontSize: 11 }}
            onClick={reparse}
            disabled={loadingReparse}
            title="Re-extraer el guion usando el parser determinista"
          >
            {loadingReparse ? '...' : 'Re-parsear'}
          </button>
        </div>
        <StepRow num="2" label="Audio generado y timings calculados"           done={project.hasTiming} />
        <StepRow num="3" label="Plan de escenas generado (LLM → scene-plan.json)" done={project.hasPlan} />
        <StepRow num="4" label="Imágenes y videos descargados (Pexels)"        done={project.hasMedia} />
        <StepRow num="5" label="Proyecto activo en Remotion Studio"            done={project.active} />
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
            Descarga desde Pexels los medios definidos en el plan. Idempotente: no re-descarga lo existente.
          </p>
          <button
            style={project.hasPlan
              ? (loadingMedia ? S.btnDisabled : S.btn('#8b5cf6', '#fff'))
              : S.btnDisabled}
            onClick={fetchMedia}
            disabled={!project.hasPlan || loadingMedia}
          >
            {loadingMedia ? 'Descargando...' : project.hasMedia ? 'Re-descargar faltantes' : 'Descargar media'}
          </button>
          {project.hasMedia && <div style={{ color: '#22c55e', fontSize: 12, marginTop: 8 }}>✓ Media en images/ y videos/</div>}
        </div>

      </div>

    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [projects,    setProjects]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [showNew,     setShowNew]     = useState(false);
  const [status,      setStatus]      = useState('Listo');
  const [statusType,  setStatusType]  = useState('idle'); // idle | ok | err | loading

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

  useEffect(() => { loadProjects(); }, []);

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
            <ProjectDetail project={selected} onRefresh={onRefresh} setStatus={setSt} />
          )}
          {!showNew && !selected && (
            <div style={S.empty}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>
                Selecciona un proyecto o crea uno nuevo
              </div>
              <div style={{ fontSize: 13, color: '#334155', marginTop: 8 }}>
                Cada proyecto pasa por 5 pasos: guion → audio → plan → media → Remotion
              </div>
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
