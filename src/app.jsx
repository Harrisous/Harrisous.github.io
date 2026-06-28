const { useState, useEffect, useRef, useCallback, useMemo } = React;

  /* ============================================================
     INLINE DATA FALLBACK — minimal copy so page renders without fetch
     (full content lives in /data/rings.json)
     ============================================================ */
  const FALLBACK_DATA = {
    profile: {
      name: 'Haochen "Harry" Li',
      callsign: 'HARRY',
      title: 'AI Engineer — Agentic Systems & Applied LLMs',
      location: 'San Jose, CA',
      tagline: 'Building agentic systems that ship.',
      avatar: './images/optimized/profile.webp',
      educationShort: [
        'Duke · M.Eng. AI · 2024–2025',
        'HKU · B.Sc. CS & Actuarial · 2019–2024',
      ],
      educationFull: [],
      experience: [],
      skills: {},
      contact: {
        email: 'harryli12321@gmail.com',
        linkedin: 'https://www.linkedin.com/in/haochen-harry-li',
        github: 'https://github.com/Harrisous',
        location: 'San Jose, CA, USA',
      },
    },
    projects: [
      { id: 'PROJ_NEW_01', title: 'Gosvea Agentic RAG Chatbot', category: 'Production Agentic AI', description: 'Production AI support channel.', stack: ['LangChain','Pinecone','Groq'], link: null, image: './images/optimized/project_008.webp' },
    ],
    blogs: [
      { id: 'BLOG_01', title: 'How AI Sees Cats — Grad-CAM Visualization', category: 'Computer Vision · XAI', description: 'Grad-CAM on cats.', stack: ['PyTorch'], link: './blog/blog1/blog1.html', image: null },
    ],
    resources: [
      { id: 'RES_01', title: 'CH_01 · Introduction to Machine Learning', category: 'Field Manual', description: 'Core concepts.', stack: ['Fundamentals'], link: './blog/blog2/1_introduction.html', image: null, active: true },
    ],
  };

  /* ============================================================
     Typewriter
     ============================================================ */
  const Typewriter = ({ text, speed = 18, startDelay = 0, onDone, className = '' }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => {
      setShown(0);
      let cancelled = false;
      const start = setTimeout(function tick() {
        let i = 0;
        const step = () => {
          if (cancelled) return;
          i++; setShown(i);
          if (i < text.length) setTimeout(step, speed);
          else onDone && onDone();
        };
        step();
      }, startDelay);
      return () => { cancelled = true; clearTimeout(start); };
    }, [text]);
    return (
      <span className={className}>
        {text.slice(0, shown)}
        <span className="blink text-cyber-neonBlue">▍</span>
      </span>
    );
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
      let raf = 0, frame = 0;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

      const onResize = () => { resize(); buildRain(); };
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
      draw();

      return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
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
        <text x="200" y="95" textAnchor="middle" fill="#00e5ff" fontFamily="Share Tech Mono" fontSize="18" letterSpacing="4">{label}</text>
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
     BGM via SoundCloud iframe
     ============================================================ */
  const SOUNDCLOUD_API_SRC = 'https://w.soundcloud.com/player/api.js';

  const useBgm = () => {
    const [playing, setPlaying] = useState(false);
    const [vol, setVol] = useState(50);
    const widgetRef = useRef(null);
    const readyRef = useRef(false);
    const scriptPromiseRef = useRef(null);

    const loadSoundCloudApi = useCallback(() => {
      if (window.SC) return Promise.resolve();
      if (scriptPromiseRef.current) return scriptPromiseRef.current;

      scriptPromiseRef.current = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-soundcloud-api="true"]');
        if (existing) {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', reject, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = SOUNDCLOUD_API_SRC;
        script.async = true;
        script.dataset.soundcloudApi = 'true';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      return scriptPromiseRef.current;
    }, []);

    const tryInit = useCallback(() => {
      if (widgetRef.current) return Promise.resolve();
      const iframe = document.getElementById('sc-iframe');
      if (!iframe) return Promise.resolve();

      if (!iframe.getAttribute('src')) {
        iframe.setAttribute('src', iframe.dataset.src || '');
      }

      return loadSoundCloudApi().then(() => {
        if (widgetRef.current || !window.SC) return;
        widgetRef.current = window.SC.Widget(iframe);
        widgetRef.current.bind(window.SC.Widget.Events.READY, () => {
          readyRef.current = true;
          widgetRef.current.setVolume(vol);
        });
        widgetRef.current.bind(window.SC.Widget.Events.PLAY,  () => setPlaying(true));
        widgetRef.current.bind(window.SC.Widget.Events.PAUSE, () => setPlaying(false));
        widgetRef.current.bind(window.SC.Widget.Events.FINISH,() => setPlaying(false));
      });
    }, [loadSoundCloudApi, vol]);

    const toggle = () => {
      tryInit().then(() => {
        if (widgetRef.current) widgetRef.current.toggle();
      }).catch(() => setPlaying(false));
    };
    const setVolume = (v) => {
      setVol(v);
      if (widgetRef.current) widgetRef.current.setVolume(v);
    };
    return { playing, vol, toggle, setVolume };
  };

  /* ============================================================
     Profile Node (desktop)
     ============================================================ */
  const ContactIcons = ({ contact }) => (
    <div className="flex items-center justify-center gap-3">
      <a href={`mailto:${contact.email}`} aria-label="Email" title={contact.email} className="contact-icon">
        {/* Envelope */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" />
          <path d="M3 6l9 7 9-7" />
          <path d="M3 19l6-6 M21 19l-6-6" opacity="0.5" />
        </svg>
      </a>
      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className="contact-icon">
        {/* LinkedIn "in" */}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4 4h3.6v3.6H4V4zm.3 5.1h3V20h-3V9.1zM9.8 9.1h2.87v1.5h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V20h-3v-5.4c0-1.28-.02-2.94-1.8-2.94-1.8 0-2.08 1.4-2.08 2.85V20h-3V9.1z" />
        </svg>
      </a>
      <a href={contact.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" className="contact-icon">
        {/* GitHub octocat */}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 1.8c-5.63 0-10.2 4.57-10.2 10.2 0 4.5 2.92 8.32 6.97 9.67.51.1.7-.22.7-.49 0-.24-.01-.88-.01-1.72-2.84.62-3.44-1.37-3.44-1.37-.46-1.18-1.13-1.49-1.13-1.49-.93-.64.07-.62.07-.62 1.03.07 1.57 1.06 1.57 1.06.91 1.57 2.4 1.12 2.98.86.09-.67.36-1.12.65-1.38-2.27-.26-4.66-1.14-4.66-5.07 0-1.12.4-2.04 1.06-2.75-.11-.26-.46-1.3.1-2.72 0 0 .86-.28 2.83 1.05a9.8 9.8 0 0 1 5.15 0c1.97-1.33 2.83-1.05 2.83-1.05.56 1.42.21 2.46.1 2.72.66.71 1.06 1.63 1.06 2.75 0 3.94-2.4 4.81-4.68 5.06.37.32.7.94.7 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.19.6.71.49 4.04-1.35 6.96-5.17 6.96-9.67C22.2 6.37 17.63 1.8 12 1.8z" />
        </svg>
      </a>
    </div>
  );

  const ProfileNode = ({ profile, minimized, onToggleExpand, expanded, bgm, expandBtnRef }) => {
    if (minimized) {
      return (
        <div className="profile-mini">
          <img src={profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-cyber-neonBlue/50" loading="eager" decoding="async" />
          <div className="leading-tight">
            <div className="text-cyber-neonBlue text-sm font-bold tracking-widest neon-glow-blue">{profile.callsign}</div>
            <div className="text-white/60 text-[11px]">{profile.title.split('—')[0].trim()}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative">
        <div className="orbit-wrap">
          <span className="orbit-dot d1" />
          <span className="orbit-dot d2" />
          <span className="orbit-dot d3" />
        </div>
        <div className="flex flex-col items-center gap-5">
          <button
            aria-label="Toggle background music"
            onClick={(e) => { e.stopPropagation(); bgm.toggle(); }}
            className={`avatar-ring ${bgm.playing ? 'avatar-playing' : ''} outline-none`}
          >
            <img src={profile.avatar} alt={profile.name} loading="eager" decoding="async" />
          </button>

          {/* Volume slider */}
          <div className="w-44">
            <input
              type="range" min="0" max="100" value={bgm.vol}
              onChange={(e) => bgm.setVolume(parseInt(e.target.value, 10))}
              className="cyber-slider"
              style={{'--val': `${bgm.vol}%`}}
              aria-label="Volume"
            />
            <div className="flex justify-between text-[11px] text-cyber-neonBlue/70 mt-1 font-mono tracking-wider">
              <span>VOL {bgm.vol}</span><span>{bgm.playing ? '▶ PLAYING' : '◼ IDLE'}</span>
            </div>
          </div>

          <div className="cyber-panel relative px-7 py-6 text-center neon-box-blue">
            <span className="hud-corner hud-tl" />
            <span className="hud-corner hud-tr" />
            <span className="hud-corner hud-bl" />
            <span className="hud-corner hud-br" />
            <div className="font-display text-cyber-neonBlue text-xs tracking-[0.35em] mb-3 neon-glow-blue">// IDENTITY</div>
            <h1 className="glitch-text text-4xl md:text-6xl font-black tracking-tight text-white neon-glow-blue" data-text={profile.callsign}>
              {profile.callsign}
            </h1>
            <div className="text-cyber-neonYellow mt-2 text-base md:text-lg font-bold neon-glow-yellow tracking-wide">{profile.name}</div>
            <div className="text-white/85 mt-4 text-sm md:text-base leading-relaxed max-w-xs font-medium">
              {profile.title}
            </div>
            <div className="mt-5 pt-4 border-t border-cyber-neonBlue/25 space-y-1.5">
              {profile.educationShort.map((e, i) => (
                <div key={i} className="text-xs md:text-sm text-cyber-neonCyan tracking-wide">{e}</div>
              ))}
            </div>
            <div className="mt-5">
              <ContactIcons contact={profile.contact} />
            </div>
            <button
              ref={expandBtnRef}
              onClick={onToggleExpand}
              className="mt-5 w-full text-[11px] md:text-xs bg-cyber-neonBlue text-[#020202] font-bold py-2.5 tracking-[0.3em] font-display hover:brightness-125 hover:neon-glow-blue transition-all"
              aria-label={expanded ? 'Collapse profile' : 'Expand profile'}
            >
              {expanded ? '[◀] COLLAPSE_PROFILE' : '[▶] EXPAND_PROFILE'}
            </button>
            <div className="mt-6 flex justify-center">
              <img src="./images/optimized/relic.webp" alt="Relic" className="w-16 h-auto" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ============================================================
     Rail (single) — vertical cover-flow of items
     ============================================================ */
  const RailItem = ({ item, posOffset, onOpen, isFocused }) => {
    const absOffset = Math.abs(posOffset);
    const className = [
      'item-card item-stagger',
      isFocused ? 'focus' : '',
      absOffset === 1 ? 'dim' : '',
      absOffset >= 2 ? 'dim-2' : '',
      item.active === false ? 'disabled' : '',
    ].join(' ');

    const handleClick = () => {
      if (item.active === false) return;
      onOpen(item);
    };
    return (
      <div
        className={className}
        onClick={handleClick}
        style={{ animationDelay: `${absOffset * 40}ms` }}
        role="button"
        tabIndex={isFocused ? 0 : -1}
        onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className={`tracking-[0.25em] text-cyber-neonBlue/80 font-display ${isFocused ? 'text-[11px]' : 'text-[10px]'}`}>{item.id}</div>
          {isFocused && item.active !== false && (
            <div className="text-[10px] tracking-[0.2em] text-cyber-neonPink font-display blink neon-glow-pink">[ENTER]</div>
          )}
        </div>
        <div className={`mt-1 ${isFocused ? 'text-xl md:text-2xl neon-glow-blue' : 'text-base'} font-bold text-white leading-tight`}>
          {item.title}
        </div>
        {isFocused && (
          <>
            <div className="text-xs text-cyber-neonYellow tracking-wider mt-1.5 neon-glow-yellow">{item.category}</div>
            {item.stack && item.stack.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {item.stack.slice(0, 5).map((s, i) => (
                  <span key={i} className="cyber-chip">{s}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const Rail = ({ label, slot, items, focusedItemIndex, onChangeIndex, onOpen, isActive, onActivate }) => {
    const railRef = useRef(null);

    // Wheel scrolling (only on active rail)
    useEffect(() => {
      if (!isActive) return;
      const el = railRef.current;
      if (!el) return;
      let lastTick = 0;
      const onWheel = (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTick < 150) return;
        lastTick = now;
        if (e.deltaY > 0) onChangeIndex(+1);
        else if (e.deltaY < 0) onChangeIndex(-1);
      };
      el.addEventListener('wheel', onWheel, { passive: false });
      return () => el.removeEventListener('wheel', onWheel);
    }, [isActive, onChangeIndex]);

    const visible = useMemo(() => {
      if (!items || items.length === 0) return [];
      // Show up to ±2 around focused (5 items visible, center = focused)
      const out = [];
      const span = Math.min(2, Math.floor(items.length / 2));
      for (let d = -span; d <= span; d++) {
        let idx = (focusedItemIndex + d + items.length) % items.length;
        out.push({ item: items[idx], offset: d, key: `${items[idx].id}-${d}` });
      }
      return out;
    }, [focusedItemIndex, items]);

    return (
      <div
        ref={railRef}
        className={`rail-group ${slot}`}
        onClick={!isActive && onActivate ? (e) => { e.stopPropagation(); onActivate(); } : undefined}
        role="region"
        aria-label={`${label} rail${isActive ? ' (focused)' : ''}`}
      >
        {/* Arrows on LEFT, vertically centered */}
        <div className="rail-arrows">
          <button
            onClick={(e) => { e.stopPropagation(); onChangeIndex(-1); }}
            className="rail-arrow"
            aria-label="Previous item"
            tabIndex={isActive ? 0 : -1}
          >▲</button>
          <button
            onClick={(e) => { e.stopPropagation(); onChangeIndex(+1); }}
            className="rail-arrow"
            aria-label="Next item"
            tabIndex={isActive ? 0 : -1}
          >▼</button>
        </div>

        <div className={`rail-panel ${isActive ? 'rail-breath' : ''}`}>
          <div className="rail-tag">// {label}</div>

          <div className="rail-header">
            <div className="text-[10px] text-cyber-neonBlue/70 font-display tracking-widest">
              {String(focusedItemIndex + 1).padStart(2, '0')} / {String((items || []).length).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-cyber-neonPink/70 font-display tracking-[0.25em] blink">
              [ SCROLL / ↑↓ ]
            </div>
          </div>

          <div className="rail-items">
            {visible.map(({ item, offset, key }) => (
              <RailItem
                key={key}
                item={item}
                posOffset={offset}
                isFocused={offset === 0}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ============================================================
     Data bus — SVG line between profile and focused rail
     ============================================================ */
  const DataBus = ({ ticking }) => (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{zIndex: 5}}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#00e5ff" stopOpacity=".0"/>
          <stop offset=".5" stopColor="#00e5ff" stopOpacity=".6"/>
          <stop offset="1" stopColor="#ff00c8" stopOpacity=".6"/>
        </linearGradient>
      </defs>
      <path d="M 28 50 C 45 40, 62 60, 85 50"
            stroke="url(#busGrad)" fill="none" strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
            className={`bus-path ${ticking ? 'ticking' : ''}`} />
    </svg>
  );

  /* ============================================================
     Dossier panel (slide-in from right)
     ============================================================ */
  const Dossier = ({ profile, open, onClose }) => {
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    return (
      <aside className={`dossier ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="p-6 md:p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-cyber-neonBlue/70 font-display tracking-[0.3em]">// DOSSIER</div>
              <h2 className="text-2xl md:text-3xl font-black text-white">{profile.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-cyber-neonPink border border-cyber-neonPink/50 w-9 h-9 flex items-center justify-center hover:bg-cyber-neonPink/10"
              aria-label="Close dossier"
            >✕</button>
          </div>

          {/* Education */}
          <section>
            <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display">// EDUCATION</h3>
            <div className="space-y-4">
              {profile.educationFull && profile.educationFull.map((e, i) => (
                <div key={i} className="cyber-panel relative p-4">
                  <span className="hud-corner hud-tl" />
                  <span className="hud-corner hud-br" />
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="text-white font-bold">{e.school}</div>
                    <div className="text-[11px] text-cyber-neonYellow">{e.dates}</div>
                  </div>
                  <div className="text-cyber-neonCyan text-sm mt-1">{e.degree}</div>
                  {e.gpa && <div className="text-[11px] text-cyber-neonPink mt-1">GPA {e.gpa}</div>}
                  {e.courses && e.courses.length > 0 && (
                    <>
                      <div className="text-[10px] text-cyber-neonBlue/60 tracking-widest mt-3 mb-1">// KEY COURSES</div>
                      <div className="flex flex-wrap gap-1.5">
                        {e.courses.map((c, k) => <span key={k} className="cyber-chip">{c}</span>)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Experience */}
          {profile.experience && profile.experience.length > 0 && (
            <section>
              <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display">// EXPERIENCE</h3>
              <div className="space-y-4">
                {profile.experience.map((x, i) => (
                  <div key={i} className="cyber-panel relative p-4">
                    <span className="hud-corner hud-tl" />
                    <span className="hud-corner hud-br" />
                    <div className="flex justify-between items-start gap-3 flex-wrap">
                      <div className="text-white font-bold">{x.company}</div>
                      <div className="text-[11px] text-cyber-neonYellow">{x.dates}</div>
                    </div>
                    <div className="text-cyber-neonCyan text-sm mt-1">{x.role}{x.location ? ` · ${x.location}` : ''}</div>
                    {x.bullets && x.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1.5 text-[13px] text-white/80 leading-relaxed">
                        {x.bullets.map((b, k) => (
                          <li key={k} className="flex gap-2"><span className="text-cyber-neonPink">▸</span><span>{b}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {profile.skills && Object.keys(profile.skills).length > 0 && (
            <section>
              <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display">// SKILLS</h3>
              <div className="space-y-3">
                {Object.entries(profile.skills).map(([group, list]) => (
                  <div key={group}>
                    <div className="text-[11px] text-cyber-neonPink tracking-widest mb-2">{group}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((s, i) => <span key={i} className="cyber-chip">{s}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact */}
          <section>
            <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display">// CONTACT</h3>
            <div className="space-y-2 text-sm">
              <a href={`mailto:${profile.contact.email}`} className="link-cyber block text-white hover:text-cyber-neonPink">✉  {profile.contact.email}</a>
              <a href={profile.contact.linkedin} target="_blank" rel="noopener noreferrer" className="link-cyber block text-white hover:text-cyber-neonPink">in  {profile.contact.linkedin}</a>
              <a href={profile.contact.github} target="_blank" rel="noopener noreferrer" className="link-cyber block text-white hover:text-cyber-neonPink">gh  {profile.contact.github}</a>
              <div className="text-white/70">📍  {profile.contact.location}</div>
            </div>
          </section>
        </div>
      </aside>
    );
  };

  /* ============================================================
     Inline expand-profile (desktop) — pops out to the right of profile,
     pushes the rings. Has an X close button.
     ============================================================ */
  const ExpandProfile = ({ profile, onClose }) => (
    <div className="expand-panel cyber-panel relative neon-box-blue">
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />

      <button
        onClick={onClose}
        aria-label="Collapse profile"
        className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center text-cyber-neonPink border border-cyber-neonPink/50 hover:bg-cyber-neonPink/15 hover:neon-glow-pink transition-colors z-10"
        style={{clipPath:'polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)'}}
      >✕</button>

      <div className="mb-6">
        <div className="text-[11px] text-cyber-neonBlue tracking-[0.35em] font-display neon-glow-blue">// DOSSIER</div>
        <h2 className="text-3xl font-black text-white mt-1 neon-glow-blue">{profile.name}</h2>
        <div className="text-cyber-neonYellow text-sm mt-1 neon-glow-yellow">{profile.title}</div>
      </div>

      {profile.educationFull && profile.educationFull.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display neon-glow-blue">// EDUCATION</h3>
          <div className="space-y-3">
            {profile.educationFull.map((e, i) => (
              <div key={i} className="cyber-panel relative p-4">
                <span className="hud-corner hud-tl" />
                <span className="hud-corner hud-br" />
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="text-white font-bold text-base">{e.school}</div>
                  <div className="text-[11px] text-cyber-neonYellow">{e.dates}</div>
                </div>
                <div className="text-cyber-neonCyan text-sm mt-1">{e.degree}</div>
                {e.gpa && <div className="text-[11px] text-cyber-neonPink mt-1 neon-glow-pink">GPA {e.gpa}</div>}
                {e.courses && e.courses.length > 0 && (
                  <>
                    <div className="text-[10px] text-cyber-neonBlue/70 tracking-widest mt-3 mb-1.5">// KEY COURSES</div>
                    <div className="flex flex-wrap gap-1.5">
                      {e.courses.map((c, k) => <span key={k} className="cyber-chip">{c}</span>)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.experience && profile.experience.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display neon-glow-blue">// EXPERIENCE</h3>
          <div className="space-y-3">
            {profile.experience.map((x, i) => (
              <div key={i} className="cyber-panel relative p-4">
                <span className="hud-corner hud-tl" />
                <span className="hud-corner hud-br" />
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="text-white font-bold text-base">{x.company}</div>
                  <div className="text-[11px] text-cyber-neonYellow">{x.dates}</div>
                </div>
                <div className="text-cyber-neonCyan text-sm mt-1">{x.role}{x.location ? ` · ${x.location}` : ''}</div>
                {x.bullets && x.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1.5 text-[13px] text-white/85 leading-relaxed">
                    {x.bullets.map((b, k) => (
                      <li key={k} className="flex gap-2"><span className="text-cyber-neonPink">▸</span><span>{b}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.skills && Object.keys(profile.skills).length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display neon-glow-blue">// SKILLS</h3>
          <div className="space-y-3">
            {Object.entries(profile.skills).map(([group, list]) => (
              <div key={group}>
                <div className="text-[11px] text-cyber-neonPink tracking-widest mb-2 neon-glow-pink">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s, i) => <span key={i} className="cyber-chip">{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm text-cyber-neonBlue tracking-[0.3em] mb-3 font-display neon-glow-blue">// CONTACT</h3>
        <div className="space-y-2 text-sm">
          <a href={`mailto:${profile.contact.email}`} className="link-cyber block text-white hover:text-cyber-neonPink">✉  {profile.contact.email}</a>
          <a href={profile.contact.linkedin} target="_blank" rel="noopener noreferrer" className="link-cyber block text-white hover:text-cyber-neonPink">in  LinkedIn</a>
          <a href={profile.contact.github} target="_blank" rel="noopener noreferrer" className="link-cyber block text-white hover:text-cyber-neonPink">gh  {profile.contact.github}</a>
          <div className="text-white/70">📍  {profile.contact.location}</div>
        </div>
      </section>
    </div>
  );

  /* ============================================================
     Ring tabs — quick switch above rails
     ============================================================ */
  const RING_META = {
    projects:  { label: 'PROJECTS',  color: '#00e5ff', kls: '' },
    blogs:     { label: 'BLOGS',     color: '#ff00c8', kls: 'k-blogs' },
    resources: { label: 'RESOURCES', color: '#f5e663', kls: 'k-resources' },
  };
  const RingTabs = ({ rings, focused, counts, onSelect }) => (
    <div className="ring-tabs">
      {rings.map((r) => {
        const meta = RING_META[r] || { label: r.toUpperCase(), color: '#00e5ff', kls: '' };
        const active = focused === r;
        return (
          <button
            key={r}
            onClick={() => onSelect(r)}
            className={`ring-tab ${active ? 'active' : ''} ${active ? meta.kls : ''}`}
            style={active ? { color: '#fff' } : undefined}
          >
            <span className="ring-tab-dot" style={{ color: meta.color }} />
            {meta.label}
            <span className="tab-count">[{counts[r] || 0}]</span>
          </button>
        );
      })}
    </div>
  );

  /* ============================================================
     Detail view (center card)
     ============================================================ */
  const DetailView = ({ item, ring, onClose }) => {
    useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
      <div className="detail-wrap" onClick={onClose}>
        <div className="detail-card glitch-appear cyber-panel relative p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
          <span className="hud-corner hud-tl" />
          <span className="hud-corner hud-tr" />
          <span className="hud-corner hud-bl" />
          <span className="hud-corner hud-br" />

          {/* Close button at the panel's absolute top-right */}
          <button
            onClick={onClose}
            className="detail-close"
            aria-label="Close detail"
            title="Close (ESC)"
          >✕</button>

          <div className="mb-4 pr-12">
            <div className="flex items-center gap-3 text-[11px] font-display tracking-[0.3em] flex-wrap">
              <span className="text-cyber-neonBlue neon-glow-blue">// {ring.toUpperCase()}</span>
              <span className="text-cyber-neonPink neon-glow-pink">:: {item.id}</span>
              {item.category && <span className="text-cyber-neonYellow neon-glow-yellow">[{item.category}]</span>}
            </div>
            <h2 className="glitch-text text-3xl md:text-5xl font-black text-white mt-2 leading-tight" data-text={item.title}>
              {item.title}
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-6 mb-6">
            <div className="md:col-span-2">
              <div className="h-48 md:h-64 relative overflow-hidden"
                   style={{clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}}>
                <SmartImage
                  src={item.image}
                  alt={item.title}
                  id={item.id}
                  className="w-full h-full object-cover"
                />
              </div>
              {item.stack && item.stack.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] text-cyber-neonBlue tracking-widest mb-2 font-display">// KEYWORDS</div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.stack.map((s, i) => (
                      <span key={i} className="cyber-chip fade-up" style={{animationDelay: `${i * 40}ms`}}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <div className="text-[11px] text-cyber-neonBlue tracking-widest mb-2 font-display">// INTRODUCTION</div>
              <div className="text-white/85 text-[15px] md:text-base leading-relaxed whitespace-pre-wrap">
                <Typewriter text={item.description || ''} speed={8} />
              </div>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 border border-cyber-neonPink text-cyber-neonPink hover:bg-cyber-neonPink hover:text-cyber-black transition-colors font-display tracking-[0.25em] text-sm"
                  style={{clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}}
                >
                  OPEN_EXTERNAL  →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ============================================================
     Desktop Graph scene
     ============================================================ */
  const GraphScene = ({ data, bgm }) => {
    const ringOrder = ['projects', 'blogs', 'resources']; // loop
    const [focusedRing, setFocusedRing] = useState('projects');
    const [itemIdx, setItemIdx] = useState({ projects: 0, blogs: 0, resources: 0 });
    const [openItem, setOpenItem] = useState(null); // { item, ring }
    const [expanded, setExpanded] = useState(false);
    const [busTick, setBusTick] = useState(false);

    const expandSlotRef = useRef(null);
    const expandBtnRef = useRef(null);

    // Slot assignment for horizontal carousel: active / slot-prev / slot-next
    // Uses modular distance so no ring teleports across on cycle.
    const slotFor = useCallback((ring) => {
      if (ring === focusedRing) return 'active';
      const f = ringOrder.indexOf(focusedRing);
      const r = ringOrder.indexOf(ring);
      const diff = (r - f + 3) % 3; // 1 = next, 2 = prev
      return diff === 1 ? 'slot-next' : 'slot-prev';
    }, [focusedRing]);

    const pulseBus = () => {
      setBusTick(true);
      setTimeout(() => setBusTick(false), 400);
    };

    const cycleRing = useCallback((dir) => {
      const cur = ringOrder.indexOf(focusedRing);
      const next = (cur + dir + 3) % 3;
      setFocusedRing(ringOrder[next]);
      pulseBus();
    }, [focusedRing]);

    const setRingByClick = useCallback((ring) => {
      setFocusedRing(ring);
      pulseBus();
    }, []);

    const changeItem = useCallback((dir) => {
      setItemIdx((prev) => {
        const items = data[focusedRing] || [];
        if (items.length === 0) return prev;
        const cur = prev[focusedRing];
        const next = (cur + dir + items.length) % items.length;
        return { ...prev, [focusedRing]: next };
      });
      pulseBus();
    }, [data, focusedRing]);

    // Keyboard
    useEffect(() => {
      const handler = (e) => {
        if (openItem) return;
        if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); cycleRing(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); cycleRing(+1); }
        else if (e.key === 'ArrowUp')    { e.preventDefault(); changeItem(-1); }
        else if (e.key === 'ArrowDown')  { e.preventDefault(); changeItem(+1); }
        else if (e.key === 'Enter') {
          const items = data[focusedRing];
          const item = items && items[itemIdx[focusedRing]];
          if (item && item.active !== false) setOpenItem({ item, ring: focusedRing });
        } else if (e.key === 'Escape' && expanded) {
          setExpanded(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [cycleRing, changeItem, focusedRing, itemIdx, openItem, expanded, data]);

    // Click-outside to collapse expand panel
    useEffect(() => {
      if (!expanded) return;
      const onDown = (e) => {
        const slot = expandSlotRef.current;
        const btn  = expandBtnRef.current;
        if (slot && slot.contains(e.target)) return;
        if (btn && btn.contains(e.target)) return;
        setExpanded(false);
      };
      document.addEventListener('mousedown', onDown);
      return () => document.removeEventListener('mousedown', onDown);
    }, [expanded]);

    const counts = {
      projects:  (data.projects  || []).length,
      blogs:     (data.blogs     || []).length,
      resources: (data.resources || []).length,
    };

    return (
      <div className="relative" style={{minHeight: '100vh'}}>
        <DataBus ticking={busTick} />

        {/* Top HUD */}
        <div className="top-hud absolute top-5 left-6 right-6 flex items-start justify-between text-[11px] font-display tracking-[0.25em] z-40">
          <a href="./index_apple.html" className="text-cyber-neonBlue hover:text-cyber-neonPink link-cyber neon-glow-blue">[ SWITCH_MODE ]</a>
          <div className="text-right leading-tight">
            <div className="text-cyber-neonBlue neon-glow-blue">SYS :: <span className="text-cyber-neonYellow neon-glow-yellow">GRAPH_OS_v2.0</span></div>
            <div className="text-white/55">KEYS :: ←→ ring  ↑↓ item  ENTER open  ESC back</div>
          </div>
        </div>

        {/* Main layout — centered horizontally */}
        <div className="graph-stage absolute inset-0 pt-20 pb-12 flex items-stretch justify-center">
          {/* Profile column (fixed width, centered content) */}
          <div className="profile-column flex-shrink-0 flex items-center justify-center z-20">
            <ProfileNode
              profile={data.profile}
              minimized={!!openItem}
              onToggleExpand={() => setExpanded((v) => !v)}
              expanded={expanded}
              bgm={bgm}
              expandBtnRef={expandBtnRef}
            />
          </div>

          {/* Inline expand-profile slot (width animates 0 → 460) */}
          <div
            ref={expandSlotRef}
            className={`expand-slot z-20 ${expanded ? 'open' : ''}`}
          >
            <div className="h-full flex items-center px-3">
              <ExpandProfile profile={data.profile} onClose={() => setExpanded(false)} />
            </div>
          </div>

          {/* Rings column — fixed equal width to profile so expand centers */}
          <div className={`rings-column flex-shrink-0 relative flex flex-col ${openItem ? 'opacity-25 scale-95' : ''}`}
               style={{transition: 'opacity .4s, transform .4s'}}>
            <div className="flex-shrink-0 pt-1 pb-3">
              <RingTabs rings={ringOrder} focused={focusedRing} counts={counts} onSelect={setRingByClick} />
            </div>
            <div className="rails-area flex-1">
              {ringOrder.map((ring) => {
                const slot = slotFor(ring);
                const isActive = slot === 'active';
                return (
                  <Rail
                    key={ring}
                    label={ring.toUpperCase()}
                    slot={slot}
                    items={data[ring]}
                    focusedItemIndex={itemIdx[ring]}
                    onChangeIndex={(dir) => { if (isActive) changeItem(dir); }}
                    onOpen={(item) => item.active !== false && setOpenItem({ item, ring })}
                    isActive={isActive}
                    onActivate={() => setRingByClick(ring)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail */}
        {openItem && <DetailView item={openItem.item} ring={openItem.ring} onClose={() => setOpenItem(null)} />}

        {/* Footer HUD */}
        <div className="footer-hud absolute bottom-4 left-6 right-6 flex justify-between items-end text-[10px] font-display tracking-[0.25em] z-40 pointer-events-none">
          <div className="text-cyber-neonBlue/70 neon-glow-blue">
            &copy; 2026 HAOCHEN LI &middot; HARRISOUS.GITHUB.IO
          </div>
          <div className="text-white/40">
            BGM :: THE_REBEL_PATH — P.T.ADAMCZYK
          </div>
        </div>
      </div>
    );
  };

  /* ============================================================
     Mobile scene
     ============================================================ */
  const MobileProfile = ({ profile, onToggleDossier }) => (
    <div className="mobile-profile-card cyber-panel relative p-5">
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />
      <div className="flex items-center gap-3">
        <img src={profile.avatar} alt={profile.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-cyber-neonBlue/50" loading="eager" decoding="async" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-cyber-neonBlue tracking-[0.16em] sm:tracking-[0.24em] font-display">// IDENTITY</div>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight glitch-text break-words" data-text={profile.callsign}>{profile.callsign}</h1>
          <div className="text-cyber-neonYellow/90 text-sm break-words">{profile.name}</div>
        </div>
      </div>
      <div className="text-white/75 text-sm leading-relaxed mt-3 break-words">{profile.title}</div>
      <div className="mt-3 pt-3 border-t border-cyber-neonBlue/20 space-y-1">
        {profile.educationShort.map((e, i) => (
          <div key={i} className="text-xs text-cyber-neonCyan/80 tracking-wide break-words">{e}</div>
        ))}
      </div>
      <button
        onClick={onToggleDossier}
        className="mt-4 w-full text-[11px] text-cyber-neonPink border border-cyber-neonPink/40 py-2 tracking-[0.25em] font-display hover:bg-cyber-neonPink/10"
      >[▶] EXPAND_PROFILE</button>
    </div>
  );

  const MobileContact = ({ contact }) => (
    <div className="mt-6">
      <div className="text-[10px] text-cyber-neonBlue tracking-[0.3em] font-display mb-2">// CONTACT</div>
      <div className="grid grid-cols-1 gap-2">
        <a href={`mailto:${contact.email}`} className="cyber-panel relative px-4 py-3 text-sm text-white hover:text-cyber-neonPink break-all">
          <span className="hud-corner hud-tl" /><span className="hud-corner hud-br" />
          <span className="text-cyber-neonBlue mr-2">✉</span> {contact.email}
        </a>
        <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="cyber-panel relative px-4 py-3 text-sm text-white hover:text-cyber-neonPink">
          <span className="hud-corner hud-tl" /><span className="hud-corner hud-br" />
          <span className="text-cyber-neonBlue mr-2">in</span> LinkedIn
        </a>
        <a href={contact.github} target="_blank" rel="noopener noreferrer" className="cyber-panel relative px-4 py-3 text-sm text-white hover:text-cyber-neonPink">
          <span className="hud-corner hud-tl" /><span className="hud-corner hud-br" />
          <span className="text-cyber-neonBlue mr-2">gh</span> GitHub
        </a>
      </div>
    </div>
  );

  const MobileBackground = ({ profile }) => (
    <div className="mt-6">
      <div className="text-[10px] text-cyber-neonBlue tracking-[0.3em] font-display mb-2">// BACKGROUND</div>
      <div className="cyber-panel relative p-4">
        <span className="hud-corner hud-tl" /><span className="hud-corner hud-br" />
        <p className="text-sm text-white/80 leading-relaxed">{profile.tagline}</p>
        <div className="mt-3 text-[11px] text-cyber-neonYellow">📍 {profile.location}</div>
      </div>
    </div>
  );

  const MobileSkillsTicker = ({ skills }) => {
    const flat = Object.values(skills || {}).flat().slice(0, 18);
    if (flat.length === 0) return null;
    return (
      <div className="mt-6">
        <div className="text-[10px] text-cyber-neonBlue tracking-[0.3em] font-display mb-2">// SKILLS</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5">
          {flat.map((s, i) => <span key={i} className="cyber-chip whitespace-nowrap flex-shrink-0">{s}</span>)}
        </div>
      </div>
    );
  };

  const MobileTabs = ({ data, onOpen }) => {
    const [tab, setTab] = useState('projects');
    const tabs = [
      { key: 'projects',  label: 'PROJECTS',  color: 'neonBlue'  },
      { key: 'blogs',     label: 'BLOGS',     color: 'neonPink'  },
      { key: 'resources', label: 'RESOURCES', color: 'neonYellow'},
    ];
    const items = data[tab] || [];
    return (
      <div className="mt-6">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-0 px-1 py-2 text-[10px] sm:text-[11px] font-display tracking-[0.12em] sm:tracking-[0.18em] border ${
                tab === t.key
                  ? 'bg-cyber-neonBlue/15 border-cyber-neonBlue text-cyber-neonBlue'
                  : 'border-cyber-neonBlue/20 text-white/50 hover:text-cyber-neonBlue'
              }`}
            >{t.label}</button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it) => {
            const disabled = it.active === false;
            return (
              <button
                key={it.id}
                onClick={() => !disabled && onOpen({ item: it, ring: tab })}
                disabled={disabled}
                className={`cyber-panel relative w-full text-left p-4 ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-cyber-neonPink/60'} transition-colors`}
              >
                <span className="hud-corner hud-tl" /><span className="hud-corner hud-br" />
                <div className="flex justify-between items-center gap-2">
                  <div className="text-[10px] text-cyber-neonBlue tracking-[0.25em] font-display">{it.id}</div>
                  <div className="text-[10px] text-cyber-neonYellow/80">{it.category}</div>
                </div>
                <div className="mt-1 text-lg font-bold text-white leading-tight break-words">{it.title}</div>
                <div className="text-sm text-white/70 mt-1 line-clamp-2 break-words">{it.description}</div>
                {it.stack && it.stack.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.stack.slice(0, 4).map((s, i) => <span key={i} className="cyber-chip">{s}</span>)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const MobileScene = ({ data, bgm }) => {
    const [openItem, setOpenItem] = useState(null);
    const [dossierOpen, setDossierOpen] = useState(false);
    return (
      <div className="mobile-shell px-5">
        <div className="mobile-topbar flex items-center justify-between pt-4">
          <a href="./index_apple.html" className="text-[11px] text-cyber-neonBlue tracking-[0.2em] font-display link-cyber">[ SWITCH_MODE ]</a>
          <button
            aria-label="Toggle BGM"
            onClick={bgm.toggle}
            className={`text-[11px] text-cyber-neonPink tracking-[0.2em] font-display ${bgm.playing ? 'blink' : ''}`}
          >{bgm.playing ? '◼ BGM_ON' : '▶ BGM'}</button>
        </div>
        <MobileProfile profile={data.profile} onToggleDossier={() => setDossierOpen(true)} />
        <MobileContact contact={data.profile.contact} />
        <MobileBackground profile={data.profile} />
        <MobileSkillsTicker skills={data.profile.skills} />
        <MobileTabs data={data} onOpen={setOpenItem} />

        <Dossier profile={data.profile} open={dossierOpen} onClose={() => setDossierOpen(false)} />
        {openItem && <DetailView item={openItem.item} ring={openItem.ring} onClose={() => setOpenItem(null)} />}

        <div className="mt-10 text-center text-[10px] text-cyber-neonBlue/60 font-display tracking-[0.25em]">
          &copy; 2026 HAOCHEN LI &middot; HARRISOUS.GITHUB.IO
          <div className="mt-1 text-white/40">BGM :: THE_REBEL_PATH — P.T.ADAMCZYK</div>
        </div>
      </div>
    );
  };

  /* ============================================================
     App root
     ============================================================ */
  const App = () => {
    const [data, setData] = useState(null);
    const [isDesktop, setIsDesktop] = useState(() =>
      typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
    );
    const bgm = useBgm();
    useCyberBackground();

    useEffect(() => {
      const mq = window.matchMedia('(min-width: 768px)');
      const onChange = () => setIsDesktop(mq.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }, []);

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

    return isDesktop
      ? <GraphScene data={data} bgm={bgm} />
      : <MobileScene data={data} bgm={bgm} />;
  };

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
