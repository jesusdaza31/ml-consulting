/* =============================================
   ML CONSULTING — courses.js
   Persistencia y lógica de cursos/servicios,
   inscripciones y contenido (JSON, sin BD).
============================================= */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DAY_MS = 24 * 60 * 60 * 1000;

const DATA_DIR = path.join(__dirname, 'data');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');

/* ---------- Persistencia (escritura atómica) ---------- */

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readCourses() {
  ensureDataDir();
  if (!fs.existsSync(COURSES_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
    return Array.isArray(parsed.courses) ? parsed.courses : [];
  } catch (e) {
    return [];
  }
}

function writeCourses(list) {
  ensureDataDir();
  const tmp = COURSES_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ courses: list }, null, 2), 'utf8');
  fs.renameSync(tmp, COURSES_FILE);
}

let courses = readCourses();

function save() { writeCourses(courses); }
function allCourses() { return courses; }
function findCourse(id) { return courses.find(c => c.id === id); }

/* ---------- Helpers de tiempo ---------- */

function diasRestantes(vencimiento) {
  const diff = new Date(vencimiento).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

function calcularVencimiento(fechaInscripcion, duracionDias) {
  return new Date(new Date(fechaInscripcion).getTime() + duracionDias * DAY_MS).toISOString();
}

/* ---------- Validación de entrada de curso/servicio ---------- */

function validateCourseInput(b) {
  const nombre = String((b && b.nombre) || '').trim();
  const tipo = String((b && b.tipo) || '');

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
    if (b.cupoMax === '' || b.cupoMax == null) {
      cupoMax = null; // ilimitado
    } else {
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

  const paymentLink = String((b && b.paymentLink) || '').trim();
  if (paymentLink) {
    try { new URL(paymentLink); } catch {
      return { error: 'El link de pago debe ser una URL válida.' };
    }
  }

  return {
    value: {
      nombre: nombre,
      tipo: tipo,
      descripcion: String((b && b.descripcion) || '').trim(),
      objetivoGeneral: String((b && b.objetivoGeneral) || '').trim(),
      resultadoEsperado: String((b && b.resultadoEsperado) || '').trim(),
      modulos: sanitizeModulos(b && b.modulos),
      cupoMax: cupoMax,
      horas: horas,
      duracionDias: duracionDias,
      price,
      paymentLink
    }
  };
}

// Sanitiza el arreglo de módulos: strings, recortados, no vacíos, máx 20.
function sanitizeModulos(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map(m => String(m).trim())
    .filter(m => m.length > 0)
    .slice(0, 20);
}

/* ---------- CRUD ---------- */

function createCourse(data) {
  const course = {
    id: crypto.randomUUID(),
    nombre: data.nombre,
    tipo: data.tipo,
    descripcion: data.descripcion,
    objetivoGeneral: data.objetivoGeneral || '',
    resultadoEsperado: data.resultadoEsperado || '',
    modulos: data.modulos || [],
    cupoMax: data.cupoMax,
    horas: data.horas,
    duracionDias: data.duracionDias,
    price: data.price != null ? Number(data.price) : null,
    paymentLink: data.paymentLink ? String(data.paymentLink).trim() : null,
    inscritos: [],
    contenido: [],
    createdAt: new Date().toISOString()
  };
  courses.push(course);
  save();
  return course;
}

function updateCourse(id, data) {
  const course = findCourse(id);
  if (!course) return null;
  course.nombre = data.nombre;
  course.tipo = data.tipo;
  course.descripcion = data.descripcion;
  course.objetivoGeneral = data.objetivoGeneral || '';
  course.resultadoEsperado = data.resultadoEsperado || '';
  course.modulos = data.modulos || [];
  course.cupoMax = data.cupoMax;
  course.horas = data.horas;
  course.duracionDias = data.duracionDias;
  if (data.price !== undefined) course.price = data.price != null ? Number(data.price) : null;
  if (data.paymentLink !== undefined) course.paymentLink = data.paymentLink ? String(data.paymentLink).trim() : null;
  save();
  return course;
}

function deleteCourse(id) {
  const index = courses.findIndex(c => c.id === id);
  if (index === -1) return false;
  courses.splice(index, 1);
  save();
  return true;
}

/* ---------- Contenido de curso ---------- */

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

function validateContenidoInput(b) {
  b = b || {};

  // Reorder-only update
  if (b.orden != null && !b.tipo) {
    const orden = Number(b.orden);
    if (!Number.isFinite(orden) || orden < 1) return { error: 'Orden inválido.' };
    return { value: { orden: orden } };
  }

  const tipo = String(b.tipo || '');
  const titulo = String(b.titulo || '').trim();
  if (!['texto', 'video', 'documento'].includes(tipo)) {
    return { error: 'Tipo de contenido inválido.' };
  }
  if (!titulo) return { error: 'El título es obligatorio.' };

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
      // Video de la biblioteca R2 (la existencia la valida server.js)
      if (!r2K) return { error: 'Falta la referencia del video.' };
      r2VideoId = r2Id;
      r2Key = r2K;
    } else {
      const embed = videoUrlToEmbed(rawUrl);
      if (!embed) return { error: 'Ingresa un enlace válido de YouTube.' };
      videoUrl = embed;
    }
  }

  return {
    value: {
      tipo: tipo,
      titulo: titulo,
      texto: texto,
      videoUrl: videoUrl,
      r2VideoId: r2VideoId,
      r2Key: r2Key,
      docFile: b.docFile || null,
      docNombre: b.docNombre || null
    }
  };
}

