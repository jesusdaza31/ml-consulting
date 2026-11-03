const { requireAuth } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');
const r2 = require('../../lib/r2');
const { inferCategory } = require('../../lib/file-validation');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contenidoId = req.query.id;

  await requireAuth(req, res, async () => {
    const userId = req.user.id;
    const isAdmin = req.profile.role === 'admin';

    const { data: item } = await supabaseAdmin
      .from('contenido')
      .select('*, courses:course_id (id)')
      .eq('id', contenidoId)
      .maybeSingle();

    if (!item || !['documento', 'imagen'].includes(item.tipo) || !item.doc_file) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Para tipo 'imagen': siempre inline (sin Content-Disposition attachment)
    if (item.tipo === 'imagen') {
      try {
        const url = await r2.signGetUrl(item.doc_file);
        return res.redirect(302, url);
      } catch (e) {
        return res.status(500).json({ error: 'No se pudo generar la URL de la imagen.' });
      }
    }

    if (!isAdmin) {
      const { data: insc } = await supabaseAdmin
        .from('inscripciones')
        .select('estado')
        .eq('course_id', item.course_id)
        .eq('client_id', userId)
        .in('estado', ['activo', 'completado'])
        .maybeSingle();

      if (!insc) return res.status(403).json({ error: 'No estas inscrito en este curso' });
    }

    if (!r2.isConfigured()) {
      return res.status(503).json({ error: 'R2 no configurado' });
    }

    try {
      const docMime = item.doc_mime || r2.mimeFromExt(item.doc_file);
      const docCategory = item.doc_category || inferCategory(item.doc_file) || 'document';
      const url = await r2.signGetUrl(item.doc_file);
      const nombre = encodeURIComponent(item.doc_nombre || item.doc_file);

      // Office docs and TXT: force download; images and PDFs: inline
      if (docCategory === 'presentation' || (docCategory === 'document' && docMime !== 'application/pdf')) {
        res.setHeader('Content-Disposition', 'attachment; filename="' + (item.doc_nombre || item.doc_file) + '"');
      }

      res.redirect(302, url);
    } catch (e) {
      res.status(500).json({ error: 'No se pudo generar la URL del documento.' });
    }
  });
};
