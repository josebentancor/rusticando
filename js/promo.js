// Bienvenida: a los pocos segundos invita a escribir por WhatsApp o seguir en Instagram.
// Si la persona la cierra, no vuelve a aparecer por unos días (solo en su navegador).
(() => {
  const box = document.getElementById('promo');
  if (!box) return;
  const KEY = 'rk-promo-cerrada', DAYS = 3;
  let closedAt = 0;
  try { closedAt = Number(localStorage.getItem(KEY)) || 0; } catch {}
  if (Date.now() - closedAt < DAYS * 864e5) return;

  const close = () => {
    box.classList.remove('show');
    setTimeout(() => { box.hidden = true; }, 400);
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
  };
  box.querySelector('.promo-close').addEventListener('click', close);
  box.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  setTimeout(() => {
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('show'));
  }, 3500);
})();
