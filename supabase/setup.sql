-- Rusticando · configuración de Supabase
-- Pegar entero en Supabase > SQL Editor > New query > Run. Se puede correr una sola vez.

-- 1. Catálogo -----------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 80),
  category    text not null default 'otro' check (category in ('ratona','barra','rack','mesa','otro')),
  wood        text check (char_length(wood) <= 60),
  thickness   text check (char_length(thickness) <= 30),
  size        text check (char_length(size) <= 40),
  detail      text check (char_length(detail) <= 60),
  price       text check (char_length(price) <= 30),
  image_url   text check (image_url ~ '^(https://[a-z0-9.-]+\.supabase\.co/|img/)'),
  video_url   text check (video_url ~ '^(https://[a-z0-9.-]+\.supabase\.co/|img/)'),
  sort        int  not null default 100,
  visible     boolean not null default true
);

-- 2. Quién es administrador ---------------------------------------------------
-- Solo los usuarios anotados acá pueden cargar, editar o borrar.
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;  -- sin políticas: nadie la lee desde la web

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 3. Permisos del catálogo (Row Level Security) -------------------------------
alter table public.products enable row level security;

drop policy if exists "ver piezas visibles" on public.products;
create policy "ver piezas visibles" on public.products
  for select to anon, authenticated using (visible or public.is_admin());

drop policy if exists "admin crea" on public.products;
create policy "admin crea" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin edita" on public.products;
create policy "admin edita" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin borra" on public.products;
create policy "admin borra" on public.products
  for delete to authenticated using (public.is_admin());

-- 4. Fotos y videos -----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 26214400, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin sube archivos" on storage.objects;
create policy "admin sube archivos" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin cambia archivos" on storage.objects;
create policy "admin cambia archivos" on storage.objects
  for update to authenticated using (bucket_id = 'productos' and public.is_admin());

drop policy if exists "admin borra archivos" on storage.objects;
create policy "admin borra archivos" on storage.objects
  for delete to authenticated using (bucket_id = 'productos' and public.is_admin());

-- 5. Piezas actuales (las fotos ya están en la web) ---------------------------
insert into public.products (name, category, wood, thickness, size, detail, price, image_url, video_url, sort)
select * from (values
  ('Ratona pino marítimo',  'ratona', 'Pino marítimo',      null, null,               'Terminación sedosa', '$5.900',      'img/ratona-pino.jpg',   null, 10),
  ('Ratona ciprés',         'ratona', 'Ciprés',             '2"', '1,30 × 0,85 m',    null,                 'pieza única', 'img/ratona-cipres.jpg', null, 20),
  ('Ratona cedro azul',     'ratona', 'Cedro azul',         null, null,               'Borde vivo',         'pieza única', 'img/ratona-cedro.jpg',  null, 30),
  ('Barra base de hierro',  'barra',  'Madera 100% maciza', null, 'A medida',         'Base de hierro',     'a medida',    'img/barra-hierro.jpg',  null, 40),
  ('Mesada lambertiana',    'barra',  'Ciprés lambertiana', '2"', '2,50 × 0,70 m',    null,                 'a medida',    'img/mesada-lambertiana-poster.jpg', 'img/mesada-lambertiana.mp4', 50),
  ('Tapa de mesada ciprés', 'barra',  'Ciprés',             '2"', null,               'Mesada · barra',     'a medida',    'img/mesada-cipres.jpg', null, 60),
  ('Barras pino marítimo',  'barra',  'Pino marítimo',      null, 'A medida',         'Barra · desayunador','a medida',    'img/barras-maritimo.jpg', null, 70),
  ('Rack TV ciprés',        'rack',   'Ciprés',             '2"', '170 × 35 × 70 cm', null,                 'a medida',    'img/rack-cipres.jpg',   null, 80),
  ('Mesas de comedor',      'mesa',   null,                 null, null,               'En stock',           'en stock',    'img/mesas-stock.jpg',   null, 90)
) as v(name, category, wood, thickness, size, detail, price, image_url, video_url, sort)
where not exists (select 1 from public.products);

-- 6. Último paso, después de crear el usuario del cliente en Authentication > Users:
--    reemplazar el correo y correr solo esta línea.
-- insert into public.admins (user_id) select id from auth.users where email = 'correo-del-cliente@ejemplo.com';
