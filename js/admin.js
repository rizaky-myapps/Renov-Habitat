/* ------------------------------------------------------------------
   Administration des réalisations avant/après.

   Fonctionnement : le site est hébergé sur GitHub Pages (fichiers fixes).
   Cette page enregistre donc les modifications directement dans le dépôt
   GitHub, via l'API Git, avec le code d'accès personnel de l'administrateur :
     - data/projects.json            la liste des réalisations
     - assets/img/projects/*.jpg     les photos (redimensionnées ici)
   Tout est écrit dans UN SEUL commit, puis GitHub Pages republie le site.
------------------------------------------------------------------- */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const CFG = (window.SITE && window.SITE.admin) || {};
  const API = CFG.apiBase || 'https://api.github.com';
  const TOKEN_KEY = 'rh_admin_token';
  const DATA_PATH = 'data/projects.json';
  const IMG_DIR = 'assets/img/projects/';
  const MAX_EDGE = 1600;
  const QUALITY = 0.82;
  const DEFAULT_CATEGORIES = {
    fenetres: 'Fenêtres', portes: 'Portes', escaliers: 'Escaliers',
    placards: 'Placards', cuisines: 'Cuisines', terrasses: 'Terrasses'
  };

  const state = {
    token: '',
    branch: CFG.branch || '',
    data: null,          // { categories, projects }
    order: null,         // ordre en attente d'enregistrement (liste d'identifiants)
    previews: new Map(), // chemin -> URL locale (photos envoyées, pas encore publiées)
    editId: null,
    deleteId: null,
    busy: false
  };

  /* ================= Utilitaires ================= */

  function h(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach((c) => { if (c != null) node.append(c); });
    return node;
  }

  const slugify = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'realisation';

  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');
  const src = (path) => state.previews.get(path) || '../' + path;
  const mimeOf = (p) => (/\.svg$/i.test(p) ? 'image/svg+xml' : /\.png$/i.test(p) ? 'image/png' : /\.webp$/i.test(p) ? 'image/webp' : 'image/jpeg');

  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const blobToB64 = async (blob) => bytesToB64(new Uint8Array(await blob.arrayBuffer()));
  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  /* Stockage du code d'accès : session par défaut, appareil si « rester connecté » */
  const store = {
    load() { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } },
    save(token, remember) {
      try {
        sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY);
        (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      } catch (_) { /* stockage indisponible : la session reste valable tant que l'onglet est ouvert */ }
    },
    clear() { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (_) {} }
  };

  /* ================= API GitHub ================= */

  class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  async function gh(path, opts = {}) {
    const method = opts.method || 'GET';
    // GitHub laisse le navigateur garder ses réponses GET 60 s : on ajoute un paramètre unique pour toujours
    // relire la version la plus récente (indispensable juste après une publication).
    const url = API + path + (method === 'GET' ? (path.includes('?') ? '&' : '?') + '_=' + Date.now() : '');
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: Object.assign(
          { Authorization: 'Bearer ' + state.token, Accept: opts.accept || 'application/vnd.github+json' },
          opts.body ? { 'Content-Type': 'application/json' } : {}
        ),
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (_) {
      throw new ApiError(0, 'network');
    }
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch (_) { /* corps non JSON */ }
      throw new ApiError(res.status, msg);
    }
    return opts.raw ? res : res.json();
  }

  const repo = () => `/repos/${encodeURIComponent(CFG.owner)}/${encodeURIComponent(CFG.repo)}`;
  const refPath = () => `heads/${encodePath(state.branch)}`;

  function describeError(e) {
    if (!(e instanceof ApiError)) return (e && e.message) || 'Une erreur inattendue est survenue.';
    switch (e.status) {
      case 0: return 'Connexion à GitHub impossible. Vérifiez votre connexion Internet.';
      case 401: return 'Code d’accès invalide ou expiré. Générez-en un nouveau (voir l’aide ci-dessous).';
      case 403:
        return e.message === 'no-push'
          ? 'Ce code d’accès n’a pas le droit de modifier le dépôt.'
          : 'Accès refusé par GitHub : le code doit avoir la permission « Contents : Read and write » sur ce dépôt (ou la limite d’appels est atteinte, réessayez dans quelques minutes).';
      case 404:
        return e.message === 'branch'
          ? `La branche « ${state.branch} » est introuvable : vérifiez le réglage « branch » dans js/config.js.`
          : 'Dépôt introuvable : ce code n’a pas accès au dépôt, ou le réglage « admin » de js/config.js est incorrect.';
      case 409:
      case 422: return 'Le site a été modifié en même temps ailleurs. Rechargez la page puis recommencez.';
      default: return `GitHub a répondu par une erreur (${e.status}). Réessayez dans un instant.`;
    }
  }

  async function headRef() {
    try {
      return (await gh(`${repo()}/git/ref/${refPath()}`)).object.sha;
    } catch (e) {
      if (e.status === 404) throw new ApiError(404, 'branch');
      throw e;
    }
  }

  const normalize = (d) => ({
    categories: (d && d.categories && Object.keys(d.categories).length) ? d.categories : { ...DEFAULT_CATEGORIES },
    projects: Array.isArray(d && d.projects) ? d.projects : []
  });

  async function readData() {
    try {
      const f = await gh(`${repo()}/contents/${DATA_PATH}?ref=${encodeURIComponent(state.branch)}`);
      return normalize(JSON.parse(b64ToText(f.content)));
    } catch (e) {
      if (e.status === 404) return normalize({});
      throw e;
    }
  }

  /* Un seul commit : blobs -> arbre -> commit -> mise à jour de la branche */
  async function commit(message, files, deletes) {
    const head = await headRef();
    const base = (await gh(`${repo()}/git/commits/${head}`)).tree.sha;

    if (deletes.length) { // ne supprime que les fichiers réellement présents
      const t = await gh(`${repo()}/git/trees/${base}?recursive=1`);
      const have = new Set(t.tree.map((x) => x.path));
      deletes = deletes.filter((p) => have.has(p));
    }

    const entries = [];
    for (const f of files) {
      const blob = await gh(`${repo()}/git/blobs`, {
        method: 'POST',
        body: f.base64 ? { content: f.base64, encoding: 'base64' } : { content: f.text, encoding: 'utf-8' }
      });
      entries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    deletes.forEach((path) => entries.push({ path, mode: '100644', type: 'blob', sha: null }));

    const tree = await gh(`${repo()}/git/trees`, { method: 'POST', body: { base_tree: base, tree: entries } });
    const c = await gh(`${repo()}/git/commits`, { method: 'POST', body: { message, tree: tree.sha, parents: [head] } });
    await gh(`${repo()}/git/refs/${refPath()}`, { method: 'PATCH', body: { sha: c.sha, force: false } });
    return c.sha;
  }

  /* Lecture-modification-écriture sur la version la plus récente du fichier de données */
  async function mutate(message, files, apply) {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      const fresh = await readData();
      const { data, deletes = [] } = apply(fresh);
      try {
        await commit(
          message,
          [...files, { path: DATA_PATH, text: JSON.stringify(data, null, 2) + '\n' }],
          deletes.filter(Boolean)
        );
        return data;
      } catch (e) {
        lastErr = e;
        if (!(e instanceof ApiError) || (e.status !== 409 && e.status !== 422)) throw e; // conflit : on relit et on réessaie
      }
    }
    throw lastErr;
  }

  /* ================= Photos ================= */

  async function processImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      throw new Error('Format non pris en charge : utilisez une photo JPEG, PNG ou WebP.');
    }
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (_) {
      try { bmp = await createImageBitmap(file); }
      catch (e) { throw new Error('Impossible de lire cette image.'); }
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const width = Math.max(1, Math.round(bmp.width * scale));
    const height = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bmp, 0, 0, width, height);
    if (bmp.close) bmp.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('Impossible de préparer cette image.');
    return { blob, width, height, url: URL.createObjectURL(blob) };
  }

  /* Si une photo n'est pas encore publiée (404), on la relit via l'API pour l'afficher quand même */
  function watchImages(root) {
    $$('img', root).forEach((img) => {
      img.addEventListener('error', async () => {
        const rel = img.getAttribute('src') || '';
        if (!rel.startsWith('../') || img.dataset.fallback) return;
        img.dataset.fallback = '1';
        try {
          const path = rel.slice(3);
          const res = await gh(`${repo()}/contents/${encodePath(path)}?ref=${encodeURIComponent(state.branch)}`, { accept: 'application/vnd.github.raw+json', raw: true });
          const url = URL.createObjectURL(new Blob([await res.blob()], { type: mimeOf(path) }));
          state.previews.set(path, url);
          img.src = url;
        } catch (_) { /* introuvable : on laisse le fond neutre */ }
      }, { once: true });
    });
  }

  /* ================= Vues ================= */

  const viewLogin = $('#view-login');
  const viewApp = $('#view-app');
  const btnLogout = $('#btn-logout');
  const loginError = $('#login-error');

  function showLogin(message = '') {
    viewApp.hidden = true; btnLogout.hidden = true; viewLogin.hidden = false;
    loginError.textContent = message;
    $('#token').focus();
  }
  function showApp() {
    viewLogin.hidden = true; viewApp.hidden = false; btnLogout.hidden = false;
    renderList();
  }
  function logout(message = '') {
    store.clear();
    state.token = ''; state.data = null; state.order = null;
    $('#token').value = '';
    $('#notice').hidden = true;
    showLogin(message);
  }
  function handleFailure(e, fallbackTarget) {
    if (e instanceof ApiError && e.status === 401) { logout(describeError(e)); return; }
    fallbackTarget(describeError(e));
  }

  function notice(kind, text, link) {
    const n = $('#notice');
    n.className = 'notice' + (kind === 'ok' ? '' : ` notice--${kind}`);
    n.replaceChildren(h('span', { text }), link ? h('a', { href: link.href, target: '_blank', rel: 'noopener', text: link.text }) : null);
    n.hidden = false;
  }
  const actionsLink = () => ({ href: `https://github.com/${CFG.owner}/${CFG.repo}/actions`, text: 'Suivre la mise en ligne' });
  const noticePublished = () => notice('ok', 'Enregistré. Le site sera à jour dans 1 à 2 minutes, le temps que GitHub le republie.', actionsLink());

  function setBusy(on) {
    state.busy = on;
    document.body.classList.toggle('is-busy', on);
    $('#edit-submit').disabled = on; $('#edit-cancel').disabled = on; $('#edit-close').disabled = on;
    $('#del-confirm').disabled = on; $('#del-cancel').disabled = on;
  }
  window.addEventListener('beforeunload', (e) => { if (state.busy) { e.preventDefault(); e.returnValue = ''; } });

  async function bootstrap() {
    if (!CFG.owner || !CFG.repo) throw new Error('Configuration manquante : renseignez le réglage « admin » dans js/config.js.');
    const info = await gh(repo());
    if (info.permissions && info.permissions.push === false) throw new ApiError(403, 'no-push');
    if (!state.branch) state.branch = info.default_branch;
    await headRef();
    state.data = await readData();
    state.order = null;
    showApp();
  }

  /* ---------- Connexion ---------- */
  $('#help-repo').textContent = CFG.repo || 'Renov-Habitat';

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = $('#token').value.trim();
    if (!token) { loginError.textContent = 'Collez votre code d’accès GitHub.'; return; }
    state.token = token;
    loginError.textContent = '';
    const btn = $('#login-submit');
    btn.disabled = true; btn.textContent = 'Connexion…';
    try {
      await bootstrap();
      store.save(token, $('#remember').checked);
      $('#token').value = '';
    } catch (err) {
      state.token = '';
      loginError.textContent = describeError(err);
    } finally {
      btn.disabled = false; btn.textContent = 'Se connecter';
    }
  });
  btnLogout.addEventListener('click', () => logout());

  /* ---------- Liste ---------- */
  const currentOrder = () => state.order || state.data.projects.map((p) => p.id);

  function renderList() {
    const list = $('#list');
    list.replaceChildren();
    const ids = currentOrder().slice();
    const known = new Set(ids);
    state.data.projects.forEach((p) => { if (!known.has(p.id)) ids.unshift(p.id); });
    const byId = new Map(state.data.projects.map((p) => [p.id, p]));
    const items = ids.map((id) => byId.get(id)).filter(Boolean);
    $('#list-empty').hidden = items.length > 0;
    items.forEach((p, i) => list.append(card(p, i, items.length)));
    const saved = state.data.projects.map((p) => p.id).join();
    $('#order-bar').hidden = !(state.order && state.order.join() !== saved);
  }

  function card(p, index, total) {
    const host = h('div', {
      dataset: {
        before: src(p.before), after: src(p.after), hint: 'false',
        altBefore: p.altBefore || `${p.title} — avant`, altAfter: p.altAfter || `${p.title} — après`
      }
    });
    window.RHSlider.build(host);
    watchImages(host);
    const cat = state.data.categories[p.category] || p.category;
    return h('article', { class: 'acard', 'data-id': p.id },
      h('div', { class: 'acard__media' },
        host,
        h('div', { class: 'acard__rank' }, h('span', { class: index === 0 ? 'is-feature' : '', text: index === 0 ? '1 · En haut de l’accueil' : String(index + 1) }))
      ),
      h('div', { class: 'acard__body' },
        h('p', { class: 'acard__cat', text: cat }),
        h('h2', { text: p.title }),
        h('p', { class: 'acard__desc', text: p.description }),
        h('div', { class: 'acard__actions' },
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Monter', title: 'Monter', text: '↑', disabled: index === 0, onclick: () => move(p.id, -1) }),
          h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Descendre', title: 'Descendre', text: '↓', disabled: index === total - 1, onclick: () => move(p.id, 1) }),
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Modifier', onclick: () => openEdit(p) }),
          h('button', { class: 'btn btn--danger btn--sm', type: 'button', text: 'Supprimer', onclick: () => openDelete(p) })
        )
      )
    );
  }

  function move(id, delta) {
    const order = currentOrder().slice();
    const i = order.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    state.order = order;
    renderList();
  }
  $('#order-cancel').addEventListener('click', () => { state.order = null; renderList(); });
  $('#order-save').addEventListener('click', async () => {
    if (state.busy) return;
    const wanted = new Map(state.order.map((id, i) => [id, i]));
    setBusy(true);
    notice('info', 'Enregistrement de l’ordre…');
    try {
      state.data = await mutate('Admin : nouvel ordre des réalisations', [], (data) => {
        data.projects.sort((a, b) => (wanted.has(a.id) ? wanted.get(a.id) : 1e6) - (wanted.has(b.id) ? wanted.get(b.id) : 1e6));
        return { data };
      });
      state.order = null;
      renderList();
      noticePublished();
    } catch (err) {
      handleFailure(err, (msg) => notice('error', msg));
    } finally { setBusy(false); }
  });

  /* ---------- Ajout / modification ---------- */
  const dlg = $('#dlg-edit');
  const form = $('#edit-form');
  const F = {
    title: $('#e-title'), cat: $('#e-cat'), newcat: $('#e-newcat'), newcatWrap: $('#e-newcat-wrap'),
    desc: $('#e-desc'), tags: $('#e-tags'), status: $('#e-status'), ratio: $('#e-ratio'), preview: $('#e-preview')
  };
  const picks = {};
  ['before', 'after'].forEach((side) => {
    const root = $(`.pick[data-side="${side}"]`);
    picks[side] = {
      root, input: $('input', root), drop: $('.drop', root), img: $('.drop__img', root),
      hint: $('.drop__hint strong', root), info: $('.pick__info', root), file: null, current: null
    };
  });

  const formStatus = (text, kind = '') => { F.status.textContent = text; F.status.className = 'form__status' + (kind ? ` is-${kind}` : ''); };

  function fillCategories(selected) {
    const entries = Object.entries(state.data.categories);
    F.cat.replaceChildren(
      ...entries.map(([k, label]) => h('option', { value: k, text: label })),
      h('option', { value: '__new', text: '+ Nouvelle catégorie…' })
    );
    F.cat.value = selected && state.data.categories[selected] ? selected : (entries[0] ? entries[0][0] : '__new');
    toggleNewCat(false);
  }
  function toggleNewCat(focus = true) {
    const isNew = F.cat.value === '__new';
    F.newcatWrap.hidden = !isNew;
    if (isNew && focus) F.newcat.focus();
  }
  F.cat.addEventListener('change', () => toggleNewCat());

  function showThumb(side) {
    const p = picks[side];
    const url = p.file ? p.file.url : (p.current ? src(p.current) : '');
    if (url) p.img.src = url; else p.img.removeAttribute('src');
    p.img.hidden = !url;
    p.drop.classList.toggle('has-img', !!url);
    p.hint.textContent = url ? 'Changer la photo' : 'Choisir une photo';
    if (url && !p.file) watchImages(p.drop);
  }

  function updatePreview() {
    const srcOf = (side) => (picks[side].file ? picks[side].file.url : (picks[side].current ? src(picks[side].current) : null));
    const before = srcOf('before'), after = srcOf('after');
    F.preview.replaceChildren();
    F.ratio.hidden = true;
    if (!before || !after) {
      F.preview.append(h('p', { class: 'muted', text: 'Ajoutez les deux photos pour voir l’aperçu du comparateur.' }));
      return;
    }
    const host = h('div', { dataset: { before, after, altBefore: 'Photo avant', altAfter: 'Photo après', hint: 'false', eager: 'true' } });
    F.preview.append(host);
    window.RHSlider.build(host);
    watchImages(host);
    const imgs = $$('img', host);
    Promise.all(imgs.map((i) => i.decode().catch(() => null))).then(() => {
      if (!host.isConnected) return;
      const [a, b] = imgs.map((i) => i.naturalWidth / i.naturalHeight);
      F.ratio.hidden = !(a && b && Math.abs(a - b) / Math.max(a, b) > 0.05);
    });
  }

  async function handleFile(side, file) {
    if (!file) return;
    const p = picks[side];
    p.info.className = 'pick__info';
    p.info.textContent = 'Traitement de la photo…';
    try {
      p.file = await processImage(file);
      p.info.textContent = `${p.file.width} × ${p.file.height} px · ${Math.max(1, Math.round(p.file.blob.size / 1024))} Ko`;
      showThumb(side);
      updatePreview();
    } catch (err) {
      p.info.textContent = err.message;
      p.info.classList.add('is-error');
    }
  }

  ['before', 'after'].forEach((side) => {
    const p = picks[side];
    p.input.addEventListener('change', () => { handleFile(side, p.input.files[0]); p.input.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => p.drop.addEventListener(t, (e) => { e.preventDefault(); p.drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => p.drop.addEventListener(t, (e) => { e.preventDefault(); p.drop.classList.remove('is-over'); }));
    p.drop.addEventListener('drop', (e) => handleFile(side, e.dataTransfer && e.dataTransfer.files[0]));
  });

  function openEdit(project) {
    state.editId = project ? project.id : null;
    $('#edit-title').textContent = project ? 'Modifier la réalisation' : 'Nouvelle réalisation';
    $('#edit-submit').textContent = project ? 'Enregistrer' : 'Publier';
    fillCategories(project && project.category);
    F.title.value = project ? project.title : '';
    F.desc.value = project ? project.description : '';
    F.tags.value = project && project.tags ? project.tags.join(', ') : '';
    F.newcat.value = '';
    formStatus('');
    ['before', 'after'].forEach((side) => {
      const p = picks[side];
      p.file = null;
      p.current = project ? project[side] : null;
      p.info.className = 'pick__info';
      p.info.textContent = project ? 'Photo actuelle. Choisissez-en une autre pour la remplacer.' : '';
      showThumb(side);
    });
    updatePreview();
    dlg.showModal();
    F.title.focus();
  }

  const closeEdit = () => { if (!state.busy) dlg.close(); };
  $('#btn-add').addEventListener('click', () => openEdit(null));
  $('#edit-cancel').addEventListener('click', closeEdit);
  $('#edit-close').addEventListener('click', closeEdit);
  dlg.addEventListener('cancel', (e) => { if (state.busy) e.preventDefault(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.busy) return;

    const title = F.title.value.trim();
    const description = F.desc.value.trim();
    let category = F.cat.value;
    let newCategoryLabel = '';
    if (category === '__new') {
      newCategoryLabel = F.newcat.value.trim();
      if (!newCategoryLabel) return formStatus('Indiquez le nom de la nouvelle catégorie.', 'error');
      category = slugify(newCategoryLabel);
    }
    if (!title) return formStatus('Indiquez un titre.', 'error');
    if (!description) return formStatus('Ajoutez une courte description.', 'error');
    for (const side of ['before', 'after']) {
      if (!picks[side].file && !(state.editId && picks[side].current)) {
        return formStatus(`Ajoutez la photo ${side === 'before' ? 'avant' : 'après'}.`, 'error');
      }
    }
    const tags = F.tags.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8);

    setBusy(true);
    formStatus('Préparation des photos…');
    try {
      const editing = !!state.editId;
      const stamp = Date.now().toString(36);
      const id = state.editId || `${slugify(title)}-${stamp}`;
      const files = [];
      const newPaths = {};
      for (const side of ['before', 'after']) {
        const f = picks[side].file;
        if (!f) continue;
        // Nouveau : l'identifiant est déjà unique. Remplacement : suffixe pour ne pas servir l'ancienne photo en cache.
        const path = `${IMG_DIR}${id}-${side === 'before' ? 'avant' : 'apres'}${editing ? '-' + stamp : ''}.jpg`;
        files.push({ path, base64: await blobToB64(f.blob) });
        newPaths[side] = path;
      }

      formStatus('Envoi à GitHub…');
      const data = await mutate(
        `Admin : ${editing ? 'modification' : 'ajout'} de la réalisation « ${title} »`,
        files,
        (fresh) => {
          const deletes = [];
          if (newCategoryLabel && !fresh.categories[category]) fresh.categories[category] = newCategoryLabel;
          const alts = { altBefore: `${title} — avant`, altAfter: `${title} — après` };
          if (editing) {
            const p = fresh.projects.find((x) => x.id === id);
            if (!p) throw new Error('Cette réalisation a été supprimée entre-temps.');
            ['before', 'after'].forEach((side) => { if (newPaths[side]) { deletes.push(p[side]); p[side] = newPaths[side]; } });
            Object.assign(p, { category, title, description, tags }, alts);
          } else {
            fresh.projects.unshift({ id, category, title, description, tags, before: newPaths.before, after: newPaths.after, ...alts });
          }
          return { data: fresh, deletes };
        }
      );

      ['before', 'after'].forEach((side) => { if (newPaths[side]) state.previews.set(newPaths[side], picks[side].file.url); });
      state.data = data;
      renderList();
      dlg.close();
      noticePublished();
    } catch (err) {
      handleFailure(err, (msg) => formStatus(msg, 'error'));
      if (state.token) dlg.scrollTo({ top: dlg.scrollHeight, behavior: 'smooth' });
    } finally {
      setBusy(false);
      if (!state.token && dlg.open) dlg.close();
    }
  });

  /* ---------- Suppression ---------- */
  const dlgDel = $('#dlg-delete');
  const delStatus = $('#del-status');

  function openDelete(p) {
    state.deleteId = p.id;
    $('#del-name').textContent = p.title;
    delStatus.textContent = ''; delStatus.className = 'form__status';
    dlgDel.showModal();
  }
  $('#del-cancel').addEventListener('click', () => { if (!state.busy) dlgDel.close(); });
  dlgDel.addEventListener('cancel', (e) => { if (state.busy) e.preventDefault(); });
  $('#del-confirm').addEventListener('click', async () => {
    if (state.busy) return;
    const id = state.deleteId;
    const title = $('#del-name').textContent;
    setBusy(true);
    delStatus.className = 'form__status'; delStatus.textContent = 'Suppression en cours…';
    try {
      state.data = await mutate(`Admin : suppression de la réalisation « ${title} »`, [], (data) => {
        const i = data.projects.findIndex((p) => p.id === id);
        if (i < 0) return { data };
        const [p] = data.projects.splice(i, 1);
        return { data, deletes: [p.before, p.after] };
      });
      if (state.order) state.order = state.order.filter((x) => x !== id);
      renderList();
      dlgDel.close();
      noticePublished();
    } catch (err) {
      handleFailure(err, (msg) => { delStatus.textContent = msg; delStatus.classList.add('is-error'); });
    } finally {
      setBusy(false);
      if (!state.token && dlgDel.open) dlgDel.close();
    }
  });

  /* ---------- Démarrage : reconnexion automatique si un code est mémorisé ---------- */
  const saved = store.load();
  if (saved) {
    state.token = saved;
    bootstrap().catch((err) => { state.token = ''; store.clear(); showLogin(describeError(err)); });
  } else {
    showLogin();
  }
})();