function addContenido(course, data) {
  if (data.tipo === 'documento' && !data.docFile) {
    return { error: 'Sube el archivo del documento primero.', status: 400 };
  }
  const item = {
    id: crypto.randomUUID(),
    tipo: data.tipo,
    titulo: data.titulo,
    texto: data.tipo === 'texto' ? data.texto : null,
    videoUrl: data.tipo === 'video' ? data.videoUrl : null,
    r2VideoId: data.tipo === 'video' ? data.r2VideoId : null,
    r2Key: data.tipo === 'video' ? data.r2Key : null,
    docFile: data.tipo === 'documento' ? data.docFile : null,
    docNombre: data.tipo === 'documento' ? data.docNombre : null,
    orden: course.contenido.length + 1
  };
  course.contenido.push(item);
  save();
  return { item: item };
}

function updateContenido(course, id, data) {
  const item = course.contenido.find(x => x.id === id);
  if (!item) return { notFound: true };

  if (data.orden != null) {
    item.orden = data.orden;
    save();
    return { item: item };
  }

  if (data.tipo === 'documento' && !item.docFile && !data.docFile) {
    return { error: 'Para un documento, sube el archivo primero.', status: 400 };
  }

  const oldDoc = item.docFile;
  item.tipo = data.tipo;
  item.titulo = data.titulo;
  item.texto = data.tipo === 'texto' ? data.texto : null;
  item.videoUrl = data.tipo === 'video' ? data.videoUrl : null;
  item.r2VideoId = data.tipo === 'video' ? data.r2VideoId : null;
  item.r2Key = data.tipo === 'video' ? data.r2Key : null;

  if (data.docFile) {
    item.docFile = data.docFile;
    item.docNombre = data.docNombre;
  }
  if (data.tipo !== 'documento' && oldDoc) {
    item.docFile = null;
    item.docNombre = null;
    save();
    return { item: item, oldDoc: oldDoc };
  }
  save();
  return { item: item };
}

function deleteContenido(course, id) {
  const idx = course.contenido.findIndex(x => x.id === id);
  if (idx === -1) return { notFound: true };
  const [removed] = course.contenido.splice(idx, 1);
  course.contenido.forEach((x, i) => { x.orden = i + 1; });
  save();
  return { docFile: removed.docFile };
}

function findContenidoGlobal(id) {
  for (const c of courses) {
    const item = c.contenido.find(x => x.id === id);
    if (item) return Object.assign({ curso: c }, item);
  }
  return null;
}

function sortedContent(course) {
  return course.contenido
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map(x => ({
      id: x.id,
      tipo: x.tipo,
      titulo: x.titulo,
      texto: x.tipo === 'texto' ? x.texto : null,
      videoUrl: x.tipo === 'video' ? x.videoUrl : null,
      r2VideoId: x.tipo === 'video' ? x.r2VideoId : null,
      r2Key: x.tipo === 'video' ? x.r2Key : null,
      docFile: x.tipo === 'documento' ? x.docFile : null,
      docNombre: x.tipo === 'documento' ? x.docNombre : null,
      orden: x.orden
    }));
}

/* ---------- Vistas públicas / enriquecidas (admin) ---------- */

