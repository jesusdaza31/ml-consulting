const { requireAuth } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    if (req.profile.role !== 'client') {
      return res.status(403).json({ error: 'Solo los clientes ven el catalogo' });
    }

    const userId = req.user.id;

    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!courses) return res.json({ cursos: [] });

    const { data: inscripciones } = await supabaseAdmin
      .from('inscripciones')
      .select('course_id, client_id, estado')
      .eq('client_id', userId);

    const inscByCourse = {};
    if (inscripciones) {
      inscripciones.forEach(i => {
        if (!inscByCourse[i.course_id]) inscByCourse[i.course_id] = [];
        inscByCourse[i.course_id].push(i);
      });
    }

    const [{ data: contenidoCounts }, { data: activeInsc }] = await Promise.all([
      supabaseAdmin.from('contenido').select('course_id, id'),
      supabaseAdmin.from('inscripciones').select('course_id, estado').eq('estado', 'activo')
    ]);

    const contCountByCourse = {};
    if (contenidoCounts) {
      contenidoCounts.forEach(c => {
        contCountByCourse[c.course_id] = (contCountByCourse[c.course_id] || 0) + 1;
      });
    }

    const activeCountByCourse = {};
    if (activeInsc) {
      activeInsc.forEach(i => {
        activeCountByCourse[i.course_id] = (activeCountByCourse[i.course_id] || 0) + 1;
      });
    }

    const result = courses.map(c => {
      const courseInsc = inscByCourse[c.id] || [];
      const latest = courseInsc.length ? courseInsc[courseInsc.length - 1] : null;
      const activos = activeCountByCourse[c.id] || 0;

      return {
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        descripcion: c.descripcion || '',
        objetivoGeneral: c.objetivo_general || '',
        resultadoEsperado: c.resultado_esperado || '',
        modulos: c.modulos || [],
        cupoMax: c.cupo_max,
        cuposLibres: (c.tipo === 'curso' && c.cupo_max) ? Math.max(0, c.cupo_max - activos) : null,
        horas: c.horas,
        duracionDias: c.duracion_dias,
        cantidadContenido: contCountByCourse[c.id] || 0,
        estado: latest ? latest.estado : null,
        price: c.price || null,
        paymentLink: c.payment_link || null
      };
    });

    res.json({ cursos: result });
  });
};
