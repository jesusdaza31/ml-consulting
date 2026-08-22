const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function diasRestantes(vencimiento) {
  if (!vencimiento) return null;
  return Math.max(0, Math.ceil((new Date(vencimiento).getTime() - Date.now()) / DAY_MS));
}

function videoUrlToEmbed(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/
  ];
  for (const re of patterns) {
    const m = String(url).match(re);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
  }
  return null;
}

async function getCourseWithDetails(courseId) {
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) return null;

  const [{ data: inscripciones }, { data: contenido }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*').eq('course_id', courseId),
    supabaseAdmin.from('contenido').select('*').eq('course_id', courseId).order('orden'),
    supabaseAdmin.from('profiles').select('id, name')
  ]);

  const nameById = {};
  if (profiles) profiles.forEach(p => { nameById[p.id] = p.name; });

  const activeCount = (inscripciones || []).filter(i => i.estado === 'activo').length;
  const cuposLibres = (course.tipo === 'curso' && course.cupo_max)
    ? Math.max(0, course.cupo_max - activeCount)
    : null;

  return {
    course,
    inscripciones: inscripciones || [],
    contenido: contenido || [],
    nameById,
    public: {
      id: course.id,
      nombre: course.nombre,
      tipo: course.tipo,
      descripcion: course.descripcion || '',
      objetivoGeneral: course.objetivo_general || '',
      resultadoEsperado: course.resultado_esperado || '',
      modulos: course.modulos || [],
      cupoMax: course.cupo_max,
      horas: course.horas,
      duracionDias: course.duracion_dias,
      price: course.price || null,
      paymentLink: course.payment_link || null,
      createdAt: course.created_at,
      inscritosActivos: activeCount,
      totalInscritos: (inscripciones || []).length,
      cuposLibres,
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
      inscritos: (inscripciones || []).map(i => {
        const vencido = i.estado === 'activo' && i.vencimiento && new Date(i.vencimiento).getTime() < Date.now();
        const horasRestantes = (course.tipo === 'servicio' && i.horas_asignadas)
          ? i.horas_asignadas - i.horas_usadas
          : null;
        return {
          clienteId: i.client_id,
          clienteNombre: nameById[i.client_id] || '—',
          fechaInscripcion: i.fecha_inscripcion,
          vencimiento: i.vencimiento,
          diasRestantes: diasRestantes(i.vencimiento),
          vencido,
          estado: i.estado,
          horasAsignadas: course.tipo === 'servicio' ? i.horas_asignadas : null,
          horasUsadas: course.tipo === 'servicio' ? i.horas_usadas : null,
          horasRestantes
        };
      })
    }
  };
}

function validateCourseInput(b) {
  b = b || {};
  const nombre = String(b.nombre || '').trim();
  const tipo = String(b.tipo || '');

  if (!nombre) return { error: 'El nombre es obligatorio.' };
  if (tipo !== 'curso' && tipo !== 'servicio') {
    return { error: 'Tipo inválido. Debe ser "curso" o "servicio".' };
  }

  const duracionDias = Number(b.duracionDias == null ? 30 : b.duracionDias);
  if (!Number.isFinite(duracionDias) || duracionDias < 1) {
    return { error: 'La duración debe ser de al menos 1 día.' };
  }

  let cupoMax = null;
  let horas = null;

  if (tipo === 'curso') {
    if (b.cupoMax !== '' && b.cupoMax != null) {
      cupoMax = Number(b.cupoMax);
      if (!Number.isFinite(cupoMax) || cupoMax < 1) {
        return { error: 'El cupo máximo debe ser mayor que 0.' };
      }
    }
  } else {
    horas = Number(b.horas);
    if (!Number.isFinite(horas) || horas < 1) {
      return { error: 'Las horas deben ser mayores que 0.' };
    }
  }

  let price = null;
  if (b.price !== '' && b.price != null) {
    price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: 'El precio debe ser mayor o igual a 0.' };
    }
  }

  const paymentLink = String(b.paymentLink || '').trim();
  if (paymentLink) {
    try { new URL(paymentLink); } catch {
      return { error: 'El link de pago debe ser una URL válida.' };
    }
  }

  let modulos = [];
  if (Array.isArray(b.modulos)) {
    modulos = b.modulos.map(m => String(m).trim()).filter(m => m.length > 0).slice(0, 20);
  }

  return {
    value: {
      nombre,
      tipo,
      descripcion: String(b.descripcion || '').trim(),
      objetivoGeneral: String(b.objetivoGeneral || '').trim(),
      resultadoEsperado: String(b.resultadoEsperado || '').trim(),
      modulos,
      cupoMax,
      horas,
      duracionDias,
      price,
      paymentLink: paymentLink || null
    }
  };
}

