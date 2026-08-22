const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const r2 = require('../../lib/r2');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const videoId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: video, error } = await supabaseAdmin
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!video) return res.status(404).json({ error: 'Video no encontrado' });

      await supabaseAdmin.from('videos').delete().eq('id', videoId);

      if (r2.isConfigured()) {
        await r2.deleteObject(video.key);
      }

      res.json({ ok: true });
    });
  });
};
