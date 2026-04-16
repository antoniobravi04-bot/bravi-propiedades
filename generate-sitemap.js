/**
 * generate-sitemap.js
 * Genera sitemap.xml a partir de properties.json.
 * Se ejecuta automáticamente después de update-properties.js en el workflow.
 */

const fs   = require('fs');
const path = require('path');

const BASE_URL = 'https://bravipropiedades.com.ar';
const today    = new Date().toISOString().split('T')[0];

const props = JSON.parse(fs.readFileSync(path.join(__dirname, 'properties.json'), 'utf8'));

const staticPages = [
  { url: '/',               priority: '1.0', changefreq: 'weekly'  },
  { url: '/ventas.html',    priority: '0.9', changefreq: 'daily'   },
  { url: '/alquileres.html',priority: '0.9', changefreq: 'daily'   },
];

const propPages = props.map(p => ({
  url:        `/propiedad.html?id=${p.id}`,
  priority:   '0.7',
  changefreq: 'weekly',
}));

const allPages = [...staticPages, ...propPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml);
console.log(`✅ sitemap.xml generado con ${allPages.length} URLs (${props.length} propiedades)`);
