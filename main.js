/* ==========================================================================
   N&C 4L TROPHY 2028 — MOTEUR D'ANIMATIONS COMMUN (main.js)
   Association C'est Beau 2 Rêver · Saint-Malo -> Sahara

   Ce fichier est partagé par toutes les pages (menu, apparitions au scroll,
   route animée avec la 4L, particules de sable, compteurs, toasts...).
   Chaque page garde ensuite son petit script spécifique juste en dessous.
   ========================================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const formatFR = (v) => Math.round(v).toLocaleString('fr-FR');

  /* ------------------------------------------------------------------------
     1. UTILITAIRES PARTAGÉS (exposés dans window.CB2R pour les pages)
     ------------------------------------------------------------------------ */

  // Anime un nombre de "from" à "to" dans un élément (easing doux)
  function animateNumber(el, from, to, duration, format, onFrame) {
    format = format || formatFR;
    cancelAnimationFrame(el._cbRaf);
    if (reduceMotion || duration <= 0) {
      el.textContent = format(to);
      if (onFrame) onFrame(to, 1);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      const value = from + (to - from) * eased;
      el.textContent = format(value);
      if (onFrame) onFrame(value, p);
      if (p < 1) el._cbRaf = requestAnimationFrame(step);
    };
    el._cbRaf = requestAnimationFrame(step);
  }

  // Petite notification élégante (remplace les alert())
  let toastEl, toastTimer;
  function toast(message, type) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.dataset.type = type || 'ok';
    toastEl.classList.remove('show');
    void toastEl.offsetWidth; // relance l'animation
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3600);
  }

  // Copie dans le presse-papier, avec solution de secours (anciens navigateurs / http)
  async function copyText(text, okMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (!ok) throw new Error('copy failed');
      }
      toast(okMessage || 'Copié dans le presse-papier ✓');
      return true;
    } catch (err) {
      toast('Copie impossible automatiquement : sélectionnez le texte à la main.', 'error');
      return false;
    }
  }

  // Fait "briller" un bloc (ex. formulaire) pour attirer l'œil
  function pulse(el) {
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  window.CB2R = { animateNumber, toast, copyText, pulse, reduceMotion };

  /* ------------------------------------------------------------------------
     2. MENU (burger animé, fermeture au clic / Échap / clic extérieur)
     ------------------------------------------------------------------------ */
  const nav = document.getElementById('main-nav');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  let menuOpenY = 0;
  function setMenu(open) {
    if (!navLinks || !navToggle) return;
    if (open) menuOpenY = window.scrollY;
    navLinks.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('open') && nav && !nav.contains(e.target)) setMenu(false);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 980) setMenu(false); });
  }

  /* ------------------------------------------------------------------------
     3. APPARITIONS AU SCROLL (sections + cartes en cascade)
     ------------------------------------------------------------------------ */
  const staggerGroups = '.cards-grid, .zones-grid, .crew, .frame-row, .timeline, .specs-banner, .milestones-row, .social-cards';
  document.querySelectorAll(staggerGroups).forEach((group) => {
    const perRow = group.classList.contains('timeline') ? 1 : 4;
    Array.from(group.children).forEach((child, i) => {
      child.classList.add('stagger');
      child.style.setProperty('--i', i % perRow);
    });
  });

  const toReveal = document.querySelectorAll('.reveal, .stagger');
  function revealNow(el) {
    el.classList.add('visible');
    const km = el.querySelector(':scope > .km');
    if (km) km.classList.add('reached');
    // une fois l'entrée terminée, on rend la main aux effets de survol des cartes
    if (el.classList.contains('stagger')) {
      setTimeout(() => el.classList.remove('stagger'), reduceMotion ? 0 : 1400);
    }
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    toReveal.forEach(revealNow);
  } else {
    // threshold 0 : fonctionne même pour les sections très hautes (sur mobile)
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
    toReveal.forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------------------------------------
     4. COMPTEURS ANIMÉS (.counter[data-target])
     ------------------------------------------------------------------------ */
  const counters = document.querySelectorAll('.counter[data-target]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    counters.forEach((c) => { c.textContent = '0'; });
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = parseFloat(entry.target.dataset.target) || 0;
        animateNumber(entry.target, 0, target, 1900);
        counterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => counterObserver.observe(c));
  }

  /* ------------------------------------------------------------------------
     5. SCROLL : barre de lecture, route qui se remplit, 4L qui roule,
        parallaxe du hero, bouton retour en haut
     ------------------------------------------------------------------------ */
  const scrollBar = document.getElementById('scroll-progress-bar');
  const route = document.getElementById('route-container');
  const hero = document.querySelector('.hero');
  const heroContent = hero && hero.querySelector('.hero-content');
  const heroDunes = hero && hero.querySelector('.hero-dunes');

  // La petite 4L (vue de dessus) qui descend la route en suivant le scroll
  let routeCar = null;
  if (route) {
    routeCar = document.createElement('div');
    routeCar.className = 'route-car';
    routeCar.setAttribute('aria-hidden', 'true');
    routeCar.innerHTML =
      '<svg viewBox="0 0 24 38" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="2.5" y="1.5" width="19" height="35" rx="5" fill="#c8402e" stroke="#f3efe4" stroke-width="1.5"/>' +
        '<rect x="5.5" y="5" width="13" height="4" rx="1.2" fill="#12151b"/>' +
        '<rect x="6" y="11.5" width="12" height="11" rx="1" fill="none" stroke="#c9a063" stroke-width="1.2"/>' +
        '<line x1="9" y1="11.5" x2="9" y2="22.5" stroke="#c9a063" stroke-width="1"/>' +
        '<line x1="15" y1="11.5" x2="15" y2="22.5" stroke="#c9a063" stroke-width="1"/>' +
        '<path d="M5 25.5h14l-1.4 5.5H6.4z" fill="#12151b"/>' +
        '<circle cx="6" cy="34.2" r="1.3" fill="#ffe7a8"/>' +
        '<circle cx="18" cy="34.2" r="1.3" fill="#ffe7a8"/>' +
      '</svg>';
    route.appendChild(routeCar);
  }

  // Bouton "retour en haut" avec anneau de progression
  const toTop = document.createElement('button');
  toTop.type = 'button';
  toTop.className = 'to-top';
  toTop.setAttribute('aria-label', 'Revenir en haut de la page');
  toTop.innerHTML =
    '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle class="ring-bg" cx="24" cy="24" r="21"/>' +
      '<circle class="ring" cx="24" cy="24" r="21"/>' +
    '</svg><span aria-hidden="true">↑</span>';
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  document.body.appendChild(toTop);
  const ring = toTop.querySelector('.ring');
  const RING_LEN = 2 * Math.PI * 21;

  let lastY = window.scrollY;
  let ticking = false;
  let carTimer;

  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight - vh;
    const pct = docHeight > 0 ? Math.min(1, Math.max(0, y / docHeight)) : 0;

    if (scrollBar) scrollBar.style.width = (pct * 100) + '%';
    if (nav) nav.classList.toggle('scrolled', y > 40);

    if (route) {
      const rect = route.getBoundingClientRect();
      const routePct = Math.max(0, Math.min(100, ((vh * 0.6) - rect.top) / rect.height * 100));
      route.style.setProperty('--spine-height', routePct + '%');
      if (routeCar && Math.abs(y - lastY) > 1) {
        routeCar.classList.toggle('up', y < lastY);
        routeCar.classList.add('moving');
        clearTimeout(carTimer);
        carTimer = setTimeout(() => routeCar.classList.remove('moving'), 160);
      }
    }

    if (!reduceMotion && hero && heroContent) {
      const h = hero.offsetHeight;
      if (y < h) {
        heroContent.style.transform = 'translate3d(0,' + (y * 0.28) + 'px,0)';
        heroContent.style.opacity = String(Math.max(0, 1 - y / (h * 0.9)));
        if (heroDunes) heroDunes.style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0)';
      }
    }

    // le menu mobile se referme quand on fait défiler la page
    if (navLinks && navLinks.classList.contains('open') && Math.abs(y - menuOpenY) > 60) setMenu(false);

    toTop.classList.toggle('show', y > 600);
    if (ring) ring.style.strokeDashoffset = String(RING_LEN * (1 - pct));

    lastY = y;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(onScroll));
  onScroll(); // état correct même si la page s'ouvre au milieu (ancre, rechargement)

  /* ------------------------------------------------------------------------
     6. EFFETS DE SURVOL : halo des cartes, inclinaison 3D des photos,
        onde au clic sur les boutons
     ------------------------------------------------------------------------ */
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.spotlight-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
    card.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px');
  }, { passive: true });

  if (canHover && !reduceMotion) {
    document.querySelectorAll('.frame').forEach((frame) => {
      frame.addEventListener('pointermove', (e) => {
        const r = frame.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        frame.style.transform = 'perspective(900px) rotateX(' + (-y * 7) + 'deg) rotateY(' + (x * 9) + 'deg)';
      });
      frame.addEventListener('pointerleave', () => { frame.style.transform = ''; });
    });
  }

  if (!reduceMotion) {
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest && e.target.closest('.btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* ------------------------------------------------------------------------
     7. CARTES CLIQUABLES ACCESSIBLES AU CLAVIER (Entrée / Espace)
     ------------------------------------------------------------------------ */
  document.querySelectorAll('.km-tier-card, .zone-card').forEach((card) => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  /* ------------------------------------------------------------------------
     8. FAQ : ouverture / fermeture en douceur
     ------------------------------------------------------------------------ */
  document.querySelectorAll('details.faq-item').forEach((details) => {
    const summary = details.querySelector('summary');
    const content = summary && summary.nextElementSibling;
    if (!content || reduceMotion || !content.animate) return;
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (details.dataset.animating) return;
      details.dataset.animating = '1';
      const done = () => { delete details.dataset.animating; };
      if (!details.open) {
        details.open = true;
        const h = content.offsetHeight;
        content.animate(
          [{ height: '0px', opacity: 0, marginTop: '0px' }, { height: h + 'px', opacity: 1, marginTop: '12px' }],
          { duration: 340, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        ).onfinish = done;
      } else {
        const h = content.offsetHeight;
        content.animate(
          [{ height: h + 'px', opacity: 1, marginTop: '12px' }, { height: '0px', opacity: 0, marginTop: '0px' }],
          { duration: 240, easing: 'ease-in' }
        ).onfinish = () => { details.open = false; done(); };
      }
    });
  });

  /* ------------------------------------------------------------------------
     9. IMAGES : chargement différé + masque propre si une image manque
     ------------------------------------------------------------------------ */
  document.querySelectorAll('img').forEach((img) => {
    if (img.closest('#progress-car')) return; // gérée par la page contact
    const fail = () => img.classList.add('img-missing');
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
    else img.addEventListener('error', fail, { once: true });
  });

  /* ------------------------------------------------------------------------
     10. PARTICULES DE SABLE DANS LE HERO (net sur écrans Retina,
         réagit à la souris, se met en pause hors écran)
     ------------------------------------------------------------------------ */
  const canvas = document.getElementById('sand-canvas');
  if (canvas && !reduceMotion && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const host = canvas.parentElement;
    const count = host.classList.contains('small') ? 38 : 64;
    let w = 0, h = 0, particles = [], running = false, raf = 0;
    let mx = -9999, my = -9999;

    const spawn = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.9 + 0.5,
      vx: Math.random() * 0.5 + 0.15,
      vy: -(Math.random() * 0.3 + 0.04),
      a: Math.random() * 0.45 + 0.12,
      ph: Math.random() * Math.PI * 2
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!particles.length) particles = Array.from({ length: count }, spawn);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 12000) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d2 / 12000) * 2.2;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
        p.x += p.vx + Math.sin(t / 1500 + p.ph) * 0.15;
        p.y += p.vy;
        if (p.x > w + 10) { p.x = -10; p.y = Math.random() * h; }
        if (p.x < -12) p.x = w + 8;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.y > h + 12) p.y = -8;
        const alpha = p.a * (0.7 + 0.3 * Math.sin(t / 700 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201,160,99,' + alpha.toFixed(3) + ')';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    host.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { mx = my = -9999; });

    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
    resize();

    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(draw); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(host);
    } else {
      start();
    }
  }
})();
