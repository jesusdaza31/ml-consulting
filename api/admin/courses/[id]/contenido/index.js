const { requireAuth, requireAdmin } = require('../../../../lib/auth');
const { supabaseAdmin } = require('../../../../lib/supabase');
const { getCourseWithDetails, videoUrlToEmbed } = require('../../index');

function validateContenidoInput(b) {
  b = b || {};

  if (b.orden != null && !b.tipo) {
    const orden = Number(b.orden);
    if (!Number.isFinite(orden) || orden < 1) return { error: 'Orden invalido.' };
    return { value: { orden } };
  }

  const tipo = String(b.tipo || '');
  const titulo = String(b.titulo || '').trim();
  if (!['texto', 'video', 'documento'].includes(tipo)) {
    return { error: 'Tipo de contenido invalido.' };
  }
  if (!titulo) return { error: 'El titulo es obligatorio.' };

  let texto = null;
  let videoUrl = null;
  let r2VideoId = null;
  let r2Key = null;

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
      r2VideoId = r2Id;
      r2Key = r2K;
    } else {
      const embed = videoUrlToEmbed(rawUrl);
      if (!embed) return { error: 'Ingresa un enlace valido de YouTube.' };
      videoUrl = embed;
    }
  }

  return {
    value: {
      tipo,
      titulo,
      texto,
      videoUrl,
      r2VideoId,
      r2Key,
      docFile: b.docFile || null,
      docNombre: b.docNombre || null
    }
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const courseId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .single();

      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

      if (req.body.r2VideoId) {
        const { data: video } = await supabaseAdmin
          .from('videos')
          .select('id')
          .eq('id', req.body.r2VideoId)
          .maybeSingle();

        if (!video) return res.status(400).json({ error: 'El video seleccionado ya no existe en la biblioteca.' });
      }

      const validated = validateContenidoInput(req.body || {});
      if (validated.error) return res.status(400).json({ error: validated.error });

      const v = validated.value;

      if (v.tipo === 'documento' && !v.docFile) {
        return res.status(400).json({ error: 'Sube el archivo del documento primero.' });
      }

      const { data: maxOrden } = await supabaseAdmin
        .from('contenido')
        .select('orden')
        .eq('course_id', courseId)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle();

      const orden = (maxOrden ? maxOrden.orden : 0) + 1;

      const { data: item, error } = await supabaseAdmin
        .from('contenido')
        .insert({
          course_id: courseId,
          tipo: v.tipo,
          titulo: v.titulo,
          texto: v.texto,
          video_url: v.videoUrl,
          r2_video_id: v.r2VideoId,
          r2_key: v.r2Key,
          doc_file: v.docFile,
          doc_nombre: v.docNombre,
          orden
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const detail = await getCourseWithDetails(courseId);
      res.status(201).json({
        contenido: {
          id: item.id,
          tipo: item.tipo,
          titulo: item.titulo,
          texto: item.tipo === 'texto' ? item.texto : null,
          videoUrl: item.tipo === 'video' ? item.video_url : null,
          r2VideoId: item.tipo === 'video' ? item.r2_video_id : null,
          r2Key: item.tipo === 'video' ? item.r2_key : null,
          docFile: item.tipo === 'documento' ? item.doc_file : null,
          docNombre: item.tipo === 'documento' ? item.doc_nombre : null,
          orden: item.orden
        },
        curso: detail.public
      });
    });
  });
};

module.exports.validateContenidoInput = validateContenidoInput;
