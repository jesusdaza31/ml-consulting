const { requireAuth, requireAdmin } = require('../../lib/auth');
const r2 = require('../../lib/r2');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!r2.isConfigured()) {
    return res.status(503).json({ error: 'R2 no configurado', r2Missing: true });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      try {
        const body = req.body || {};
        const filename = String(body.filename || 'documento.pdf');
        const contentType = String(body.contentType || 'application/pdf');
        const size = Number(body.size);

        if (!Number.isFinite(size) || size < 1) {
          return res.status(400).json({ error: 'Indica el tamano del archivo.' });
        }

        if (size > 50 * 1024 * 1024) {
          return res.status(400).json({ error: 'El archivo excede el limite de 50MB.' });
        }

        const id = crypto.randomUUID();
        const { uploadUrl, key } = await r2.presignUpload({
          type: 'file',
          filename,
          contentType
        });

        res.json({ uploadUrl, key, id });
      } catch (e) {
        res.status(500).json({ error: 'No se pudo generar la URL de subida.' });
      }
    });
  });
};
