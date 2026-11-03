const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const { inferCategory } = require('../../lib/file-validation');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const body = req.body || {};
      const id = String(body.id || '');
      const key = String(body.key || '');
      const filename = String(body.filename || 'documento');
      const size = Number(body.size);
      const mime = String(body.mime || 'application/pdf');

      if (!id || !key) return res.status(400).json({ error: 'Faltan datos del archivo.' });
      if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: 'Tamano invalido.' });

      const category = inferCategory(filename) || 'document';

      const { data: file, error } = await supabaseAdmin
        .from('files')
        .insert({
          id,
          key,
          original_name: filename,
          size,
          mime,
          category
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      res.status(201).json({
        file: {
          id: file.id,
          key: file.key,
          originalName: file.original_name,
          size: file.size,
          mime: file.mime,
          category: file.category,
          createdAt: file.created_at
        }
      });
    });
  });
};
