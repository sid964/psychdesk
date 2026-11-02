/* LiDAR-inspired topographic point cloud for the Overview hero.
   Decorative and scroll-scrubbed: no perpetual animation, 3D dependency, or data access. */
(() => {
  'use strict';
  const root = document.querySelector('#main');
  if (!root) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const points = [];
  const rows = 27, cols = 56;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  // A deterministic landscape projected onto a 2D plane, like a LiDAR scan.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const u = col / (cols - 1), v = row / (rows - 1);
      const ridgeA = Math.exp(-((u - .38) ** 2 / .045 + (v - .41) ** 2 / .14));
      const ridgeB = .78 * Math.exp(-((u - .76) ** 2 / .038 + (v - .54) ** 2 / .095));
      const ripple = .075 * Math.sin(u * 27 + v * 10) * Math.cos(v * 15);
      const z = clamp(ridgeA + ridgeB + ripple, 0, 1.25);
      const x = .075 + .85 * (u * .78 + (1 - v) * .22);
      const y = .25 + .63 * (v * .68 + (1 - z) * .20);
      points.push({ x, y, z, seed: ((row * 37 + col * 53) % 19) / 19 });
    }
  }
  points.sort((a, b) => a.y - b.y);
  let host = null, canvas = null, context = null, resize = null, frame = 0;
  let width = 0, height = 0, lastProgress = -1;
  function dispose() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; resize?.disconnect(); resize = null;
    host = null; canvas = null; context = null; lastProgress = -1;
  }
  function measure() {
    if (!canvas || !canvas.isConnected) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    width = box.width; height = box.height;
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h; lastProgress = -1;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    schedule();
  }
  function draw() {
    frame = 0;
    if (!canvas?.isConnected || !context || !width || document.hidden) return;
    if (root.querySelector('.dashboard-page > .hero') !== host) return;
    const rect = host.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const progress = reduced.matches ? 1 : clamp(.56 + window.scrollY / Math.max(240, innerHeight * .72) * .44, .56, 1);
    if (Math.abs(progress - lastProgress) < .002) return;
    lastProgress = progress;
    context.clearRect(0, 0, width, height);
    const edge = progress * width;
    for (const point of points) {
      const px = point.x * width, py = point.y * height;
      if (px > edge) continue;
      const proximity = reduced.matches ? 0 : clamp(1 - Math.abs(edge - px) / (width * .14), 0, 1);
      const alpha = clamp(.13 + point.z * .22 + proximity * .36 + point.seed * .07, 0, .8);
      const radius = .48 + point.z * .46 + proximity * .30;
      context.beginPath();
      context.fillStyle = 'rgba(211,224,231,' + alpha.toFixed(3) + ')';
      context.arc(px, py, radius, 0, Math.PI * 2);
      context.fill();
    }
    if (!reduced.matches && progress < .999) {
      const line = context.createLinearGradient(edge, height * .12, edge, height * .91);
      line.addColorStop(0, 'rgba(220,235,243,0)');
      line.addColorStop(.42, 'rgba(220,235,243,.34)');
      line.addColorStop(1, 'rgba(220,235,243,0)');
      context.beginPath(); context.strokeStyle = line; context.lineWidth = 1;
      context.moveTo(edge, height * .12); context.lineTo(edge, height * .91); context.stroke();
    }
  }
  function schedule() {
    if (!frame && canvas?.isConnected) frame = requestAnimationFrame(draw);
  }
  function mount() {
    const target = root.querySelector('.dashboard-page > .hero');
    if (!target) { if (host) dispose(); return; }
    if (target === host && canvas?.isConnected) return;
    dispose();
    host = target;
    canvas = document.createElement('canvas');
    canvas.className = 'lidar-scan';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('role', 'presentation');
    host.appendChild(canvas);
    context = canvas.getContext('2d', { alpha: true });
    if (!context) { canvas.remove(); dispose(); return; }
    resize = new ResizeObserver(measure);
    resize.observe(canvas);
    measure();
  }
  // The app replaces #main children during renders; nested canvas changes do not retrigger this.
  const observer = new MutationObserver(mount);
  observer.observe(root, { childList: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  reduced.addEventListener('change', () => { lastProgress = -1; schedule(); });
  window.addEventListener('pagehide', dispose, { once: true });
  mount();
})();
