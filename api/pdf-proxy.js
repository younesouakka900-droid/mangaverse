export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'file مطلوب' });

  const GH_TOKEN = process.env.GITHUB_TOKEN;
  const rawUrl = `https://raw.githubusercontent.com/younesouakka900-droid/mangaverse-pdf/main/files/${file}`;

  try {
    const r = await fetch(rawUrl, {
      headers: GH_TOKEN ? { Authorization: `token ${GH_TOKEN}` } : {}
    });

    if (!r.ok) return res.status(r.status).json({ error: 'فشل جلب الملف' });

    const buf = await r.arrayBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
