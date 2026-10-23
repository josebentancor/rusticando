const cfg = window.RUSTICANDO_CONFIG || {};
const $ = id => document.getElementById(id);
const BUCKET = 'productos';
const CATEGORIES = { ratona: 'Ratona', barra: 'Barra', mesa: 'Mesa', rack: 'Rack', tabla: 'Tabla para picar' };
const CATEGORY_LABELS = { ratona: 'Ratona', barra: 'Barra / Mesada', mesa: 'Mesa comedor / Escritorio', rack: 'Rack', tabla: 'Tabla para picar' };
const MAX_VIDEO = 25 * 1024 * 1024;
const show = (id, on = true) => { $(id).hidden = !on; };
// Paths saved as img/... live in the site itself, one folder up from /admin
const mediaUrl = u => !u ? '' : /^https:\/\//.test(u) ? u : '../' + u;

let toastTimer;
function toast(text, kind = 'ok') {
  const t = $('toast');
  t.textContent = text;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'ok' ? 3500 : 6000);
}
function fieldError(id, text) { $(id).textContent = text; $(id).hidden = !text; }

if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
  show('setup');
  throw new Error('Supabase no configurado');
}
const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

let pieces = [];
let editing = null;      // piece being edited, or null for a new one
let category = 'ratona';
let frame = { x: 50, y: 50, z: 1 };   // framing of the cover in the 4:5 card
let extras = [];         // more photos/videos: { type, url } saved, or { type, file, preview } new
let removedExtras = [];  // saved extras removed in this edit (their files are deleted after saving)
const MAX_EXTRAS = 12;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const frameOf = p => ({ x: clamp(Number(p.frame_x ?? 50), 0, 100), y: clamp(Number(p.frame_y ?? 50), 0, 100), z: clamp(Number(p.frame_zoom ?? 1), 1, 3) });
function applyFrame(node, f) {
  node.style.setProperty('--fx', f.x + '%');
  node.style.setProperty('--fy', f.y + '%');
  node.style.setProperty('--fz', f.z);
}

// ---------- Session ----------
async function start() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enter(); else show('login');
}

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  fieldError('login-msg', '');
  $('login-btn').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: window.rusticandoLoginEmail($('user').value), password: $('password').value });
  $('login-btn').disabled = false;
  $('password').value = '';
  if (error) return fieldError('login-msg', /rate|too many/i.test(error.message) ? 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' : 'Usuario o contraseña incorrectos.');
  await enter();
});

$('logout').addEventListener('click', async () => { await sb.auth.signOut(); location.href = '../'; });

async function enter() {
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    await sb.auth.signOut();
    show('login');
    return fieldError('login-msg', 'Esta cuenta no tiene permiso para editar el catálogo.');
  }
  show('login', false); show('home'); show('logout');
  await loadPieces();
}

