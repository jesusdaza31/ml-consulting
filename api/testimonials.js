/* =============================================
   ML CONSULTING — api/testimonials.js
   Endpoint público para consultar y enviar testimonios
   GET: Lista testimonios aprobados
   POST: Envía testimonio público (estado pendiente)
============================================= */

const storage = require('../testimonials-storage');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      return res.status(200).json({ ok: true, testimonials });
    } catch (err) {
      console.error('[testimonials] GET error:', err);
      return res.status(500).json({ ok: false, error: 'Error al obtener testimonios.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, service, content, rating } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ ok: false, error: 'Por favor ingresa tu nombre (mínimo 2 caracteres).' });
      }

      if (!service || typeof service !== 'string' || service.trim().length < 2) {
        return res.status(400).json({ ok: false, error: 'Por favor indica el servicio recibido.' });
      }

      if (!content || typeof content !== 'string' || content.trim().length < 10) {
        return res.status(400).json({ ok: false, error: 'El comentario debe contener al menos 10 caracteres.' });
      }

      if (content.trim().length > 600) {
        return res.status(400).json({ ok: false, error: 'El comentario no debe exceder 600 caracteres.' });
      }

      const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

      const created = await storage.createTestimonial({
        name: name.trim().slice(0, 80),
        service: service.trim().slice(0, 80),
        content: content.trim(),
        rating: numRating,
        status: 'pending',
        featured: false
      });

      return res.status(201).json({
        ok: true,
        message: '¡Gracias por compartir tu testimonio! Será publicado una vez sea aprobado por nuestro equipo.',
        testimonial: {
          id: created.id,
          name: created.name,
          service: created.service,
          rating: created.rating,
          status: created.status
        }
      });
    } catch (err) {
      console.error('[testimonials] POST error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'Error al guardar el testimonio.' });
    }
  }

  return res.status(405).json({ ok: false, error: 'Método no permitido' });
};
