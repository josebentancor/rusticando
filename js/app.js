const PHONE = "59898923479";
const INSTAGRAM = "https://www.instagram.com/rusticando.uy/";
const waUrl = msg => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
const CATEGORIES = { ratona: 'Mesa ratona', barra: 'Barra · mesada', mesa: 'Mesa comedor · escritorio', rack: 'Rack', tabla: 'Tabla para picar' };
const PAGE = 9;   // pieces shown before "Ver más"

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only allow https URLs or relative paths inside the site; anything else (javascript:, data:) is dropped
const safeUrl = u => (u && (/^https:\/\//.test(u) || /^[\w./-]+$/.test(u))) ? u : '';

// WhatsApp links; product cards prefill the product name
function bindWhatsApp(root = document) {
  root.querySelectorAll('a.wa').forEach(a => {
    const card = a.closest('.pieza');
    const msg = a.dataset.msg || (card ? `¡Hola! Me interesa: ${card.querySelector('h3').textContent}. ¿Me pasan más info?` : '¡Hola Rusticando!');
    a.href = waUrl(msg);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  root.querySelectorAll('a.ig').forEach(a => { a.href = INSTAGRAM; a.target = '_blank'; a.rel = 'noopener noreferrer'; });
}

// Wood-grain fallback when a photo is missing
function bindPhotos(root = document) {
  root.querySelectorAll('.ph img').forEach(img => {
    const mark = () => img.closest('.ph').classList.add('missing');
    if (img.complete && !img.naturalWidth) mark();
    img.addEventListener('error', mark);
  });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
}

// Every photo and video of a piece, in order: the cover (video if it has one) and then the extras
function mediaList(p) {
  const img = safeUrl(p.image_url), video = safeUrl(p.video_url);
  const list = video ? [{ type: 'video', url: video, poster: img }] : img ? [{ type: 'image', url: img }] : [];
  for (const m of Array.isArray(p.extra) ? p.extra : []) {
    const url = safeUrl(m && m.url);
    if (url && (m.type === 'image' || m.type === 'video')) list.push({ type: m.type, url });
  }
  return list;
}

// Gallery: all the photos and videos of one piece
const lb = document.getElementById('lb');
const stage = lb.querySelector('.lb-stage');
let gallery = [], gi = 0, galleryName = '';
function showGallery() {
  const m = gallery[gi];
  stage.querySelector('video')?.pause();
  if (m.type === 'video') {
    const v = document.createElement('video');
    v.src = m.url; if (m.poster) v.poster = m.poster;
    v.controls = true; v.playsInline = true; v.autoplay = true; v.muted = true; v.loop = true;
    stage.replaceChildren(v);
  } else {
    const i = document.createElement('img');
    i.src = m.url; i.alt = galleryName;
    stage.replaceChildren(i);
  }
  lb.querySelector('.lb-cap').textContent = gallery.length > 1 ? `${galleryName} · ${gi + 1} de ${gallery.length}` : galleryName;
  lb.querySelectorAll('.lb-prev, .lb-next').forEach(b => { b.hidden = gallery.length < 2; });
}
function openGallery(p) {
  gallery = mediaList(p);
  if (!gallery.length) return;
  gi = 0; galleryName = p.name;
  showGallery();
  lb.showModal();
}
const step = d => { gi = (gi + d + gallery.length) % gallery.length; showGallery(); };
lb.querySelector('.lb-prev').addEventListener('click', () => step(-1));
lb.querySelector('.lb-next').addEventListener('click', () => step(1));
lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
lb.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); });
lb.addEventListener('close', () => { stage.querySelector('video')?.pause(); stage.replaceChildren(); });
// Swipe on phones
let sx = null;
stage.addEventListener('pointerdown', e => { sx = e.clientX; });
stage.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50 && gallery.length > 1) step(e.clientX < sx ? 1 : -1); sx = null; });

// Scroll reveal (content stays visible if the observer never fires)
let io;
function bindReveal(root = document) {
  const els = root.querySelectorAll('.reveal');
  if (!io) { els.forEach(el => el.classList.add('in')); return; }
  els.forEach(el => io.observe(el));
  setTimeout(() => els.forEach(el => el.classList.add('in')), 2500);
}
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('anim');
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
}

// ---------- Catalog ----------
const grid = document.getElementById('grid');
const moreBtn = document.getElementById('ver-mas');
let filter = 'all', expanded = false, pieces = [];

