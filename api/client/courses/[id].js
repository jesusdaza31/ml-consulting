const { requireAuth } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function diasRestantes(vencimiento) {
  if (!vencimiento) return null;
  return Math.max(0, Math.ceil((new Date(vencimiento).getTime() - Date.now()) / DAY_MS));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const courseId = req.query.id;

  await requireAuth(req, res, async () => {
    const userId = req.user.id;
    const isAdmin = req.profile.role === 'admin';

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    if (!isAdmin) {
      const { data: insc } = await supabaseAdmin
        .from('inscripciones')
        .select('estado')
        .eq('course_id', courseId)
        .eq('client_id', userId)
        .in('estado', ['activo', 'completado'])
        .maybeSingle();

      if (!insc) return res.status(403).json({ error: 'No estas inscrito en este curso' });
    }

    const [{ data: inscripciones }, { data: contenido }] = await Promise.all([
      supabaseAdmin.from('inscripciones').select('*').eq('course_id', courseId).eq('client_id', userId),
      supabaseAdmin.from('contenido').select('*').eq('course_id', courseId).order('orden')
    ]);

    const latestInsc = inscripciones && inscripciones.length
      ? inscripciones.find(i => i.estado === 'activo' || i.estado === 'completado') || inscripciones[inscripciones.length - 1]
      : null;

    const inscripcion = latestInsc ? {
      estado: latestInsc.estado,
      vencimiento: latestInsc.vencimiento,
      diasRestantes: diasRestantes(latestInsc.vencimiento),
      vencido: latestInsc.estado === 'activo' && latestInsc.vencimiento && new Date(latestInsc.vencimiento).getTime() < Date.now(),
      horasAsignadas: course.tipo === 'servicio' ? latestInsc.horas_asignadas : null,
      horasUsadas: course.tipo === 'servicio' ? latestInsc.horas_usadas : null,
      horasRestantes: course.tipo === 'servicio' && latestInsc.horas_asignadas
        ? latestInsc.horas_asignadas - latestInsc.horas_usadas : null
    } : null;

    res.json({
      curso: {
        id: course.id,
        nombre: course.nombre,
        tipo: course.tipo,
        descripcion: course.descripcion || '',
        objetivoGeneral: course.objetivo_general || '',
        resultadoEsperado: course.resultado_esperado || '',
        modulos: course.modulos || [],
        horas: course.horas,
        duracionDias: course.duracion_dias,
        inscripcion,
        contenido: (contenido || []).map(c => ({
          id: c.id,
          tipo: c.tipo,
          titulo: c.titulo,
          texto: c.tipo === 'texto' ? c.texto : null,
          videoUrl: c.tipo === 'video' ? c.video_url : null,
          r2VideoId: c.tipo === 'video' ? c.r2_video_id : null,
          r2Key: c.tipo === 'video' ? c.r2_key : null,
          docFile: c.tipo === 'documento' ? c.doc_file : null,
          docNombre: c.tipo === 'documento' ? c.doc_nombre : null,
          orden: c.orden
        })),
        price: course.price || null,
        paymentLink: course.payment_link || null
      }
    });
  });
};
