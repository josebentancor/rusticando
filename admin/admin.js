const cfg = window.RUSTICANDO_CONFIG || {};
const $ = id => document.getElementById(id);
const BUCKET = 'productos';
const CATEGORIES = { ratona: 'Mesa ratona', barra: 'Barra · mesada', rack: 'Rack TV', mesa: 'Mesa', otro: 'Otro' };
const MAX_VIDEO = 25 * 1024 * 1024;

const show = (id, on = true) => { $(id).hidden = !on; };
function message(id, text, kind = 'err') {
  const el = $(id);
  el.textContent = text;
  el.className = `msg ${kind}${id === 'form-msg' ? ' full' : ''}`;
  el.hidden = !text;
}
// Paths saved as img/... live in the site itself, one folder up from /admin
const mediaUrl = u => !u ? '' : /^https:\/\//.test(u) ? u : '../' + u;

if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
  show('setup');
  throw new Error('Supabase no configurado');
}
const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

let pieces = [];
let editing = null;   // piece being edited, or null for a new one

// ---------- Session ----------
async function start() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enter(); else show('login');
}

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  message('login-msg', '');
  $('login-btn').disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  $('login-btn').disabled = false;
  $('password').value = '';
  if (error) {
    message('login-msg', /rate|too many/i.test(error.message)
      ? 'Demasiados intentos. Esperá unos minutos y probá de nuevo.'
      : 'El correo o la contraseña no son correctos.');
    return;
  }
  await enter();
});

$('logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});

async function enter() {
  const { data: isAdmin, error } = await sb.rpc('is_admin');
  if (error || !isAdmin) {
    await sb.auth.signOut();
    show('login');
    message('login-msg', 'Esta cuenta no tiene permiso para editar el catálogo.');
    return;
  }
  show('login', false); show('dash'); show('logout');
  await loadPieces();
}

// ---------- List ----------
async function loadPieces() {
  const { data, error } = await sb.from('products').select('*').order('sort').order('created_at', { ascending: false });
  if (error) { message('dash-msg', 'No se pudo cargar el catálogo. Revisá la conexión y recargá la página.'); return; }
  pieces = data;
  renderList();
}

function renderList() {
  const list = $('list');
  list.replaceChildren();
  if (!pieces.length) {
    const p = document.createElement('p');
    p.textContent = 'Todavía no hay piezas. Tocá "+ Nueva pieza" para cargar la primera.';
    list.append(p);
    return;
  }
  for (const piece of pieces) {
    const row = document.createElement('div');
    row.className = 'row' + (piece.visible ? '' : ' off');

    const img = document.createElement('img');
    img.className = 'thumb'; img.alt = ''; img.loading = 'lazy';
    if (piece.image_url) img.src = mediaUrl(piece.image_url);

    const info = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = piece.name;
    if (piece.video_url) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'Video'; h.append(b); }
    if (!piece.visible) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'Oculta'; h.append(b); }
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = [CATEGORIES[piece.category] || 'Otro', piece.wood, piece.size, piece.price].filter(Boolean).join(' · ');
    info.append(h, meta);

    const acts = document.createElement('div');
    acts.className = 'acts';
    acts.append(
      button(piece.visible ? 'Ocultar' : 'Mostrar', 'ghost small', () => toggleVisible(piece)),
      button('Editar', 'small', () => openEditor(piece)),
      deleteButton(piece)
    );
    row.append(img, info, acts);
    list.append(row);
  }
}

