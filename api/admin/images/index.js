const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const r2 = require('../../lib/r2');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!r2.isConfigured()) {
    return res.status(503).json({ error: 'R2 no configurado', r2Missing: true });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      try {
        const { data: images, error } = await supabaseAdmin
          .from('images')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        if (!images) return res.json({ images: [] });

        const result = [];
        for (const img of images) {
          const getUrl = await r2.signGetUrl(img.key);
          result.push({
            id: img.id,
            key: img.key,
            originalName: img.original_name,
            size: img.size,
            mime: img.mime,
            createdAt: img.created_at,
            getUrl
          });
        }

        res.json({ images: result });
      } catch (e) {
        res.status(500).json({ error: 'No se pudieron listar las imagenes.' });
      }
    });
  });
};
