// Conexión con Supabase (base de datos del catálogo).
// Mientras estén vacíos, la web muestra el catálogo fijo que viene en index.html.
// La "anon key" es pública por diseño: la seguridad la dan las reglas (RLS) de supabase/setup.sql.
window.RUSTICANDO_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};
