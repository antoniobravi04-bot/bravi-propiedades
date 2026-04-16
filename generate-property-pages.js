/**
 * generate-property-pages.js
 * Genera una página HTML estática por cada propiedad en /p/UUID.html
 * con los Open Graph tags correctos (título, imagen, descripción).
 *
 * Cómo funciona:
 * - Los bots (WhatsApp, Facebook, Telegram, Google) leen los OG tags estáticos ✅
 * - El navegador del usuario ejecuta el JS y es redirigido a propiedad.html?id=UUID ✅
 *
 * Se ejecuta en el workflow de GitHub Actions después de update-properties.js.
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL = 'https://bravipropiedades.com.ar';
const OUT_DIR  = path.join(__dirname, 'p');

// Leer properties.json
const props = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'properties.json'), 'utf8')
);

// Crear carpeta /p/ si no existe
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

// Limpiar archivos anteriores para no acumular propiedades eliminadas
const existing = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.html'));
existing.forEach(f => fs.unlinkSync(path.join(OUT_DIR, f)));

// Función para escapar HTML
const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

let count = 0;

for (const p of props) {
  if (!p.id) continue;

  const titulo    = p.titulo || 'Propiedad en General Rodríguez';
  const tituloFull = `${titulo} | Bravi Propiedades`;
  const desc      = [p.tipo, p.tipoProp, p.precio, p.ciudad || 'General Rodríguez']
                      .filter(Boolean).join(' — ');
  const imagen    = p.imagen || `${BASE_URL}/hero-bg-1.jpg`;
  const shareUrl  = `${BASE_URL}/p/${p.id}`;
  const propUrl   = `${BASE_URL}/propiedad.html?id=${p.id}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="refresh" content="0;url=${propUrl}" />
  <title>${esc(tituloFull)}</title>

  <!-- Open Graph — leídos por WhatsApp, Facebook, Telegram, LinkedIn -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="Bravi Propiedades" />
  <meta property="og:title"       content="${esc(tituloFull)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image"       content="${esc(imagen)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"         content="${esc(shareUrl)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(tituloFull)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image"       content="${esc(imagen)}" />

  <link rel="canonical" href="${esc(propUrl)}" />
</head>
<body>
  <script>window.location.replace('${propUrl}');</script>
  <noscript>
    <p>Redirigiendo… <a href="${propUrl}">Ver propiedad</a></p>
  </noscript>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, `${p.id}.html`), html, 'utf8');
  count++;
}

console.log(`✅ ${count} páginas de propiedad generadas en /p/`);
