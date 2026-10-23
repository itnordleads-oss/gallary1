(() => {
  /**
   * Relay-style energy ribbons reconstructed from webv.mp4:
   * multiple silk-light strands enter from the upper right, converge at a
   * bright focal knot, then peel down/right through the lower sections.
   */
  const canvas = document.getElementById("ribbons");
  if (!canvas) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touchMode =
    matchMedia("(max-width: 980px)").matches
    || matchMedia("(pointer: coarse)").matches
    || document.documentElement.dataset.touchLayout === "true";
  const lowCore = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
  const lowPower = touchMode || innerWidth < 720 || lowCore;
  const frameInterval = lowPower ? 1000 / 30 : 0;
  const ctx = canvas.getContext("2d", { alpha: true });
  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let running = true;
  let t0 = performance.now();
  let lastFrame = 0;

  const strandCount = lowPower ? 14 : 20;

  const dust = Array.from({ length: lowPower ? 45 : 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.4 + Math.random() * 1.6,
    s: 0.06 + Math.random() * 0.2,
    a: 0.12 + Math.random() * 0.4,
  }));

  function resize() {
    const dprCap = lowCore ? 1 : touchMode ? 1.5 : 1.75;
    dpr = Math.min(devicePixelRatio || 1, dprCap);
    const nextW = Math.max(1, Math.round(canvas.clientWidth || innerWidth));
    const nextH = Math.max(1, Math.round(canvas.clientHeight || innerHeight));
    if (nextW === w && nextH === h) return;
    w = nextW;
    h = nextH;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function strandGeometry(index, time, scrollProgress) {
    const lane = index / (strandCount - 1);
    const centered = lane - 0.5;
    const weave = Math.sin(time * 1.08 + index * 1.71);
    const sway = Math.sin(time * 1.28) * 18;
    const travel = scrollProgress * h * 0.54;
    const knot = {
      x: w * 0.39 + weave * 5 + sway * 0.35,
      y: h * 0.61 + centered * 18 - travel + sway * 0.18,
    };

    // This is a ribbon field, not a single snake: it enters as a broad
    // upper-right veil, compresses into one illuminated throat, then unfolds
    // into a wide lower curtain as in the reference footage.
    const source = {
      x: w * (1.02 + lane * 0.08),
      y: h * (0.05 + lane * 0.34) + Math.sin(time * 0.72 + index) * 11 - travel * 0.42,
    };
    const exit = {
      x: w * (0.25 + lane * 0.58) + weave * 16,
      y: h * (1.04 + Math.abs(centered) * 0.2 + Math.sin(index * 0.9 + time * 0.32) * 0.025) - travel,
    };

    const upperControlA = {
      x: w * (0.79 + centered * 0.08),
      y: h * (0.09 + lane * 0.26) + weave * 9 - travel * 0.48,
    };
    const upperControlB = {
      x: w * (0.57 + centered * 0.12),
      y: h * (0.47 + centered * 0.15) + weave * 10 + sway * 0.55 - travel * 0.82,
    };
    const lowerControlA = {
      x: w * (0.25 + centered * 0.16),
      y: h * (0.74 + Math.abs(centered) * 0.08) + sway * 0.7 - travel,
    };
    const lowerControlB = {
      x: w * (0.34 + lane * 0.4),
      y: h * (0.9 + centered * 0.05) - travel,
    };

    return { source, upperControlA, upperControlB, knot, lowerControlA, lowerControlB, exit, centered };
  }

  function strokeBezier(geometry, width, hue, alpha, blur) {
    ctx.beginPath();
    ctx.moveTo(geometry.source.x, geometry.source.y);
    ctx.bezierCurveTo(
      geometry.upperControlA.x,
      geometry.upperControlA.y,
      geometry.upperControlB.x,
      geometry.upperControlB.y,
      geometry.knot.x,
      geometry.knot.y
    );
    ctx.bezierCurveTo(
      geometry.lowerControlA.x,
      geometry.lowerControlA.y,
      geometry.lowerControlB.x,
      geometry.lowerControlB.y,
      geometry.exit.x,
      geometry.exit.y
    );
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = `hsla(${hue}, 100%, 64%, ${alpha})`;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = lowPower ? 0 : blur;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function cubicPoint(start, controlA, controlB, end, p) {
    const q = 1 - p;
    return {
      x: q * q * q * start.x + 3 * q * q * p * controlA.x + 3 * q * p * p * controlB.x + p * p * p * end.x,
      y: q * q * q * start.y + 3 * q * q * p * controlA.y + 3 * q * p * p * controlB.y + p * p * p * end.y,
    };
  }

  function drawMovingEnergy(geometry, index, time) {
    const progress = (time * (0.22 + (index % 5) * 0.022) + index * 0.061) % 1;
    const point =
      progress < 0.5
        ? cubicPoint(geometry.source, geometry.upperControlA, geometry.upperControlB, geometry.knot, progress * 2)
        : cubicPoint(geometry.knot, geometry.lowerControlA, geometry.lowerControlB, geometry.exit, (progress - 0.5) * 2);

    const pulse = 1 + Math.sin(time * 6.2 + index * 1.3) * 0.22;
    const outerRadius = 58 * pulse;
    const outerGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, outerRadius);
    outerGlow.addColorStop(0, `rgba(184,255,28,${0.16 * pulse})`);
    outerGlow.addColorStop(0.24, `rgba(174,255,20,${0.075 * pulse})`);
    outerGlow.addColorStop(1, "rgba(174,255,20,0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    const radius = 25 * pulse;
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    glow.addColorStop(0, `rgba(248,255,205,${Math.min(1, 0.9 * pulse)})`);
    glow.addColorStop(0.18, `rgba(205,255,52,${Math.min(1, 0.62 * pulse)})`);
    glow.addColorStop(1, "rgba(190,255,25,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRibbonField(time, scrollProgress) {
    for (let i = 0; i < strandCount; i++) {
      const g = strandGeometry(i, time, scrollProgress);
      const isBlue = i % 11 === 0;
      const hue = isBlue ? 191 : 65 + (i % 7) * 4;
      const shimmer = 0.88 + Math.sin(time * 4.6 + i * 0.74) * 0.2;
      const coreAlpha = (isBlue ? 0.46 : 0.25 + (i % 5) * 0.042) * shimmer;

      // Transparent luminous fabric first, then individual silk filaments.
      strokeBezier(g, 18 + (i % 4) * 3, hue, 0.022 * shimmer, 34);
      strokeBezier(g, 3.8 + (i % 3), hue, 0.09 * shimmer, 15);
      strokeBezier(g, 0.8 + (i % 4) * 0.18, hue, coreAlpha, 5);
      if (i % 2 === 0) drawMovingEnergy(g, i, time);
    }

    // Bright focal throat; it is a broad convergence, never a thin snake tip.
    const knotX = w * 0.39;
    const knotPulse = 1 + Math.sin(time * 3.6) * 0.14;
    const knotY = h * 0.61 - scrollProgress * h * 0.54 + Math.sin(time * 1.28) * 3.2;
    const outerKnot = ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, 160 * knotPulse);
    outerKnot.addColorStop(0, `rgba(189,255,25,${0.16 * knotPulse})`);
    outerKnot.addColorStop(0.25, `rgba(181,255,18,${0.075 * knotPulse})`);
    outerKnot.addColorStop(1, "rgba(181,255,18,0)");
    ctx.fillStyle = outerKnot;
    ctx.beginPath();
    ctx.arc(knotX, knotY, 160 * knotPulse, 0, Math.PI * 2);
    ctx.fill();

    const knot = ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, 95 * knotPulse);
    knot.addColorStop(0, `rgba(250,255,205,${Math.min(1, 0.9 * knotPulse)})`);
    knot.addColorStop(0.08, `rgba(209,255,54,${Math.min(1, 0.58 * knotPulse)})`);
    knot.addColorStop(0.38, "rgba(181,255,18,0.14)");
    knot.addColorStop(1, "rgba(181,255,18,0)");
    ctx.fillStyle = knot;
    ctx.beginPath();
    ctx.arc(knotX, knotY, 95 * knotPulse, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDust(time) {
    for (const p of dust) {
      const x = ((p.x * w + time * p.s * 18) % (w + 30)) - 15;
      const y = p.y * h + Math.sin(time * 0.4 + p.x * 12) * 14;
      ctx.beginPath();
      ctx.fillStyle = `rgba(230,255,170,${p.a})`;
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    if (!running) return;
    if (frameInterval && now - lastFrame < frameInterval) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastFrame = now;
    const time = (now - t0) / 1000;
    const scrollP = Number(window.__relayScroll || 0);

    ctx.clearRect(0, 0, w, h);

    // Soft green atmosphere behind ribbons (video bloom)
    const g = ctx.createRadialGradient(w * 0.58, h * 0.4, 0, w * 0.58, h * 0.4, w * 0.7);
    g.addColorStop(0, "rgba(200,255,60,0.08)");
    g.addColorStop(0.4, "rgba(160,220,50,0.035)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    drawRibbonField(time, scrollP);
    drawDust(time);

    raf = requestAnimationFrame(frame);
  }

  function paintStatic(scrollProgress = 0) {
    resize();
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.58, h * 0.4, 0, w * 0.58, h * 0.4, w * 0.7);
    g.addColorStop(0, "rgba(200,255,60,0.1)");
    g.addColorStop(0.45, "rgba(160,220,50,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawRibbonField(0, scrollProgress);
  }

  function start() {
    if (reduce || touchMode) {
      paintStatic(0);
      canvas.dataset.static = "true";
      let paintTimer = 0;
      document.documentElement.addEventListener("relay-scroll", (event) => {
        clearTimeout(paintTimer);
        paintTimer = setTimeout(() => {
          paintStatic(Number(event.detail) || 0);
        }, 16);
      });
      addEventListener("resize", () => {
        clearTimeout(paintTimer);
        paintTimer = setTimeout(() => paintStatic(Number(window.__relayScroll) || 0), 80);
      });
      return;
    }
    cancelAnimationFrame(raf);
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, lowPower ? 180 : 60);
  });

  if (!touchMode) {
    addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.__relayScroll = max > 0 ? window.scrollY / max : 0;
    }, { passive: true });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  } else {
    let scrollFrame = 0;
    addEventListener("scroll", () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        const max = document.documentElement.scrollHeight - innerHeight;
        const progress = max > 0 ? window.scrollY / max : 0;
        window.__relayScroll = progress;
        paintStatic(progress);
      });
    }, { passive: true });
  }

  resize();
  start();
})();
