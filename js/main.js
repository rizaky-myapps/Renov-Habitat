(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SITE = window.SITE || {};
  const { esc, build: buildSlider } = window.RHSlider;

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

  /* ---------- Apparition au scroll ---------- */
  const revealObserver = ('IntersectionObserver' in window && !reduceMotion)
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    : null;
  const reveal = (els) => els.forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add('is-in')));
  reveal($$('.reveal'));

  /* ---------- Réalisations (data/projects.json) ---------- */
  const heroHost = $('[data-hero]');
  const grids = $$('[data-projects]');

  if (heroHost || grids.length) {
    fetch('data/projects.json', { cache: 'no-cache' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then((data) => render(data.projects || [], data.categories || {}))
      .catch((err) => {
        console.error('Réalisations indisponibles :', err);
        if (heroHost) hideHero();
        grids.forEach((g) => { g.innerHTML = '<p class="empty">Impossible de charger les réalisations pour le moment. Merci de réessayer dans un instant.</p>'; });
      });
  }

  function hideHero() {
    const visual = heroHost.closest('.hero__visual');
    if (visual) visual.hidden = true;
    const hero = heroHost.closest('.hero');
    if (hero) hero.classList.add('hero--solo');
  }

  function render(projects, categories) {
    /* Hero : la 1ʳᵉ réalisation de la liste */
    if (heroHost) {
      const p = projects[0];
      if (!p) {
        hideHero();
      } else {
        Object.assign(heroHost.dataset, {
          before: p.before, after: p.after,
          altBefore: p.altBefore || p.title + ' — avant', altAfter: p.altAfter || p.title + ' — après'
        });
        buildSlider(heroHost);
      }
    }

    grids.forEach((grid) => {
      const offset = Number(grid.dataset.offset || 0);
      const limit = Number(grid.dataset.limit || projects.length);
      const list = projects.slice(offset, offset + limit);

      if (!list.length) {
        const section = grid.closest('[data-hide-when-empty]');
        if (section) { section.hidden = true; return; }
        grid.innerHTML = '<p class="empty">Nos réalisations seront bientôt en ligne.</p>';
        return;
      }

      const frag = document.createDocumentFragment();
      list.forEach((p, i) => {
        const card = document.createElement('article');
        card.className = 'project reveal';
        card.dataset.category = p.category;
        card.style.setProperty('--d', (i % 3) * 90 + 'ms');
        card.innerHTML =
          `<div class="ba" data-before="${esc(p.before)}" data-after="${esc(p.after)}" data-alt-before="${esc(p.altBefore || p.title + ' — avant')}" data-alt-after="${esc(p.altAfter || p.title + ' — après')}"></div>` +
          '<div class="project__body">' +
            `<p class="project__cat">${esc(categories[p.category] || p.category)}</p>` +
            `<h3>${esc(p.title)}</h3>` +
            `<p class="project__desc">${esc(p.description)}</p>` +
            (p.tags && p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '') +
          '</div>';
        frag.appendChild(card);
      });
      grid.textContent = '';
      grid.appendChild(frag);
      $$('.ba[data-before]', grid).forEach(buildSlider);
      reveal($$('.reveal', grid));

      /* Filtres (page Réalisations) : uniquement les catégories présentes */
      const filters = grid.id ? $('#filters') : null;
      if (!filters) return;
      const present = Object.keys(categories).filter((k) => list.some((p) => p.category === k));
      if (present.length < 2) { filters.remove(); return; }
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
    });
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
