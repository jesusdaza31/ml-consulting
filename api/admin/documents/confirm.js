const { requireAuth, requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const body = req.body || {};
      const key = String(body.key || '');
      const filename = String(body.filename || 'documento');
      const size = Number(body.size);
      const mime = String(body.mime || 'application/pdf');

      if (!key) return res.status(400).json({ error: 'Faltan datos del documento.' });
      if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: 'Tamano invalido.' });

      res.status(201).json({
        docFile: key,
        docNombre: filename
      });
    });
  });
};