// Framing chosen in the panel: focus point (0-100 %) and zoom (1-3)
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const frameStyle = p => `--fx:${num(p.frame_x, 0, 100, 50)}%;--fy:${num(p.frame_y, 0, 100, 50)}%;--fz:${num(p.frame_zoom, 1, 3, 1)}`;

function cardHTML(p, i) {
  const img = safeUrl(p.image_url), video = safeUrl(p.video_url);
  const cat = p.category in CATEGORIES ? p.category : 'ratona';
  const total = mediaList(p).length;
  const badges = (video ? '<span class="badge">▶ Video</span>' : '') + (total > 1 ? `<span class="count">${total} fotos y videos</span>` : '');
  const inner = video
    ? `<video src="${esc(video)}"${img ? ` poster="${esc(img)}"` : ''} muted loop playsinline preload="none" aria-label="Video: ${esc(p.name)}"></video>`
    : `<img loading="lazy" src="${esc(img)}" alt="${esc(p.name)}">`;
  const media = `<button class="ph" type="button" data-i="${i}" style="${frameStyle(p)}" aria-label="Ver fotos de ${esc(p.name)}">${inner}${badges}</button>`;
  const specs = [p.wood, p.thickness, p.size, p.detail].filter(Boolean).map(esc).join(' · ');
  return `<article class="pieza reveal" data-cat="${cat}">
    ${media}
    <div class="pieza-body">
      <span class="cat">${CATEGORIES[cat]}</span>
      <h3>${esc(p.name)}</h3>
      ${specs ? `<p>${specs}</p>` : ''}
      <div class="pieza-foot"><span class="unica">Pieza única</span><a class="ask wa" href="#"><svg><use href="#i-wa"/></svg>Consultar</a></div>
    </div>
  </article>`;
}

// Show the filtered pieces, PAGE at a time until "Ver más" is pressed
function applyFilter() {
  let shown = 0, total = 0;
  grid.querySelectorAll('.pieza').forEach(card => {
    const match = filter === 'all' || card.dataset.cat === filter;
    if (match) total++;
    const visible = match && (expanded || shown < PAGE);
    if (visible) shown++;
    card.hidden = !visible;
  });
  moreBtn.hidden = expanded || total <= PAGE;
  moreBtn.textContent = `Ver las ${total} piezas`;
  playVisibleVideos();
}

// Catalog videos play only while on screen, to save data
const vio = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.hasAttribute('data-paused')) v.play().catch(() => {}); } else v.pause();
}), { threshold: .3 }) : null;
function playVisibleVideos() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  grid.querySelectorAll('video').forEach(v => vio ? vio.observe(v) : v.play().catch(() => {}));
}

function render(rows) {
  pieces = rows;
  grid.innerHTML = rows.map(cardHTML).join('');
  grid.querySelectorAll('.ph[data-i]').forEach(b => b.addEventListener('click', () => openGallery(pieces[b.dataset.i])));
  bindWhatsApp(grid); bindPhotos(grid); bindReveal(grid);
  applyFilter();
}

document.querySelectorAll('.chip[data-f]').forEach(c => c.addEventListener('click', () => {
  document.querySelectorAll('.chip[data-f]').forEach(x => x.setAttribute('aria-pressed', x === c));
  filter = c.dataset.f; expanded = false;
  applyFilter();
}));
// Hero category chips jump to the catalog with that filter
document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', () => {
  document.querySelector(`.chip[data-f="${a.dataset.go}"]`)?.click();
}));
moreBtn.addEventListener('click', () => { expanded = true; applyFilter(); });

// Supabase first; the bundled copy (js/catalogo.js) if it is not configured or does not answer
async function loadCatalog() {
  const cfg = window.RUSTICANDO_CONFIG || {};
  if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/products?select=*&visible=eq.true&order=sort.asc,created_at.desc`, {
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` }
      });
      if (!res.ok) throw new Error(res.status);
      const rows = await res.json();
      if (rows.length) return render(rows);
    } catch (e) {
      console.warn('Catálogo: se muestra la copia de respaldo', e);
    }
  }
  render(window.RUSTICANDO_CATALOGO || []);
}

bindWhatsApp(); bindPhotos(); bindReveal();
loadCatalog();
document.getElementById('y').textContent = new Date().getFullYear();
