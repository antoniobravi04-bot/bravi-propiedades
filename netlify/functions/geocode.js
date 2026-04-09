const https = require('https');

exports.handler = async function(event) {
  const q = (event.queryStringParameters || {}).q || '';
  if (!q) return { statusCode: 400, body: JSON.stringify({ error: 'Missing q' }) };

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=es`;

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'BraviPropiedades/1.0 (bravipropiedades.com.ar)',
          'Accept': 'application/json'
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve(body));
      }).on('error', reject);
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
      body: data
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
