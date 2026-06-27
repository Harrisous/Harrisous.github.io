(function () {
  const WEBP_SRC = "./mascot/hood-cat-open-eyes-v1.webp";
  const FALLBACK_SRC = WEBP_SRC;
  const STATUS_IDLE = "idle channel: masked";
  const STATUS_LINES = [
    "signal rupture: 67%",
    "packet ghost: awake",
    "mask buffer: unstable",
    "red channel: locked",
    "noise bloom: accepted"
  ];
  const CHARS = "01{}[]<>/_$#@RUNTRACEVOIDCATSIGNALERROR";
  const REDUCE_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (document.querySelector(".cyber-cat-companion")) return;

  function createCompanion() {
    const root = document.createElement("aside");
    root.className = "cyber-cat-companion";
    root.setAttribute("aria-label", "Cyber cat companion");
    root.style.setProperty("--cyber-cat-image", `url("${WEBP_SRC}")`);

    const button = document.createElement("button");
    button.className = "cyber-cat-button";
    button.type = "button";
    button.setAttribute("aria-label", "Trigger cyber cat signal interference");

    const picture = document.createElement("picture");
    const source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = WEBP_SRC;

    const image = document.createElement("img");
    image.className = "cyber-cat-image";
    image.src = FALLBACK_SRC;
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    image.setAttribute("aria-hidden", "true");

    picture.append(source, image);

    const rainCanvas = document.createElement("canvas");
    rainCanvas.className = "cyber-cat-rain";

    const staticCanvas = document.createElement("canvas");
    staticCanvas.className = "cyber-cat-static";

    const screen = document.createElement("span");
    screen.className = "cyber-cat-screen";

    const scan = document.createElement("span");
    scan.className = "cyber-cat-scan";

    button.append(picture, rainCanvas, staticCanvas, screen, scan);
    buildTears(button);

    const status = document.createElement("div");
    status.className = "cyber-cat-status";
    status.textContent = STATUS_IDLE;

    root.append(button, status);
    document.body.append(root);

    return { button, status, rainCanvas, staticCanvas };
  }

  function buildTears(button) {
    for (let i = 0; i < 10; i += 1) {
      const top = 24 + Math.random() * 55;
      const height = 2.2 + Math.random() * 6.2;
      const tear = document.createElement("span");
      tear.className = "cyber-cat-tear";
      tear.style.setProperty("--tear-top", `${top}%`);
      tear.style.setProperty("--tear-bottom", `${Math.max(0, 100 - top - height)}%`);
      tear.style.setProperty("--tear-x1", `${-18 + Math.random() * 36}px`);
      tear.style.setProperty("--tear-x2", `${-13 + Math.random() * 26}px`);
      tear.style.setProperty("--tear-x3", `${-24 + Math.random() * 48}px`);
      tear.style.setProperty("--tear-delay", `${i * 18}ms`);
      button.appendChild(tear);
    }
  }

  function createRenderer(canvas, staticCanvas, button) {
    const rainContext = canvas.getContext("2d");
    const staticContext = staticCanvas.getContext("2d");
    let columns = [];
    let animationFrame = 0;
    let staticFrame = 0;

    function sizeCanvas(target, context) {
      const rect = target.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      target.width = Math.max(1, Math.floor(rect.width * dpr));
      target.height = Math.max(1, Math.floor(rect.height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    }

    function reset() {
      const rect = sizeCanvas(canvas, rainContext);
      sizeCanvas(staticCanvas, staticContext);
      const size = Math.max(7, Math.floor(rect.width / 22));
      const count = Math.ceil(rect.width / size);
      columns = Array.from({ length: count }, (_, index) => ({
        x: index * size,
        y: Math.random() * rect.height,
        speed: 0.45 + Math.random() * 1.2,
        size
      }));
    }

    function drawRain() {
      const rect = canvas.getBoundingClientRect();
      rainContext.fillStyle = "rgba(3, 1, 2, 0.16)";
      rainContext.fillRect(0, 0, rect.width, rect.height);
      rainContext.font = "700 8px Cascadia Code, Consolas, monospace";
      rainContext.textAlign = "center";

      for (const column of columns) {
        const char = CHARS[(Math.random() * CHARS.length) | 0];
        const hot = Math.random() > 0.9;
        rainContext.fillStyle = hot ? "rgba(255, 224, 231, 0.88)" : "rgba(255, 23, 72, 0.72)";
        rainContext.shadowColor = hot ? "rgba(255, 230, 236, 0.86)" : "rgba(255, 23, 72, 0.86)";
        rainContext.shadowBlur = hot ? 10 : 6;
        rainContext.fillText(char, column.x, column.y);
        column.y += column.speed;
        if (column.y > rect.height + 18) column.y = rect.height * 0.28 + Math.random() * 12;
      }
    }

    function drawStatic() {
      const rect = staticCanvas.getBoundingClientRect();
      staticContext.clearRect(0, 0, rect.width, rect.height);
      staticContext.globalCompositeOperation = "lighter";

      for (let i = 0; i < 8; i += 1) {
        const y = Math.random() * rect.height;
        const h = 1 + Math.random() * 2;
        const x = Math.random() * rect.width * 0.18;
        staticContext.fillStyle = Math.random() > 0.44 ? "rgba(255, 23, 72, 0.2)" : "rgba(84, 57, 166, 0.16)";
        staticContext.fillRect(x, y, rect.width - x * 2, h);
      }

      if (button.classList.contains("is-hit")) {
        for (let i = 0; i < 16; i += 1) {
          staticContext.fillStyle = Math.random() > 0.58 ? "rgba(255, 230, 236, 0.46)" : "rgba(255, 23, 72, 0.38)";
          staticContext.fillRect(Math.random() * rect.width, Math.random() * rect.height, 5 + Math.random() * 26, 1 + Math.random() * 4);
        }
      }
    }

    function tick() {
      if (!document.hidden) {
        drawRain();
        staticFrame += 1;
        if (staticFrame % 3 === 0) drawStatic();
      }
      animationFrame = window.requestAnimationFrame(tick);
    }

    function start() {
      reset();
      if (!REDUCE_MOTION) animationFrame = window.requestAnimationFrame(tick);
    }

    function stop() {
      window.cancelAnimationFrame(animationFrame);
    }

    window.addEventListener("resize", reset, { passive: true });
    return { start, stop, reset };
  }

  function boot() {
    const companion = createCompanion();
    const renderer = createRenderer(companion.rainCanvas, companion.staticCanvas, companion.button);

    companion.button.addEventListener("click", function () {
      companion.button.classList.remove("is-hit");
      void companion.button.offsetWidth;
      companion.button.classList.add("is-hit");
      companion.status.textContent = STATUS_LINES[(Math.random() * STATUS_LINES.length) | 0];

      window.setTimeout(function () {
        companion.button.classList.remove("is-hit");
        companion.status.textContent = STATUS_IDLE;
      }, 1100);
    });

    renderer.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}());
