// Vercel Function — proxy de imágenes MapaProp (exigen Referer propio, bloquean hotlinking)
module.exports = async function handler(req, res) {
  const url = req.query && req.query.url;
  if (!url || !/^https:\/\/images\.mapaprop\.app\//.test(url)) {
    return res.status(400).send('URL inválida');
  }

  try {
    const upstream = await fetch(url, { headers: { Referer: 'https://mapaprop.app/' } });
    if (!upstream.ok) {
      return res.status(upstream.status).send('Error al obtener imagen');
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(500).send('Error: ' + err.message);
  }
};
