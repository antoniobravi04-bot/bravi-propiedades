const https = require('https');

module.exports = async function handler(req, res) {
  const q = (req.query || {}).q || '';
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=es`;

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'BraviPropiedades/1.0 (bravipropiedades.com.ar)',
          'Accept': 'application/json'
        }
      }, (response) => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve(body));
      }).on('error', reject);
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
