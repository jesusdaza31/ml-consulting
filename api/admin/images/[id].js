const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const r2 = require('../../lib/r2');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const imageId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: image, error } = await supabaseAdmin
        .from('images')
        .select('*')
        .eq('id', imageId)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!image) return res.status(404).json({ error: 'Imagen no encontrada' });

      await supabaseAdmin.from('images').delete().eq('id', imageId);

      if (r2.isConfigured()) {
        await r2.deleteObject(image.key);
      }

      res.json({ ok: true });
    });
  });
};
