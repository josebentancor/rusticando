// Conexión con Supabase (base de datos del catálogo).
// Mientras estén vacíos, la web muestra el catálogo fijo que viene en index.html.
// La "anon key" es pública por diseño: la seguridad la dan las reglas (RLS) de supabase/setup.sql.
window.RUSTICANDO_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // El cliente entra con un usuario corto (ej.: "rusticando"); se completa como rusticando@rusticando.uy
  loginDomain: 'rusticando.uy'
};

// "rusticando" -> "rusticando@rusticando.uy"; un correo completo queda igual
window.rusticandoLoginEmail = user => {
  const u = String(user || '').trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${window.RUSTICANDO_CONFIG.loginDomain}`;
};
