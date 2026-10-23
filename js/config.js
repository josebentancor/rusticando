// Conexión con Supabase (base de datos del catálogo).
// Mientras estén vacíos, la web muestra el catálogo fijo que viene en index.html.
// La "anon key" es pública por diseño: la seguridad la dan las reglas (RLS) de supabase/setup.sql.
window.RUSTICANDO_CONFIG = {
  supabaseUrl: 'https://dtpgpmheczguoxqdizxf.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cGdwbWhlY3pndW94cWRpenhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MDI3NjcsImV4cCI6MjEwODI3ODc2N30.6maU9WFYaW4vISRXdb3Gbl7z7LHVnRre2HItdwOJsWI',
  // El cliente entra con un usuario corto (ej.: "admin"); se completa como admin@rusticando.uy
  loginDomain: 'rusticando.uy'
};

// "admin" -> "admin@rusticando.uy"; un correo completo queda igual
window.rusticandoLoginEmail = user => {
  const u = String(user || '').trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${window.RUSTICANDO_CONFIG.loginDomain}`;
};
