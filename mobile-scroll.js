(() => {
  if (document.documentElement.dataset.touchLayout !== "true") return;
  if (typeof Lenis === "undefined") return;

  const lenis = new Lenis({
    lerp: 0.1,
    syncTouch: true,
    smoothWheel: false,
    touchMultiplier: 1,
    wheelMultiplier: 0,
  });

  lenis.on("scroll", ({ scroll }) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? scroll / max : 0;
    window.__relayScroll = progress;
    document.documentElement.dispatchEvent(
      new CustomEvent("relay-scroll", { detail: progress })
    );
  });

  function frame(time) {
    lenis.raf(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
