// "Ingresar al panel" del pie de página: inicia sesión y lleva al panel.
// La librería de Supabase se descarga solo cuando alguien usa este formulario.
(() => {
  const form = document.getElementById('panel-form');
  if (!form) return;
  const cfg = window.RUSTICANDO_CONFIG || {};
  const msg = document.getElementById('pl-msg');
  const btn = document.getElementById('pl-btn');
  const say = t => { msg.textContent = t; msg.hidden = !t; };
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const SRI = 'sha384-0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o';

  function loadLib() {
    if (window.supabase) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = LIB; s.integrity = SRI; s.crossOrigin = 'anonymous';
      s.onload = ok; s.onerror = fail;
      document.head.append(s);
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    say('');
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return say('El panel todavía no está conectado.');
    btn.disabled = true; btn.textContent = 'Entrando…';
    try {
      await loadLib();
      const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      const { error } = await sb.auth.signInWithPassword({
        email: window.rusticandoLoginEmail(document.getElementById('pl-user').value),
        password: document.getElementById('pl-pass').value
      });
      if (error) {
        say(/rate|too many/i.test(error.message) ? 'Demasiados intentos. Esperá unos minutos.' : 'Usuario o contraseña incorrectos.');
        return;
      }
      location.href = 'admin/';
    } catch {
      say('No se pudo conectar. Revisá internet y probá de nuevo.');
    } finally {
      document.getElementById('pl-pass').value = '';
      btn.disabled = false; btn.textContent = 'Entrar';
    }
  });
})();
