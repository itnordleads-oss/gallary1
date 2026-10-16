(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touchLayout = matchMedia("(max-width: 980px)").matches || matchMedia("(pointer: coarse)").matches;
  if (touchLayout) document.documentElement.dataset.touchLayout = "true";
  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");

  menuBtn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll(".links a").forEach((a) => {
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menuBtn?.setAttribute("aria-expanded", "false");
    });
  });

  // Heatmap
  const heat = document.querySelector(".heatmap");
  if (heat) {
    const on = new Set([3, 9, 11, 16, 18, 24, 31, 33, 38]);
    for (let i = 0; i < 49; i++) {
      const s = document.createElement("span");
      if (on.has(i)) s.classList.add("on");
      heat.appendChild(s);
    }
  }

  // Pricing
  const range = document.getElementById("runs");
  const priceVal = document.getElementById("priceVal");
  function priceFromRuns(runs) {
    if (runs <= 10000) return 29;
    if (runs <= 30000) return 89;
    if (runs <= 60000) return 149;
    return 249;
  }
  function syncPrice() {
    if (!range || !priceVal) return;
    priceVal.textContent = String(priceFromRuns(Number(range.value)));
  }
  range?.addEventListener("input", syncPrice);
  syncPrice();

  document.querySelector(".cta-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.elements.email;
    const status = document.getElementById("lead-form-status");
    if (!(email instanceof HTMLInputElement) || !status) return;

    if (!email.validity.valid) {
      email.setAttribute("aria-invalid", "true");
      status.textContent = "Enter a valid work email address.";
      email.focus();
      return;
    }

    email.removeAttribute("aria-invalid");
    status.textContent = "Lead delivery is not configured. Connect a secure form endpoint before launch.";
  });
  document.querySelector(".cta-form input")?.addEventListener("input", (e) => {
    e.currentTarget.removeAttribute("aria-invalid");
    const status = document.getElementById("lead-form-status");
    if (status) status.textContent = "";
  });

  function setCount(el, target) {
    el.textContent = target >= 1000 ? target.toLocaleString("en-US") : String(target);
  }

  function animateCount(el, target) {
    if (!window.gsap) {
      setCount(el, target);
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        setCount(el, Math.round(obj.v));
      },
    });
  }

  function triggerSectionFX(section) {
    section.querySelectorAll("[data-count]").forEach((node) => {
      if (node.dataset.done) return;
      node.dataset.done = "1";
      animateCount(node, Number(node.dataset.count || "0"));
    });
    section.querySelectorAll(".prog[data-pct]").forEach((circle) => {
      if (circle.dataset.done) return;
      circle.dataset.done = "1";
      const pct = Number(circle.dataset.pct || "0");
      const r = Number(circle.getAttribute("r") || 38);
      const circ = 2 * Math.PI * r;
      circle.style.strokeDasharray = String(circ);
      const offset = circ * (1 - pct / 100);
      if (window.gsap) {
        gsap.fromTo(circle, { strokeDashoffset: circ }, { strokeDashoffset: offset, duration: 1.4, ease: "power2.out" });
      } else {
        circle.style.strokeDashoffset = String(offset);
      }
    });
    section.querySelectorAll("[data-bar]").forEach((bar) => {
      if (bar.dataset.done) return;
      bar.dataset.done = "1";
      const width = `${bar.dataset.bar}%`;
      if (window.gsap) {
        gsap.fromTo(bar, { width: "0%" }, { width, duration: 1.15, ease: "power2.out" });
      } else {
        bar.style.width = width;
      }
    });
    section.classList.add("is-in");
  }

  function revealAllContent() {
    document.querySelectorAll(".reveal, .glass, .lime-band, .section, .hero, .app, .bubble, .bubble-wire").forEach((el) => {
      el.classList.add("is-in");
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
    });
  }

  function popWorkflow() {
    const card = document.querySelector(".float-card");
    if (!card || card.dataset.popped) return;
    card.dataset.popped = "1";
    card.classList.add("workflow-pop");
  }

  function initTouchScrollMode() {
    revealAllContent();
    popWorkflow();
    const sections = document.querySelectorAll(".section, .hero, .site-footer");
    if (!("IntersectionObserver" in window)) {
      sections.forEach((section) => triggerSectionFX(section));
      return;
    }
    const seen = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          triggerSectionFX(entry.target);
          seen.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    sections.forEach((section) => seen.observe(section));
  }

  if (touchLayout || reduceMotion) {
    initTouchScrollMode();
    return;
  }

  // ---------- GSAP Scroll animations (video-style) ----------
  if (!window.gsap || !window.ScrollTrigger) {
    initTouchScrollMode();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Kill old CSS reveal hiding — GSAP owns motion now
  gsap.set(".reveal", { clearProps: "all" });

  // Hero entrance
  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTl
    .from(".hero .pill", { y: 30, opacity: 0, duration: 0.6 })
    .from(".hero h1", { y: 60, opacity: 0, duration: 0.85 }, "-=0.25")
    .from(".hero .lede", { y: 40, opacity: 0, duration: 0.7 }, "-=0.45")
    .from(".hero .hero-cta", { y: 30, opacity: 0, duration: 0.65 }, "-=0.4")
    .from(".hero .micro", { y: 20, opacity: 0, duration: 0.5 }, "-=0.35")
    .from(
      ".hero-card",
      {
        y: 80,
        opacity: 0,
        scale: 0.86,
        rotateX: 12,
        duration: 1,
        transformOrigin: "center bottom",
        onComplete: popWorkflow,
      },
      "-=0.75"
    );

  // Parallax hero card stays off on touch layouts so the card cannot drift off-screen.
  const card = document.querySelector(".float-card");
  if (card && !touchLayout) {
    addEventListener(
      "pointermove",
      (e) => {
        if (!card.dataset.popped) return;
        const x = (e.clientX / innerWidth - 0.5) * 16;
        const y = (e.clientY / innerHeight - 0.5) * 12;
        gsap.to(card, { x, y, duration: 0.6, ease: "power2.out", overwrite: true });
      },
      { passive: true }
    );
  }

  // Generic section animator
  function animateSection(selector, opts = {}) {
    const section = document.querySelector(selector);
    if (!section) return;

    const kids = Array.from(section.querySelectorAll(
      opts.targets || "h2, h3, .kicker, .muted, .apps .app, .glass, .lime-band, .feature-grid > *, .dash-grid > *, .metric-row > *, .two-col > *, .cta-bento > *, p, .approve-row, .pricing"
    ));
    const bubbleCards = kids.filter((node) =>
      node.matches(".glass, .app, .lime-band, .feature-grid > *, .dash-grid > *, .metric-row > *, .cta-bento > *, .pricing")
    );
    const textKids = kids.filter((node) => !bubbleCards.includes(node));

    const initial = touchLayout
      ? { opacity: 0, y: 18, x: 0, scale: 1, filter: "none" }
      : {
          opacity: 0,
          scale: opts.scale ?? 0.96,
          filter: "blur(8px)",
        };
    if (!touchLayout && opts.x !== undefined) initial.x = opts.x;
    if (!touchLayout && (opts.y !== undefined || opts.x === undefined)) initial.y = opts.y ?? 56;
    if (!touchLayout && opts.rotateX !== undefined) initial.rotateX = opts.rotateX;
    if (!touchLayout && opts.rotateY !== undefined) initial.rotateY = opts.rotateY;

    function resetSection() {
      gsap.killTweensOf(kids);
      gsap.set(kids, initial);
      gsap.set(bubbleCards, touchLayout
        ? { opacity: 0, y: 18, x: 0, scale: 1, filter: "none", transformOrigin: "center center" }
        : {
            scale: opts.cardScale ?? 0.14,
            opacity: 0,
            filter: "blur(13px)",
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            transformOrigin: "center center",
          });
    }

    function playSection() {
      gsap.killTweensOf(kids);
      triggerSectionFX(section);
      opts.onEnter?.(section);

      gsap.to(textKids, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        filter: "blur(0px)",
        duration: opts.duration ?? 0.9,
        stagger: opts.stagger ?? 0.08,
        ease: "power3.out",
      });
      gsap.to(bubbleCards, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        filter: "blur(0px)",
        duration: opts.cardDuration ?? 0.82,
        stagger: opts.cardStagger ?? Math.max(0.07, (opts.stagger ?? 0.08)),
        ease: "back.out(1.55)",
      });
    }

    resetSection();
    ScrollTrigger.create({
      trigger: section,
      start: touchLayout ? "top 92%" : (opts.start || "top 88%"),
      end: opts.end || "bottom 15%",
      onEnter: playSection,
      onEnterBack: touchLayout ? undefined : playSection,
      onLeaveBack: touchLayout ? undefined : resetSection,
    });

    // Continuous scrub parallax while section is in view. Skip it on small screens:
    // the extra Y shift collides with the stacked layout and clips cards.
    if (!opts.noScrub && !touchLayout) {
      gsap.to(section.querySelectorAll(".glass, .lime-band"), {
        y: -28,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.1,
        },
      });
    }
  }

  // Each scroll scene uses a distinct entrance path, rather than repeating
  // one fade-up transition across the full page.
  animateSection(".integrations", {
    stagger: 0.055,
    x: -72,
    scale: 0.9,
    onEnter: (section) => {
      gsap.fromTo(
        section.querySelectorAll(".app"),
        { scale: 0.18, filter: "blur(10px)" },
        { scale: 1, filter: "blur(0px)", stagger: 0.065, duration: 0.7, ease: "back.out(1.8)" }
      );
    },
  });
  animateSection(".canvas-sec", {
    stagger: 0.14,
    x: 92,
    scale: 0.93,
  });
  animateSection(".record-sec", {
    stagger: 0.13,
    x: -82,
    scale: 0.92,
    onEnter: (section) => {
      gsap.fromTo(
        section.querySelectorAll(".chart-3d .bar-col"),
        { y: 44, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.09, duration: 0.72, ease: "back.out(1.4)" }
      );
    },
  });
  animateSection(".boring-sec", {
    targets: "h2, .muted, .feature-grid > *",
    stagger: 0.14,
    scale: 0.92,
    y: 0,
  });
  animateSection(".dash-sec", {
    targets: "h2, .dash-grid > *",
    stagger: 0.1,
    scale: 0.9,
    y: 70,
    onEnter: (section) => {
      gsap.fromTo(
        section.querySelectorAll(".dash-grid > *"),
        { y: 90 },
        { y: 0, stagger: 0.08, duration: 0.82, ease: "power3.out" }
      );
    },
  });
  animateSection(".metrics-sec", {
    targets: "h2, .metric-row > *",
    stagger: 0.14,
    scale: 0.88,
    y: 64,
    onEnter: (section) => {
      gsap.fromTo(
        section.querySelectorAll(".metric-row > *"),
        { scale: 0.55, opacity: 0 },
        { scale: 1, opacity: 1, stagger: 0.13, duration: 0.75, ease: "back.out(1.35)" }
      );
    },
  });
  animateSection(".pricing-sec", { stagger: 0.12, x: 76, scale: 0.94 });
  animateSection(".standup-sec", {
    targets: ".lime-band",
    cardScale: 0.035,
    cardDuration: 1.1,
    cardStagger: 0,
    y: 24,
    noScrub: true,
    onEnter: (section) => {
      const panel = section.querySelector(".lime-band");
      const arrow = section.querySelector(".arrow-btn");
      if (!panel || !arrow) return;

      gsap.fromTo(
        panel,
        { boxShadow: "0 0 0 rgba(200,255,60,0)" },
        {
          boxShadow: "0 28px 90px rgba(200,255,60,0.42)",
          duration: 0.75,
          delay: 0.24,
          ease: "power2.out",
        }
      );
      gsap.fromTo(
        arrow,
        { scale: 0.08, rotate: -55, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.58, delay: 0.58, ease: "back.out(2)" }
      );
    },
  });
  animateSection(".cta-sec", {
    targets: ".cta-bento > *",
    stagger: 0.16,
    scale: 0.9,
    x: -82,
  });

  // Footer fade
  gsap.from(".site-footer .foot-grid > *", {
    opacity: 0,
    y: 30,
    stagger: 0.08,
    duration: 0.7,
    ease: "power2.out",
    scrollTrigger: { trigger: ".site-footer", start: "top 90%", once: true },
  });

  // Scroll-linked ribbon intensity (for Three.js / canvas scripts)
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      document.documentElement.style.setProperty("--scroll-p", self.progress.toFixed(4));
      window.__relayScroll = self.progress;
      window.__relayScrollY = self.scroll();
    },
  });

})();
