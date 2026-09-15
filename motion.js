(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  const reveals = [...document.querySelectorAll('.reveal')];
  const progress = document.querySelector('.reading-progress');
  const hero = document.querySelector('.hero');
  const landscape = document.querySelector('.hero-image-wrap');
  const navLinks = [...document.querySelectorAll('.site-header nav a')];
  let manuallyPaused = false;
  let observer;
  let framePending = false;

  function motionAllowed() { return !reduced.matches && !manuallyPaused; }
  function exposeAll() {
    if (observer) observer.disconnect();
    reveals.forEach(el => { el.classList.remove('is-pending'); el.classList.add('is-visible'); });
  }
  function updateMotion() {
    const paused = !motionAllowed();
    document.body.classList.toggle('motion-paused', paused);
    document.documentElement.classList.toggle('motion-paused', paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = reduced.matches ? 'Reduced motion enabled' : (paused ? 'Resume animations' : 'Pause animations');
    toggle.disabled = reduced.matches;
    if (paused) { exposeAll(); landscape.style.transform = 'none'; }
    scheduleFrame();
  }
  function animateScroll() {
    framePending = false;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const fraction = Math.min(1, Math.max(0, window.scrollY / scrollable));
    progress.style.transform = `scaleX(${fraction})`;
    if (motionAllowed()) {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom > 0) landscape.style.transform = `translate3d(0,${Math.min(45, Math.max(0, -rect.top) * .07)}px,0)`;
    }
  }
  function scheduleFrame() {
    if (!framePending) { framePending = true; requestAnimationFrame(animateScroll); }
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => { manuallyPaused = !manuallyPaused; updateMotion(); });
  if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', updateMotion);
  else if (typeof reduced.addListener === 'function') reduced.addListener(updateMotion);

  if ('IntersectionObserver' in window && motionAllowed()) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(el => {
      if (el.getBoundingClientRect().top >= window.innerHeight - 20) { el.classList.add('is-pending'); observer.observe(el); }
      else el.classList.add('is-visible');
    });
    const sections = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) navLinks.forEach(link => {
          const active = link.hash === '#' + entry.target.id;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-18% 0px -55% 0px' });
    navLinks.forEach(link => { const section = document.querySelector(link.hash); if (section) sections.observe(section); });
  }
  window.addEventListener('scroll', scheduleFrame, { passive: true });
  window.addEventListener('resize', scheduleFrame, { passive: true });
  window.addEventListener('hashchange', () => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) target.querySelectorAll('.is-pending').forEach(el => { el.classList.remove('is-pending'); el.classList.add('is-visible'); });
  });
  updateMotion();
})();

// Decorative network: nodes drift together, with attached edges and subtle pointer depth.
(() => {
  const svg = document.querySelector('.network-background');
  const hero = document.querySelector('.hero');
  if (!svg || !hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const nodes = [...svg.querySelectorAll('.network-node')].map((el, i) => ({
    el, x: +el.getAttribute('cx'), y: +el.getAttribute('cy'), phase: i * 2.39996
  }));
  const nearest = (x, y) => nodes.reduce((a, b) =>
    Math.hypot(b.x-x,b.y-y) < Math.hypot(a.x-x,a.y-y) ? b : a, nodes[0]);
  if (!nodes.length) return;
  const edges = [...svg.querySelectorAll('.network-edges path')].map(el => {
    const xy = el.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    return {el, a: nearest(xy[0],xy[1]), b: nearest(xy[2],xy[3])};
  });
  let frame = 0, previous = 0, time = 0, visible = true;
  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  const allowed = () => visible && !document.hidden && !reduced.matches && !document.body.classList.contains('motion-paused');
  function draw() {
    nodes.forEach(n => {
      n.px = n.x + Math.sin(time*.23+n.phase)*13 + pointerX;
      n.py = n.y + Math.cos(time*.19+n.phase)*10 + pointerY;
      n.el.setAttribute('cx', n.px.toFixed(2));
      n.el.setAttribute('cy', n.py.toFixed(2));
      n.el.style.opacity = (.62 + Math.sin(time*.7+n.phase)*.2).toFixed(3);
    });
    edges.forEach(({el,a,b}) => el.setAttribute('d',`M${a.px},${a.py} L${b.px},${b.py}`));
  }
  function tick(now) {
    frame = 0;
    if (!allowed()) { previous = 0; return; }
    if (previous) time += Math.min((now-previous)/1000,.05);
    previous = now;
    pointerX += (targetX-pointerX)*.035;
    pointerY += (targetY-pointerY)*.035;
    draw(); frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (!allowed()) { cancelAnimationFrame(frame); frame = 0; previous = 0; }
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  hero.addEventListener('pointermove',e => {
    if (e.pointerType !== 'mouse') return;
    const r=hero.getBoundingClientRect();
    targetX=((e.clientX-r.left)/r.width-.5)*12;
    targetY=((e.clientY-r.top)/r.height-.5)*8;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(hero);
  sync();
})();
