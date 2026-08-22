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

  await requireAuth(req, res, async () => {
    const userId = req.user.id;
    const isAdmin = req.profile.role === 'admin';

    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!courses) return res.json({ cursos: [] });

    const { data: inscripciones } = await supabaseAdmin
      .from('inscripciones')
      .select('course_id, client_id, estado, fecha_inscripcion, vencimiento, horas_asignadas, horas_usadas')
      .eq('client_id', userId);

    const inscByCourse = {};
    if (inscripciones) {
      inscripciones.forEach(i => {
        if (!inscByCourse[i.course_id]) inscByCourse[i.course_id] = [];
        inscByCourse[i.course_id].push(i);
      });
    }

    const { data: contenidoCounts } = await supabaseAdmin
      .from('contenido')
      .select('course_id, id');

    const contCountByCourse = {};
    if (contenidoCounts) {
      contenidoCounts.forEach(c => {
        contCountByCourse[c.course_id] = (contCountByCourse[c.course_id] || 0) + 1;
      });
    }

    const result = [];
    for (const c of courses) {
      const courseInsc = inscByCourse[c.id] || [];
      const latest = courseInsc.length ? courseInsc[courseInsc.length - 1] : null;

      if (!isAdmin && !latest) continue;

      const inscripcion = (latest && latest.estado === 'activo') ? {
        estado: latest.estado,
        vencimiento: latest.vencimiento,
        diasRestantes: diasRestantes(latest.vencimiento),
        vencido: latest.estado === 'activo' && latest.vencimiento && new Date(latest.vencimiento).getTime() < Date.now(),
        horasAsignadas: c.tipo === 'servicio' ? latest.horas_asignadas : null,
        horasUsadas: c.tipo === 'servicio' ? latest.horas_usadas : null,
        horasRestantes: c.tipo === 'servicio' && latest.horas_asignadas
          ? latest.horas_asignadas - latest.horas_usadas : null
      } : null;

      result.push({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        descripcion: c.descripcion || '',
        horas: c.horas,
        duracionDias: c.duracion_dias,
        estado: latest ? latest.estado : null,
        fechaInscripcion: latest ? latest.fecha_inscripcion : null,
        inscripcion,
        cantidadContenido: contCountByCourse[c.id] || 0
      });
    }

    res.json({ cursos: result });
  });
};
