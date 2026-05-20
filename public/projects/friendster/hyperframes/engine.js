/* ── HyperFrames Orchestration Player & Controller ───────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.hyperframesData === 'undefined') {
    console.error('❌ No se encontró hyperframesData. Asegúrate de compilar data.js');
    document.getElementById('chapter-title').innerText = 'Error: data.js no encontrado';
    return;
  }

  initEngine();
});

const SLOT_COORDS = {
  "top-left":     { x: 270,  y: 220 },
  "top-right":    { x: 1010, y: 220 },
  "mid-left":     { x: 240,  y: 410 },
  "center":       { x: 640,  y: 410 },
  "mid-right":    { x: 1040, y: 410 },
  "bottom-left":  { x: 290,  y: 600 },
  "bottom-right": { x: 990,  y: 600 },
};

const SIZE_PX = {
  sm: 130,
  md: 200,
  lg: 280,
  xl: 360,
};

// ── Dynamic Slot Coordinates for Radial & Grid Adaptations ──
function getDynamicSlotCoords(elements) {
  const coords = { ...SLOT_COORDS };
  const activeSlots = elements.map(e => e.slot);
  const hasCenter = activeSlots.includes("center");

  // Case 1: 6 Elements Layout (Unified 3x2 Grid)
  if (elements.length === 6) {
    if (activeSlots.includes("top-left")) coords["top-left"] = { x: 270, y: 220 };
    if (activeSlots.includes("top-right")) coords["top-right"] = { x: 1010, y: 220 };
    if (activeSlots.includes("center")) coords["center"] = { x: 640, y: 220 }; // Move to top-center
    if (activeSlots.includes("mid-right")) coords["mid-right"] = { x: 1010, y: 520 }; // Move to bottom-right
    if (activeSlots.includes("bottom-left")) coords["bottom-left"] = { x: 270, y: 520 }; // Move to bottom-left
    if (activeSlots.includes("bottom-right")) coords["bottom-right"] = { x: 640, y: 520 }; // Move to bottom-center
  }
  // Case 2: Radial Layout (Center + Orbitals)
  else if (hasCenter && elements.length >= 4) {
    elements.forEach(e => {
      if (e.slot !== "center") {
        const defaultCoord = SLOT_COORDS[e.slot];
        const dx = defaultCoord.x - 640;
        const dy = defaultCoord.y - 410;
        const factor = 0.82; // Pull 18% closer for tight radial diagram feel
        coords[e.slot] = {
          x: 640 + dx * factor,
          y: 410 + dy * factor,
        };
      }
    });
  }
  // Case 3: 5 Elements Layout with Center
  else if (hasCenter && elements.length === 5) {
    elements.forEach(e => {
      if (e.slot !== "center") {
        const defaultCoord = SLOT_COORDS[e.slot];
        const dx = defaultCoord.x - 640;
        const dy = defaultCoord.y - 410;
        const factor = 0.85;
        coords[e.slot] = {
          x: 640 + dx * factor,
          y: 410 + dy * factor,
        };
      }
    });
  }

  return coords;
}

let mainTimeline = null;
let totalFrames = 0;
const FPS = 60;
let audioEl = null;

function initEngine() {
  const data = window.hyperframesData;
  const container = document.getElementById('elements-container');
  const svgContainer = document.getElementById('arrows-svg');
  
  // Total duration in seconds based on audio or user defined
  const totalDuration = data.duration || 60; 
  totalFrames = Math.ceil(totalDuration * FPS);
  
  console.log(`🎬 Inicializando HyperFrames. Duración: ${totalDuration}s (${totalFrames} frames a 60fps)`);
  
  // Create audio element for real-time preview sync
  audioEl = document.createElement('audio');
  audioEl.src = `../audio.mp3`;
  audioEl.preload = 'auto';
  document.body.appendChild(audioEl);
  
  // Create Main Master GSAP Timeline (paused initially)
  mainTimeline = gsap.timeline({ paused: true });

  // 1. Inject Visual Elements
  const allElements = [];
  const allArrows = [];

  data.scenes.forEach((scene, sceneIndex) => {
    const startSec = scene.start;
    const endSec = scene.end;

    // Get the dynamic coordinate map for this scene
    const sceneCoords = getDynamicSlotCoords(scene.visual.elements);

    // Create scene container to isolate visibility
    scene.visual.elements.forEach(el => {
      const coord = sceneCoords[el.slot] || SLOT_COORDS.center;
      const sizePx = SIZE_PX[el.size] || SIZE_PX.md;
      
      const elDiv = document.createElement('div');
      elDiv.id = `el-${scene.id}-${el.id}`;
      elDiv.className = `visual-element el-type-${el.type}`;
      elDiv.style.left = `${coord.x}px`;
      elDiv.style.top = `${coord.y}px`;
      
      // Customize size by type
      let width = sizePx;
      let height = sizePx;
      if (el.type === 'logo') {
        width = Math.min(sizePx, 180);
        height = width;
        elDiv.classList.add('element-logo');
        elDiv.innerHTML = `<iconify-icon icon="simple-icons:${el.name}"></iconify-icon>`;
      } else if (el.type === 'icon') {
        width = 86;
        height = 86;
        elDiv.classList.add('element-icon');
        elDiv.innerHTML = `<iconify-icon icon="${el.icon_name}"></iconify-icon>`;
      } else if (el.type === 'pexels_image') {
        width = Math.min(sizePx, 280);
        height = Math.round(width * 0.5625); // 16:9 aspect ratio
        elDiv.classList.add('element-image');
        elDiv.style.width = `${width}px`;
        elDiv.style.height = `${height}px`;
        // Load local Pexels cache or external URL
        const imgPath = el.local_path 
          ? `../../${el.local_path}` // Path relation inside public/projects/google-wave/
          : (el.url || `https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=300`);
        elDiv.innerHTML = `<img src="${imgPath}" alt="${el.trigger_word}" />`;
      } else if (el.type === 'label_red') {
        elDiv.classList.add('element-label-red');
        elDiv.innerText = el.text;
      } else if (el.type === 'label_black') {
        elDiv.classList.add('element-label-black');
        elDiv.innerText = el.text;
      } else if (el.type === 'motion_graphic') {
        elDiv.classList.add('element-motion');
        elDiv.innerHTML = `<code>${el.text || 'system.sync()'}</code>`;
      }

      container.appendChild(elDiv);
      allElements.push({
        el: elDiv,
        data: el,
        sceneId: scene.id,
        startSec,
        endSec,
        type: el.type
      });
    });

    // 2. SVG Connections & Arrows
    if (scene.visual.arrows) {
      scene.visual.arrows.forEach((arr, arrowIndex) => {
        const fromEl = scene.visual.elements.find(e => e.id === arr.from);
        const toEl = scene.visual.elements.find(e => e.id === arr.to);
        if (!fromEl || !toEl) return;

        const fromCoord = sceneCoords[fromEl.slot] || SLOT_COORDS.center;
        const toCoord = sceneCoords[toEl.slot] || SLOT_COORDS.center;

        // Calculate path representing a smooth curve
        const pathData = calculateCurve(fromCoord.x, fromCoord.y, toCoord.x, toCoord.y, arr.style);
        
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('id', `arrow-${scene.id}-${arrowIndex}`);
        
                const isOrange = arr.style && arr.style.includes('orange');
        pathEl.setAttribute('class', isOrange ? 'arrow-path-orange' : 'arrow-path');
        pathEl.setAttribute('d', pathData);
        pathEl.setAttribute('marker-end', isOrange ? 'url(#arrow-marker-orange)' : 'url(#arrow-marker)');
        pathEl.setAttribute('opacity', '0');
        
        svgContainer.appendChild(pathEl);
        
        allArrows.push({
          path: pathEl,
          sceneId: scene.id,
          startSec,
          endSec,
          start_sec: arr.start_sec
        });
      });
    }
  });

  // 3. Assemble GSAP Master Timeline (Millisecond accurate timing based on speech cues)
  // Scene level title & captions timings
  data.scenes.forEach((scene) => {
    const startSec = scene.start;
    const endSec = scene.end;
    const duration = endSec - startSec;

    // A. Chapter Title animations
    mainTimeline.add(() => {
      document.getElementById('chapter-title').innerText = scene.chapter_title || '';
      document.getElementById('chapter-number').innerText = `ESCENA ${scene.id}`;
    }, startSec);

    // B. Subtitles timed triggers
    mainTimeline.to('#caption-box', {
      opacity: 1,
      y: 0,
      duration: 0.3,
      ease: 'power2.out',
      onStart: () => {
        document.getElementById('caption-text').innerHTML = formatSpeech(scene.texto);
      }
    }, startSec);

    mainTimeline.to('#caption-box', {
      opacity: 0,
      y: 10,
      duration: 0.3,
      ease: 'power2.in'
    }, endSec - 0.3);

    // C. Elements Animations
    const sceneElements = allElements.filter(e => e.sceneId === scene.id);
    sceneElements.forEach((elObj) => {
      const elData = elObj.data;
      const elDom = elObj.el;
      
      // Calculate delay based on standard trigger word mapping (or evenly distributed if not custom timed)
      const relativeStart = elData.start_sec ? (elData.start_sec - startSec) : 0.5;
      const absoluteStart = startSec + relativeStart;
      
      // Animate entry with premium physics (pop or slide)
      if (elObj.type === 'logo' || elObj.type === 'icon' || elObj.type === 'label_red') {
        // Juicy pop elastic scale
        mainTimeline.fromTo(elDom, {
          scale: 0,
          opacity: 0,
          rotation: elObj.type === 'label_red' ? -15 : 0
        }, {
          scale: 1,
          opacity: 1,
          rotation: elObj.type === 'label_red' ? -3 : 0,
          duration: 0.85,
          ease: 'elastic.out(0.8, 0.45)'
        }, absoluteStart);
      } else {
        // Smooth slide-in
        mainTimeline.fromTo(elDom, {
          y: '+=80',
          scale: 0.85,
          opacity: 0
        }, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out'
        }, absoluteStart);
      }

      // Continuous float macro-animation once active (controlled by Master Timeline)
      const entryDuration = (elObj.type === 'logo' || elObj.type === 'icon' || elObj.type === 'label_red') ? 0.85 : 0.7;
      const floatStart = absoluteStart + entryDuration;
      const floatDuration = 2 + Math.random() * 2;
      const remainingTime = endSec - floatStart;
      if (remainingTime > 0) {
        const floatRepeats = Math.ceil(remainingTime / floatDuration) + 1;
        mainTimeline.to(elDom, {
          y: '+=6',
          rotation: elObj.type === 'label_red' ? '+=1.5' : '+=3',
          duration: floatDuration,
          repeat: floatRepeats,
          yoyo: true,
          ease: 'sine.inOut'
        }, floatStart);
      }

      // Animate exit
      mainTimeline.to(elDom, {
        scale: 0.8,
        opacity: 0,
        y: '-=40',
        duration: 0.4,
        ease: 'power2.in'
      }, endSec - 0.4);
    });

    // D. Connection Arrows Drawing Animation
    const sceneArrows = allArrows.filter(a => a.sceneId === scene.id);
    sceneArrows.forEach((arrObj) => {
      const pathDom = arrObj.path;
      // Get length to animate path drawing
      const pathLength = pathDom.getTotalLength();
      
      const absoluteStart = arrObj.start_sec || (startSec + 0.8);
      
      mainTimeline.fromTo(pathDom, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
        opacity: 0
      }, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.out'
      }, absoluteStart);

      mainTimeline.to(pathDom, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in'
      }, endSec - 0.3);
    });
  });
}

// ── Vector Curve Arrow Calculations ───────────────────────────────────────────
function calculateCurve(x1, y1, x2, y2, style) {
  // If straight style, draw line with small correction for markers
  if (style && style.includes('straight')) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  
  // Calculate curved path (quadratic Bezier) using offset control point
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = (x1 + x2) / 2 - dy * 0.15;
  const cy = (y1 + y2) / 2 + dx * 0.15;
  
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ── Speech Formatting helper (bolding key concepts) ──────────────────────────
function formatSpeech(text) {
  if (!text) return '';
  // Highlight important words / numbers / tech brand names
  return text.replace(
    /\b(google|wave|blackberry|iphone|apple|100%|40%|15\s*segundos|banda\s+ancha|ellis|gibbs|1989|colaborativo|sincronizado|producción)\b/gi,
    '<strong>$1</strong>'
  );
}

// ── Headless/Dashboard Playback Control Hooks ─────────────────────────────────
// ── Headless/Dashboard Playback Control Hooks ─────────────────────────────────
window.seekToFrame = function(frame) {
  if (!mainTimeline) return;
  const progress = Math.min(Math.max(frame / totalFrames, 0), 1);
  mainTimeline.progress(progress).pause();
  if (audioEl) {
    audioEl.currentTime = mainTimeline.time();
    audioEl.pause();
  }
};

window.playTimeline = function() {
  if (!mainTimeline) return;
  mainTimeline.play();
  if (audioEl) {
    audioEl.currentTime = mainTimeline.time();
    audioEl.play().catch(e => console.log('Autoplay blocked or audio missing', e));
  }
  console.log('▶ Play HyperFrames');
};

window.pauseTimeline = function() {
  if (!mainTimeline) return;
  mainTimeline.pause();
  if (audioEl) {
    audioEl.pause();
  }
  console.log('⏸ Pausa HyperFrames');
};

window.getTimelineProgress = function() {
  if (!mainTimeline) return 0;
  return mainTimeline.progress();
};
