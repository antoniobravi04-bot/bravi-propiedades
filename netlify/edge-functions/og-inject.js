/**
 * og-inject.js — Netlify Edge Function
 * Intercepta pedidos a /propiedad.html?id=XXX y reemplaza
 * los OG meta tags con datos reales de la propiedad.
 * Los bots (WhatsApp, Facebook, Twitter, Google) leen estos tags
 * sin ejecutar JavaScript.
 */

export default async (request, context) => {
  const url = new URL(request.url);
  const propId = url.searchParams.get('id');

  // Sin ?id= → dejar pasar sin modificar
  if (!propId) return context.next();

  // Obtener el HTML original de la página
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // Obtener properties.json desde la propia web (ya es público)
  let prop = null;
  try {
    const propsRes = await fetch('https://bravipropiedades.com.ar/properties.json', {
      headers: { 'Cache-Control': 'max-age=240' }
    });
    const props = await propsRes.json();
    prop = props.find(p => String(p.id) === String(propId));
  } catch (e) {
    // Si falla la carga, devolver la página sin modificar
    return response;
  }

  if (!prop) return response;

  // Construir los valores correctos
  const titulo   = (prop.titulo || 'Propiedad') + ' | Bravi Propiedades';
  const desc     = [prop.tipo, prop.tipoProp, prop.precio, prop.ciudad || 'General Rodríguez']
                     .filter(Boolean).join(' — ');
  const imagen   = prop.imagen || 'https://bravipropiedades.com.ar/hero-bg-1.jpg';
  const pageUrl  = `https://bravipropiedades.com.ar/propiedad.html?id=${propId}`;

  // Escapar caracteres especiales para insertar en HTML
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Modificar el HTML estático con los tags correctos
  let html = await response.text();

  html = html
    .replace(
      /<meta property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${esc(titulo)}" />`
    )
    .replace(
      /<meta property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${esc(desc)}" />`
    )
    .replace(
      /<meta property="og:image"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${esc(imagen)}" />`
    )
    .replace(
      /<meta property="og:url"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${esc(pageUrl)}" />`
    )
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${esc(prop.titulo || 'Propiedad')} | Bravi Propiedades</title>`
    );

  // Agregar Twitter Cards si no existen
  if (!html.includes('twitter:card')) {
    const twitterTags = `
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(titulo)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(imagen)}" />`;
    html = html.replace('</head>', twitterTags + '\n</head>');
  }

  return new Response(html, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers),
      'content-type': 'text/html; charset=utf-8',
    },
  });
};

export const config = { path: '/propiedad.html' };
