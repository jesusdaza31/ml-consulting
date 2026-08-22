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
      const filename = String(body.filename || 'video');
      const size = Number(body.size);
      const mime = String(body.mime || 'video/mp4');

      if (!id || !key) return res.status(400).json({ error: 'Faltan datos del video.' });
      if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: 'Tamano invalido.' });

      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .insert({
          id,
          key,
          original_name: filename,
          size,
          mime,
          curso_id: null
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      res.status(201).json({
        video: {
          id: video.id,
          key: video.key,
          originalName: video.original_name,
          size: video.size,
          mime: video.mime,
          createdAt: video.created_at
        }
      });
    });
  });
};
