/* ================= KRNO digital catalog — app ================= */
'use strict';

/* ---------- CONFIG: edit these before sharing ---------- */
const CONFIG = {
  // Put your WhatsApp business number in international format without '+' (e.g. '201234567890')
  // Leave empty to send inquiries to the Facebook page instead.
  whatsapp: '',
  facebook: 'https://www.facebook.com/KRNOPack',
  website: 'https://www.krnopack.com',
};

const DATA = window.KRNO_DATA;
const PRODUCTS = DATA.products;
let KS = null;

/* ---------- i18n ---------- */
const I18N = {
  en: {
    qr: 'QR', inquire: 'Inquire', version: 'Version 2026 · PET / PP / PS',
    heroTitle: 'Every product we make,<br><em>one scan away.</em>',
    heroSub: 'The complete KRNO packaging catalog — rebuilt as a fast, searchable digital experience for your clients. No PDFs, no attachments.',
    browse: 'Browse the catalog', showQr: 'Show catalog QR',
    sections: 'Product Sections', sectionsSub: 'Four families, one standard of quality.',
    specs: 'Technical Specifications', inquireWa: 'Inquire on WhatsApp', inquireFb: 'Inquire on Facebook',
    qrBtn: 'Product QR', copyLink: 'Copy link', printCard: 'Print card', share: 'Share',
    dlPng: 'Download PNG', dlSvg: 'Download SVG',
    qrHint: 'This QR always points to the live catalog — host this folder on your domain and the same QR keeps working forever.',
    more: 'Show more', noResults: 'No products match your search.', clear: 'Clear filters',
    sortCode: 'Sort: Code', sortTitle: 'Sort: Name',
    website: 'Website', location: 'Location', fTag: 'Your partner in industrial packaging excellence',
    rights: 'All rights reserved', scan: 'Scan to open',
    searchPh: 'Search by code, name or category…', all: 'All products',
    allShort: 'All', products: 'products', copied: 'Link copied to clipboard',
    catalogQr: 'Catalog QR', productQr: 'Product QR',
    secNames: { 'CUPS': 'Cups', 'CONTAINERS': 'Containers', 'TABLEWARE': 'Tableware', 'FOAM RANGE': 'Foam Range' },
    secSub: { 'CUPS': 'Beverage, sweet & sauce cups + lids', 'CONTAINERS': 'Hinged, round, rectangular & specialty', 'TABLEWARE': 'Plates, trays, bowls & cutlery', 'FOAM RANGE': 'Foam plates & boxes' },
    matAll: 'All materials', langBtn: 'عربي',
    statProducts: 'Products', statSections: 'Sections', statGroups: 'Categories', statVersion: 'Version',
    title: 'KRNO — Product Catalog 2026 | Premium Packaging Solutions',
  },
  ar: {
    qr: 'QR', inquire: 'تواصل', version: 'إصدار 2026 · PET / PP / PS',
    heroTitle: 'كل منتج نصنعه…<br><em>على بُعد مسح واحد.</em>',
    heroSub: 'كتالوج KRNO الكامل للتعبئة والتغليف — نسخة رقمية سريعة وقابلة للبحث تبعتها لعملائك بدل مرفقات الـ PDF.',
    browse: 'تصفّح الكتالوج', showQr: 'اعرض QR الكتالوج',
    sections: 'أقسام المنتجات', sectionsSub: 'أربع عائلات من المنتجات… ومعيار جودة واحد.',
    specs: 'المواصفات الفنية', inquireWa: 'استفسر عبر واتساب', inquireFb: 'استفسر عبر فيسبوك',
    qrBtn: 'QR المنتج', copyLink: 'انسخ الرابط', printCard: 'اطبع كارت', share: 'مشاركة',
    dlPng: 'تحميل PNG', dlSvg: 'تحميل SVG',
    qrHint: 'الـ QR بيشير دايمًا للنسخة اللايف του الكتالوج — ارفع المجلد ده على الدومين بتاعك ونفس الـ QR يفضل شغال على طول.',
    more: 'عرض المزيد', noResults: 'مفيش منتجات مطابقة لبحثك.', clear: 'مسح الفلاتر',
    sortCode: 'ترتيب: الكود', sortTitle: 'ترتيب: الاسم',
    website: 'الموقع', location: 'الموقع الجغرافي', fTag: 'شريكك في تميّز التعبئة والتغليف الصناعي',
    rights: 'كل الحقوق محفوظة', scan: 'امسح للكود',
    searchPh: 'ابحث بالكود أو الاسم أو الفئة…', all: 'كل المنتجات',
    allShort: 'الكل', products: 'منتج', copied: 'تم نسخ الرابط',
    catalogQr: 'QR الكتالوج', productQr: 'QR المنتج',
    secNames: { 'CUPS': 'الأكواب', 'CONTAINERS': 'العبوات', 'TABLEWARE': 'أدوات المائدة', 'FOAM RANGE': 'خط الفوم' },
    secSub: { 'CUPS': 'أكواب مشروبات وحلويات وصلصة + أغطية', 'CONTAINERS': 'مفصلية ومستديرة ومستطيلة وخاصة', 'TABLEWARE': 'أطباق وصواني وطبقات وأدوات مائدة', 'FOAM RANGE': 'أطباق وعلب فوم' },
    matAll: 'كل الخامات', langBtn: 'EN',
    statProducts: 'منتج', statSections: 'أقسام', statGroups: 'فئة', statVersion: 'إصدار',
    title: 'KRNO — كتالوج المنتجات 2026 | حلول تعبئة وتغليف مميزة',
  },
};
let lang = localStorage.getItem('krno_lang') || 'en';
const t = (k) => (I18N[lang][k] ?? I18N.en[k] ?? k);

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dash = (v) => (!v || /^-+$/.test(v.trim()) ? '—' : v);
const secName = (s) => (I18N[lang].secNames[s] || s);
const GROUPS_BY_SEC = DATA.sections;
const slugOf = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const baseUrl = () => location.href.split('#')[0];
const productUrl = (id) => baseUrl() + '#/p/' + encodeURIComponent(id);

