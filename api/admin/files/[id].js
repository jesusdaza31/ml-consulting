const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const r2 = require('../../lib/r2');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fileId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: file, error } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('id', fileId)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!file) return res.status(404).json({ error: 'Archivo no encontrado' });

      await supabaseAdmin.from('files').delete().eq('id', fileId);

      if (r2.isConfigured()) {
        await r2.deleteObject(file.key);
      }

      res.json({ ok: true });
    });
  });
};
