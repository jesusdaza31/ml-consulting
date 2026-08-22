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
        const { data: videos, error } = await supabaseAdmin
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        if (!videos) return res.json({ videos: [] });

        const result = [];
        for (const v of videos) {
          const getUrl = await r2.signGetUrl(v.key);
          result.push({
            id: v.id,
            key: v.key,
            originalName: v.original_name,
            size: v.size,
            mime: v.mime,
            cursoId: v.curso_id,
            createdAt: v.created_at,
            getUrl
          });
        }

        res.json({ videos: result });
      } catch (e) {
        res.status(500).json({ error: 'No se pudo listar los videos.' });
      }
    });
  });
};