// ---------- List ----------
async function loadPieces() {
  const { data, error } = await sb.from('products').select('*').order('sort').order('created_at', { ascending: false });
  if (error) return toast('No se pudo cargar el catálogo. Recargá la página.', 'err');
  pieces = data;
  renderList();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function btn(text, cls, onClick) {
  const b = el('button', 'btn ' + cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function renderList() {
  const list = $('list');
  list.replaceChildren();
  const visible = pieces.filter(p => p.visible).length, hidden = pieces.length - visible;
  $('count').textContent = pieces.length
    ? `${visible} a la vista${hidden ? ` · ${hidden} ${hidden === 1 ? 'oculta' : 'ocultas'}` : ''}. Usá las flechas para cambiar el orden.`
    : 'Todavía no hay piezas. Subí la primera con el botón verde.';

  pieces.forEach((p, idx) => {
    const card = el('article', 'piece' + (p.visible ? '' : ' off'));
    const pic = el('div', 'pic');
    const img = el('img');
    img.alt = ''; img.loading = 'lazy';
    if (p.image_url) img.src = mediaUrl(p.image_url);
    applyFrame(pic, frameOf(p));
    const tags = el('div', 'tagline');
    const nExtra = Array.isArray(p.extra) ? p.extra.length : 0;
    if (nExtra) tags.append(el('span', 'chip-s', `+${nExtra} fotos/videos`));
    if (!p.visible) tags.append(el('span', 'chip-s warn', 'Oculta'));
    if (p.video_url) tags.append(el('span', 'chip-s', 'Video'));
    pic.append(img, tags);

    const body = el('div', 'body');
    body.append(el('h3', null, p.name), el('div', 'sub', [CATEGORY_LABELS[p.category] || 'Ratona', p.wood].filter(Boolean).join(' · ')));

    const move = el('div', 'move');
    const up = btn('↑ Subir', 'light', () => swap(idx, idx - 1));
    const down = btn('↓ Bajar', 'light', () => swap(idx, idx + 1));
    up.disabled = idx === 0; down.disabled = idx === pieces.length - 1;
    move.append(up, down);

    const acts = el('div', 'acts');
    acts.append(
      btn('Editar', '', () => openEditor(p)),
      btn(p.visible ? 'Ocultar' : 'Mostrar', 'light', () => toggleVisible(p))
    );
    const del = btn('Borrar', 'light', () => {
      const box = el('div', 'confirm');
      box.append(el('p', null, `¿Borrar "${p.name}" para siempre?`),
        btn('Sí, borrar', 'danger', () => removePiece(p)),
        btn('No', 'light', () => box.replaceWith(del)));
      del.replaceWith(box);
    });
    del.style.gridColumn = '1 / -1';
    acts.append(del);

    body.append(move, acts);
    card.append(pic, body);
    list.append(card);
  });
}

// Reordering swaps the two pieces' positions, then renumbers everyone 10, 20, 30…
async function swap(a, b) {
  if (b < 0 || b >= pieces.length) return;
  [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
  renderList();
  const updates = pieces.map((p, i) => ({ id: p.id, sort: (i + 1) * 10 })).filter((u, i) => pieces[i].sort !== u.sort);
  pieces.forEach((p, i) => { p.sort = (i + 1) * 10; });
  for (const u of updates) {
    const { error } = await sb.from('products').update({ sort: u.sort }).eq('id', u.id);
    if (error) { toast('No se pudo guardar el orden.', 'err'); return loadPieces(); }
  }
  toast('Orden guardado.');
}

async function toggleVisible(p) {
  const { error } = await sb.from('products').update({ visible: !p.visible }).eq('id', p.id);
  if (error) return toast('No se pudo cambiar.', 'err');
  toast(p.visible ? `"${p.name}" ya no se ve en la web.` : `"${p.name}" ya se ve en la web.`);
  await loadPieces();
}

async function removePiece(p) {
  const { error } = await sb.from('products').delete().eq('id', p.id);
  if (error) return toast('No se pudo borrar.', 'err');
  await removeFiles([p.image_url, p.video_url, ...(Array.isArray(p.extra) ? p.extra.map(m => m.url) : [])]);
  toast(`"${p.name}" se borró.`);
  await loadPieces();
}

// ---------- Editor ----------
const extra = ['wood', 'thickness', 'size', 'detail'];   // no prices: every piece is unique

$('new-btn').addEventListener('click', () => openEditor(null));
$('cancel-btn').addEventListener('click', closeEditor);

$('tiles').addEventListener('click', e => {
  const t = e.target.closest('.tile');
  if (!t) return;
  const prevLabel = CATEGORIES[category];
  setCategory(t.dataset.c);
  // Suggest a name the first time, or if it still is the previous suggestion
  if (!$('f-name').value.trim() || $('f-name').value === prevLabel) $('f-name').value = CATEGORIES[t.dataset.c];
  $('f-name').focus();
});
function setCategory(c) {
  category = c in CATEGORIES ? c : 'ratona';
  document.querySelectorAll('.tile').forEach(t => t.setAttribute('aria-pressed', t.dataset.c === category));
}

// Quick-fill chips (Ciprés, 2", Borde vivo…)
document.querySelectorAll('.quick').forEach(q => q.addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  e.preventDefault();
  $(q.dataset.for).value = e.target.textContent;
}));

function openEditor(p) {
  editing = p;
  $('piece-form').reset();
  fieldError('form-msg', '');
  $('editor-title').textContent = p ? 'Editar pieza' : 'Pieza nueva';
  $('save-btn').textContent = p ? 'Guardar cambios' : 'Publicar en la web';
  $('f-name').value = p ? p.name : '';
  for (const f of extra) $('f-' + f).value = p ? (p[f] ?? '') : '';
  $('f-visible').checked = p ? p.visible : true;
  setCategory(p ? p.category : 'ratona');
  $('more').open = !!(p && extra.some(f => p[f]));
  setFrame(p ? frameOf(p) : { x: 50, y: 50, z: 1 });
  extras = p && Array.isArray(p.extra) ? p.extra.map(m => ({ type: m.type, url: m.url })) : [];
  removedExtras = [];
  renderExtras();
  coverPoster = null;
  if (p && p.video_url) setPhoto(mediaUrl(p.video_url), true, mediaUrl(p.image_url));
  else setPhoto(p ? mediaUrl(p.image_url) : '');
  show('new-btn', false);
  show('editor');
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditor() {
  editing = null;
  show('editor', false);
  show('new-btn');
}

// Main photo or video (step 1). poster: the still used for the framing preview when it is a video
function setPhoto(src, isVideo = false, poster = '') {
  const drop = $('drop');
  drop.querySelectorAll('img, video').forEach(n => n.remove());
  $('drop-ph').hidden = !!src;
  if (src && isVideo) {
    const v = el('video'); v.src = src; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    drop.append(v);
  } else if (src) { const i = el('img'); i.src = src; i.alt = 'Foto elegida'; drop.append(i); }
  // The framing step shows the same photo inside the card frame
  $('frame-img').src = (isVideo ? poster : src) || '';
  show('frame-step', !!(isVideo ? poster : src));
}

const isVideoFile = f => f.type.startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(f.name);
let coverPoster = null;   // still taken from the chosen main video, saved as its photo

// First frame of a video, as a JPEG (the photo shown while the video loads, and in the panel list)
function videoPoster(file) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    const done = blob => { URL.revokeObjectURL(v.src); resolve(blob); };
    setTimeout(() => done(null), 15000);
    v.addEventListener('loadeddata', () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); }, { once: true });
    v.addEventListener('seeked', () => {
      const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
      if (!c.width) return done(null);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      c.toBlob(b => done(b), 'image/jpeg', 0.85);
    }, { once: true });
    v.addEventListener('error', () => done(null), { once: true });
    v.src = URL.createObjectURL(file);
  });
}

