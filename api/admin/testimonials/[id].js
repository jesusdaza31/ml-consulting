/* =============================================
   ML CONSULTING — api/admin/testimonials/[id].js
   Actualizar o eliminar un testimonio por ID
   PATCH/PUT: Cambiar estado (approved/rejected/pending)
   DELETE: Eliminar testimonio
============================================= */

const storage = require('../../../testimonials-storage');
let authLib = null;
try {
  authLib = require('../../lib/auth');
} catch (e) {
  // Ignorar si se ejecuta fuera de la estructura api
}

async function runWithAuth(req, res, callback) {
  if (req.user && req.user.role === 'admin') {
    return callback();
  }

  if (authLib && authLib.requireAuth && authLib.requireAdmin) {
    return authLib.requireAuth(req, res, async () => {
      return authLib.requireAdmin(req, res, callback);
    });
  }

  return callback();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query && req.query.id ? req.query.id : req.params && req.params.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'ID de testimonio requerido.' });
  }

  await runWithAuth(req, res, async () => {
    if (req.method === 'PATCH' || req.method === 'PUT') {
      try {
        const updates = req.body || {};
        const updated = await storage.updateTestimonial(id, updates);
        return res.status(200).json({ ok: true, testimonial: updated });
      } catch (err) {
        console.error('[admin/testimonials/[id]] PATCH error:', err);
        return res.status(500).json({ ok: false, error: err.message || 'Error al actualizar testimonio.' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        await storage.deleteTestimonial(id);
        return res.status(200).json({ ok: true, message: 'Testimonio eliminado correctamente.' });
      } catch (err) {
        console.error('[admin/testimonials/[id]] DELETE error:', err);
        return res.status(500).json({ ok: false, error: err.message || 'Error al eliminar testimonio.' });
      }
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  });
};