module.exports = async (req, res) => {
  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      if (req.method === 'GET') {
        const { data: courses } = await supabaseAdmin
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!courses) return res.json({ courses: [] });

        const courseIds = courses.map(c => c.id);
        const [{ data: inscripciones }, { data: contenido }, { data: profiles }] = await Promise.all([
          supabaseAdmin.from('inscripciones').select('course_id, client_id, estado, vencimiento, horas_asignadas, horas_usadas').in('course_id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000']),
          supabaseAdmin.from('contenido').select('course_id, id, tipo, titulo, texto, video_url, r2_video_id, r2_key, doc_file, doc_nombre, orden').in('course_id', courseIds.length ? courseIds : ['00000000-0000-0000-0000-000000000000']),
          supabaseAdmin.from('profiles').select('id, name')
        ]);

        const nameById = {};
        if (profiles) profiles.forEach(p => { nameById[p.id] = p.name; });

        const inscByCourse = {};
        if (inscripciones) {
          inscripciones.forEach(i => {
            if (!inscByCourse[i.course_id]) inscByCourse[i.course_id] = [];
            inscByCourse[i.course_id].push(i);
          });
        }

        const contByCourse = {};
        if (contenido) {
          contenido.forEach(c => {
            if (!contByCourse[c.course_id]) contByCourse[c.course_id] = [];
            contByCourse[c.course_id].push(c);
          });
        }

        const result = courses.map(course => {
          const courseInsc = inscByCourse[course.id] || [];
          const courseCont = (contByCourse[course.id] || []).sort((a, b) => a.orden - b.orden);
          const activeCount = courseInsc.filter(i => i.estado === 'activo').length;
          const cuposLibres = (course.tipo === 'curso' && course.cupo_max)
            ? Math.max(0, course.cupo_max - activeCount)
            : null;

          return {
            id: course.id,
            nombre: course.nombre,
            tipo: course.tipo,
            descripcion: course.descripcion || '',
            objetivoGeneral: course.objetivo_general || '',
            resultadoEsperado: course.resultado_esperado || '',
            modulos: course.modulos || [],
            cupoMax: course.cupo_max,
            horas: course.horas,
            duracionDias: course.duracion_dias,
            price: course.price || null,
            paymentLink: course.payment_link || null,
            createdAt: course.created_at,
            inscritosActivos: activeCount,
            totalInscritos: courseInsc.length,
            cuposLibres,
            contenido: courseCont.map(c => ({
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
            inscritos: courseInsc.map(i => {
              const vencido = i.estado === 'activo' && i.vencimiento && new Date(i.vencimiento).getTime() < Date.now();
              const horasRestantes = (course.tipo === 'servicio' && i.horas_asignadas)
                ? i.horas_asignadas - i.horas_usadas
                : null;
              return {
                clienteId: i.client_id,
                clienteNombre: nameById[i.client_id] || '—',
                fechaInscripcion: i.fecha_inscripcion,
                vencimiento: i.vencimiento,
                diasRestantes: diasRestantes(i.vencimiento),
                vencido,
                estado: i.estado,
                horasAsignadas: course.tipo === 'servicio' ? i.horas_asignadas : null,
                horasUsadas: course.tipo === 'servicio' ? i.horas_usadas : null,
                horasRestantes
              };
            })
          };
        });

        res.json({ courses: result });

      } else if (req.method === 'POST') {
        const validated = validateCourseInput(req.body || {});
        if (validated.error) return res.status(400).json({ error: validated.error });

        const v = validated.value;
        const { data: course, error } = await supabaseAdmin
          .from('courses')
          .insert({
            nombre: v.nombre,
            tipo: v.tipo,
            descripcion: v.descripcion,
            objetivo_general: v.objetivoGeneral,
            resultado_esperado: v.resultadoEsperado,
            modulos: v.modulos,
            cupo_max: v.cupoMax,
            horas: v.horas,
            duracion_dias: v.duracionDias,
            price: v.price,
            payment_link: v.paymentLink
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });

        const detail = await getCourseWithDetails(course.id);
        res.status(201).json({ curso: detail.public });

      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  });
};

module.exports.getCourseWithDetails = getCourseWithDetails;
module.exports.validateCourseInput = validateCourseInput;
module.exports.videoUrlToEmbed = videoUrlToEmbed;
module.exports.diasRestantes = diasRestantes;