function button(text, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn ' + cls; b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// Delete asks for confirmation in place, without browser dialogs
function deleteButton(piece) {
  const wrap = document.createElement('span');
  wrap.style.display = 'contents';
  const ask = button('Borrar', 'ghost small', () => { ask.hidden = true; yes.hidden = no.hidden = false; });
  const yes = button('¿Borrar? Sí', 'danger small', () => removePiece(piece, yes));
  const no = button('No', 'ghost small', () => { ask.hidden = false; yes.hidden = no.hidden = true; });
  yes.hidden = no.hidden = true;
  wrap.append(ask, yes, no);
  return wrap;
}

async function toggleVisible(piece) {
  const { error } = await sb.from('products').update({ visible: !piece.visible }).eq('id', piece.id);
  if (error) return message('dash-msg', 'No se pudo cambiar la visibilidad.');
  message('dash-msg', piece.visible ? `"${piece.name}" ya no se muestra en la web.` : `"${piece.name}" ya se muestra en la web.`, 'ok');
  await loadPieces();
}

async function removePiece(piece, btn) {
  btn.disabled = true;
  const { error } = await sb.from('products').delete().eq('id', piece.id);
  if (error) { btn.disabled = false; return message('dash-msg', 'No se pudo borrar la pieza.'); }
  await removeFiles([piece.image_url, piece.video_url]);
  message('dash-msg', `"${piece.name}" se borró.`, 'ok');
  await loadPieces();
}

// ---------- Editor ----------
const fields = ['name', 'category', 'wood', 'thickness', 'size', 'detail', 'price', 'sort'];

$('new-btn').addEventListener('click', () => openEditor(null));
$('cancel-btn').addEventListener('click', closeEditor);

function openEditor(piece) {
  editing = piece;
  $('piece-form').reset();
  message('form-msg', '');
  $('editor-title').textContent = piece ? 'Editar pieza' : 'Nueva pieza';
  for (const f of fields) $('f-' + f).value = piece ? (piece[f] ?? '') : (f === 'sort' ? 100 : f === 'category' ? 'ratona' : '');
  $('f-visible').checked = piece ? piece.visible : true;
  renderPreview(piece ? mediaUrl(piece.image_url) : '', piece ? mediaUrl(piece.video_url) : '');
  show('editor');
  $('editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('f-name').focus({ preventScroll: true });
}

function closeEditor() {
  editing = null;
  show('editor', false);
}

function renderPreview(imgSrc, videoSrc) {
  const box = $('preview');
  box.replaceChildren();
  if (imgSrc) { const i = document.createElement('img'); i.src = imgSrc; i.alt = 'Foto'; box.append(i); }
  if (videoSrc) { const v = document.createElement('video'); v.src = videoSrc; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; box.append(v); }
}

$('f-image').addEventListener('change', () => {
  const f = $('f-image').files[0];
  if (f) renderPreview(URL.createObjectURL(f), $('f-video').files[0] ? URL.createObjectURL($('f-video').files[0]) : mediaUrl(editing?.video_url));
});
$('f-video').addEventListener('change', () => {
  const f = $('f-video').files[0];
  if (f && f.size > MAX_VIDEO) { message('form-msg', 'El video pesa más de 25 MB. Recortalo o bajale la calidad.'); $('f-video').value = ''; return; }
  if (f) renderPreview($('f-image').files[0] ? URL.createObjectURL($('f-image').files[0]) : mediaUrl(editing?.image_url), URL.createObjectURL(f));
});

$('piece-form').addEventListener('submit', async e => {
  e.preventDefault();
  message('form-msg', '');
  const imageFile = $('f-image').files[0];
  const videoFile = $('f-video').files[0];
  if (!editing && !imageFile) return message('form-msg', 'Agregá una foto de la pieza.');

  $('save-btn').disabled = true;
  $('save-btn').textContent = 'Guardando…';
  try {
    const row = { visible: $('f-visible').checked };
    for (const f of fields) {
      const v = $('f-' + f).value.trim();
      row[f] = f === 'sort' ? (parseInt(v, 10) || 100) : (v || null);
    }
    const oldFiles = [];
    if (imageFile) { row.image_url = await upload(await shrinkImage(imageFile), 'jpg', 'image/jpeg'); if (editing) oldFiles.push(editing.image_url); }
    if (videoFile) { row.video_url = await upload(videoFile, 'mp4', 'video/mp4'); if (editing) oldFiles.push(editing.video_url); }

    const { error } = editing
      ? await sb.from('products').update(row).eq('id', editing.id)
      : await sb.from('products').insert(row);
    if (error) throw error;
    await removeFiles(oldFiles);

    message('dash-msg', `"${row.name}" se guardó y ya está en la web.`, 'ok');
    closeEditor();
    await loadPieces();
    $('dash-msg').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error(err);
    message('form-msg', 'No se pudo guardar. Revisá la conexión e intentá de nuevo.');
  } finally {
    $('save-btn').disabled = false;
    $('save-btn').textContent = 'Guardar';
  }
});

// Photos from the phone can be 5–10 MB; resize to 1600 px and re-encode as JPEG (also strips GPS metadata)
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
