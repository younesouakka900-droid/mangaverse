export const config = {
  api: {
    bodyParser: {
      sizeLimit: '60mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { fileName, fileBase64 } = req.body;

    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'fileName و fileBase64 مطلوبان' });
    }

    const GH_TOKEN  = process.env.GITHUB_TOKEN;
    const GH_OWNER  = 'younesouakka900-droid';
    const GH_REPO   = 'mangaverse-pdf';
    const GH_BRANCH = 'main';

    if (!GH_TOKEN) {
      return res.status(500).json({ error: 'GITHUB_TOKEN غير موجود' });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}_${safeName}`;
    const path = `files/${uniqueName}`;

    const ghRes = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GH_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `رفع: ${uniqueName}`,
          content: fileBase64,
          branch: GH_BRANCH,
        }),
      }
    );

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({}));
      return res.status(500).json({ error: err.message || 'فشل الرفع' });
    }

    const cdnUrl = `https://cdn.jsdelivr.net/gh/${GH_OWNER}/${GH_REPO}@${GH_BRANCH}/${path}`;
    return res.status(200).json({ url: cdnUrl });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'خطأ غير متوقع' });
  }
}
