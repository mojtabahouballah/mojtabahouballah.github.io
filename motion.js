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
