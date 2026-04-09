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
    titulo:      p.title || 'Propiedad en General Rodríguez',
    imagen:      p.mainImage || imagenes[0] || '',
    imagenes,
    link:        p.seoUrl ? `https://mapaprop.app/propiedades/${p.seoUrl}` : '',
    codigo:      p.code || '',
    tipo:        String(operation) === '2' ? 'Alquiler' : 'Venta',
    moneda:      p.currency === 'USD' ? 'USD' : 'ARS',
    precio,
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

(async () => {
  console.log('Actualizando properties.json...\n');
  try {
    const ventas     = await fetchAll(1);
    const alquileres = await fetchAll(2);
    const all        = [...ventas, ...alquileres];

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
