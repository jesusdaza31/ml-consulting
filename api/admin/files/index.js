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
        const { data: files, error } = await supabaseAdmin
          .from('files')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        if (!files) return res.json({ files: [] });

        const result = [];
        for (const f of files) {
          const getUrl = await r2.signGetUrl(f.key);
          result.push({
            id: f.id,
            key: f.key,
            originalName: f.original_name,
            size: f.size,
            mime: f.mime,
            category: f.category,
            createdAt: f.created_at,
            getUrl
          });
        }

        res.json({ files: result });
      } catch (e) {
        res.status(500).json({ error: 'No se pudieron listar los archivos.' });
      }
    });
  });
};
