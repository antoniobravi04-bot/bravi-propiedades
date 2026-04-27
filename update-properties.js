/**
 * update-properties.js
 * Genera properties.json con todas las propiedades desde la API de MapaProp.
 *
 * Uso: node update-properties.js
 * Requiere: MAPAPROP_TOKEN en variable de entorno o en .env
 *
 * Después de correr este script, hacer deploy para publicar las propiedades actualizadas.
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// Cargar .env si existe
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
} catch (_) {}

const TOKEN = process.env.MAPAPROP_TOKEN;
if (!TOKEN) {
  console.error('Error: MAPAPROP_TOKEN no encontrado. Creá un archivo .env con MAPAPROP_TOKEN=...');
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Verifica si una URL de imagen responde 200. Timeout de 5s.
function checkUrl(url) {
  return new Promise(resolve => {
    const req = https.request(url, { method: 'HEAD', timeout: 5000 }, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Valida un array de URLs en paralelo (máx. CONCURRENCY a la vez)
// Devuelve solo las URLs que responden 200.
async function filterValidUrls(urls, concurrency = 10) {
  const valid = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(u => checkUrl(u)));
    batch.forEach((u, j) => { if (results[j]) valid.push(u); });
  }
  return valid;
}

const tipoMap = {
  'casa': 'casa', 'departamento': 'departamento', 'depto': 'departamento',
  'terreno': 'terreno', 'lote': 'terreno', 'local': 'local',
  'oficina': 'oficina', 'galpon': 'galpon', 'galpón': 'galpon',
  'quinta': 'quinta', 'ph': 'departamento', 'cochera': 'cochera',
  'duplex': 'duplex', 'dúplex': 'duplex', 'townhouse': 'duplex', 'chalet': 'casa'
};

function mapProperty(p, operation) {
  const currency = p.currency === 'USD' ? 'U$S' : '$';
  const precio   = p.price
    ? `${currency} ${Number(p.price).toLocaleString('es-AR')}`
    : 'Consultar';

  const imagenes = (p.images || []).sort((a, b) => a.order - b.order).map(i => i.image);

  // Campos directos de MapaProp (no en attributes)
  const dormVal    = p.bedrooms  || null;
  const banosVal   = p.bathrooms || null;
  const cocheraVal = p.garages   || 0;

  // Amenities booleanas (alarma, pileta, quincho, etc.)
  const amenities = (p.attributes || [])
    .filter(a => a.status === true)
    .map(a => a.label);

  return {
    id:          p.id || p.propertyHash,
    titulo:      (() => { const t = p.title || 'Propiedad en General Rodríguez'; return t === t.toUpperCase() ? t.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : t; })(),
    imagen:      p.mainImage || imagenes[0] || '',
    imagenes,
    link:        p.seoUrl ? `https://mapaprop.app/propiedades/${p.seoUrl}` : '',
    codigo:      p.code || '',
    tipo:        String(operation) === '2' ? 'Alquiler' : 'Venta',
    moneda:      p.currency === 'USD' ? 'USD' : 'ARS',
    precio,
    precioNum:   p.price ? Number(p.price) : null,
    dormitorios: dormVal,
    banos:       banosVal,
    superficie:  p.buildingArea ? `${p.buildingArea} m²` : p.landArea ? `${p.landArea} m²` : null,
    tipoProp:    tipoMap[(p.propertyType || '').toLowerCase()] || (p.propertyType || '').toLowerCase(),
    descripcion: p.descriptionFormatted || p.description || '',
    direccion:   p.address || '',
    ciudad:      p.city || 'General Rodríguez',
    ambientes:   p.ambiences  || null,
    supCubierta: p.buildingArea ? `${p.buildingArea} m²` : null,
    supTerreno:  p.landArea     ? `${p.landArea} m²`     : null,
    zona:        p.zone || p.county || '',
    cochera:     cocheraVal,
    amenities,
    lat:         p.location && p.location.lat ? parseFloat(p.location.lat) : null,
    lon:         p.location && p.location.lon ? parseFloat(p.location.lon) : null,
  };
}

async function fetchAll(operation) {
  const base = `https://mapaprop.app/api/action/express-v1/properties?oauth_token=${TOKEN}&operation=${operation}`;
  console.log(`  Fetcheando operación ${operation === 1 ? 'Venta' : 'Alquiler'}...`);

  const SIZE = 20;

  // Primera página
  const first = await get(`${base}&from=0&size=${SIZE}`);
  if (!first.properties || !first.properties.length) return [];

  const total = first.total || first.properties.length;
  console.log(`  Total: ${total} propiedades`);

  let raw = [...first.properties];

  // Paginar con offset hasta traer todas
  let from = SIZE;
  while (from < total) {
    try {
      const d = await get(`${base}&from=${from}&size=${SIZE}`);
      if (d.properties && d.properties.length) {
        raw = raw.concat(d.properties);
        process.stdout.write(`  Cargando... ${raw.length}/${total}\r`);
      } else {
        break;
      }
    } catch (_) { break; }
    from += SIZE;
  }

  // Deduplicar por propertyHash (solo descarta si ya fue visto, nunca descarta sin clave)
  const seen = new Set();
  const unique = raw.filter(p => {
    const key = p.propertyHash || p.code;
    if (key) {
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
  console.log(`  (${raw.length} raw → ${unique.length} únicos después de deduplicar)`);

  return unique.map(p => mapProperty(p, operation));
}

// Valida y limpia las imágenes de todas las propiedades.
// Filtra URLs rotas (403/404) y sincroniza la imagen principal.
async function validarImagenes(props) {
  console.log('\n  Validando imágenes...');

  // Recolectar todas las URLs únicas a chequear
  const allUrls = new Set();
  props.forEach(p => {
    if (p.imagen) allUrls.add(p.imagen);
    (p.imagenes || []).forEach(u => allUrls.add(u));
  });

  // Chequear todas en paralelo (lotes de 10)
  const urlList = [...allUrls];
  const valid = new Set();
  for (let i = 0; i < urlList.length; i += 10) {
    const batch = urlList.slice(i, i + 10);
    const results = await Promise.all(batch.map(u => checkUrl(u)));
    batch.forEach((u, j) => { if (results[j]) valid.add(u); });
    process.stdout.write(`  Chequeando... ${Math.min(i + 10, urlList.length)}/${urlList.length}\r`);
  }

  let rotas = 0;
  const cleaned = props.map(p => {
    const imagenes = (p.imagenes || []).filter(u => valid.has(u));
    const diff = (p.imagenes || []).length - imagenes.length;
    if (diff > 0) rotas += diff;

    // Si la imagen principal está rota, usar la primera válida del array
    const imagen = valid.has(p.imagen) ? p.imagen : (imagenes[0] ? imagenes[0].replace(/\.jpg$/i, 't.jpg') : '');

    return { ...p, imagen, imagenes };
  });

  console.log(`  ${rotas > 0 ? `⚠️  ${rotas} URLs rotas eliminadas` : '✅ Todas las imágenes OK'}`);
  return cleaned;
}

(async () => {
  console.log('Actualizando properties.json...\n');
  try {
    const ventas     = await fetchAll(1);
    const alquileres = await fetchAll(2);
    let all          = [...ventas, ...alquileres];

    // Validar y limpiar imágenes rotas
    all = await validarImagenes(all);

    const outPath = path.join(__dirname, 'properties.json');
    fs.writeFileSync(outPath, JSON.stringify(all, null, 2));

    console.log(`\n✅ Listo! ${ventas.length} ventas + ${alquileres.length} alquileres = ${all.length} propiedades`);
    console.log(`   Guardado en: ${outPath}`);
    console.log('\n   Ahora hacé deploy para publicar los cambios.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
