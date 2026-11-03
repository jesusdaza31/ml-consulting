const { requireAuth, requireAdmin } = require('../../../../../lib/auth');
const { supabaseAdmin } = require('../../../../../lib/supabase');
const { getCourseWithDetails } = require('../../../index');

module.exports = async (req, res) => {
  const courseId = req.query.id;
  const contenidoId = req.query.contenidoId;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .single();

      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

      const { data: existing } = await supabaseAdmin
        .from('contenido')
        .select('*')
        .eq('id', contenidoId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!existing) return res.status(404).json({ error: 'Contenido no encontrado' });

      const { row_id, width_pct, orden } = req.body || {};
      const updateData = { updated_at: new Date().toISOString() };

      if (row_id !== undefined) {
        updateData.row_id = row_id;
      }

      if (width_pct !== undefined) {
        const validWidths = [25, 33, 50, 66, 75, 100];
        if (!validWidths.includes(width_pct)) {
          return res.status(400).json({ error: 'Ancho inválido. Debe ser 25, 33, 50, 66, 75 o 100.' });
        }
        updateData.width_pct = width_pct;
      }

      if (orden !== undefined && Number.isFinite(Number(orden))) {
        updateData.orden = Number(orden);
      }

      const { data: updated, error } = await supabaseAdmin
        .from('contenido')
        .update(updateData)
        .eq('id', contenidoId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const detail = await getCourseWithDetails(courseId);
      res.json({ contenido: formatItem(updated), curso: detail.public });
    });
  });
};

function formatItem(c) {
  return {
    id: c.id,
    tipo: c.tipo,
    titulo: c.titulo,
    texto: c.tipo === 'texto' ? c.texto : null,
    videoUrl: c.tipo === 'video' ? c.video_url : null,
    r2VideoId: c.tipo === 'video' ? c.r2_video_id : null,
    r2Key: c.tipo === 'video' ? c.r2_key : null,
    docFile: (c.tipo === 'documento' || c.tipo === 'imagen') ? c.doc_file : null,
    docNombre: (c.tipo === 'documento' || c.tipo === 'imagen') ? c.doc_nombre : null,
    docMime: (c.tipo === 'documento' || c.tipo === 'imagen') ? c.doc_mime : null,
    docSize: (c.tipo === 'documento' || c.tipo === 'imagen') ? c.doc_size : null,
    docCategory: (c.tipo === 'documento' || c.tipo === 'imagen') ? c.doc_category : null,
    orden: c.orden,
    rowId: c.row_id,
    widthPct: c.width_pct || 100
  };
}
