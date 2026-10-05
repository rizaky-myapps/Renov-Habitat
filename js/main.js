(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SITE = window.SITE || {};

  /* ---------- Infos entreprise (js/config.js) ---------- */
  $$('[data-site]').forEach((el) => {
    const value = SITE[el.dataset.site];
    if (value) el.textContent = value;
  });
  $$('[data-site-href]').forEach((el) => {
    if (el.dataset.siteHref === 'tel' && SITE.phone) el.href = 'tel:' + SITE.phone.replace(/[^\d+]/g, '');
    if (el.dataset.siteHref === 'mail' && SITE.email) el.href = 'mailto:' + SITE.email;
  });

  /* ---------- En-tête & menu mobile ---------- */
  const header = $('.site-header');
  const nav = $('#nav');
  const toggle = $('.nav-toggle');

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 861px)').addEventListener('change', () => setMenu(false));

  /* Lien actif selon la section visible */
  const links = $$('.nav a[href^="#"]:not(.nav__cta)');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Comparateur avant / après ---------- */
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ARROWS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>';

  function buildSlider(host) {
    const d = host.dataset;
    const lazy = d.eager === 'true' ? '' : ' loading="lazy"';
    host.innerHTML =
      `<img class="ba__img" src="${esc(d.after)}" alt="${esc(d.altAfter)}" width="1200" height="800" draggable="false"${lazy}>` +
      `<img class="ba__img ba__img--before" src="${esc(d.before)}" alt="${esc(d.altBefore)}" width="1200" height="800" draggable="false"${lazy}>` +
      '<span class="ba__tag ba__tag--before">Avant</span>' +
      '<span class="ba__tag ba__tag--after">Après</span>' +
      `<span class="ba__handle" aria-hidden="true"><span class="ba__knob">${ARROWS}</span></span>` +
      `<input class="ba__range" type="range" min="0" max="100" step="1" value="50" aria-label="Comparer avant et après : ${esc(d.altAfter)}">`;

    const range = $('.ba__range', host);
    let dragging = false;
    let hintFrame = 0;

    const setPos = (p) => {
      const v = Math.max(0, Math.min(100, p));
      host.style.setProperty('--pos', v + '%');
      range.value = Math.round(v);
    };
    const fromPointer = (e) => {
      const r = host.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };
    const stopHint = () => { cancelAnimationFrame(hintFrame); hintFrame = 0; };

    host.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stopHint();
      dragging = true;
      host.classList.add('is-dragging');
      host.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    host.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    const end = () => { dragging = false; host.classList.remove('is-dragging'); };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    range.addEventListener('input', () => { stopHint(); setPos(Number(range.value)); });

    /* Petit balayage d'invitation, une seule fois, quand le comparateur devient visible */
    if (!reduceMotion && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const keyframes = [50, 30, 70, 50];
        const seg = 520;
        const t0 = performance.now() + 350;
        const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const tick = (now) => {
          const t = Math.max(0, now - t0);
          const i = Math.floor(t / seg);
          if (i >= keyframes.length - 1) { setPos(keyframes[keyframes.length - 1]); hintFrame = 0; return; }
          const k = ease((t % seg) / seg);
          setPos(keyframes[i] + (keyframes[i + 1] - keyframes[i]) * k);
          hintFrame = requestAnimationFrame(tick);
        };
        hintFrame = requestAnimationFrame(tick);
      }, { threshold: 0.6 });
      io.observe(host);
    }
  }

  /* ---------- Réalisations ---------- */
  const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  const categories = window.CATEGORIES || {};
  const grid = $('#projects');
  const filters = $('#filters');

  if (grid && projects.length) {
    const frag = document.createDocumentFragment();
    projects.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'project reveal';
      card.dataset.category = p.category;
      card.style.setProperty('--d', (i % 3) * 90 + 'ms');
      card.innerHTML =
        `<div class="ba" data-before="${esc(p.before)}" data-after="${esc(p.after)}" data-alt-before="${esc(p.altBefore || 'Avant')}" data-alt-after="${esc(p.altAfter || 'Après')}"></div>` +
        '<div class="project__body">' +
          `<p class="project__cat">${esc(categories[p.category] || p.category)}</p>` +
          `<h3>${esc(p.title)}</h3>` +
          `<p class="project__desc">${esc(p.description)}</p>` +
          (p.tags && p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
        '</div>';
      frag.appendChild(card);
    });
    grid.appendChild(frag);

    /* Filtres : uniquement les catégories présentes */
    const present = Object.keys(categories).filter((k) => projects.some((p) => p.category === k));
    if (filters && present.length > 1) {
      const mk = (key, label, pressed) =>
        `<button class="chip" type="button" data-filter="${esc(key)}" aria-pressed="${pressed}">${esc(label)}</button>`;
      filters.innerHTML = mk('all', 'Tous', true) + present.map((k) => mk(k, categories[k], false)).join('');
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        $$('.chip', filters).forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
        const f = btn.dataset.filter;
        $$('.project', grid).forEach((card) => {
          const show = f === 'all' || card.dataset.category === f;
          card.hidden = !show;
          if (show) card.classList.add('is-in');
        });
      });
    } else if (filters) {
      filters.remove();
    }
  }

  $$('.ba[data-before]').forEach(buildSlider);

  /* ---------- Apparition au scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Formulaire de contact (ouvre la messagerie) ---------- */
  const form = $('#contact-form');
  const status = $('#form-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const email = String(data.get('email') || '').trim();
      const message = String(data.get('message') || '').trim();

      let ok = true;
      [['name', name], ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''], ['message', message]].forEach(([field, value]) => {
        const input = form.elements[field];
        const bad = !value;
        input.classList.toggle('is-invalid', bad);
        input.setAttribute('aria-invalid', String(bad));
        if (bad) ok = false;
      });
      status.className = 'form__status';
      if (!ok) {
        status.textContent = 'Merci de renseigner votre nom, un e-mail valide et votre projet.';
        status.classList.add('is-error');
        return;
      }

      const phone = String(data.get('phone') || '').trim();
      const body = [
        `Nom : ${name}`,
        `E-mail : ${email}`,
        phone && `Téléphone : ${phone}`,
        `Projet : ${data.get('type')}`
      ].filter(Boolean).join('\n') + '\n\n' + message;
      const subject = `Demande de devis — ${data.get('type')}`;
      window.location.href = `mailto:${SITE.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      status.textContent = 'Votre messagerie s’ouvre avec votre demande prête à envoyer. Merci !';
      status.classList.add('is-ok');
    });
    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('is-invalid')) { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); }
    });
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