$('f-image').addEventListener('change', async () => {
  const f = $('f-image').files[0];
  coverPoster = null;
  if (!f) return;
  fieldError('form-msg', '');
  setFrame({ x: 50, y: 50, z: 1 });
  if (!isVideoFile(f)) return setPhoto(URL.createObjectURL(f));
  if (f.size > MAX_VIDEO) {
    $('f-image').value = '';
    return fieldError('form-msg', 'El video pesa más de 25 MB. Recortalo o grabalo en menor calidad (1080p) e intentá de nuevo.');
  }
  setPhoto(URL.createObjectURL(f), true);
  coverPoster = await videoPoster(f);
  if ($('f-image').files[0] === f) setPhoto(URL.createObjectURL(f), true, coverPoster ? URL.createObjectURL(coverPoster) : '');
});

// ---------- Framing: drag to move, slider / wheel / pinch to zoom ----------
function setFrame(f) {
  frame = { x: clamp(f.x, 0, 100), y: clamp(f.y, 0, 100), z: clamp(f.z, 1, 3) };
  applyFrame($('frame'), frame);
  $('f-zoom').value = frame.z;
}
$('f-zoom').addEventListener('input', () => setFrame({ ...frame, z: Number($('f-zoom').value) }));
$('frame-reset').addEventListener('click', () => setFrame({ x: 50, y: 50, z: 1 }));

const pointers = new Map();
let pinchStart = null;
$('frame').addEventListener('pointerdown', e => {
  $('frame').setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $('frame').classList.add('dragging');
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y), z: frame.z };
  }
});
$('frame').addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2 && pinchStart) {
    const [a, b] = [...pointers.values()];
    setFrame({ ...frame, z: pinchStart.z * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.d });
    return;
  }
  // Moving the photo right shows more of its left side, so the focus point moves the other way
  const r = $('frame').getBoundingClientRect();
  setFrame({ ...frame, x: frame.x - (e.clientX - prev.x) / r.width * 100 / frame.z, y: frame.y - (e.clientY - prev.y) / r.height * 100 / frame.z });
});
const endDrag = e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (!pointers.size) $('frame').classList.remove('dragging');
};
$('frame').addEventListener('pointerup', endDrag);
$('frame').addEventListener('pointercancel', endDrag);
$('frame').addEventListener('wheel', e => { e.preventDefault(); setFrame({ ...frame, z: frame.z - e.deltaY * 0.002 }); }, { passive: false });

