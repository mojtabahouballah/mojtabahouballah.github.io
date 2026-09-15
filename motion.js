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

// Interactive complex-systems field. Decorative only; no scientific data implied.
(() => {
  const host = document.querySelector('.computational-field');
  const hero = document.querySelector('.hero');
  if (!host || !hero) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'interactive-network');
  svg.setAttribute('viewBox', '0 0 1000 800');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  function make(tag, attrs) {
    const e = document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v)); svg.append(e); return e;
  }
  const nodes=[];
  for(let row=0;row<12;row++) for(let col=0;col<12;col++) {
    const i=row*12+col;
    nodes.push({x:30+col*85+Math.sin(i*2.4)*16,y:row*73+Math.cos(i*1.7)*14,
      el:make('rect',{width:3,height:3,fill:'#88b9ce',opacity:.4}),phase:i*2.399});
  }
  const spokes=Array.from({length:11},()=>make('line',{stroke:'#b7d9e5','stroke-width':.8,opacity:0}));
  const satellites=Array.from({length:11},()=>make('rect',{width:5,height:5,fill:'#d7e8ed',opacity:0}));
  const halo=make('circle',{r:22,fill:'#f0bd6c',opacity:.06});
  const hub=make('rect',{width:12,height:12,rx:1,fill:'#f0bd6c'});
  host.querySelector('.network-background')?.remove();host.append(svg);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let x=650,y=390,targetX=x,targetY=y,time=0,last=0,raf=0,visible=true,inside=false;
  let connections=[];
  function draw(dt) {
    const ease=1-Math.exp(-dt*3.5);
    x+=(targetX-x)*ease;y+=(targetY-y)*ease;
    nodes.forEach(n=>{
      n.px=n.x+Math.sin(time*.22+n.phase)*10;
      n.py=n.y+Math.cos(time*.18+n.phase)*9;
      n.el.setAttribute('x',n.px-1.5);n.el.setAttribute('y',n.py-1.5);
    });
    // Hysteresis avoids connections flickering as the hub moves between nodes.
    const ranked=[...nodes].sort((a,b)=>(Math.hypot(a.px-x,a.py-y)-(connections.includes(a)?28:0))-(Math.hypot(b.px-x,b.py-y)-(connections.includes(b)?28:0)));
    connections=ranked.slice(0,11);
    connections.forEach((n,i)=>{
      const distance=Math.hypot(n.px-x,n.py-y);
      const opacity=Math.max(.08,Math.min(.65,1-distance/240));
      const l=spokes[i];l.setAttribute('x1',x);l.setAttribute('y1',y);l.setAttribute('x2',n.px);l.setAttribute('y2',n.py);l.setAttribute('opacity',opacity);
      const dot=satellites[i];dot.setAttribute('x',n.px-2.5);dot.setAttribute('y',n.py-2.5);dot.setAttribute('opacity',opacity+.15);
    });
    hub.setAttribute('x',x-6);hub.setAttribute('y',y-6);halo.setAttribute('cx',x);halo.setAttribute('cy',y);
  }
  const allowed=()=>visible&&!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-paused');
  function tick(now){raf=0;if(!allowed()){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;time+=dt;
    if(!inside){targetX=640+Math.sin(time*.24)*150;targetY=390+Math.cos(time*.19)*130;}
    draw(dt);raf=requestAnimationFrame(tick);
  }
  function sync(){if(!allowed()){cancelAnimationFrame(raf);raf=0;last=0;}else if(!raf)raf=requestAnimationFrame(tick);}
  hero.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!allowed())return;
    const matrix=svg.getScreenCTM();if(!matrix)return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    targetX=Math.max(340,Math.min(950,p.x));targetY=Math.max(70,Math.min(730,p.y));inside=true;
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{inside=false;});
  reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  if('IntersectionObserver'in window)new IntersectionObserver(e=>{visible=e[0].isIntersecting;sync();}).observe(hero);
  draw(0);sync();
})();