function getCoursePublic(course, nameById) {
  const active = course.inscritos.filter(i => i.estado === 'activo').length;
  const cuposLibres = (course.tipo === 'curso' && course.cupoMax)
    ? Math.max(0, course.cupoMax - active)
    : null;

  return {
    id: course.id,
    nombre: course.nombre,
    tipo: course.tipo,
    descripcion: course.descripcion,
    objetivoGeneral: course.objetivoGeneral || '',
    resultadoEsperado: course.resultadoEsperado || '',
    modulos: course.modulos || [],
    cupoMax: course.cupoMax,
    horas: course.horas,
    duracionDias: course.duracionDias,
    price: course.price || null,
    paymentLink: course.paymentLink || null,
    createdAt: course.createdAt,
    inscritosActivos: active,
    totalInscritos: course.inscritos.length,
    cuposLibres: cuposLibres,
    contenido: sortedContent(course),
    inscritos: course.inscritos.map(i => {
      const vencido = i.estado === 'activo' && new Date(i.vencimiento).getTime() < Date.now();
      const horasRestantes = (course.tipo === 'servicio' && i.horasAsignadas)
        ? i.horasAsignadas - i.horasUsadas
        : null;
      return {
        clienteId: i.clienteId,
        clienteNombre: (nameById && nameById[i.clienteId]) || '—',
        fechaInscripcion: i.fechaInscripcion,
        vencimiento: i.vencimiento,
        diasRestantes: diasRestantes(i.vencimiento),
        vencido: vencido,
        estado: i.estado,
        horasAsignadas: course.tipo === 'servicio' ? i.horasAsignadas : null,
        horasUsadas: course.tipo === 'servicio' ? i.horasUsadas : null,
        horasRestantes: horasRestantes
      };
    })
  };
}

/* ---------- Inscripción ---------- */

function activeInscripcion(course, clienteId) {
  return course.inscritos.find(i => i.clienteId === clienteId && i.estado === 'activo') || null;
}

function enrolledInscripcion(course, clienteId) {
  return course.inscritos.find(i => i.clienteId === clienteId &&
    (i.estado === 'activo' || i.estado === 'completado')) || null;
}

function latestInscripcion(course, clienteId) {
  return course.inscritos.filter(i => i.clienteId === clienteId).slice(-1)[0] || null;
}

function inscribir(course, clienteId, horas, nameById) {
  // Duplicado activo en el mismo curso
  const yaInscrito = course.inscritos.some(i => i.clienteId === clienteId && i.estado === 'activo');
  if (yaInscrito) return { error: 'Ya inscrito', status: 409 };

  if (course.tipo === 'curso') {
    if (course.cupoMax) {
      const active = course.inscritos.filter(i => i.estado === 'activo').length;
      if (active >= course.cupoMax) return { error: 'Curso completo', status: 409 };
    }
  } else {
    const horasNum = Number(horas);
    if (!Number.isFinite(horasNum) || horasNum < 1) {
      return { error: 'Se requieren horas para el servicio.', status: 400 };
    }
  }

  const fechaInscripcion = new Date().toISOString();
  const inscripcion = {
    clienteId: clienteId,
    fechaInscripcion: fechaInscripcion,
    horasAsignadas: course.tipo === 'servicio' ? Number(horas) : null,
    horasUsadas: 0,
    estado: 'activo',
    vencimiento: calcularVencimiento(fechaInscripcion, course.duracionDias)
  };
  course.inscritos.push(inscripcion);
  save();
  return { inscripcion: inscripcion, curso: getCoursePublic(course, nameById) };
}

/* ---------- Máquina de estados de inscripción ----------
   pendiente -> (admin aprueba | pago confirmado) -> activo
   pendiente -> (admin rechaza)                   -> cancelado
   activo    -> (horas completas)                 -> completado
   completado/cancelado -> (cliente solicita)     -> pendiente

   `activarInscripcion` es el único punto de activación real.
   Lo usan BOTH la aprobación del admin y (en el futuro) la
   confirmación de pago: activación automática a un paso.
--------------------------------------------------------- */

function activarInscripcion(course, inscripcion) {
  // Hook compartido: aprobación admin o confirmación de pago.
  inscripcion.estado = 'activo';
  inscripcion.vencimiento = calcularVencimiento(new Date().toISOString(), course.duracionDias);
  if (course.tipo === 'servicio') {
    inscripcion.horasAsignadas = course.horas;
  }
  save();
  return inscripcion;
}

