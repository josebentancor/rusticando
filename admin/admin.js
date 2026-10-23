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
    const tags = el('div', 'tagline');
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
  await removeFiles([p.image_url, p.video_url]);
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
  setPhoto(p ? mediaUrl(p.image_url) : '');
  show('new-btn', false);
  show('editor');
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeEditor() {
  editing = null;
  show('editor', false);
  show('new-btn');
}

function setPhoto(src) {
  const drop = $('drop');
  drop.querySelector('img')?.remove();
  $('drop-ph').hidden = !!src;
  if (src) { const i = el('img'); i.src = src; i.alt = 'Foto elegida'; drop.append(i); }
}

$('f-image').addEventListener('change', () => {
  const f = $('f-image').files[0];
  if (f) setPhoto(URL.createObjectURL(f));
});
$('f-video').addEventListener('change', () => {
  const f = $('f-video').files[0];
  if (f && f.size > MAX_VIDEO) { fieldError('form-msg', 'El video pesa más de 25 MB. Recortalo o mandalo en menor calidad.'); $('f-video').value = ''; }
});

$('piece-form').addEventListener('submit', async e => {
  e.preventDefault();
  fieldError('form-msg', '');
  const imageFile = $('f-image').files[0];
  const videoFile = $('f-video').files[0];
  if (!editing && !imageFile) { fieldError('form-msg', 'Falta la foto (paso 1).'); $('drop').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  if (!$('f-name').value.trim()) { fieldError('form-msg', 'Falta el nombre (paso 3).'); $('f-name').focus(); return; }

  const save = $('save-btn');
  save.disabled = true;
  save.textContent = imageFile || videoFile ? 'Subiendo…' : 'Guardando…';
  try {
    const row = { name: $('f-name').value.trim(), category, visible: $('f-visible').checked };
    for (const f of extra) row[f] = $('f-' + f).value.trim() || null;
    if (!editing) row.sort = (pieces.length ? Math.min(...pieces.map(p => p.sort)) : 100) - 10;  // new pieces go first

    const oldFiles = [];
    if (imageFile) { row.image_url = await upload(await shrinkImage(imageFile), 'jpg', 'image/jpeg'); if (editing) oldFiles.push(editing.image_url); }
    if (videoFile) {
      const isMov = videoFile.type === 'video/quicktime';
      row.video_url = await upload(videoFile, isMov ? 'mov' : 'mp4', isMov ? 'video/quicktime' : 'video/mp4');
      if (editing) oldFiles.push(editing.video_url);
    }

    const { error } = editing
      ? await sb.from('products').update(row).eq('id', editing.id)
      : await sb.from('products').insert(row);
    if (error) throw error;
    await removeFiles(oldFiles);

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