/* ---------- state ---------- */
const state = { q: '', section: null, group: null, mat: 'ALL', sort: 'code', shown: 60, product: null, baseHash: '#/catalog', echo: [] };
const MATS = ['ALL', 'PET', 'PP', 'PS', 'FOAM'];

/* ---------- QR ---------- */
function qrSvg(text, modules) {
  const qr = qrcode(0, 'M');
  qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 4, size = n + q * 2;
  let rects = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (qr.isDark(r, c)) rects += `<rect x="${c + q}" y="${r + q}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#141a3d">${rects}</g></svg>`;
}
function downloadQrPng(text, fname) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 4, sc = 12, size = (n + q * 2) * sc;
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, size, size);
  cx.fillStyle = '#141a3d';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (qr.isDark(r, c)) cx.fillRect((c + q) * sc, (r + q) * sc, sc, sc);
  cv.toBlob((b) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}
function downloadQrSvg(text, fname) {
  const blob = new Blob([qrSvg(text)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}


/* ---------- filtering ---------- */
function matMatch(p, mat) {
  if (mat === 'ALL') return true;
  const m = (p.material || '').toUpperCase();
  if (mat === 'FOAM') return m.includes('FOAM');
  return m.includes(mat);
}
function filtered() {
  const qt = state.q.trim();
  const ex = qt ? KS.expand(qt) : { groups: [], echo: [] };
  state.echo = ex.echo;
  const groups = ex.groups;
  let list = PRODUCTS.filter((p) =>
    (!state.section || p.section === state.section) &&
    (!state.group || p.group === state.group) &&
    matMatch(p, state.mat) &&
    (!groups.length || groups.every((g) => g.some((term) => KS.hay(p).includes(term))))
  );
  list.sort((a, b) => (state.sort === 'code' ? a.code.localeCompare(b.code) : a.title.localeCompare(b.title)));
  return list;
}

/* ---------- static renders ---------- */
function renderHeroStats() {
  const groups = GROUPS_BY_SEC ? Object.values(GROUPS_BY_SEC).reduce((n, g) => n + g.length, 0) : 0;
  $('#heroStats').innerHTML = `
    <div class="hstat"><b>${PRODUCTS.length}+</b><span>${t('statProducts')}</span></div>
    <div class="hstat"><b>${Object.keys(GROUPS_BY_SEC).length}</b><span>${t('statSections')}</span></div>
    <div class="hstat"><b>${groups}</b><span>${t('statGroups')}</span></div>
    <div class="hstat"><b>2026</b><span>${t('statVersion')}</span></div>`;
}
function renderSecCards() {
  const icons = {
    'CUPS': '<path d="M6 2h12l-1.5 20h-9L6 2Zm2.2 2 1.2 16h5.2l1.2-16H8.2Z"/>',
    'CONTAINERS': '<path d="M3 8h18v3H3V8Zm1 5h16v8H4v-8Zm3-9h10l1 2H6l1-2Z"/>',
    'TABLEWARE': '<path d="M7 2v8a3 3 0 0 0 2 2.8V22h2V12.8A3 3 0 0 0 13 10V2h-1.5v7H10V2H8.5v7H7V2H7Zm9 0c-2 0-3 3-3 7 0 3 1 4 2 4v9h2V2h-1Z"/>',
    'FOAM RANGE': '<path d="M4 10h16v3H4v-3Zm1 5h14v5H5v-5Zm2-9h10l2 2H5l2-2Z"/>',
  };
  $('#secCards').innerHTML = Object.entries(GROUPS_BY_SEC).map(([sec, groups]) => {
    const n = groups.reduce((s, g) => s + g.count, 0);
    return `<a class="sec-card" href="#/s/${encodeURIComponent(sec)}">
      <svg class="sc-mark" viewBox="0 0 24 24" fill="#0fb8c9">${icons[sec] || icons['CONTAINERS']}</svg>
      <div><h3>${esc(secName(sec))}</h3><p>${esc(t('secSub')[sec] || '')}</p></div>
      <span class="sc-count">${n} ${t('products')}</span></a>`;
  }).join('');
}
function renderSidebar() {
  const sb = $('#sidebar');
  const activeAll = !state.section;
  let html = `<button class="sb-all ${activeAll ? 'active' : ''}" data-nav="all">${t('all')} <span class="n">${PRODUCTS.length}</span></button>`;
  for (const [sec, groups] of Object.entries(GROUPS_BY_SEC)) {
    const open = state.section === sec;
    const n = groups.reduce((s, g) => s + g.count, 0);
    html += `<div class="sb-sec ${open ? 'open' : ''}" data-sec="${esc(sec)}">
      <button class="sb-sec-btn" data-toggle="${esc(sec)}">${esc(secName(sec))} · ${n} <span class="car">▶</span></button>
      <div class="sb-groups">
        <button class="sb-group ${open && !state.group ? 'active' : ''}" data-nav="s:${esc(sec)}">${t('allShort')} <span class="n">${n}</span></button>
        ${groups.map((g) => `<button class="sb-group ${state.group === g.name ? 'active' : ''}" data-nav="g:${esc(sec)}:${esc(g.slug)}">${esc(g.name)} <span class="n">${g.count}</span></button>`).join('')}
      </div></div>`;
  }
  sb.innerHTML = html;
}
function renderChips() {
  $('#matChips').innerHTML = MATS.map((m) =>
    `<button class="mat-chip ${state.mat === m ? 'active' : ''}" data-mat="${m}">${m === 'ALL' ? t('matAll') : m}</button>`).join('');
}

/* ---------- grid ---------- */
function cardHtml(p) {
  return `<article class="p-card" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(p.title)}">
    <div class="thumb">
      <span class="code-chip">${esc(p.code)}</span>
      <span class="mat-chip-mini">${esc(p.material || '')}</span>
      <img src="${esc(p.img ? p.img.replace('.jpg', '-t.jpg') : '')}" alt="${esc(p.title)}" loading="lazy" decoding="async">
    </div>
    <div class="body">
      <span class="grp">${esc(p.group)}</span>
      <h3>${esc(p.title)}</h3>
      <div class="meta">${dash(p.capacity) !== '—' ? `<span>${esc(dash(p.capacity))}</span>` : ''}<span>${esc(p.section)}</span></div>
    </div></article>`;
}
function renderGrid(reset) {
  const list = filtered();
  if (reset) state.shown = 60;
  const grid = $('#grid');
  grid.innerHTML = list.slice(0, state.shown).map(cardHtml).join('');
  $('#catCount').textContent = list.length;
  const title = state.group ? state.group : state.section ? secName(state.section) : t('all');
  $('#catTitle').textContent = title;
  const echo = $('#searchEcho');
  if (state.echo && state.echo.length && state.q.trim()) {
    echo.hidden = false;
    echo.innerHTML = state.echo.map(([a, b]) => `<span class="se-item">${esc(a)} → <b>${esc(b)}</b></span>`).join('');
  } else echo.hidden = true;
  $('#moreRow').hidden = list.length <= state.shown;
  $('#emptyState').hidden = list.length > 0;
}

/* ---------- views / routing ---------- */
function showView(name) {
  $('#homeHero').hidden = name !== 'home';
  $('.sections-strip').hidden = name !== 'home';
  $('#catalogView').hidden = name !== 'catalog';
}
function parseHash() {
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'p' && parts[1]) return { view: 'product', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 's' && parts[1]) return { view: 'catalog', section: decodeURIComponent(parts[1]), group: null };
  if (parts[0] === 'g' && parts[1] && parts[2]) return { view: 'catalog', section: decodeURIComponent(parts[1]), group: null, groupSlug: decodeURIComponent(parts[2]) };
  if (parts[0] === 'catalog') return { view: 'catalog', section: null, group: null };
  return { view: 'home' };
}
function route() {
  const r = parseHash();
  if (r.view === 'product') {
    const p = PRODUCTS.find((x) => x.id === r.id);
    if (p) { openProduct(p); return; }
  }
  closeProduct();
  if (r.view === 'home') {
    state.section = state.group = null;
    showView('home');
    window.scrollTo({ top: 0 });
    return;
  }
  state.section = r.section || null;
  state.group = null;
  if (r.groupSlug && r.section) {
    const g = (GROUPS_BY_SEC[r.section] || []).find((x) => x.slug === r.groupSlug);
    if (g) state.group = g.name;
  }
  state.baseHash = location.hash;
  showView('catalog');
  renderSidebar(); renderChips(); renderGrid(true);
}

/* ---------- product modal ---------- */
function openProduct(p) {
  state.product = p;
  $('#pImg').src = p.img || '';
  $('#pImg').alt = p.title;
  $('#pCodeChip').textContent = p.code;
  $('#pCrumb').textContent = `${secName(p.section)}  ›  ${p.group}`;
  $('#pTitle').textContent = p.title;
  $('#pBadges').innerHTML =
    `<span>${esc(p.code)}</span>` +
    (p.material ? `<span class="alt">${esc(p.material)}</span>` : '') +
    (dash(p.capacity) !== '—' ? `<span class="alt">${esc(p.capacity)}</span>` : '');
  $('#pSpecs').innerHTML = p.specs.map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>${esc(dash(v))}</td></tr>`).join('');
  const msg = encodeURIComponent(`Hello KRNO! I'm interested in: ${p.code} — ${p.title} (${productUrl(p.id)})`);
  const wa = $('#pWa');
  if (CONFIG.whatsapp) {
    wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${msg}`;
    wa.querySelector('span').textContent = t('inquireWa');
  } else {
    wa.href = `${CONFIG.facebook}?text=${msg}`;
    wa.querySelector('span').textContent = t('inquireFb');
  }
  $('#pModal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeProduct() {
  if (!state.product) return;
  state.product = null;
  $('#pModal').hidden = true;
  document.body.style.overflow = '';
}

/* ---------- QR modals ---------- */
let qrContext = null; // {url,title,file}
function openQr(url, title) {
  qrContext = { url, title, file: 'krno-qr-' + (url.includes('#/p/') ? url.split('#/p/')[1] : 'catalog') };
  $('#qrBox').innerHTML = qrSvg(url);
  $('#qrTitle').textContent = title;
  $('#qrUrl').textContent = url;
  $('#qrModal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeQr() { $('#qrModal').hidden = true; if (!state.product) document.body.style.overflow = ''; }

/* ---------- print card ---------- */
function printCard(ctx) {
  const pc = $('#printCard');
  if (ctx.product) {
    const p = ctx.product;
    $('#pcTitle').textContent = `${p.code} — ${p.title}`;
    $('#pcSub').textContent = `${secName(p.section)} › ${p.group}`;
    $('#pcSpecs').innerHTML = p.specs.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(dash(v))}</td></tr>`).join('');
    $('#pcQr').innerHTML = qrSvg(productUrl(p.id));
  } else {
    $('#pcTitle').textContent = lang === 'ar' ? 'كتالوج منتجات KRNO 2026' : 'KRNO Product Catalog 2026';
    $('#pcSub').textContent = lang === 'ar' ? 'حلول تعبئة وتغليف صناعية مميزة' : 'Premium industrial packaging solutions';
    $('#pcSpecs').innerHTML = Object.entries(GROUPS_BY_SEC).map(([s, g]) =>
      `<tr><td>${esc(secName(s))}</td><td>${g.reduce((n, x) => n + x.count, 0)} ${t('products')}</td></tr>`).join('');
    $('#pcQr').innerHTML = qrSvg(baseUrl());
  }
  setTimeout(() => window.print(), 60);
}

