import { WorkbenchScene } from './workbench.jsx';
import { useBgm } from './bgm.js';
const { useState, useEffect, useRef, useCallback } = React;

  /* ============================================================
     INLINE DATA FALLBACK — minimal copy so page renders without fetch
     (full content lives in /data/rings.json)
     ============================================================ */
  const FALLBACK_DATA = {
    profile: {
      name: 'Haochen "Harry" Li',
      callsign: 'HARRY',
      title: 'AI Engineer',
      focusAreas: ['AI Agent System Orchestration', 'LLM Post Training', 'Applied AI & DevOps'],
      location: 'Miami, FL',
      tagline: 'Building agentic systems that ship.',
      avatar: './images/optimized/profile.webp',
      educationShort: [
        'Duke · M.Eng. AI · 2024–2025',
        'HKU · B.Sc. CS & Actuarial · 2019–2024',
      ],
      educationFull: [],
      experience: [
        { company: 'Jemm Tec', role: 'Artificial Intelligence Engineer', location: 'Miami, FL', dates: 'Jul. 2026 – Present', bullets: [] },
      ],
      skills: {},
      contact: {
        email: 'harryli12321@gmail.com',
        linkedin: 'https://www.linkedin.com/in/haochen-harry-li',
        github: 'https://github.com/Harrisous',
        location: 'Miami, FL, USA',
      },
    },
    projects: [
      { id: 'PROJ_008', title: 'Gosvea Agentic RAG Chatbot', category: 'Production Agentic AI', description: 'Production AI support channel.', stack: ['LangChain','Pinecone','Groq'], link: null, image: './images/generated/project_008.webp' },
    ],
    blogs: [
      { id: 'BLOG_01', title: 'How AI Sees Cats — Grad-CAM Visualization', category: 'Computer Vision · XAI', description: 'Grad-CAM on cats.', stack: ['PyTorch'], link: './blog/blog1/blog1.html', image: null },
    ],
    resources: [
      { id: 'RES_01', title: 'CH_01 · Introduction to Machine Learning', category: 'Field Manual', description: 'Core concepts.', stack: ['Fundamentals'], link: './blog/blog2/1_introduction.html', image: null, active: true },
    ],
    publications: [
      { id: 'PUB_001', title: 'StableAML: Machine Learning for Behavioral Wallet Detection in Stablecoin Anti-Money Laundering on Ethereum', category: 'Peer-Reviewed · Blockchain (2026)', description: 'ML benchmark for behavioral wallet detection in stablecoin AML on Ethereum.', stack: ['Machine Learning', 'AML'], link: 'https://www.elspub.com/doi/10.55092/blockchain20260007', image: null },
    ],
    notes: [
      { id: 'NOTE_01', title: 'DeepSeek Tech Tree — from GPT to DeepSeek-V4.1', category: 'Study Notes · Course', description: 'A 21-lesson course.', stack: ['Transformer', 'MLA', 'MoE'], link: 'https://claude.ai/artifact/Dsrd1uuGzLMQ9Cbja9rmwr', image: null },
    ],
  };

  /* ============================================================
     Cyberpunk canvas background — layered neural net + matrix rain
     + signal pulses + occasional glitch bars
     ============================================================ */
  const useCyberBackground = () => {
    useEffect(() => {
      const canvas = document.getElementById('bg-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let raf = 0, frame = 0;
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      let reduced = motionPreference.matches;

      let width = 0, height = 0;
      const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };
      resize();

      const isMobile = () => width < 768;

      /* ---------- Hexagonal Water Grid ---------- */
      const hexRadius = isMobile() ? 48 : 64;
      const hexWidth = Math.sqrt(3) * hexRadius;
      const hexHeight = 2 * hexRadius;
      const xOffset = hexWidth;
      const yOffset = hexHeight * 0.75;

      /* ---------- Matrix Rain ---------- */
      const chars = 'アイウエオカキクケコｻｼｽｾｿﾀﾁﾂﾃﾄ01{}[]<>#$%*+=<>/\\';
      let cols = 0;
      let drops = [];
      const buildRain = () => {
        const size = 28; // even larger size = sparser density
        cols = Math.floor(width / size);
        drops = Array.from({ length: cols }).map(() => Math.random() * -height);
      };

      const onResize = () => { resize(); buildRain(); if (reduced) draw(); };
      window.addEventListener('resize', onResize);
      buildRain();

      /* ---------- Terminal Process Logs ---------- */
      const numTermCols = 24; // Up to 24 columns for super ultrawide
      const termColumns = Array.from({ length: numTermCols }, () => []);
      const maxLogs = 100; // Expanded vertical coverage
      
      const logSnippetsLeft = [
        "sys.init(0x00) -> SUCCESS", 
        "allocating mem... OK [0x2A4F]", 
        "CONNECT TCP 10.0.0.1:443",
        "WARN: buffer overflow detected at 0x0F", 
        "kernel.boot() -> mounting /dev/sda1", 
        "thread_spawn(40) -> PID 8934",
        "EXEC /bin/sh -c 'rm -rf /tmp/cache'", 
        "[OK] module loaded: cyber_core.so",
        "accessing main.db -> query OK (12ms)", 
        "TIMEOUT 404: peer unreachable",
        "socket.listen(8080) -> READY",
        "SIGKILL received on process 442",
        "dumping core... saved to /var/crash", 
        "cache miss: fetching from remote", 
        "rebuilding index -> tree balanced",
        "scan network -> 4 hosts up"
      ];

      const logSnippetsRight = [
        "decrypting hash [RSA-4096]", 
        "fetching records... 2404 items", 
        "SYNERGY protocol active (v2.4.1)", 
        "bypassing firewall -> proxy 127.0.0.1", 
        "AUTH REQUIRED: Enter passkey", 
        "granting root... access level 9", 
        "injecting payload [0x44 0x89 0xFA]",
        "compiling neural net model",
        "extracting telemetry data",
        "tracing IP packets -> origin unknown",
        "uploading firmware v3.11",
        "synchronizing temporal nodes",
        "parsing biometric logs",
        "executing brute_force.sh",
        "corrupting data cluster 04",
        "establishing quantum link",
        "downloading sub-routine 7A"
      ];

      const generateProgressBar = () => {
        const percent = Math.floor(Math.random() * 100);
        const bars = Math.floor(percent / 10);
        const empty = 10 - bars;
        return `[${'█'.repeat(bars)}${'░'.repeat(empty)}] ${percent.toString().padStart(3, ' ')}%`;
      };

      const generateLogLeft = (offsetMs = 0) => {
        const time = new Date(Date.now() - offsetMs).toISOString().split('T')[1].slice(0, 8);
        const snippet = logSnippetsLeft[Math.floor(Math.random() * logSnippetsLeft.length)];
        const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase();
        return `[${time}] 0x${hex} - ${snippet}`;
      };

      const generateLogRight = (offsetMs = 0) => {
        const time = new Date(Date.now() - offsetMs).toISOString().split('T')[1].slice(0, 8);
        const snippet = logSnippetsRight[Math.floor(Math.random() * logSnippetsRight.length)];
        const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0').toUpperCase();
        
        let output = `[${time}] 0x${hex} - ${snippet}`;
        // Attach a progress bar ~40% of the time to make it wider
        if (Math.random() > 0.6) {
          output += ` ${generateProgressBar()}`;
        }
        return output;
      };
      
      for (let i = 0; i < numTermCols; i++) {
        for (let j = 0; j < maxLogs; j++) {
          const offsetMs = (maxLogs - j) * 1000;
          termColumns[i].push(generateLogLeft(offsetMs));
        }
      }

      const getProjectedPoint = (vx, vy, t, w, h) => {
        const proj = (vx - vy) * 0.004;
        const wave1 = Math.sin(proj - t);
        const wave2 = Math.sin((vx * 0.002 + vy * 0.005) - t * 1.3) * 0.5;
        const wave3 = Math.sin((vx * 0.006 - vy * 0.002) - t * 0.8) * 0.3;
        const randPhase = Math.sin(vx * 0.012 + vy * 0.078) * 43.75;
        const wave4 = Math.sin(t * 0.6 + randPhase) * 0.25;

        let z = (wave1 + wave2 + wave3 + wave4) / 2.05;
        z = Math.max(-1, Math.min(1, z));

        // 2D longitudinal wave effect (nodes pushed in wave direction)
        const pushAmp = 56; // Amplitude of the push/pull stretching (scaled with radius)
        // wave direction is roughly bottom-left to top-right (+x, -y)
        const dx = z * pushAmp; 
        const dy = -z * pushAmp; 

        // Orthogonal shear to make the pull slightly organic and swirling
        const shear = (wave2 - wave3) * 12;
        
        const px = vx + dx + shear;
        const py = vy + dy + shear;

        return { px, py, z };
      };

      const drawHexagon = (cx, cy, radius, t, globalAlpha, w, h) => {
        const points = [];
        let avgZ = 0;
        for (let i = 0; i < 6; i++) {
          const angle_deg = 60 * i - 30;
          const angle_rad = Math.PI / 180 * angle_deg;
          const vx = cx + radius * Math.cos(angle_rad);
          const vy = cy + radius * Math.sin(angle_rad);
          const p = getProjectedPoint(vx, vy, t, w, h);
          points.push(p);
          avgZ += p.z;
        }
        avgZ /= 6;

        const normZ = (avgZ + 1) / 2; 

        // High: Blue (0, 229, 255)
        const r1 = 0, g1 = 229, b1 = 255;
        // Low: Dark Purple-Red (70, 0, 50)
        const r2 = 70, g2 = 0, b2 = 50;

        const r = Math.floor(r2 + (r1 - r2) * normZ);
        const g = Math.floor(g2 + (g1 - g2) * normZ);
        const b = Math.floor(b2 + (b1 - b2) * normZ);

        // Draw vertices (节点) without edges, making them larger
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${globalAlpha + 0.45})`;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(points[i].px, points[i].py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const draw = () => {
        if (document.visibilityState === 'hidden') return;
        frame++;
        const t = frame * 0.0105; // Slower time (30% reduction)
        
        // Clear background completely to avoid messy trails on moving nodes
        ctx.fillStyle = '#020202';
        ctx.fillRect(0, 0, width, height);

        /* ----- Matrix Rain (Native tails without background smearing) ----- */
        ctx.font = (isMobile() ? '11px' : '13px') + ' "JetBrains Mono", monospace';
        const tailLength = 20; 
        for (let i = 0; i < drops.length; i++) {
          const tailY = drops[i];
          
          for (let j = 0; j < tailLength; j++) {
            const y = tailY - j * 16; 
            if (y < -20) continue; 
            if (y > height + 20) continue;
            
            const ch = chars[Math.floor(Math.random() * chars.length)];
            const alpha = Math.pow(1 - j / tailLength, 1.5) * 0.35; 
            
            if (j === 0) {
              const roll = Math.random();
              if (roll > 0.9) {
                ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
                ctx.fillStyle = `rgba(220, 252, 255, 0.7)`;
              } else {
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(0, 229, 255, 0.5)`;
              }
            } else {
              ctx.shadowBlur = 0;
              ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
            }
            ctx.fillText(ch, i * 28, y);
          }
          
          ctx.shadowBlur = 0;
          drops[i] += 4;
          if (drops[i] - tailLength * 16 > height && Math.random() > 0.97) {
            drops[i] = -Math.random() * 200;
          }
        }

        /* ----- Random Red Dead Pixels (Snow with Lens Flare) ----- */
        if (Math.random() > 0.96) { // Halved frequency
          const numGlitches = Math.floor(Math.random() * 2) + 1;
          for (let g = 0; g < numGlitches; g++) {
            const rx = Math.random() * width;
            const ry = Math.random() * height;
            
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            
            // Horizontal trail (Lens Flare)
            const flareWidth = 120 + Math.random() * 240;
            const flareAlpha = 0.2 + Math.random() * 0.3;
            ctx.fillStyle = `rgba(255, 0, 50, ${flareAlpha})`;
            ctx.shadowColor = 'rgba(255, 0, 50, 1)';
            ctx.shadowBlur = 12;
            ctx.fillRect(rx - flareWidth / 2, ry - 1, flareWidth, 2);
            
            // Horizontal sharp dead pixel core
            const rectWidth = 20 + Math.random() * 40;
            const rectHeight = 3 + Math.random() * 3;
            ctx.fillStyle = `rgba(255, 50, 80, ${0.8 + Math.random() * 0.2})`;
            ctx.shadowBlur = 2; // slight glow on the core
            ctx.fillRect(rx - rectWidth / 2, ry - rectHeight / 2, rectWidth, rectHeight);
            
            // Central white/bright-red hot spot
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillRect(rx - 4, ry - 1, 8, 2);
            
            ctx.restore();
          }
        }

        // Breathing effect around 50% transparency
        const breath = 0.5 + 0.15 * Math.sin(frame * 0.014); // Slower breathing

        // Add padding so perspective distortion doesn't show edges of grid
        const padCols = 4;
        const padRows = 4;
        const cols = Math.ceil(width / xOffset) + padCols;
        const rows = Math.ceil(height / yOffset) + padRows;

        for (let row = -padRows; row < rows; row++) {
          for (let col = -padCols; col < cols; col++) {
            let cx = col * xOffset;
            let cy = row * yOffset;
            if (row % 2 !== 0) {
              cx += xOffset / 2;
            }

            // Ocean movement is now calculated per-vertex in getProjectedPoint
            drawHexagon(cx, cy, hexRadius, t, breath, width, height);
          }
        }

        /* ----- Draw Terminal Logs (Desktop Only) ----- */
        if (!isMobile()) {
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(200, 0, 50, 0.28)'; // Drop opacity slightly since it fills the screen
          ctx.shadowBlur = 0;

          const colWidth = 320; // 320px per column
          const visibleCols = Math.min(numTermCols, Math.max(2, Math.ceil(width / colWidth)));
          
          for (let c = 0; c < visibleCols; c++) {
            const isRight = (c === visibleCols - 1);
            const speed = 10 + (c % 5) * 3; // Speeds between 10 and 22 frames per line

            if (frame % speed === 0) {
              termColumns[c].shift();
              termColumns[c].push(isRight ? generateLogRight(0) : generateLogLeft(0));
            }

            if (isRight) {
              ctx.textAlign = 'right';
              for (let j = 0; j < maxLogs; j++) {
                ctx.fillText(termColumns[c][j], width - 20, 30 + j * 16);
              }
            } else {
              ctx.textAlign = 'left';
              for (let j = 0; j < maxLogs; j++) {
                ctx.fillText(termColumns[c][j], 20 + c * colWidth, 30 + j * 16);
              }
            }
          }
          ctx.textAlign = 'left'; // reset
        }

        if (!reduced) raf = requestAnimationFrame(draw);
      };
      const restart = () => {
        cancelAnimationFrame(raf);
        reduced = motionPreference.matches;
        draw();
      };
      document.addEventListener('visibilitychange', restart);
      motionPreference.addEventListener('change', restart);
      draw();

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', restart);
        motionPreference.removeEventListener('change', restart);
      };
    }, []);
  };

  /* ============================================================
     SVG placeholder for projects missing images
     ============================================================ */
  const ImagePlaceholder = ({ id, label = 'NO_SIGNAL' }) => (
    <div className="relative w-full h-full min-h-[160px] flex items-center justify-center overflow-hidden"
         style={{
           background: 'repeating-linear-gradient(135deg, rgba(0,229,255,0.04) 0 8px, transparent 8px 16px)',
           border: '1px dashed rgba(0,229,255,0.35)'
         }}>
      <svg viewBox="0 0 400 200" className="w-full h-full opacity-80">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#00e5ff" stopOpacity=".4" />
            <stop offset="1" stopColor="#ff00c8" stopOpacity=".4" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="380" height="180" fill="none" stroke={`url(#grad-${id})`} strokeDasharray="4 6" />
        <text x="200" y="95" textAnchor="middle" fill="#00e5ff" fontFamily="JetBrains Mono" fontSize="18" letterSpacing="4">{label}</text>
        <text x="200" y="120" textAnchor="middle" fill="#ff00c8" fontFamily="JetBrains Mono" fontSize="12" letterSpacing="2">:: {id}</text>
        <line x1="20" y1="150" x2="380" y2="150" stroke="#00e5ff" strokeOpacity=".4" />
        <line x1="20" y1="160" x2="300" y2="160" stroke="#ff00c8" strokeOpacity=".3" />
      </svg>
    </div>
  );

  const SmartImage = ({ src, alt, id, className, loading = 'lazy' }) => {
    const [err, setErr] = useState(!src);
    useEffect(() => setErr(!src), [src]);
    if (err) return <ImagePlaceholder id={id} />;
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        onError={() => setErr(true)}
      />
    );
  };

  /* ============================================================
     App root
     ============================================================ */
  const App = () => {
    const [data, setData] = useState(null);
    const bgm = useBgm();
    useCyberBackground();

    useEffect(() => {
      let cancelled = false;
      fetch('./data/rings.json', { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error('no rings.json');
          return r.json();
        })
        .then((json) => { if (!cancelled) setData(json); })
        .catch(() => { if (!cancelled) setData(FALLBACK_DATA); });
      return () => { cancelled = true; };
    }, []);

    if (!data) {
      return (
        <div className="min-h-screen flex items-center justify-center text-cyber-neonBlue font-display tracking-[0.3em] text-sm">
          LOADING :: <span className="blink ml-2">▍</span>
        </div>
      );
    }

    return <WorkbenchScene data={data} bgm={bgm} SmartImage={SmartImage} />;
  };

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
