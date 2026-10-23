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

// Lightbox for photos
const lb = document.getElementById('lb');
function bindLightbox(root = document) {
  root.querySelectorAll('.pieza button.ph').forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('missing')) return;
    const img = btn.querySelector('img');
    lb.querySelector('img').src = img.src;
    lb.querySelector('img').alt = img.alt;
    lb.querySelector('p').textContent = btn.closest('.pieza').querySelector('h3').textContent;
    lb.showModal();
  }));
}
lb.addEventListener('click', e => { if (e.target !== lb.querySelector('img')) lb.close(); });

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
let filter = 'all', expanded = false;

function cardHTML(p) {
  const img = safeUrl(p.image_url), video = safeUrl(p.video_url);
  const cat = p.category in CATEGORIES ? p.category : 'ratona';
  const media = video
    ? `<div class="ph"><video src="${esc(video)}"${img ? ` poster="${esc(img)}"` : ''} muted loop playsinline preload="none" aria-label="Video: ${esc(p.name)}"></video><span class="badge">▶ Video</span></div>`
    : `<button class="ph" type="button"><img loading="lazy" src="${esc(img)}" alt="${esc(p.name)}"></button>`;
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
  grid.innerHTML = rows.map(cardHTML).join('');
  bindWhatsApp(grid); bindPhotos(grid); bindLightbox(grid); bindReveal(grid);
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
