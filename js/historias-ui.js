// Historias destacadas: fila de círculos + visor a pantalla completa estilo Instagram
(() => {
  const H = window.RUSTICANDO_HISTORIAS || [];
  const row = document.getElementById('hl-row');
  const dlg = document.getElementById('story');
  if (!H.length || !row || !dlg) return;

  const IMAGE_MS = 5000;
  const base = (h, n, ext) => `img/historias/${h.slug}/${String(n).padStart(2, '0')}.${ext}`;
  const $ = s => dlg.querySelector(s);
  let cur = { h: 0, i: 0 }, raf = 0, t0 = 0, elapsed = 0, paused = false, sound = false, video = null;

  // Row of highlight circles
  H.forEach((h, k) => {
    const b = document.createElement('button');
    b.className = 'hl';
    b.type = 'button';
    b.setAttribute('aria-label', `Ver historias: ${h.title} (${h.items.length})`);
    const ring = document.createElement('span');
    ring.className = 'hl-ring';
    const img = document.createElement('img');
    img.src = `img/historias/${h.slug}/cover.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    ring.append(img);
    const t = document.createElement('span');
    t.className = 'hl-title';
    t.textContent = h.title;
    const c = document.createElement('span');
    c.className = 'hl-count mono';
    c.textContent = h.items.length === 1 ? '1 historia' : `${h.items.length} historias`;
    b.append(ring, t, c);
    b.addEventListener('click', () => open(k, 0));
    row.append(b);
  });

  function open(h, i) {
    sound = false;
    if (!dlg.open) dlg.showModal();
    show(h, i);
  }

  function close() {
    stop();
    $('.st-media').replaceChildren();
    if (dlg.open) dlg.close();
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (video) { video.onended = video.onerror = null; video.pause(); video.removeAttribute('src'); video.load(); video = null; }
  }

  function show(h, i) {
    stop();
    cur = { h, i };
    const hl = H[h], item = hl.items[i];
    $('.st-title').textContent = hl.title;
    $('.st-n').textContent = `${i + 1}/${hl.items.length}`;
    $('.st-av').src = `img/historias/${hl.slug}/cover.jpg`;
    $('.st-cta').href = `https://wa.me/59898923479?text=${encodeURIComponent(`¡Hola! Vi en la web las historias de "${hl.title}" y quiero consultar.`)}`;

    const bars = $('.st-bars');
    bars.replaceChildren(...hl.items.map((_, k) => {
      const s = document.createElement('span');
      const f = document.createElement('i');
      f.style.width = k < i ? '100%' : '0%';
      s.append(f);
      return s;
    }));

    const media = $('.st-media');
    media.replaceChildren();
    $('.st-sound').hidden = !item.v;
    $('.st-sound').textContent = sound ? 'Sonido: sí' : 'Sonido: no';
    paused = false; elapsed = 0;

    if (item.v) {
      video = document.createElement('video');
      video.src = base(hl, i + 1, 'mp4');
      video.poster = base(hl, i + 1, 'jpg');
      video.playsInline = true;
      video.muted = !sound;
      video.preload = 'auto';
      video.onended = next;
      video.onerror = next;
      media.append(video);
      video.play().catch(() => { video.muted = true; sound = false; video.play().catch(() => {}); });
    } else {
      const img = document.createElement('img');
      img.src = base(hl, i + 1, 'jpg');
      img.alt = `${hl.title}, historia ${i + 1}`;
      media.append(img);
    }
    preload(h, i);
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function tick(now) {
    const fill = $('.st-bars').children[cur.i]?.firstChild;
    let p;
    if (video) {
      p = video.duration ? video.currentTime / video.duration : 0;
    } else {
      if (!paused) elapsed += now - t0;
      t0 = now;
      p = elapsed / IMAGE_MS;
      if (p >= 1) return next();
    }
    if (fill) fill.style.width = Math.min(100, p * 100) + '%';
    raf = requestAnimationFrame(tick);
  }

  function preload(h, i) {
    const n = i + 1 < H[h].items.length ? { h, i: i + 1 } : h + 1 < H.length ? { h: h + 1, i: 0 } : null;
    if (n && !H[n.h].items[n.i].v) new Image().src = base(H[n.h], n.i + 1, 'jpg');
  }

  function next() {
    const { h, i } = cur;
    if (i + 1 < H[h].items.length) show(h, i + 1);
    else if (h + 1 < H.length) show(h + 1, 0);
    else close();
  }

  function prev() {
    const { h, i } = cur;
    if (i > 0) show(h, i - 1);
    else if (h > 0) show(h - 1, H[h - 1].items.length - 1);
    else show(0, 0);
  }

  function setPaused(on) {
    paused = on;
    if (video) on ? video.pause() : video.play().catch(() => {});
  }

  // Tap the left/right side to move; press and hold to pause
  for (const [sel, fn] of [['.st-prev', prev], ['.st-next', next]]) {
    const zone = $(sel);
    let downAt = 0, holdTimer = 0;
    zone.addEventListener('pointerdown', () => {
      downAt = performance.now();
      holdTimer = setTimeout(() => setPaused(true), 220);
    });
    zone.addEventListener('pointerup', () => {
      clearTimeout(holdTimer);
      if (paused) setPaused(false);
      else if (performance.now() - downAt < 220) fn();
    });
    zone.addEventListener('pointerleave', () => { clearTimeout(holdTimer); if (paused) setPaused(false); });
  }

  $('.st-close').addEventListener('click', close);
  $('.st-sound').addEventListener('click', () => {
    sound = !sound;
    if (video) video.muted = !sound;
    $('.st-sound').textContent = sound ? 'Sonido: sí' : 'Sonido: no';
  });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ') { e.preventDefault(); setPaused(!paused); }
  });
  dlg.addEventListener('close', () => { stop(); $('.st-media').replaceChildren(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
})();
