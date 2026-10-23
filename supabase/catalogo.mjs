// Catálogo inicial de Rusticando: una sola lista que genera
//   js/catalogo.js          -> copia de respaldo que muestra la web si Supabase no responde
//   supabase/catalogo.sql   -> carga las mismas piezas en Supabase
// Uso: node supabase/catalogo.mjs
import { writeFileSync } from 'node:fs';

const H = 'img/historias/';
// [nombre, categoría, madera, espesor, medida, detalle, foto, video]
const pieces = [
  ['Ratona pino marítimo', 'ratona', 'Pino marítimo', null, null, 'Terminación sedosa', 'img/ratona-pino.jpg', null],
  ['Ratona ciprés', 'ratona', 'Ciprés', '2"', '1,30 × 0,85 m', null, 'img/ratona-cipres.jpg', null],
  ['Ratona con base de hierro', 'ratona', null, null, null, 'Base de hierro', H + 'ratonas/01.jpg', null],
  ['Ratona frente a la estufa', 'ratona', null, null, null, 'Borde vivo', H + 'ratonas/02.jpg', H + 'ratonas/02.mp4'],
  ['Ratona borde vivo', 'ratona', null, null, null, 'Base de hierro', H + 'ratonas/04.jpg', null],
  ['Ratona patas macizas', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ratonas/05.jpg', null],
  ['Ratona para el living', 'ratona', null, null, null, 'Borde vivo', H + 'ratonas/06.jpg', null],
  ['Ratona maciza', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ratonas/08.jpg', null],
  ['Ratonas en stock', 'ratona', 'Pino marítimo y ciprés', null, null, 'En stock', H + 'ratonas/17.jpg', H + 'ratonas/17.mp4'],
  ['Ratona base de hierro', 'ratona', null, null, null, 'Base de hierro', H + 'ratonas/03.jpg', H + 'ratonas/03.mp4'],
  ['Ratona patas macizas en el living', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ratonas/07.jpg', null],
  ['Ratona elegancia y robustez', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ratonas/09.jpg', null],
  ['Ratona frente al fuego', 'ratona', 'Pino marítimo', null, null, 'Terminación sedosa', H + 'ratonas/11.jpg', null],
  ['Ratona ciprés en su nuevo hogar', 'ratona', 'Ciprés', '2"', '1,30 × 0,85 m', null, H + 'ratonas/14.jpg', H + 'ratonas/14.mp4'],
  ['Ratona ciprés 1,30 m', 'ratona', 'Ciprés', '2"', '1,30 × 0,85 m', null, H + 'ratonas/15.jpg', null],
  ['Ratona ciprés borde vivo', 'ratona', 'Ciprés', '2"', null, 'Borde vivo', H + 'ratonas/16.jpg', null],
  // ¡Ustedes! (muebles ya entregados) y Procesos (el taller)
  ['Ratona: clienta feliz', 'ratona', null, null, null, 'Base de hierro', H + 'ustedes/01.jpg', null],
  ['Ratona lista para enviar', 'ratona', null, null, null, 'Embalada para envío', H + 'ustedes/05.jpg', H + 'ustedes/05.mp4'],
  ['Ratona: gracias por la confianza', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ustedes/07.jpg', null],
  ['Ratona: cliente contento', 'ratona', null, null, null, 'Borde vivo', H + 'ustedes/09.jpg', null],
  ['Ratona maciza: cliente contento', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ustedes/10.jpg', null],
  ['Ratona con velas: cliente contento', 'ratona', null, null, null, 'Patas de madera maciza', H + 'ustedes/11.jpg', null],
  ['Ratona ciprés entregada', 'ratona', 'Ciprés', null, null, null, H + 'ustedes/16.jpg', H + 'ustedes/16.mp4'],
  ['Ratona pino marítimo en su nuevo hogar', 'ratona', 'Pino marítimo', null, null, null, H + 'ustedes/18.jpg', H + 'ustedes/18.mp4'],
  ['Pedidos embalados', 'ratona', null, null, null, 'Envíos a todo el país', H + 'ustedes/24.jpg', H + 'ustedes/24.mp4'],
  ['Rodajas en el taller', 'ratona', null, null, null, 'En proceso', H + 'procesos/01.jpg', H + 'procesos/01.mp4'],
  ['Puliendo una rodaja', 'ratona', null, null, null, 'En proceso', H + 'procesos/02.jpg', H + 'procesos/02.mp4'],
  ['Lijado de la pieza', 'ratona', null, null, null, 'Del grano 60 al 140', H + 'procesos/04.jpg', H + 'procesos/04.mp4'],
  ['Nivelando el tablón', 'ratona', null, null, null, 'En proceso', H + 'procesos/05.jpg', null],
  ['Rodaja para mesa ratona', 'ratona', null, null, null, 'En proceso · base de hierro', H + 'procesos/06.jpg', H + 'procesos/06.mp4'],
  ['Mesa ratona en proceso', 'ratona', null, null, null, 'En proceso', H + 'procesos/07.jpg', H + 'procesos/07.mp4'],
  ['Ratona rodaja', 'ratona', null, null, null, 'Rodaja · base de hierro', H + 'ratonas-rodaja/01.jpg', null],
  ['Ratona rodaja oscura', 'ratona', null, null, null, 'Rodaja · base de hierro', H + 'ratonas-rodaja/02.jpg', null],
  ['Ratona rodaja natural', 'ratona', null, null, null, 'Rodaja · base de hierro', H + 'ratonas-rodaja/03.jpg', null],

  ['Barra con base de hierro', 'barra', null, null, 'A medida', 'Base de hierro', 'img/barra-hierro.jpg', null],
  ['Mesada en ciprés', 'barra', 'Ciprés', '2"', '2,50 × 0,70 m', null, 'img/mesada-lambertiana-poster.jpg', 'img/mesada-lambertiana.mp4'],
  ['Tapa de mesada ciprés', 'barra', 'Ciprés', '2"', null, 'Mesada · barra', 'img/mesada-cipres.jpg', null],
  ['Barra pino marítimo', 'barra', 'Pino marítimo', null, null, 'Barra · desayunador', 'img/barras-maritimo.jpg', null],
  ['Barra a medida', 'barra', null, null, 'A medida', null, H + 'barras/01.jpg', null],
  ['Barra cocina y barbacoa', 'barra', null, null, null, 'Para exterior', H + 'barras/05.jpg', null],
  ['Barra en marítimo', 'barra', 'Pino marítimo', null, null, 'Terminación sedosa', H + 'barras/06.jpg', H + 'barras/06.mp4'],
  ['Barra borde vivo', 'barra', 'Pino marítimo', null, null, 'Borde vivo', H + 'barras/07.jpg', H + 'barras/07.mp4'],
  ['Barra rústica', 'barra', null, null, 'A medida', null, H + 'barras/02.jpg', null],
  ['Barra en caballetes', 'barra', null, null, 'A medida', null, H + 'barras/03.jpg', null],
  ['Barra mesada lista para entregar', 'barra', null, null, null, null, H + 'barras/04.jpg', H + 'barras/04.mp4'],
  ['Barra en marítimo oscuro', 'barra', 'Pino marítimo', null, null, 'Borde vivo', H + 'barras/08.jpg', null],
  ['Barra borde vivo oscura', 'barra', 'Pino marítimo', null, null, 'Borde vivo', H + 'barras/09.jpg', null],
  ['Barra marítimo en el living', 'barra', 'Pino marítimo', null, null, 'Borde vivo', H + 'barras/10.jpg', null],
  ['Mesada en ciprés hecha a medida', 'barra', 'Ciprés', null, null, 'Hecha a medida', H + 'barras/11.jpg', H + 'barras/11.mp4'],
  ['Mesada ciprés 2,50 m', 'barra', 'Ciprés', '2"', '2,50 × 0,70 m', null, H + 'barras/12.jpg', H + 'barras/12.mp4'],
  ['Barra: el proceso', 'barra', null, null, null, 'Paso a paso en el taller', H + 'barras/13.jpg', H + 'barras/13.mp4'],
  ['Barra casi lista', 'barra', null, null, null, 'Paso a paso en el taller', H + 'barras/14.jpg', H + 'barras/14.mp4'],
  ['Mesada con bacha', 'barra', null, null, null, 'Para exterior', H + 'encimeras/01.jpg', null],
  ['Mesada con bacha exterior', 'barra', null, null, null, 'Para exterior', H + 'encimeras/02.jpg', null],
  ['Mesada con bacha y hierro', 'barra', null, null, null, 'Para exterior', H + 'encimeras/03.jpg', null],
  ['Desayunador con banquetas', 'barra', null, null, null, 'Barra · desayunador', H + 'desayunador/01.jpg', null],
  ['Barra rústica en pino marítimo', 'barra', 'Pino marítimo', null, null, 'Cliente feliz', H + 'ustedes/03.jpg', null],
  ['Barra parrillero', 'barra', null, null, null, 'Para exterior', H + 'ustedes/04.jpg', H + 'ustedes/04.mp4'],
  ['Desayunador en el balcón', 'barra', null, null, null, 'Base de hierro', H + 'ustedes/08.jpg', null],
  ['Barra lista y entregada', 'barra', null, null, null, null, H + 'ustedes/15.jpg', H + 'ustedes/15.mp4'],
  ['Barra para pizzería', 'barra', null, null, null, 'Para emprendimientos', H + 'ustedes/17.jpg', H + 'ustedes/17.mp4'],
  ['Barra en La Magia pizzería', 'barra', null, null, null, 'Para emprendimientos', H + 'ustedes/20.jpg', H + 'ustedes/20.mp4'],
  ['Tablón entregado en tiempo y forma', 'barra', null, null, null, 'Envíos a todo el país', H + 'ustedes/21.jpg', H + 'ustedes/21.mp4'],
  ['Mesada: quedó divina', 'barra', null, null, null, null, H + 'ustedes/22.jpg', H + 'ustedes/22.mp4'],
  ['Mesada casi lista', 'barra', null, null, null, 'Paso a paso en el taller', H + 'ustedes/23.jpg', H + 'ustedes/23.mp4'],

  ['Mesa comedor hierro y madera', 'mesa', null, null, null, 'Base de hierro', H + 'mesa-comedor/01.jpg', H + 'mesa-comedor/01.mp4'],
  ['Mesa comedor ciprés', 'mesa', 'Ciprés', null, null, 'Borde vivo', H + 'mesa-comedor/02.jpg', null],
  ['Mesa comedor en hierro', 'mesa', null, null, null, 'Base de hierro', H + 'mesa-comedor/03.jpg', null],
  ['Mesa comedor borde vivo', 'mesa', null, null, null, 'Borde vivo', H + 'mesa-comedor/04.jpg', null],
  ['Escritorio en ciprés', 'mesa', 'Ciprés', null, null, 'Hecho a medida', H + 'escritorio/01.jpg', H + 'escritorio/01.mp4'],
  ['Mesa con trabajo de herrería', 'mesa', null, null, null, 'Base de hierro', H + 'ustedes/02.jpg', H + 'ustedes/02.mp4'],
  ['Mesa empaquetada para envío', 'mesa', null, null, null, 'Envíos a todo el país', H + 'ustedes/13.jpg', H + 'ustedes/13.mp4'],
  ['Mesas de comedor', 'mesa', null, null, null, 'En stock', 'img/mesas-stock.jpg', null],

  ['Rack TV ciprés', 'rack', 'Ciprés', '2"', '170 × 35 × 70 cm', null, 'img/rack-cipres.jpg', H + 'rack-tv/01.mp4'],
  ['Rack en su nuevo hogar', 'rack', null, null, null, null, H + 'ustedes/19.jpg', H + 'ustedes/19.mp4'],

  ['Tablas para picar', 'tabla', null, null, null, 'Veta natural', H + 'tablas/01.jpg', null],
  ['Tabla para asado', 'tabla', null, null, null, 'Para la parrilla', H + 'tablas/02.jpg', null],
  ['Tabla para picada', 'tabla', null, null, null, null, H + 'tablas/03.jpg', H + 'tablas/03.mp4'],
  ['Tabla con mango', 'tabla', null, null, null, null, H + 'tablas/04.jpg', null],
  ['Tabla grabada', 'tabla', null, null, null, 'Grabado personalizado', H + 'tablas/05.jpg', H + 'tablas/05.mp4'],
  ['Tablas grabadas', 'tabla', null, null, null, 'Grabado personalizado', H + 'tablas/06.jpg', H + 'tablas/06.mp4'],
  ['Tabla con cuchillo', 'tabla', null, null, null, null, H + 'ustedes/06.jpg', H + 'ustedes/06.mp4'],
  ['Tabla con figura de toro', 'tabla', null, null, null, 'Cliente contento', H + 'ustedes/12.jpg', null],
  ['Tablas para regalar', 'tabla', null, null, null, 'Grabado personalizado', H + 'ustedes/14.jpg', H + 'ustedes/14.mp4'],
];

// Round-robin by category so the first rows show variety; first two items lead
const byCat = {};
for (const p of pieces) (byCat[p[1]] ||= []).push(p);
const order = [];
for (let i = 0; order.length < pieces.length; i++)
  for (const c of ['ratona', 'barra', 'mesa', 'tabla', 'rack']) if (byCat[c]?.[i]) order.push(byCat[c][i]);

const rows = order.map((p, i) => ({
  name: p[0], category: p[1], wood: p[2], thickness: p[3], size: p[4], detail: p[5],
  image_url: p[6], video_url: p[7], sort: (i + 1) * 10, visible: true
}));

writeFileSync('js/catalogo.js',
  '// Copia de respaldo del catálogo (se genera con supabase/catalogo.mjs). Se usa si Supabase no responde.\n' +
  'window.RUSTICANDO_CATALOGO = ' + JSON.stringify(rows) + ';\n');

const q = v => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
writeFileSync('supabase/catalogo.sql',
`-- Catálogo inicial (generado con supabase/catalogo.mjs). Reemplaza TODAS las piezas.
delete from public.products;
insert into public.products (name, category, wood, thickness, size, detail, price, image_url, video_url, sort, visible) values
${rows.map(r => `  (${[r.name, r.category, r.wood, r.thickness, r.size, r.detail, null, r.image_url, r.video_url].map(q).join(', ')}, ${r.sort}, true)`).join(',\n')};
`);
console.log(rows.length, 'piezas');
