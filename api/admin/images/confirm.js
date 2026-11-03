const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const body = req.body || {};
      const id = String(body.id || '');
      const key = String(body.key || '');
      const filename = String(body.filename || 'imagen');
      const size = Number(body.size);
      const mime = String(body.mime || 'image/png');

      if (!id || !key) return res.status(400).json({ error: 'Faltan datos de la imagen.' });
      if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: 'Tamano invalido.' });

      const { data: image, error } = await supabaseAdmin
        .from('images')
        .insert({
          id,
          key,
          original_name: filename,
          size,
          mime
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      res.status(201).json({
        image: {
          id: image.id,
          key: image.key,
          originalName: image.original_name,
          size: image.size,
          mime: image.mime,
          createdAt: image.created_at
        }
      });
    });
  });
};
