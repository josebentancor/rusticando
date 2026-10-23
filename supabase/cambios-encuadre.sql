-- Encuadre y galería por pieza (oct. 2026). Se puede correr más de una vez.
-- frame_x / frame_y: punto de la foto que queda al centro de la tarjeta (0 a 100 %).
-- frame_zoom: 1 = sin zoom, hasta 3.
-- extra: más fotos o videos de la misma pieza, en orden: [{"type":"image"|"video","url":"..."}] (hasta 12).
alter table public.products add column if not exists frame_x    smallint     not null default 50 check (frame_x between 0 and 100);
alter table public.products add column if not exists frame_y    smallint     not null default 50 check (frame_y between 0 and 100);
alter table public.products add column if not exists frame_zoom numeric(3,2) not null default 1  check (frame_zoom between 1 and 3);
alter table public.products add column if not exists extra      jsonb        not null default '[]'::jsonb
  check (jsonb_typeof(extra) = 'array' and jsonb_array_length(extra) <= 12);
