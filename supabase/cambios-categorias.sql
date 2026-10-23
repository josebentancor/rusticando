-- Categorías del cliente (oct. 2026): Ratonas, Barras/Mesadas, Mesas comedor/Escritorio, Racks, Tablas para picar.
-- Agrega 'tabla' a las categorías permitidas en una base creada con la versión anterior de setup.sql.
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('ratona','barra','mesa','rack','tabla','otro'));
alter table public.products alter column category set default 'ratona';
