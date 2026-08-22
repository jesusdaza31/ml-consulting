const { requireAuth, requireAdmin } = require('../../../../../lib/auth');
const { supabaseAdmin } = require('../../../../../lib/supabase');
const { getCourseWithDetails, videoUrlToEmbed } = require('../../../index');

function validateContenidoInput(b) {
  b = b || {};
  if (b.orden != null && !b.tipo) {
    const orden = Number(b.orden);
    if (!Number.isFinite(orden) || orden < 1) return { error: 'Orden invalido.' };
    return { value: { orden } };
  }
  const tipo = String(b.tipo || '');
  const titulo = String(b.titulo || '').trim();
  if (!['texto', 'video', 'documento'].includes(tipo)) return { error: 'Tipo de contenido invalido.' };
  if (!titulo) return { error: 'El titulo es obligatorio.' };
  let texto = null, videoUrl = null, r2VideoId = null, r2Key = null;
  if (tipo === 'texto') {
    texto = String(b.texto || '').trim();
    if (!texto) return { error: 'El texto es obligatorio.' };
  }
  if (tipo === 'video') {
    const r2Id = String(b.r2VideoId || '').trim();
    const r2K = String(b.r2Key || '').trim();
    const rawUrl = String(b.videoUrl || '').trim();
    if (r2Id && rawUrl) return { error: 'Elige una sola fuente (YouTube o video de la biblioteca).' };
    if (r2Id) {
      if (!r2K) return { error: 'Falta la referencia del video.' };
      r2VideoId = r2Id; r2Key = r2K;
    } else {
      const embed = videoUrlToEmbed(rawUrl);
      if (!embed) return { error: 'Ingresa un enlace valido de YouTube.' };
      videoUrl = embed;
    }
  }
  return { value: { tipo, titulo, texto, videoUrl, r2VideoId, r2Key, docFile: b.docFile || null, docNombre: b.docNombre || null } };
}

module.exports = async (req, res) => {
  const courseId = req.query.id;
  const contenidoId = req.query.contenidoId;
  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: course } = await supabaseAdmin.from('courses').select('id').eq('id', courseId).single();
      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
      const { data: existing } = await supabaseAdmin.from('contenido').select('*').eq('id', contenidoId).eq('course_id', courseId).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Contenido no encontrado' });
      if (req.method === 'PUT') {
        if (req.body.r2VideoId) {
          const { data: video } = await supabaseAdmin.from('videos').select('id').eq('id', req.body.r2VideoId).maybeSingle();
          if (!video) return res.status(400).json({ error: 'El video seleccionado ya no existe en la biblioteca.' });
        }
        const validated = validateContenidoInput(req.body || {});
        if (validated.error) return res.status(400).json({ error: validated.error });
        const v = validated.value;
        if (v.orden != null) {
          const { data: updated } = await supabaseAdmin.from('contenido').update({ orden: v.orden, updated_at: new Date().toISOString() }).eq('id', contenidoId).select().single();
          const detail = await getCourseWithDetails(courseId);
          return res.json({ contenido: formatItem(updated), curso: detail.public });
        }
        if (v.tipo === 'documento' && !existing.doc_file && !v.docFile) return res.status(400).json({ error: 'Para un documento, sube el archivo primero.' });
        const updateData = { tipo: v.tipo, titulo: v.titulo, texto: v.tipo === 'texto' ? v.texto : null, video_url: v.tipo === 'video' ? v.videoUrl : null, r2_video_id: v.tipo === 'video' ? v.r2VideoId : null, r2_key: v.tipo === 'video' ? v.r2Key : null, updated_at: new Date().toISOString() };
        if (v.docFile) { updateData.doc_file = v.docFile; updateData.doc_nombre = v.docNombre; }
        if (v.tipo !== 'documento') { updateData.doc_file = null; updateData.doc_nombre = null; }
        const { data: updated, error } = await supabaseAdmin.from('contenido').update(updateData).eq('id', contenidoId).select().single();
        if (error) return res.status(500).json({ error: error.message });
        const detail = await getCourseWithDetails(courseId);
        res.json({ contenido: formatItem(updated), curso: detail.public });
      } else if (req.method === 'DELETE') {
        const { error } = await supabaseAdmin.from('contenido').delete().eq('id', contenidoId);
        if (error) return res.status(500).json({ error: error.message });
        const { data: remaining } = await supabaseAdmin.from('contenido').select('id, orden').eq('course_id', courseId).order('orden');
        if (remaining) {
          for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].orden !== i + 1) await supabaseAdmin.from('contenido').update({ orden: i + 1 }).eq('id', remaining[i].id);
          }
        }
        const detail = await getCourseWithDetails(courseId);
        res.json({ ok: true, curso: detail.public });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  });
};

function formatItem(c) {
  return { id: c.id, tipo: c.tipo, titulo: c.titulo, texto: c.tipo === 'texto' ? c.texto : null, videoUrl: c.tipo === 'video' ? c.video_url : null, r2VideoId: c.tipo === 'video' ? c.r2_video_id : null, r2Key: c.tipo === 'video' ? c.r2_key : null, docFile: c.tipo === 'documento' ? c.doc_file : null, docNombre: c.tipo === 'documento' ? c.doc_nombre : null, orden: c.orden };
}
