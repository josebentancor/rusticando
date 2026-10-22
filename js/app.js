const PHONE = "59898923479";
const waUrl = msg => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
const CATEGORIES = { ratona: 'Mesa ratona', barra: 'Barra · mesada', rack: 'Rack TV', mesa: 'Mesa', otro: 'Pieza' };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Only allow http(s) URLs or relative paths inside the site; anything else (javascript:, data:) is dropped
const safeUrl = u => (u && (/^https:\/\//.test(u) || /^[\w./-]+$/.test(u))) ? u : '';

// WhatsApp links; product tags prefill the product name
function bindWhatsApp(root = document) {
  root.querySelectorAll('a.wa').forEach(a => {
    const tag = a.closest('.tag');
    const msg = a.dataset.msg || (tag ? `¡Hola! Me interesa: ${tag.querySelector('h3').textContent}. ¿Me pasan más info?` : '¡Hola Rusticando!');
    a.href = waUrl(msg);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

// Wood-grain fallback when a photo is missing
function bindPhotos(root = document) {
  root.querySelectorAll('.ph img').forEach(img => {
    const mark = () => img.closest('.ph').classList.add('missing');
    if (img.complete && !img.naturalWidth) mark();
    img.addEventListener('error', mark);
  });
  // Respect reduced motion for catalog videos
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
}

// Lightbox
const lb = document.getElementById('lb');
function bindLightbox(root = document) {
  root.querySelectorAll('.tag button.ph').forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('missing')) return;
    const img = btn.querySelector('img');
    lb.querySelector('img').src = img.src;
    lb.querySelector('img').alt = img.alt;
    lb.querySelector('p').textContent = btn.closest('.tag').querySelector('h3').textContent;
    lb.showModal();
  }));
}
lb.addEventListener('click', e => { if (e.target !== lb.querySelector('img')) lb.close(); });

// Catalog filters
const chips = document.querySelectorAll('.chip');
function applyFilter(f) {
  document.querySelectorAll('#grid .tag').forEach(tag => {
    tag.hidden = f !== 'all' && tag.dataset.cat !== f;
  });
}
chips.forEach(c => c.addEventListener('click', () => {
  chips.forEach(x => x.setAttribute('aria-pressed', x === c));
  applyFilter(c.dataset.f);
}));

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

// One catalog card, same markup as the static ones. Every value is escaped.
function cardHTML(p, i) {
  const num = 'N.º ' + String(i + 1).padStart(3, '0');
  const img = safeUrl(p.image_url), video = safeUrl(p.video_url);
  const media = video
    ? `<div class="ph"><video src="${esc(video)}"${img ? ` poster="${esc(img)}"` : ''} autoplay muted loop playsinline preload="metadata" aria-label="Video: ${esc(p.name)}"></video></div>`
    : `<button class="ph"><img loading="lazy" src="${esc(img)}" alt="${esc(p.name)}"></button>`;
  const specs = [['Madera', p.wood], ['Espesor', p.thickness], ['Medida', p.size], ['Detalle', p.detail]]
    .filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  const price = (p.price || '').trim();
  const priceHTML = /^\$/.test(price) ? `<span class="price">${esc(price)}</span>` : `<span class="price soft">${esc(price || 'a medida')}</span>`;
  return `<article class="tag reveal" data-cat="${esc(p.category in CATEGORIES ? p.category : 'otro')}">
    <div class="tag-top mono"><span>${num}</span>${video ? '<span class="vid-tag">▶ Video</span>' : ''}<span class="hole"></span></div>
    ${media}
    <div class="tag-body"><h3>${esc(p.name)}</h3>
      ${specs ? `<dl class="specs">${specs}</dl>` : ''}
      <div class="tag-foot">${priceHTML}<a class="ask wa" href="#"><svg><use href="#i-wa"/></svg>Consultar</a></div></div>
  </article>`;
}

// Load the catalog from Supabase when configured; otherwise keep the static cards in index.html
async function loadCatalog() {
  const cfg = window.RUSTICANDO_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  try {
    const res = await fetch(`${cfg.supabaseUrl}/rest/v1/products?select=*&visible=eq.true&order=sort.asc,created_at.desc`, {
      headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` }
    });
    if (!res.ok) throw new Error(res.status);
    const rows = await res.json();
    if (!rows.length) return;
    const grid = document.getElementById('grid');
    grid.innerHTML = rows.map(cardHTML).join('');
    document.querySelector('.chip[data-f="otro"]').hidden = !rows.some(r => !(r.category in CATEGORIES) || r.category === 'otro');
    bindWhatsApp(grid); bindPhotos(grid); bindLightbox(grid); bindReveal(grid);
    const active = document.querySelector('.chip[aria-pressed="true"]');
    applyFilter(active ? active.dataset.f : 'all');
  } catch (e) {
    console.warn('Catálogo: se muestra la versión fija', e);
  }
}

bindWhatsApp(); bindPhotos(); bindLightbox(); bindReveal();
loadCatalog();
document.getElementById('y').textContent = new Date().getFullYear();
