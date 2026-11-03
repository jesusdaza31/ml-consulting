const { requireAuth } = require('../../../lib/auth');
const { supabaseAdmin } = require('../../../lib/supabase');
const r2 = require('../../../lib/r2');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contenidoId = req.query.id;

  await requireAuth(req, res, async () => {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido' });
    }

    const { data: item, error: dbError } = await supabaseAdmin
      .from('contenido')
      .select('*')
      .eq('id', contenidoId)
      .maybeSingle();

    if (dbError) {
      console.error('[contenido-file] DB error:', dbError);
      return res.status(500).json({ error: 'Error al buscar el contenido' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Contenido no encontrado', id: contenidoId });
    }

    if (!item.doc_file) {
      return res.status(404).json({ error: 'Este contenido no tiene archivo asociado', tipo: item.tipo });
    }

    if (!r2.isConfigured()) {
      return res.status(503).json({ error: 'R2 no configurado' });
    }

    try {
      const url = await r2.signGetUrl(item.doc_file);
      if (!url) {
        return res.status(404).json({ error: 'No se pudo generar la URL', key: item.doc_file });
      }
      res.redirect(302, url);
    } catch (e) {
      console.error('[contenido-file] Sign error:', e.message);
      res.status(500).json({ error: 'No se pudo generar la URL del archivo' });
    }
  });
};