/* ---------- i18n apply ---------- */
function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (v != null) el.innerHTML = v;
  });
  $('#q').placeholder = t('searchPh');
  $('#langBtn').textContent = t('langBtn');
  renderHeroStats(); renderSecCards();
}

/* ---------- events ---------- */
function bind() {
  $('#langBtn').onclick = () => { lang = lang === 'en' ? 'ar' : 'en'; localStorage.setItem('krno_lang', lang); applyLang(); route(); };
  $('#qrBtn').onclick = $('#heroQr').onclick = () => openQr(baseUrl(), t('catalogQr'));
  let deb;
  $('#q').oninput = (e) => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      state.q = e.target.value;
      if (state.q && parseHash().view === 'home') { location.hash = '#/catalog'; }
      else if (parseHash().view === 'catalog') renderGrid(true);
      else { location.hash = '#/catalog'; }
    }, 130);
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape') { closeQr(); closeProduct(); }
  });
  $('#sidebar').onclick = (e) => {
    const tog = e.target.closest('[data-toggle]');
    if (tog) { tog.parentElement.classList.toggle('open'); return; }
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    const v = nav.dataset.nav;
    if (v === 'all') location.hash = '#/catalog';
    else if (v.startsWith('s:')) location.hash = '#/s/' + encodeURIComponent(v.slice(2));
    else if (v.startsWith('g:')) {
      const [, sec, slug] = v.split(':');
      location.hash = `#/g/${encodeURIComponent(sec)}/${encodeURIComponent(slug)}`;
    }
  };
  $('#matChips').onclick = (e) => {
    const c = e.target.closest('[data-mat]'); if (!c) return;
    state.mat = c.dataset.mat; renderChips(); renderGrid(true);
  };
  $('#sortSel').onchange = (e) => { state.sort = e.target.value; renderGrid(true); };
  $('#moreBtn').onclick = () => { state.shown += 60; renderGrid(false); };
  $('#clearBtn').onclick = () => { state.q = ''; $('#q').value = ''; state.mat = 'ALL'; renderChips(); renderGrid(true); };
  $('#grid').onclick = (e) => {
    const card = e.target.closest('.p-card'); if (!card) return;
    location.hash = '#/p/' + encodeURIComponent(card.dataset.id);
  };
  $('#grid').onkeydown = (e) => {
    if (e.key === 'Enter') { const card = e.target.closest('.p-card'); if (card) location.hash = '#/p/' + encodeURIComponent(card.dataset.id); }
  };
  document.querySelectorAll('[data-close]').forEach((el) => el.onclick = () => {
    if (!$('#qrModal').hidden) closeQr();
    else { closeProduct(); history.back(); }
  });
  $('#pQr').onclick = () => openQr(productUrl(state.product.id), `${t('productQr')} — ${state.product.code}`);
  $('#pCopy').onclick = () => {
    const url = productUrl(state.product.id);
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
      .then(() => toast(t('copied')))
      .catch(() => { const i = document.createElement('input'); i.value = url; document.body.appendChild(i); i.select(); document.execCommand('copy'); i.remove(); toast(t('copied')); });
  };
  $('#pShare').onclick = () => {
    const p = state.product; const url = productUrl(p.id);
    const msg = `KRNO — ${p.code} — ${p.title}\n${url}`;
    if (navigator.share) { navigator.share({ title: p.title, text: msg, url }).catch(() => {}); }
    else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };
  $('#pPrint').onclick = () => printCard({ product: state.product });
  $('#qrPng').onclick = () => downloadQrPng(qrContext.url, qrContext.file + '.png');
  $('#qrSvg').onclick = () => downloadQrSvg(qrContext.url, qrContext.file + '.svg');
  $('#qrPrint').onclick = () => printCard({ product: state.product });
  window.addEventListener('hashchange', route);
}

/* ---------- init ---------- */
KS = window.KrnoSearch.build(PRODUCTS);
applyLang();
bind();
route();
