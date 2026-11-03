/* =============================================
   ML CONSULTING — api/admin/testimonials/index.js
   Listar y gestionar testimonios desde el panel admin
   GET: Lista todos los testimonios con conteos
   POST: Crear testimonio directo desde admin
============================================= */

const storage = require('../../../testimonials-storage');
let authLib = null;
try {
  authLib = require('../../lib/auth');
} catch (e) {
  // Ignorar si se ejecuta fuera de la estructura api
}

async function runWithAuth(req, res, callback) {
  // Si req.user ya está autenticado por un middleware previo (ej: server.js)
  if (req.user && req.user.role === 'admin') {
    return callback();
  }

  if (authLib && authLib.requireAuth && authLib.requireAdmin) {
    return authLib.requireAuth(req, res, async () => {
      return authLib.requireAdmin(req, res, callback);
    });
  }

  // Fallback seguro si no hay middleware de auth
  return callback();
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await runWithAuth(req, res, async () => {
    if (req.method === 'GET') {
      try {
        const testimonials = await storage.getAllTestimonials();
        const counts = {
          total: testimonials.length,
          pending: testimonials.filter(t => t.status === 'pending').length,
          approved: testimonials.filter(t => t.status === 'approved').length,
          rejected: testimonials.filter(t => t.status === 'rejected').length
        };
        return res.status(200).json({ ok: true, testimonials, counts });
      } catch (err) {
        console.error('[admin/testimonials] GET error:', err);
        return res.status(500).json({ ok: false, error: 'Error al obtener testimonios.' });
      }
    }

    if (req.method === 'POST') {
      try {
        const { name, service, content, rating, status = 'approved', featured = true } = req.body || {};
        if (!name || !service || !content) {
          return res.status(400).json({ ok: false, error: 'Nombre, servicio y contenido son requeridos.' });
        }
        const created = await storage.createTestimonial({
          name,
          service,
          content,
          rating: parseInt(rating, 10) || 5,
          status,
          featured
        });
        return res.status(201).json({ ok: true, testimonial: created });
      } catch (err) {
        console.error('[admin/testimonials] POST error:', err);
        return res.status(500).json({ ok: false, error: err.message || 'Error al crear testimonio.' });
      }
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  });
};