function solicitarInscripcion(course, clienteId) {
  const existing = course.inscritos.find(i => i.clienteId === clienteId &&
    (i.estado === 'pendiente' || i.estado === 'activo'));
  if (existing) return { error: 'Ya solicitado o inscrito', status: 409 };

  const inscripcion = {
    clienteId: clienteId,
    fechaInscripcion: new Date().toISOString(),
    horasAsignadas: null,
    horasUsadas: 0,
    estado: 'pendiente',
    vencimiento: null
  };
  course.inscritos.push(inscripcion);
  save();
  return { inscripcion: inscripcion };
}

function aprobarInscripcion(course, clienteId, nameById) {
  const insc = course.inscritos.find(i => i.clienteId === clienteId && i.estado === 'pendiente');
  if (!insc) return { error: 'No hay una solicitud pendiente de este cliente', status: 404 };

  // El cupo se reserva al ACTIVAR, no al solicitar.
  if (course.tipo === 'curso' && course.cupoMax) {
    const activos = course.inscritos.filter(i => i.estado === 'activo').length;
    if (activos >= course.cupoMax) return { error: 'Curso completo', status: 409 };
  }

  activarInscripcion(course, insc);
  return { inscripcion: insc, curso: getCoursePublic(course, nameById) };
}

function rechazarInscripcion(course, clienteId, nameById) {
  const insc = course.inscritos.find(i => i.clienteId === clienteId && i.estado === 'pendiente');
  if (!insc) return { error: 'No hay una solicitud pendiente de este cliente', status: 404 };

  // "Rechazada" se representa como estado `cancelado` (enum mínimo).
  insc.estado = 'cancelado';
  insc.vencimiento = null;
  insc.horasAsignadas = null;
  insc.horasUsadas = 0;
  save();
  return { inscripcion: insc, curso: getCoursePublic(course, nameById) };
}

/* ---------- Progreso (servicios) ---------- */

function registrarProgreso(course, clienteId, horasUsadas, nameById) {  if (course.tipo !== 'servicio') {
    return { error: 'Solo los servicios registran horas de progreso.', status: 400 };
  }
  const inscripcion = activeInscripcion(course, clienteId);
  if (!inscripcion) return { error: 'Inscripción no encontrada', status: 404 };

  const add = Number(horasUsadas);
  if (!Number.isFinite(add) || add < 1) {
    return { error: 'Indica cuántas horas se usaron.', status: 400 };
  }

  inscripcion.horasUsadas = Math.min(inscripcion.horasAsignadas, inscripcion.horasUsadas + add);
  if (inscripcion.horasUsadas >= inscripcion.horasAsignadas) {
    inscripcion.estado = 'completado';
  }
  save();
  return { inscripcion: inscripcion, curso: getCoursePublic(course, nameById) };
}

/* ---------- Consultas para clientes ---------- */

function clientInscripciones(clienteId) {
  const out = [];
  courses.forEach(c => {
    c.inscritos.forEach(i => {
      if (i.clienteId !== clienteId) return;
      out.push({
        cursoId: c.id,
        cursoNombre: c.nombre,
        tipo: c.tipo,
        estado: i.estado,
        fechaInscripcion: i.fechaInscripcion,
        vencimiento: i.vencimiento,
        diasRestantes: diasRestantes(i.vencimiento),
        horasAsignadas: c.tipo === 'servicio' ? i.horasAsignadas : null,
        horasUsadas: c.tipo === 'servicio' ? i.horasUsadas : null,
        horasRestantes: c.tipo === 'servicio' ? (i.horasAsignadas - i.horasUsadas) : null
      });
    });
  });
  return out;
}

function countClientInscripciones(clienteId) {
  let n = 0;
  courses.forEach(c => {
    n += c.inscritos.filter(i => i.clienteId === clienteId).length;
  });
  return n;
}

function inscripcionPublic(course, ins) {
  return {
    estado: ins.estado,
    vencimiento: ins.vencimiento,
    diasRestantes: diasRestantes(ins.vencimiento),
    vencido: ins.estado === 'activo' && new Date(ins.vencimiento).getTime() < Date.now(),
    horasAsignadas: course.tipo === 'servicio' ? ins.horasAsignadas : null,
    horasUsadas: course.tipo === 'servicio' ? ins.horasUsadas : null,
    horasRestantes: course.tipo === 'servicio' ? (ins.horasAsignadas - ins.horasUsadas) : null
  };
}

