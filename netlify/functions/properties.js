// Netlify Function — proxy seguro para MapaProp Express API
// Incluye caché en memoria por 2 horas para reducir invocaciones

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=7200"  // CDN cachea 2 horas
};

// Caché en memoria (dura mientras el container está vivo, ~15 min típico)
const _cache = {};
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas en ms

exports.handler = async function(event) {
  const TOKEN = process.env.MAPAPROP_TOKEN;
  if (!TOKEN) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: "Token no configurado" }) };
  }

  const params = event.queryStringParameters || {};
  const operation = params.operation || '1';
  const fetchAll  = params.all === 'true';

  // Solo cachear el modo fetchAll (el más costoso)
  if (fetchAll) {
    const cacheKey = `op_${operation}`;
    const cached = _cache[cacheKey];
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      return { statusCode: 200, headers: HEADERS, body: cached.body };
    }
  }

  try {
    if (!fetchAll) {
      const page = params.page || '0';
      const url  = `https://mapaprop.app/api/action/express-v1/properties?oauth_token=${TOKEN}&operation=${operation}&page=${page}`;
      const res  = await fetch(url, { headers: { "Authorization": `Bearer ${TOKEN}` } });
      const data = await res.json();
      return { statusCode: res.status, headers: HEADERS, body: JSON.stringify(data) };
    }

    // Modo fetchAll — trae todas las páginas
    const SIZE = 20;
    const firstUrl = `https://mapaprop.app/api/action/express-v1/properties?oauth_token=${TOKEN}&operation=${operation}&from=0&size=${SIZE}`;
    const firstRes  = await fetch(firstUrl, { headers: { "Authorization": `Bearer ${TOKEN}` } });
    const firstData = await firstRes.json();

    if (!firstData.properties || !firstData.properties.length) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify([]) };
    }

    const total = firstData.total || firstData.properties.length;
    let raw = [...firstData.properties];

    let from = SIZE;
    while (from < total) {
      try {
        const url = `https://mapaprop.app/api/action/express-v1/properties?oauth_token=${TOKEN}&operation=${operation}&from=${from}&size=${SIZE}`;
        const r = await fetch(url, { headers: { "Authorization": `Bearer ${TOKEN}` } });
        if (r.ok) {
          const d = await r.json();
          if (d.properties && d.properties.length) raw = raw.concat(d.properties);
          else break;
        } else break;
      } catch (_) { break; }
      from += SIZE;
    }

    const seen = new Set();
    const unique = raw.filter(p => {
      const key = p.code || p.propertyHash;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const mapped = unique.map(p => mapProperty(p, operation));
    const body   = JSON.stringify(mapped);

    // Guardar en caché
    _cache[`op_${operation}`] = { ts: Date.now(), body };

    return { statusCode: 200, headers: HEADERS, body };

  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};

function mapProperty(p, operation) {
  const currency = p.currency === 'USD' ? 'U$S' : '$';
  const precio   = p.price
    ? `${currency} ${Number(p.price).toLocaleString('es-AR')}`
    : 'Consultar';

  const tipoMap = {
    'casa': 'casa', 'departamento': 'departamento', 'depto': 'departamento',
    'terreno': 'terreno', 'lote': 'terreno', 'local': 'local',
    'oficina': 'oficina', 'galpon': 'galpon', 'galpón': 'galpon',
    'quinta': 'quinta', 'ph': 'departamento', 'cochera': 'cochera',
    'duplex': 'duplex', 'dúplex': 'duplex', 'townhouse': 'duplex', 'chalet': 'casa'
  };

  const imagenes = (p.images || [])
    .sort((a, b) => a.order - b.order)
    .map(i => i.image);

  const superficie = p.buildingArea
    ? `${p.buildingArea} m²`
    : p.landArea ? `${p.landArea} m²` : null;

  // Campos directos de MapaProp (no en attributes)
  const dormVal   = p.bedrooms  || null;
  const banosVal  = p.bathrooms || null;
  const cocheraVal = p.garages  || 0;

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
    codigo:      (p.code || '').replace(/^(\w+)-\1-/i, '$1-'),  // quitar prefijo duplicado ej: "969-969-"
    tipo:        String(operation) === '2' ? 'Alquiler' : 'Venta',
    moneda:      p.currency === 'USD' ? 'USD' : 'ARS',
    precio,
    dormitorios: dormVal,
    banos:       banosVal,
    superficie,
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
