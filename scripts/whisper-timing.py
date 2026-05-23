"""
scripts/whisper-timing.py
Transcribe el audio de un proyecto con Faster-Whisper y genera word-timing.json.

Uso:
    python scripts/whisper-timing.py <nombre-proyecto>

Requisito (instalar una sola vez):
    pip install faster-whisper

Output: public/projects/<nombre>/word-timing.json
"""

import sys
import json
import os
from pathlib import Path


def get_scene_id(timestamp_seg, scene_timing):
    """Devuelve el id de la escena a la que pertenece el timestamp dado."""
    for scene in scene_timing:
        inicio = scene.get('inicio_seg', scene.get('start', 0))
        fin    = scene.get('fin_seg',   scene.get('start', 0) + scene.get('duration', 0))
        if inicio <= timestamp_seg <= fin:
            try:
                return int(scene['id'])
            except (ValueError, TypeError):
                return scene['id']
    return 0


def build_scene_timing_index(timing_data):
    """
    Normaliza timing.json (que puede tener distintos formatos):
      - Dict: { "parrafo-01": { "start": 0.0, "duration": 4.2 } }
      - Array: [ { "id": 1, "inicio_seg": 0.0, "fin_seg": 4.2 } ]
    Devuelve siempre una lista con { id, inicio_seg, fin_seg }.
    """
    if isinstance(timing_data, dict):
        scenes = []
        for key, val in timing_data.items():
            # key = "parrafo-01"  val = { start, duration }
            raw_id = key.replace('parrafo-', '').lstrip('0') or '0'
            try:
                scene_id = int(raw_id)
            except ValueError:
                scene_id = raw_id
            start    = float(val.get('start',    0))
            duration = float(val.get('duration', 0))
            scenes.append({
                'id':        scene_id,
                'inicio_seg': start,
                'fin_seg':    start + duration,
            })
        return scenes

    if isinstance(timing_data, list):
        scenes = []
        for item in timing_data:
            inicio = item.get('inicio_seg', item.get('start', 0))
            fin    = item.get('fin_seg',    item.get('start', 0) + item.get('duration', 0))
            scenes.append({
                'id':        item.get('id', 0),
                'inicio_seg': float(inicio),
                'fin_seg':    float(fin),
            })
        return scenes

    return []


def transcribe_with_timing(project_name):
    base_dir    = Path(__file__).parent.parent  # raiz del proyecto

    # ── Channel-aware path resolution ────────────────────────────────────────
    # Reads active-channel.json (same logic as server/index.js getActiveChannelId)
    channel_id = None
    active_channel_file = base_dir / 'active-channel.json'
    if active_channel_file.exists():
        try:
            with open(active_channel_file, 'r', encoding='utf-8') as f:
                channel_id = json.load(f).get('channelId')
        except Exception:
            pass

    # Try channel-scoped path first, then fall back to legacy flat path
    if channel_id:
        project_dir = base_dir / 'public' / 'projects' / channel_id / project_name
        if not project_dir.exists():
            project_dir = base_dir / 'public' / 'projects' / project_name
    else:
        project_dir = base_dir / 'public' / 'projects' / project_name

    audio_path  = project_dir / 'audio.mp3'
    timing_path = project_dir / 'timing.json'
    output_path = project_dir / 'word-timing.json'

    print(f"  Canal activo : {channel_id or '(legacy/ninguno)'}")
    print(f"  Directorio   : {project_dir}")

    # Validaciones
    if not audio_path.exists():
        print(f"ERROR: No se encontro el audio en {audio_path}", file=sys.stderr)
        sys.exit(1)

    if not timing_path.exists():
        print(f"ERROR: No se encontro timing.json en {timing_path}", file=sys.stderr)
        sys.exit(1)


    # Cargar timing.json y normalizar
    with open(timing_path, 'r', encoding='utf-8') as f:
        raw_timing = json.load(f)
    scene_timing = build_scene_timing_index(raw_timing)
    print(f"  Timing cargado: {len(scene_timing)} escenas")

    # Cargar modelo Faster-Whisper
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERROR: faster-whisper no esta instalado.", file=sys.stderr)
        print("  Instala con: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)

    print("  Cargando modelo Whisper 'base' (cpu / int8)...")
    model = WhisperModel("base", device="cpu", compute_type="int8")

    print(f"  Transcribiendo {audio_path.name} ...")
    segments, info = model.transcribe(str(audio_path), word_timestamps=True)

    words = []
    segment_count = 0
    for segment in segments:
        segment_count += 1
        if segment_count % 10 == 0:
            print(f"    Procesando segmento {segment_count}...")
        if not segment.words:
            continue
        for word in segment.words:
            escena_id = get_scene_id(word.start, scene_timing)
            words.append({
                "palabra":   word.word.strip(),
                "inicio":    round(word.start, 3),
                "fin":       round(word.end,   3),
                "escena_id": escena_id,
            })

    # Guardar resultado
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  word-timing.json generado: {len(words)} palabras en {output_path}")


if __name__ == "__main__":
    project = sys.argv[1] if len(sys.argv) > 1 else None
    if not project:
        print("Uso: python scripts/whisper-timing.py <nombre-proyecto>", file=sys.stderr)
        sys.exit(1)

    print(f"Whisper Timing — proyecto: {project}")
    transcribe_with_timing(project)
    print("Completado exitosamente.")