function clientCourseList(clienteId, opts) {
  const isAdmin = opts && opts.isAdmin;
  const out = [];
  courses.forEach(c => {
    const ins = latestInscripcion(c, clienteId);
    if (!isAdmin && !ins) return;
    out.push({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      descripcion: c.descripcion,
      horas: c.horas,
      duracionDias: c.duracionDias,
      estado: ins ? ins.estado : null,
      fechaInscripcion: ins ? ins.fechaInscripcion : null,
      inscripcion: ins && ins.estado === 'activo' ? inscripcionPublic(c, ins) : null,
      cantidadContenido: c.contenido.length
    });
  });
  return out;
}

function clientCatalog(clienteId) {
  const out = [];
  courses.forEach(c => {
    const ins = latestInscripcion(c, clienteId);
    const activos = c.inscritos.filter(i => i.estado === 'activo').length;
    out.push({
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      descripcion: c.descripcion,
      objetivoGeneral: c.objetivoGeneral || '',
      resultadoEsperado: c.resultadoEsperado || '',
      modulos: c.modulos || [],
      cupoMax: c.cupoMax,
      cuposLibres: (c.tipo === 'curso' && c.cupoMax) ? Math.max(0, c.cupoMax - activos) : null,
      horas: c.horas,
      duracionDias: c.duracionDias,
      cantidadContenido: c.contenido.length,
      estado: ins ? ins.estado : null,
      price: c.price || null,
      paymentLink: c.paymentLink || null
    });
  });
  return out;
}

function clientCourseDetail(clienteId, course, isAdmin) {
  const ins = isAdmin ? (enrolledInscripcion(course, clienteId) || activeInscripcion(course, clienteId)) : enrolledInscripcion(course, clienteId);
  return {
    id: course.id,
    nombre: course.nombre,
    tipo: course.tipo,
    descripcion: course.descripcion,
    objetivoGeneral: course.objetivoGeneral || '',
    resultadoEsperado: course.resultadoEsperado || '',
    modulos: course.modulos || [],
    horas: course.horas,
    duracionDias: course.duracionDias,
    inscripcion: ins ? inscripcionPublic(course, ins) : null,
    contenido: sortedContent(course),
    price: course.price || null,
    paymentLink: course.paymentLink || null
  };
}

/* ---------- Dashboard ---------- */

function dashboardStats(clienteCount, nameById) {
  const activas = [];
  courses.forEach(c => {
    c.inscritos.forEach(i => {
      if (i.estado !== 'activo') return;
      const dias = diasRestantes(i.vencimiento);
      const horasRest = (c.tipo === 'servicio' && i.horasAsignadas)
        ? i.horasAsignadas - i.horasUsadas
        : null;
      activas.push({
        clienteId: i.clienteId,
        clienteNombre: (nameById && nameById[i.clienteId]) || '—',
        cursoId: c.id,
        cursoNombre: c.nombre,
        diasRestantes: dias,
        horasRestantes: horasRest
      });
    });
  });

  const cuposLibresTotales = courses.reduce((sum, c) => {
    if (c.tipo !== 'curso' || !c.cupoMax) return sum;
    const active = c.inscritos.filter(i => i.estado === 'activo').length;
    return sum + Math.max(0, c.cupoMax - active);
  }, 0);

  const porVencer = activas
    .filter(a => a.diasRestantes <= 7)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const solicitudesPendientes = courses.reduce((n, c) =>
    n + c.inscritos.filter(i => i.estado === 'pendiente').length, 0);

  return {
    totalClientes: clienteCount,
    totalCursos: courses.length,
    totalInscripciones: activas.length,
    cuposLibresTotales: cuposLibresTotales,
    cursosIlimitados: courses.filter(c => c.tipo === 'curso' && !c.cupoMax).length,
    solicitudesPendientes: solicitudesPendientes,
    porVencer: porVencer
  };
}

module.exports = {
  allCourses,
  findCourse,
  validateCourseInput,
  createCourse,
  updateCourse,
  deleteCourse,
  getCoursePublic,
  inscribir,
  registrarProgreso,
  clientInscripciones,
  countClientInscripciones,
  dashboardStats,
  validateContenidoInput,
  addContenido,
  updateContenido,
  deleteContenido,
  findContenidoGlobal,
  videoUrlToEmbed,
  activeInscripcion,
  enrolledInscripcion,
  latestInscripcion,
  clientCourseList,
  clientCatalog,
  solicitarInscripcion,
  aprobarInscripcion,
  rechazarInscripcion,
  clientCourseDetail
};