// ---------- More photos / videos ----------
function renderExtras() {
  const box = $('extras');
  box.replaceChildren(...extras.map((m, i) => {
    const item = el('div', 'xitem');
    const src = m.preview || mediaUrl(m.url);
    if (m.type === 'video') {
      const v = el('video'); v.src = src; v.muted = true; v.playsInline = true; v.preload = 'metadata';
      item.append(v, el('span', 'xtag', 'Video'));
    } else {
      const im = el('img'); im.src = src; im.alt = ''; item.append(im);
    }
    const del = el('button', 'xdel', '✕');
    del.type = 'button';
    del.setAttribute('aria-label', 'Quitar');
    del.addEventListener('click', () => {
      const [gone] = extras.splice(i, 1);
      if (gone.url) removedExtras.push(gone.url);
      renderExtras();
    });
    item.append(del);
    return item;
  }));
  $('add-extra').hidden = extras.length >= MAX_EXTRAS;
}

$('f-extra').addEventListener('change', () => {
  const files = [...$('f-extra').files];
  $('f-extra').value = '';
  let skipped = 0;
  for (const file of files) {
    if (extras.length >= MAX_EXTRAS) { skipped++; continue; }
    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > MAX_VIDEO) { skipped++; continue; }
    extras.push({ type: isVideo ? 'video' : 'image', file, preview: URL.createObjectURL(file) });
  }
  renderExtras();
  if (skipped) fieldError('form-msg', `No se agregaron ${skipped} archivo(s): máximo ${MAX_EXTRAS} por pieza y videos de hasta 25 MB.`);
});
$('piece-form').addEventListener('submit', async e => {
  e.preventDefault();
  fieldError('form-msg', '');
  const cover = $('f-image').files[0];
  const videoFile = cover && isVideoFile(cover) ? cover : null;
  const imageFile = videoFile ? coverPoster : cover;
  if (!editing && !cover) { fieldError('form-msg', 'Falta la foto o el video (paso 1).'); $('drop').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (!$('f-name').value.trim()) { fieldError('form-msg', 'Falta el nombre (paso 4).'); $('f-name').focus(); return; }

  const save = $('save-btn');
  save.disabled = true;
  save.textContent = imageFile || videoFile || extras.some(m => m.file) ? 'Subiendo…' : 'Guardando…';
  try {
    const row = { name: $('f-name').value.trim(), category, visible: $('f-visible').checked,
      frame_x: Math.round(frame.x), frame_y: Math.round(frame.y), frame_zoom: Number(frame.z.toFixed(2)) };
    for (const f of extra) row[f] = $('f-' + f).value.trim() || null;
    // Upload the new extra photos/videos, keeping their order
    const savedExtras = [];
    for (const m of extras) {
      if (!m.file) { savedExtras.push({ type: m.type, url: m.url }); continue; }
      const url = m.type === 'video'
        ? await upload(m.file, m.file.type === 'video/quicktime' ? 'mov' : 'mp4', m.file.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4')
        : await upload(await shrinkImage(m.file), 'jpg', 'image/jpeg');
      savedExtras.push({ type: m.type, url });
    }
    row.extra = savedExtras;
    if (!editing) row.sort = (pieces.length ? Math.min(...pieces.map(p => p.sort)) : 100) - 10;  // new pieces go first

    const oldFiles = [];
    // A new cover replaces both the old photo and the old video
    if (cover) {
      if (editing) oldFiles.push(editing.image_url, editing.video_url);
      row.image_url = imageFile ? await upload(await shrinkImage(imageFile), 'jpg', 'image/jpeg') : null;
      row.video_url = null;
      if (videoFile) {
        const isMov = videoFile.type === 'video/quicktime' || /\.mov$/i.test(videoFile.name);
        row.video_url = await upload(videoFile, isMov ? 'mov' : 'mp4', isMov ? 'video/quicktime' : 'video/mp4');
      }
    }

    const { error } = editing
      ? await sb.from('products').update(row).eq('id', editing.id)
      : await sb.from('products').insert(row);
    if (error) throw error;
    await removeFiles([...oldFiles, ...removedExtras]);

    toast(editing ? `"${row.name}" se actualizó.` : `¡Listo! "${row.name}" ya está en la web.`);
    closeEditor();
    await loadPieces();
  } catch (err) {
    console.error(err);
    fieldError('form-msg', 'No se pudo guardar. Revisá la conexión a internet e intentá de nuevo.');
  } finally {
    save.disabled = false;
    save.textContent = editing ? 'Guardar cambios' : 'Publicar en la web';
  }
});

// Phone photos can be 5–10 MB; resize to 1600 px and re-encode as JPEG (also strips GPS metadata)
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('No se pudo procesar la foto')), 'image/jpeg', 0.85));
}

async function upload(blob, ext, type) {
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Only files in our bucket are removed; the original photos in img/ stay with the site
async function removeFiles(urls) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const paths = urls.filter(u => u && u.includes(marker)).map(u => u.split(marker)[1]);
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
}

start();
