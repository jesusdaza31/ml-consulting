/* ==========================================
   ML CONSULTING — admin.js
   Panel de administración: resumen, clientes,
   cursos, contenido e inscripciones.
========================================= */

const state = {
  user: null,
  users: [],
  courses: [],
  dashboard: null,
  clientsFilter: '',
  manager: { courseId: null, itemId: null, viewMode: 'list', previewMode: 'edit', previewViewport: 'desktop', saveStatus: 'saved', history: [], historyIndex: -1 },
  videos: [],
  images: [],
  files: [],
  r2Configured: true,
  payments: [],
  paymentsFilter: '',
  paymentsStatusFilter: 'all',
  paymentsMethodFilter: 'all'
};

let visualSaveTimer = null;
let visualPendingSave = false;

const $ = id => document.getElementById(id);

/* ---------- Helpers ---------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

async function api(path, opts) {
  const res = await authFetch(path, opts);
  if (!res) return { ok: false, status: 401, data: {} };
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { ok: res.ok, status: res.status, data };
}

function toast(message, type) {
  const el = $('adminToast');
  el.textContent = message;
  el.className = 'admin-toast ' + (type || 'ok');
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3800);
}

function getCourse(id) {
  return state.courses.find(c => c.id === id);
}

function extractSquareUrl(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (/^https?:\/\//i.test(trimmed) && !trimmed.includes('<')) {
    return trimmed;
  }
  const match = trimmed.match(/href=["'](https?:\/\/[^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }
  const urlMatch = trimmed.match(/(https?:\/\/[^\s"'<>]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

function renderSquareBtnPreview(paymentLink, price) {
  const cleanUrl = extractSquareUrl(paymentLink);
  const priceText = (price != null && price !== '' && !isNaN(price)) ? ' · USD $' + Number(price).toFixed(2) : '';
  if (!cleanUrl) {
    return '<div style="padding:12px 14px;background:rgba(200,167,107,.08);border:1px dashed rgba(200,167,107,.4);border-radius:10px;color:var(--text-light);font-size:0.85rem;text-align:center;">' +
      '<i class="fa-solid fa-credit-card" style="color:var(--gold-deep);margin-right:6px;"></i> Ingresa o pega el enlace de Square arriba para ver cómo lucirá el botón.' +
      '</div>';
  }
  return '<div class="mc-square-cta-wrap">' +
    '<div class="mc-btn-square" style="cursor:default;">' +
      '<span class="mc-square-btn-icon"><i class="fa-solid fa-credit-card"></i></span>' +
      '<span class="mc-square-btn-text">' +
        '<strong>Pagar con Square' + escapeHtml(priceText) + '</strong>' +
        '<small><i class="fa-solid fa-lock"></i> Pasarela de pago segura</small>' +
      '</span>' +
      '<i class="fa-solid fa-arrow-up-right-from-square mc-square-external"></i>' +
    '</div>' +
    '<div class="mc-square-cta-sub">' +
      '<span class="mc-btn-report-pay" style="cursor:default;"><i class="fa-solid fa-receipt"></i> ¿Ya pagaste en Square? Confirmar pago</span>' +
    '</div>' +
  '</div>';
}

/* ---------- Sesión ---------- */

async function initSession() {
  try {
    const sbUser = await checkAuth();
    if (!sbUser) return;

    const res = await api('/api/auth/me');
    if (res.status === 401 || res.status === 403 || !res.data.user || res.data.user.role !== 'admin') {
      window.location.href = '/login.html';
      return;
    }
    state.user = res.data.user;
    $('adminName').textContent = state.user.name;
    await loadAll();
  } catch (e) {
    window.location.href = '/login.html';
  }
}

/* ---------- Carga de datos ---------- */

async function loadAll() {
  const [dash, usersRes, coursesRes, videosRes, imagesRes, filesRes, paymentsRes] = await Promise.all([
    api('/api/admin/dashboard'),
    api('/api/admin/users'),
    api('/api/admin/courses'),
    api('/api/admin/videos').catch(() => ({ ok: false, status: 503, data: {} })),
    api('/api/admin/images').catch(() => ({ ok: false, status: 503, data: {} })),
    api('/api/admin/files').catch(() => ({ ok: false, status: 503, data: {} })),
    api('/api/admin/payments').catch(() => ({ ok: false, status: 503, data: {} }))
  ]);
  if (!dash.ok || !usersRes.ok || !coursesRes.ok) {
    toast('No se pudieron cargar los datos.', 'error');
    return;
  }
  state.dashboard = dash.data;
  state.users = usersRes.data.users || [];
  state.courses = coursesRes.data.courses || [];
  if (videosRes.ok) {
    state.videos = videosRes.data.videos || [];
    state.r2Configured = true;
  } else {
    state.videos = [];
    state.r2Configured = false;
  }
  if (imagesRes.ok) {
    state.images = imagesRes.data.images || [];
  } else {
    state.images = [];
  }
  if (filesRes.ok) {
    state.files = filesRes.data.files || [];
  } else {
    state.files = [];
  }
  if (paymentsRes && paymentsRes.ok) {
    state.payments = paymentsRes.data.payments || [];
    state.paymentStats = paymentsRes.data.stats || null;
  } else {
    state.payments = [];
    state.paymentStats = null;
  }
  render();
}

/* ---------- Tabs ---------- */

function switchTab(name) {
  document.querySelectorAll('.admin-nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.admin-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + name));
  const titles = { resumen: 'Resumen', clientes: 'Clientes', cursos: 'Cursos', solicitudes: 'Solicitudes', pagos: 'Gestión de Pagos', videos: 'Videos', imagenes: 'Imágenes', archivos: 'Archivos' };
  $('panelTitle').textContent = titles[name] || 'Panel';
}

/* ---------- Render ---------- */

function render() {
  renderDashboard();
  renderClients();
  renderCourses();
  renderSolicitudes();
  renderPayments();
  renderVideos();
  renderImages();
  renderFiles();
}

function renderDashboard() {
  const d = state.dashboard;
  if (!d) return;
  const cards = [
    { v: 'v1', icon: 'fa-users', value: d.totalClientes, label: 'Total de clientes' },
    { v: 'v2', icon: 'fa-graduation-cap', value: d.totalCursos, label: 'Cursos y servicios' },
    { v: 'v3', icon: 'fa-user-check', value: d.totalInscripciones, label: 'Inscripciones activas' },
    { v: 'v4', icon: 'fa-chair', value: d.cuposLibresTotales, label: 'Cupos libres (cursos)' },
    { v: 'v5', icon: 'fa-bell', value: d.solicitudesPendientes, label: 'Solicitudes pendientes' }
  ];
  $('dashStats').innerHTML = cards.map(c =>
    '<div class="stat-card stat-' + c.v + '">' +
      '<span class="stat-icon"><i class="fa-solid ' + c.icon + '"></i></span>' +
      '<div class="stat-value">' + escapeHtml(c.value) + '</div>' +
      '<div class="stat-label">' + escapeHtml(c.label) + '</div>' +
    '</div>'
  ).join('');

  const list = $('porVencer');
  if (!d.porVencer.length) {
    list.innerHTML = '<p class="course-empty">No hay inscripciones por vencer. Todo al día.</p>';
    return;
  }
  list.innerHTML = d.porVencer.map(item => {
    const urgente = item.diasRestantes <= 3;
    const chip = '<span class="por-vencer-chip ' + (urgente ? 'urgente' : 'ok') + '">' +
      (item.diasRestantes === 0 ? 'Vence hoy' : 'Vence en ' + item.diasRestantes + ' días') + '</span>';
    const horas = item.horasRestantes !== null
      ? '<small> · ' + item.horasRestantes + 'h restantes</small>'
      : '';
    return '<div class="por-vencer-item">' +
      '<div><strong>' + escapeHtml(item.clienteNombre) + '</strong>' +
      '<small> — ' + escapeHtml(item.cursoNombre) + horas + '</small></div>' +
      chip + '</div>';
  }).join('');
}

function renderClients() {
  const term = state.clientsFilter.toLowerCase();
  const list = state.users.filter(u => {
    if (u.role !== 'client') return false;
    if (!term) return true;
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  const tbody = $('clientsBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="admin-loading">No hay clientes registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(u =>
    '<tr>' +
      '<td>' + escapeHtml(u.name) + '</td>' +
      '<td>' + escapeHtml(u.email) + '</td>' +
      '<td>' + escapeHtml(fmtDate(u.createdAt)) + '</td>' +
      '<td><span class="course-chip">' + (u.inscripciones || 0) + '</span></td>' +
    '</tr>'
  ).join('');
}

/* ---------- Cursos ---------- */

function courseCard(c) {
  const typeBadge = '<span class="type-badge type-' + c.tipo + '">' +
    (c.tipo === 'curso' ? 'Curso' : 'Servicio') + '</span>';

  let meta = '';
  let progress = '';
  if (c.tipo === 'curso') {
    const cupo = c.cupoMax ? c.cupoMax : 'Ilimitado';
    const libres = c.cuposLibres === null ? '∞' : c.cuposLibres;
    meta += '<span class="course-chip">Inscritos: ' + c.inscritosActivos + ' / ' + cupo + '</span>';
    meta += '<span class="course-chip gold">Cupos libres: ' + libres + '</span>';
    if (c.cupoMax) {
      const pct = Math.min(100, Math.round(c.inscritosActivos / c.cupoMax * 100));
      progress = '<div class="course-progress" title="' + pct + '% ocupado"><i style="width:' + pct + '%"></i></div>';
    }
  } else {
    meta += '<span class="course-chip">Horas: ' + c.horas + 'h por cliente</span>';
  }
  meta += '<span class="course-chip">Duración: ' + c.duracionDias + ' días</span>';
  if (c.modulos && c.modulos.length) {
    meta += '<span class="course-chip">Módulos: ' + c.modulos.length + '</span>';
  }
  if (c.price != null && c.price !== '') {
    meta += '<span class="course-chip gold">USD $' + Number(c.price).toFixed(2) + '</span>';
  }
  if (c.paymentLink) {
    meta += '<a href="' + escapeHtml(c.paymentLink) + '" target="_blank" rel="noopener" class="course-chip square-chip" title="Enlace Square activo: ' + escapeHtml(c.paymentLink) + '"><i class="fa-solid fa-credit-card"></i> Square activo</a>';
  } else {
    meta += '<span class="course-chip square-chip-off" data-action="square-modal" data-id="' + c.id + '" title="Configurar pasarela Square"><i class="fa-solid fa-credit-card"></i> Sin Square</span>';
  }
  meta += '<span class="course-chip gold">Contenido: ' + (c.contenido ? c.contenido.length : 0) + '</span>';

  const inscritosHtml = c.inscritos.length
    ? '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr><th>Cliente</th><th>Inscrito</th><th>Vence</th><th>Estado</th>' +
        (c.tipo === 'servicio' ? '<th>Horas</th><th></th>' : '') + '</tr></thead>' +
        '<tbody>' + c.inscritos.map(i => {
          const estado = i.vencido ? 'vencido' : i.estado;
          const estadoText = { pendiente: 'En revisión', activo: 'Activo', completado: 'Completado', cancelado: 'Cancelado', vencido: 'Vencido' }[estado] || estado;
          const estadoBadge = '<span class="estado-badge estado-' + estado + '">' + estadoText + '</span>';
          const vence = !i.vencimiento ? '—'
            : (i.vencido ? 'Vencido' : (i.diasRestantes === 0 ? 'Vence hoy' : 'En ' + i.diasRestantes + ' días'));
          let horas = '';
          let accion = '';
          if (c.tipo === 'servicio') {
            horas = '<td>' + (i.horasAsignadas != null ? (i.horasUsadas + ' / ' + i.horasAsignadas + 'h') : '—') + '</td>';
            if (i.estado === 'activo') {
              accion = '<td><form class="progreso-form" data-curso="' + c.id + '" data-cliente="' + i.clienteId + '">' +
                '<input type="number" min="1" step="1" placeholder="+h" class="progreso-input" required>' +
                '<button type="submit" class="admin-btn admin-btn-sm">Registrar</button></form></td>';
            } else {
              accion = '<td></td>';
            }
          }
          return '<tr>' +
            '<td>' + escapeHtml(i.clienteNombre) + '</td>' +
            '<td>' + escapeHtml(fmtDate(i.fechaInscripcion)) + '</td>' +
            '<td>' + escapeHtml(vence) + '</td>' +
            '<td>' + estadoBadge + '</td>' +
            horas + accion +
          '</tr>';
        }).join('') + '</tbody></table></div>'
    : '<p class="course-empty">Sin inscritos todavía.</p>';

  return '<div class="course-card">' +
    '<div class="course-head">' +
      '<div>' + typeBadge + '<h3>' + escapeHtml(c.nombre) + '</h3></div>' +
      '<div class="course-actions">' +
        '<button type="button" class="icon-btn preview" title="Vista previa" data-action="preview" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-eye"></i></button>' +
        '<button type="button" class="icon-btn square" title="Configurar Pago Square" data-action="square-modal" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-credit-card"></i></button>' +
        '<button type="button" class="icon-btn" title="Inscribir cliente" data-action="inscribir" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-user-plus"></i></button>' +
        '<button type="button" class="icon-btn gold" title="Gestionar contenido" data-action="contenido" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-layer-group"></i></button>' +
        '<button type="button" class="icon-btn" title="Editar" data-action="edit" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-pen"></i></button>' +
        '<button type="button" class="icon-btn danger" title="Eliminar" data-action="delete" data-id="' + c.id + '">' +
          '<i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>' +
    '<div class="course-body">' +
      '<p class="course-desc">' + escapeHtml(c.descripcion || 'Sin descripción.') + '</p>' +
      '<div class="course-meta">' + meta + '</div>' +
      progress +
      '<div class="course-inscritos"><h4>Inscritos (' + c.totalInscritos + ')</h4>' + inscritosHtml + '</div>' +
    '</div>' +
  '</div>';
}

function renderCourses() {
  const list = $('coursesList');
  if (!state.courses.length) {
    list.innerHTML = '<p class="admin-loading">Aún no hay cursos ni servicios. Crea el primero.</p>';
    return;
  }
  list.innerHTML = state.courses.map(courseCard).join('');
}

/* ---------- Vista previa del curso ---------- */

function adminFileUrl(contenidoId) {
  const token = localStorage.getItem('sb_access_token');
  const url = '/api/client/file/' + contenidoId;
  if (token) {
    return url + '?token=' + encodeURIComponent(token);
  }
  return url;
}

function adminVideoUrl(contenidoId) {
  const token = localStorage.getItem('sb_access_token');
  const url = '/api/client/video/' + contenidoId;
  if (token) {
    return url + '?token=' + encodeURIComponent(token);
  }
  return url;
}

function previewCourseHtml(c) {
  const typeBadge = '<span class="mc-type-badge mc-type-' + c.tipo + '">' +
    (c.tipo === 'curso' ? 'Curso' : 'Servicio') + '</span>';

  const objetivo = c.objetivoGeneral
    ? '<div class="mc-objetivo-block"><span class="mc-objetivo-label"><i class="fa-solid fa-bullseye"></i> Objetivo general</span>' +
      '<p>' + escapeHtml(c.objetivoGeneral) + '</p></div>'
    : '';

  const resultado = c.resultadoEsperado
    ? '<div class="mc-resultado-block"><span class="mc-resultado-label"><i class="fa-solid fa-medal"></i> Resultado esperado</span>' +
      '<p>' + escapeHtml(c.resultadoEsperado) + '</p></div>'
    : '';

  const modulosHtml = (c.modulos && c.modulos.length)
    ? '<div class="mc-aprender"><h3><i class="fa-solid fa-list-check"></i> Qué aprenderás</h3>' +
      '<ol>' + c.modulos.map(m =>
        '<li><i class="fa-solid fa-circle-check"></i><span>' + escapeHtml(m) + '</span></li>'
      ).join('') + '</ol></div>'
    : '';

  const rows = groupContenidoIntoRows(c.contenido || []);
  const contenido = rows.length
    ? '<div class="mc-content-list">' + rows.map(row =>
        '<div class="mc-content-row"><div class="mc-content-row-inner">' +
          row.items.map(contentItemHtml).join('') +
        '</div></div>'
      ).join('') + '</div>'
    : '<p class="mc-no-content">Este curso aún no tiene contenido publicado.</p>';

  const squareCta = c.paymentLink ? (
    '<div style="margin:18px 0;max-width:440px;">' +
      '<a href="' + escapeHtml(c.paymentLink) + '" target="_blank" rel="noopener" class="mc-btn-square">' +
        '<span class="mc-square-btn-icon"><i class="fa-solid fa-credit-card"></i></span>' +
        '<span class="mc-square-btn-text">' +
          '<strong>Pagar con Square' + (c.price != null ? ' · USD $' + Number(c.price).toFixed(2) : '') + '</strong>' +
          '<small><i class="fa-solid fa-lock"></i> Pasarela de pago segura</small>' +
        '</span>' +
        '<i class="fa-solid fa-arrow-up-right-from-square mc-square-external"></i>' +
      '</a>' +
    '</div>'
  ) : '';

  return '<div class="mc-preview-container">' +
    '<div class="mc-preview-header">' +
      '<button type="button" class="mc-preview-close" id="previewClose">' +
        '<i class="fa-solid fa-xmark"></i> Cerrar vista previa' +
      '</button>' +
    '</div>' +
    '<div class="mc-preview-body">' +
      '<div class="mc-detail-hero">' +
        typeBadge +
        '<h1>' + escapeHtml(c.nombre) + '</h1>' +
        (c.price != null ? '<div class="mc-price">USD $' + Number(c.price).toFixed(2) + '</div>' : '') +
        '<p class="mc-desc">' + escapeHtml(c.descripcion || '') + '</p>' +
        objetivo +
        resultado +
        squareCta +
      '</div>' +
      modulosHtml +
      '<h2 class="mc-section-title">Contenido</h2>' +
      contenido +
    '</div>' +
  '</div>';
}

function contentItemHtml(item) {
  const meta = {
    texto: { icon: 'fa-file-lines', label: 'Texto' },
    video: { icon: 'fa-circle-play', label: 'Video' },
    documento: { icon: 'fa-file-pdf', label: 'Documento' },
    imagen: { icon: 'fa-image', label: 'Imagen' }
  }[item.tipo] || { icon: 'fa-file', label: item.tipo };

  const widthPct = item.widthPct || 100;
  const widthClass = 'mc-width-' + widthPct;

  let body = '';
  if (item.tipo === 'texto') {
    body = '<div class="mc-texto">' +
      String(item.texto || '').split(/\n{2,}/).map(p =>
        '<p>' + escapeHtml(p.trim()) + '</p>'
      ).join('') + '</div>';
  } else if (item.tipo === 'video') {
    if (item.r2VideoId) {
      const video = state.videos.find(v => v.id === item.r2VideoId);
      const videoUrl = (video && video.getUrl) ? video.getUrl : adminVideoUrl(item.id);
      body = '<div class="mc-video"><video controls preload="metadata" playsinline>' +
        '<source src="' + escapeHtml(videoUrl) + '">' +
        'Tu navegador no soporta video HTML5.</video></div>';
    } else if (item.videoUrl) {
      body = '<div class="mc-video"><iframe src="' + escapeHtml(item.videoUrl) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    } else {
      body = '<div class="mc-video-placeholder"><i class="fa-solid fa-video-slash"></i><p>Video no disponible</p></div>';
    }
  } else if (item.tipo === 'imagen') {
    if (item.docFile) {
      const img = state.images.find(i => i.key === item.docFile);
      const imgUrl = (img && img.getUrl) ? img.getUrl : adminFileUrl(item.id);
      body = '<div class="mc-doc-preview">' +
        '<img src="' + escapeHtml(imgUrl) + '" loading="lazy" alt="' + escapeHtml(item.docNombre || '') + '">' +
        '</div>';
    } else {
      body = '<div class="mc-doc-preview"><p class="mc-doc-note">Imagen no disponible</p></div>';
    }
  } else if (item.tipo === 'documento') {
    const docCategory = item.docCategory || 'document';
    const docMime = item.docMime || '';
    const docFile = item.docFile || '';
    const docNombre = item.docNombre || docFile || 'Documento';
    const fileUrl = adminFileUrl(item.id);
    const isPdf = docMime === 'application/pdf' || /\.pdf$/i.test(docNombre) || /\.pdf$/i.test(docFile);
    if (docCategory === 'image' || (isPdf && docCategory === 'image')) {
      body = '<div class="mc-doc-preview">' +
        '<img src="' + escapeHtml(fileUrl) + '" loading="lazy" alt="' + escapeHtml(docNombre) + '">' +
        '</div>';
    } else if (isPdf) {
      body = '<div class="mc-doc-preview">' +
        '<iframe src="' + escapeHtml(fileUrl) + '" loading="lazy" title="' + escapeHtml(docNombre) + '">' +
        '</iframe>' +
        '<a href="' + escapeHtml(fileUrl) + '" download="' + escapeHtml(docNombre) + '" class="mc-doc-link" target="_blank" rel="noopener">' +
          '<i class="fa-solid fa-download"></i> Descargar PDF' +
        '</a>' +
        '</div>';
    } else if (docCategory === 'presentation') {
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Presentación</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + escapeHtml(fileUrl) + '" download="' + escapeHtml(docNombre) + '" target="_blank" rel="noopener">' +
          '<i class="fa-brands fa-microsoft-powerpoint"></i> Descargar presentación</a>' +
        '</div>';
    } else if (docCategory === 'document') {
      const icon = docMime && docMime.includes('word') ? 'fa-file-word' : 'fa-file-lines';
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Documento</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + escapeHtml(fileUrl) + '" download="' + escapeHtml(docNombre) + '" target="_blank" rel="noopener">' +
          '<i class="fa-solid ' + icon + '"></i> Descargar documento</a>' +
        '</div>';
    } else {
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Archivo adjunto</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + escapeHtml(fileUrl) + '" target="_blank" rel="noopener">' +
          '<i class="fa-solid fa-download"></i> Ver documento</a>' +
        '</div>';
    }
  }

  return '<div class="mc-content-item ' + widthClass + '">' +
    '<div class="mc-content-head">' +
      '<span class="mc-content-icon ' + item.tipo + '"><i class="fa-solid ' + meta.icon + '"></i></span>' +
      '<div><small>' + meta.label + '</small><strong>' + escapeHtml(item.titulo) + '</strong></div>' +
    '</div>' +
    '<div class="mc-content-body">' + body + '</div>' +
  '</div>';
}

function openPreview(courseId) {
  const course = getCourse(courseId);
  if (!course) return;
  openModal(previewCourseHtml(course));
  $('previewClose').addEventListener('click', closeModal);
}

/* ---------- Solicitudes pendientes ---------- */

function allPendientes() {
  const out = [];
  state.courses.forEach(c => {
    (c.inscritos || []).forEach(i => {
      if (i.estado === 'pendiente') {
        out.push({
          cursoId: c.id,
          cursoNombre: c.nombre,
          clienteId: i.clienteId,
          clienteNombre: i.clienteNombre,
          fecha: i.fechaInscripcion
        });
      }
    });
  });
  return out;
}

function renderSolicitudes() {
  const list = allPendientes();
  $('pendingCount').textContent = list.length;
  $('pendingCount').style.display = list.length ? '' : 'none';

  const el = $('solicitudesList');
  if (!list.length) {
    el.innerHTML = '<p class="course-empty">No hay solicitudes pendientes.</p>';
    return;
  }
  el.innerHTML = list.map(s =>
    '<div class="solicitud-item">' +
      '<span class="solicitud-icon"><i class="fa-solid fa-user-clock"></i></span>' +
      '<div class="solicitud-info">' +
        '<strong>' + escapeHtml(s.clienteNombre) + '</strong>' +
        '<small>' + escapeHtml(s.cursoNombre) + ' · Solicitado el ' + escapeHtml(fmtDate(s.fecha)) + '</small>' +
      '</div>' +
      '<div class="solicitud-actions">' +
        '<button type="button" class="admin-btn admin-btn-sm admin-btn-primary" data-sol="aprobar" data-curso="' + s.cursoId + '" data-cliente="' + s.clienteId + '">Aprobar</button>' +
        '<button type="button" class="admin-btn admin-btn-sm admin-btn-danger" data-sol="rechazar" data-curso="' + s.cursoId + '" data-cliente="' + s.clienteId + '">Rechazar</button>' +
      '</div>' +
    '</div>'
  ).join('');
}

async function aprobarSolicitud(cursoId, clienteId) {
  const res = await api('/api/admin/courses/' + cursoId + '/aprobar', {
    method: 'POST',
    body: JSON.stringify({ clienteId: clienteId })
  });
  if (!res.ok) return toast(res.data.error || 'No se pudo aprobar.', 'error');
  toast('Solicitud aprobada.');
  await refreshCourses();
}

async function rechazarSolicitud(cursoId, clienteId) {
  const res = await api('/api/admin/courses/' + cursoId + '/rechazar', {
    method: 'POST',
    body: JSON.stringify({ clienteId: clienteId })
  });
  if (!res.ok) return toast(res.data.error || 'No se pudo rechazar.', 'error');
  toast('Solicitud rechazada.');
  await refreshCourses();
  await refreshPayments();
}

/* ---------- Gestión de Pagos ---------- */

const PAYMENT_METHOD_META = {
  square: { label: 'Square / Tarjeta en línea', icon: 'fa-solid fa-credit-card' },
  tarjeta: { label: 'Tarjeta física', icon: 'fa-solid fa-credit-card' },
  transferencia: { label: 'Transferencia bancaria', icon: 'fa-solid fa-building-columns' },
  zelle: { label: 'Zelle', icon: 'fa-solid fa-bolt' },
  efectivo: { label: 'Efectivo', icon: 'fa-solid fa-money-bill-wave' },
  manual: { label: 'Manual / Cortesía / Beca', icon: 'fa-solid fa-handshake' },
  cortesia: { label: 'Cortesía / Beca', icon: 'fa-solid fa-gift' }
};

function courseOptions(selectedId) {
  return state.courses
    .map(c => {
      const priceStr = c.price != null && c.price !== '' ? ' ($' + Number(c.price).toFixed(2) + ')' : '';
      return '<option value="' + c.id + '" data-price="' + (c.price != null ? c.price : 0) + '"' + (c.id === selectedId ? ' selected' : '') + '>' +
        escapeHtml(c.nombre) + priceStr + '</option>';
    }).join('') || '<option value="">Sin cursos</option>';
}

function renderPayments() {
  const tbody = $('paymentsBody');
  if (!tbody) return;

  const payments = state.payments || [];

  // Actualizar stats
  const completados = payments.filter(p => p.estado === 'completado');
  const pendientes = payments.filter(p => p.estado === 'pendiente');
  const manuales = payments.filter(p => ['manual', 'cortesia', 'efectivo', 'transferencia', 'zelle'].includes(p.metodo));
  const totalRecaudado = completados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  if ($('statRecaudado')) $('statRecaudado').textContent = '$' + totalRecaudado.toFixed(2);
  if ($('statCompletados')) $('statCompletados').textContent = completados.length;
  if ($('statPendientes')) $('statPendientes').textContent = pendientes.length;
  if ($('statManuales')) $('statManuales').textContent = manuales.length;

  const pendingBadge = $('pendingPaymentsCount');
  if (pendingBadge) {
    pendingBadge.textContent = pendientes.length;
    pendingBadge.style.display = pendientes.length ? '' : 'none';
  }

  // Filtrado
  const query = (state.paymentsFilter || '').toLowerCase().trim();
  const statusFilter = state.paymentsStatusFilter || 'all';
  const methodFilter = state.paymentsMethodFilter || 'all';

  const filtered = payments.filter(p => {
    if (statusFilter !== 'all' && p.estado !== statusFilter) return false;
    if (methodFilter !== 'all') {
      if (methodFilter === 'square' && !['square', 'tarjeta'].includes(p.metodo)) return false;
      else if (methodFilter === 'transferencia' && p.metodo !== 'transferencia') return false;
      else if (methodFilter === 'zelle' && p.metodo !== 'zelle') return false;
      else if (methodFilter === 'efectivo' && p.metodo !== 'efectivo') return false;
      else if (methodFilter === 'manual' && !['manual', 'cortesia'].includes(p.metodo)) return false;
    }
    if (query) {
      const matchClient = (p.clienteNombre || '').toLowerCase().includes(query) || (p.clienteEmail || '').toLowerCase().includes(query);
      const matchCourse = (p.cursoNombre || '').toLowerCase().includes(query);
      const matchRef = (p.referencia || '').toLowerCase().includes(query) || (p.notas || '').toLowerCase().includes(query);
      return matchClient || matchCourse || matchRef;
    }
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="course-empty" style="text-align:center;padding:36px 20px;">' +
      (payments.length ? 'No hay pagos que coincidan con los filtros.' : 'Aún no hay pagos registrados. Haz clic en "Registrar pago manual" para comenzar.') +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const meta = PAYMENT_METHOD_META[p.metodo] || { label: p.metodo || 'Otro', icon: 'fa-solid fa-money-check' };
    const statusLabel = p.estado === 'completado' ? 'Pagado / Activo' : (p.estado === 'pendiente' ? 'Pendiente' : (p.estado === 'fallido' ? 'Cancelado' : p.estado));
    const statusClass = p.estado || 'completado';

    let actionBtns = '';
    if (p.estado === 'pendiente') {
      actionBtns += '<button type="button" class="icon-btn gold" title="Aprobar pago y activar acceso" data-pay-action="approve" data-id="' + p.id + '"><i class="fa-solid fa-check"></i></button>';
    }
    actionBtns += '<button type="button" class="icon-btn" title="Ver comprobante y detalles" data-pay-action="view" data-id="' + p.id + '"><i class="fa-solid fa-receipt"></i></button>';
    actionBtns += '<button type="button" class="icon-btn danger" title="Eliminar registro" data-pay-action="delete" data-id="' + p.id + '"><i class="fa-solid fa-trash"></i></button>';

    return '<tr>' +
      '<td class="payment-client-cell">' +
        '<strong>' + escapeHtml(p.clienteNombre || '—') + '</strong>' +
        '<small>' + escapeHtml(p.clienteEmail || '') + '</small>' +
      '</td>' +
      '<td>' +
        '<strong>' + escapeHtml(p.cursoNombre || '—') + '</strong> ' +
        '<span class="type-badge type-' + (p.cursoTipo || 'curso') + '">' + (p.cursoTipo === 'servicio' ? 'Servicio' : 'Curso') + '</span>' +
      '</td>' +
      '<td><span class="payment-amount">$' + Number(p.monto).toFixed(2) + ' <small>' + escapeHtml(p.moneda || 'USD') + '</small></span></td>' +
      '<td>' +
        '<span class="payment-method-badge"><i class="' + meta.icon + '"></i> ' + escapeHtml(meta.label) + '</span>' +
      '</td>' +
      '<td>' +
        '<span class="payment-status-badge ' + statusClass + '">' +
          (statusClass === 'completado' ? '<i class="fa-solid fa-circle-check"></i> ' : (statusClass === 'pendiente' ? '<i class="fa-solid fa-clock"></i> ' : '<i class="fa-solid fa-circle-xmark"></i> ')) +
          statusLabel +
        '</span>' +
      '</td>' +
      '<td><code>' + escapeHtml(p.referencia || '—') + '</code></td>' +
      '<td><small>' + escapeHtml(fmtDate(p.createdAt)) + '</small></td>' +
      '<td style="text-align:right;"><div style="display:inline-flex;gap:6px;">' + actionBtns + '</div></td>' +
    '</tr>';
  }).join('');
}

function paymentForm(payment = null) {
  const p = payment || {
    clientId: '',
    courseId: '',
    monto: '',
    metodo: 'transferencia',
    estado: 'completado',
    referencia: '',
    notas: '',
    activarInscripcion: true
  };
  const isEdit = !payment;

  return '<h2>' + (isEdit ? 'Editar registro de pago' : 'Registrar pago manual / Habilitar acceso') + '</h2>' +
    '<form id="paymentForm" ' + (isEdit ? ('data-payment-id="' + p.id + '"') : '') + '>' +
      '<label class="admin-field"><span>Cliente</span>' +
        '<select name="clientId" required class="admin-input">' +
          '<option value="">Selecciona un cliente…</option>' +
          clientOptions(p.clientId) +
        '</select>' +
      '</label>' +
      '<label class="admin-field"><span>Curso o Servicio</span>' +
        '<select name="courseId" id="paymentCourseSelect" required class="admin-input">' +
          '<option value="">Selecciona un curso o servicio…</option>' +
          courseOptions(p.courseId) +
        '</select>' +
      '</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
        '<label class="admin-field"><span>Monto ($ USD)</span>' +
          '<input type="number" step="0.01" min="0" name="monto" id="paymentMontoInput" value="' + (p.monto != null && p.monto !== '' ? p.monto : '0.00') + '" required class="admin-input" placeholder="0.00">' +
          '<small style="color:var(--text-light);font-size:0.75rem;margin-top:4px;display:block;">Usa 0.00 para accesos por cortesía o beca.</small>' +
        '</label>' +
        '<label class="admin-field"><span>Método de pago</span>' +
          '<select name="metodo" class="admin-input">' +
            '<option value="transferencia"' + (p.metodo === 'transferencia' ? ' selected' : '') + '>Transferencia bancaria</option>' +
            '<option value="zelle"' + (p.metodo === 'zelle' ? ' selected' : '') + '>Zelle</option>' +
            '<option value="efectivo"' + (p.metodo === 'efectivo' ? ' selected' : '') + '>Efectivo</option>' +
            '<option value="manual"' + (p.metodo === 'manual' ? ' selected' : '') + '>Manual / Cortesía / Beca</option>' +
            '<option value="square"' + (p.metodo === 'square' ? ' selected' : '') + '>Square / Tarjeta en línea</option>' +
            '<option value="tarjeta"' + (p.metodo === 'tarjeta' ? ' selected' : '') + '>Tarjeta (Terminal física)</option>' +
          '</select>' +
        '</label>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
        '<label class="admin-field"><span>Estado del pago</span>' +
          '<select name="estado" class="admin-input">' +
            '<option value="completado"' + (p.estado === 'completado' ? ' selected' : '') + '>Completado (Activa el acceso al instante)</option>' +
            '<option value="pendiente"' + (p.estado === 'pendiente' ? ' selected' : '') + '>Pendiente por verificar</option>' +
          '</select>' +
        '</label>' +
        '<label class="admin-field"><span>N° de Referencia / Comprobante</span>' +
          '<input type="text" name="referencia" value="' + escapeHtml(p.referencia || '') + '" class="admin-input" placeholder="Ej: Zelle #48291, Depósito #102...">' +
        '</label>' +
      '</div>' +
      '<label class="admin-field"><span>Notas u observaciones (opcional)</span>' +
        '<textarea name="notas" rows="2" class="admin-input" placeholder="Comentarios sobre el pago o quién autoriza...">' + escapeHtml(p.notas || '') + '</textarea>' +
      '</label>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:12px;background:rgba(200,167,107,.1);border-radius:10px;cursor:pointer;">' +
        '<input type="checkbox" name="activarInscripcion" value="true" checked style="width:18px;height:18px;accent-color:var(--gold);">' +
        '<span style="font-size:0.88rem;color:var(--primary-dark);font-weight:700;">Habilitar automáticamente el acceso al curso para este cliente al guardar</span>' +
      '</label>' +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-modal-close>Cancelar</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">' + (isEdit ? 'Actualizar pago' : 'Registrar pago y habilitar') + '</button>' +
      '</div>' +
    '</form>';
}

function viewPaymentDetailsModal(id) {
  const p = (state.payments || []).find(x => x.id === id);
  if (!p) return;
  const meta = PAYMENT_METHOD_META[p.metodo] || { label: p.metodo, icon: 'fa-solid fa-money-check' };

  return '<h2>Detalles del pago</h2>' +
    '<div class="payment-detail-card">' +
      '<div class="payment-detail-row"><span>ID Transacción:</span><code>' + escapeHtml(p.id) + '</code></div>' +
      '<div class="payment-detail-row"><span>Cliente:</span><strong>' + escapeHtml(p.clienteNombre) + ' (' + escapeHtml(p.clienteEmail) + ')</strong></div>' +
      '<div class="payment-detail-row"><span>Curso / Servicio:</span><strong>' + escapeHtml(p.cursoNombre) + '</strong></div>' +
      '<div class="payment-detail-row"><span>Monto pagado:</span><strong style="color:var(--gold-deep);font-size:1.1rem;">$' + Number(p.monto).toFixed(2) + ' ' + escapeHtml(p.moneda) + '</strong></div>' +
      '<div class="payment-detail-row"><span>Método:</span><span><i class="' + meta.icon + '"></i> ' + escapeHtml(meta.label) + '</span></div>' +
      '<div class="payment-detail-row"><span>Estado:</span><span class="payment-status-badge ' + p.estado + '">' + escapeHtml(p.estado) + '</span></div>' +
      '<div class="payment-detail-row"><span>Referencia:</span><code>' + escapeHtml(p.referencia || 'Sin referencia') + '</code></div>' +
      '<div class="payment-detail-row"><span>Fecha:</span><span>' + escapeHtml(fmtDate(p.createdAt)) + '</span></div>' +
      (p.notas ? ('<div class="payment-detail-row"><span>Notas:</span><p style="margin:0;font-size:0.85rem;">' + escapeHtml(p.notas) + '</p></div>') : '') +
    '</div>' +
    '<div class="admin-modal-actions">' +
      (p.estado === 'pendiente' ? ('<button type="button" class="admin-btn admin-btn-primary" data-pay-approve-id="' + p.id + '"><i class="fa-solid fa-check"></i> Aprobar pago y habilitar curso</button>') : '') +
      '<button type="button" class="admin-btn" data-modal-close>Cerrar</button>' +
    '</div>';
}

async function savePayment(e) {
  e.preventDefault();
  const form = e.target;
  const paymentId = form.dataset.paymentId || null;
  const formData = new FormData(form);

  const payload = {
    clientId: formData.get('clientId'),
    courseId: formData.get('courseId'),
    monto: Number(formData.get('monto')) || 0,
    metodo: formData.get('metodo'),
    estado: formData.get('estado'),
    referencia: formData.get('referencia'),
    notas: formData.get('notas'),
    activarInscripcion: formData.get('activarInscripcion') === 'true'
  };

  const res = await api('/api/admin/payments' + (paymentId ? ('/' + paymentId) : ''), {
    method: paymentId ? 'PUT' : 'POST',
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    return toast(res.data?.error || 'Error al registrar el pago.', 'error');
  }

  toast(paymentId ? 'Pago actualizado.' : 'Pago registrado y curso habilitado correctamente.');
  closeModal();
  await refreshPayments();
  await refreshCourses();
}

async function approvePayment(id) {
  const res = await api('/api/admin/payments/' + id, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'completado' })
  });
  if (!res.ok) return toast(res.data?.error || 'Error al aprobar pago.', 'error');
  toast('Pago aprobado y acceso al curso habilitado.');
  closeModal();
  await refreshPayments();
  await refreshCourses();
}

async function deletePayment(id) {
  if (!confirm('¿Eliminar este registro de pago?')) return;
  const res = await api('/api/admin/payments/' + id, { method: 'DELETE' });
  if (!res.ok) return toast(res.data?.error || 'Error al eliminar pago.', 'error');
  toast('Registro de pago eliminado.');
  await refreshPayments();
}

async function refreshPayments() {
  const res = await api('/api/admin/payments').catch(() => ({ ok: false }));
  if (res.ok) {
    state.payments = res.data.payments || [];
    state.paymentStats = res.data.stats || null;
    renderPayments();
  }
}

/* ---------- Biblioteca de videos (R2) ---------- */

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + units[i];
}

/* ---------- Client-side file validation ---------- */

const CLIENT_ALLOWED = {
  image:        ['png', 'jpg', 'jpeg', 'webp', 'gif'],
  document:     ['pdf', 'doc', 'docx', 'txt'],
  presentation: ['ppt', 'pptx']
};

const CLIENT_SIZE_LIMITS = {
  image:        10 * 1024 * 1024,
  document:     25 * 1024 * 1024,
  presentation: 50 * 1024 * 1024
};

function validateClientSide(file) {
  if (!file) return { ok: true };
  const name = file.name || '';
  const ext = name.split('.').pop().toLowerCase();
  const category = Object.entries(CLIENT_ALLOWED).find(([, exts]) => exts.includes(ext))?.[0];
  if (!category) return { ok: false, error: 'Tipo de archivo no permitido' };
  if (file.size > CLIENT_SIZE_LIMITS[category]) {
    const limitMB = CLIENT_SIZE_LIMITS[category] / 1024 / 1024;
    return { ok: false, error: category + ' excede ' + limitMB + 'MB' };
  }
  return { ok: true };
}

function videosNotConfiguredHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-video"></i> Biblioteca de videos</h2>' +
    '<p class="admin-block-note">R2 no está configurado todavía.</p>' +
    '<div class="r2-setup">' +
      '<p>Para subir videos directamente desde el navegador (sin pasar por el servidor) y reproducirlos con enlaces firmados:</p>' +
      '<ol>' +
        '<li>Crea una cuenta en <a href="https://dash.cloudflare.com" target="_blank" rel="noopener">Cloudflare</a>.</li>' +
        '<li>En <strong>R2</strong>, crea un bucket (p. ej. <code>ml-consulting-videos</code>).</li>' +
        '<li>En <strong>Administrar tokens de API</strong>, crea un token con permiso <em>Object Read &amp; Write</em> sobre ese bucket.</li>' +
        '<li>Copia el <strong>Account ID</strong>, <strong>Access Key ID</strong> y <strong>Secret Access Key</strong> al archivo <code>.env</code> (mira <code>.env.example</code>).</li>' +
        '<li>Reinicia el servidor.</li>' +
      '</ol>' +
      '<p class="course-empty">Mientras tanto, los cursos siguen funcionando con videos de YouTube.</p>' +
    '</div>' +
  '</div>';
}

function videosPanelHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-video"></i> Biblioteca de videos</h2>' +
    '<p class="admin-block-note">Sube videos directo a Cloudflare R2. Luego elígelos al agregar contenido a un curso.</p>' +
    '<div class="dropzone" id="dropzone">' +
      '<i class="fa-solid fa-cloud-arrow-up"></i>' +
      '<p><strong>Arrastra un video aquí</strong> o haz clic para elegirlo</p>' +
      '<small>MP4, WebM, MOV… se sube directo a R2</small>' +
      '<input type="file" id="videoFileInput" accept="video/*" hidden>' +
    '</div>' +
    '<div class="upload-progress-wrap" id="uploadProgressWrap" hidden>' +
      '<span>Subiendo…</span>' +
      '<div class="upload-progress"><i id="uploadProgress"></i></div>' +
    '</div>' +
    '<div class="video-list" id="videosList"><p class="admin-loading">Cargando…</p></div>' +
  '</div>';
}

function renderVideos() {
  const el = $('videosState');
  if (!state.r2Configured) {
    el.innerHTML = videosNotConfiguredHtml();
    return;
  }
  el.innerHTML = videosPanelHtml();
  bindVideoEvents();
  renderVideosList();
}

function renderVideosList() {
  const list = $('videosList');
  if (!list) return;
  if (!state.videos.length) {
    list.innerHTML = '<p class="course-empty">Todavía no hay videos subidos.</p>';
    return;
  }
  list.innerHTML = state.videos.map(v =>
    '<div class="video-item">' +
      '<span class="video-item-icon"><i class="fa-solid fa-file-video"></i></span>' +
      '<div class="video-item-info">' +
        '<strong>' + escapeHtml(v.originalName) + '</strong>' +
        '<small>' + escapeHtml(formatBytes(v.size)) + ' · ' + escapeHtml(fmtDate(v.createdAt)) + '</small>' +
      '</div>' +
      '<div class="video-item-actions">' +
        '<button type="button" class="icon-btn" title="Vista previa" data-preview-video="' + v.id + '"><i class="fa-solid fa-play"></i></button>' +
        '<button type="button" class="icon-btn danger" title="Eliminar" data-del-video="' + v.id + '"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>'
  ).join('');
}

function bindVideoEvents() {
  const dz = $('dropzone');
  const input = $('videoFileInput');
  if (!dz || !input) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); });
  });
  dz.addEventListener('drop', e => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleVideoFile(file);
  });
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) handleVideoFile(input.files[0]);
    input.value = '';
  });

  $('videosList').addEventListener('click', e => {
    const del = e.target.closest('[data-del-video]');
    if (del) { if (confirm('¿Eliminar este video de la biblioteca?')) deleteVideo(del.dataset.delVideo); return; }
    const prev = e.target.closest('[data-preview-video]');
    if (prev) {
      const v = state.videos.find(x => x.id === prev.dataset.previewVideo);
      if (v && v.getUrl) window.open(v.getUrl, '_blank');
    }
  });
}

async function handleVideoFile(file) {
  if (!file.type || !file.type.startsWith('video/')) {
    toast('Selecciona un archivo de video.', 'error');
    return;
  }
  toast('Generando URL de subida…');
  const pres = await api('/api/admin/videos/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4', size: file.size })
  });
  if (!pres.ok) return toast(pres.data.error || 'No se pudo iniciar la subida.', 'error');
  await uploadToR2(pres.data.uploadUrl, file, pres.data.key, pres.data.id);
}

function uploadToR2(uploadUrl, file, key, id) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    const wrap = $('uploadProgressWrap');
    const bar = $('uploadProgress');
    if (wrap) wrap.hidden = false;
    const finish = () => { if (wrap) wrap.hidden = true; if (bar) bar.style.width = '0%'; };

    xhr.upload.onprogress = e => {
      if (bar && e.lengthComputable) {
        bar.style.width = Math.round(e.loaded / e.total * 100) + '%';
      }
    };
    xhr.onload = async () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) {
        const conf = await api('/api/admin/videos/confirm', {
          method: 'POST',
          body: JSON.stringify({ id: id, key: key, filename: file.name, size: file.size, mime: file.type || 'video/mp4' })
        });
        if (conf.ok) toast('Video subido correctamente.');
        else toast(conf.data.error || 'Error al confirmar el video.', 'error');
      } else {
        toast('Error al subir el video a R2.', 'error');
      }
      await refreshVideos();
      resolve();
    };
    xhr.onerror = () => {
      finish();
      toast('Error de conexión al subir.', 'error');
      resolve();
    };
    xhr.send(file);
  });
}

async function deleteVideo(id) {
  const res = await api('/api/admin/videos/' + id, { method: 'DELETE' });
  if (!res.ok) return toast(res.data.error || 'No se pudo eliminar.', 'error');
  toast('Video eliminado.');
  await refreshVideos();
}

async function refreshVideos() {
  const res = await api('/api/admin/videos').catch(() => ({ ok: false }));
  if (res.ok) {
    state.videos = res.data.videos || [];
    renderVideosList();
  }
}

/* ---------- Biblioteca de imágenes (R2) ---------- */

function renderImages() {
  const el = $('imagesState');
  if (!el) return;
  if (!state.r2Configured) {
    el.innerHTML = imagesNotConfiguredHtml();
    return;
  }
  el.innerHTML = imagesPanelHtml();
  bindImageEvents();
  renderImagesList();
}

function imagesNotConfiguredHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-image"></i> Biblioteca de imágenes</h2>' +
    '<p class="admin-block-note">R2 no está configurado todavía.</p>' +
    '<div class="r2-setup">' +
      '<p>Mientras tanto, puedes usar URLs de imágenes externas en el contenido.</p>' +
    '</div>' +
  '</div>';
}

function imagesPanelHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-image"></i> Biblioteca de imágenes</h2>' +
    '<p class="admin-block-note">Sube imágenes a Cloudflare R2. Luego elígelelas al contenido de tipo "Imagen".</p>' +
    '<div class="dropzone" id="imageDropzone">' +
      '<i class="fa-solid fa-cloud-arrow-up"></i>' +
      '<p><strong>Arrastra una imagen aquí</strong> o haz clic para elegirla</p>' +
      '<small>PNG, JPG, JPEG, WEBP, GIF — máx 10MB</small>' +
      '<input type="file" id="imageFileInput" accept=".png,.jpg,.jpeg,.webp,.gif" hidden>' +
    '</div>' +
    '<div class="upload-progress-wrap" id="imageUploadProgressWrap" hidden>' +
      '<span>Subiendo…</span>' +
      '<div class="upload-progress"><i id="imageUploadProgress"></i></div>' +
    '</div>' +
    '<div class="image-grid" id="imagesList"><p class="admin-loading">Cargando…</p></div>' +
  '</div>';
}

function bindImageEvents() {
  const dz = $('imageDropzone');
  const input = $('imageFileInput');
  if (!dz || !input) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); });
  });
  dz.addEventListener('drop', e => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) handleImageFile(input.files[0]);
    input.value = '';
  });

  $('imagesList').addEventListener('click', e => {
    const del = e.target.closest('[data-del-image]');
    if (del) { if (confirm('¿Eliminar esta imagen de la biblioteca?')) deleteImage(del.dataset.delImage); return; }
    const prev = e.target.closest('[data-preview-image]');
    if (prev) {
      const img = state.images.find(x => x.id === prev.dataset.previewImage);
      if (img && img.getUrl) window.open(img.getUrl, '_blank');
    }
  });
}

function renderImagesList() {
  const list = $('imagesList');
  if (!list) return;
  if (!state.images.length) {
    list.innerHTML = '<p class="course-empty">Todavía no hay imágenes en la biblioteca.</p>';
    return;
  }
  list.innerHTML = state.images.map(img =>
    '<div class="image-item">' +
      '<button type="button" class="image-thumb-btn" data-preview-image="' + img.id + '" title="Vista previa">' +
        '<img src="' + escapeHtml(img.getUrl || img.key) + '" alt="" loading="lazy">' +
      '</button>' +
      '<div class="image-item-info">' +
        '<strong>' + escapeHtml(img.originalName) + '</strong>' +
        '<small>' + escapeHtml(formatBytes(img.size)) + ' · ' + escapeHtml(fmtDate(img.createdAt)) + '</small>' +
      '</div>' +
      '<div class="image-item-actions">' +
        '<button type="button" class="icon-btn danger" title="Eliminar" data-del-image="' + img.id + '"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>'
  ).join('');
}

async function handleImageFile(file) {
  const validation = validateClientSide(file);
  if (!validation.ok) {
    toast(validation.error, 'error');
    return;
  }
  toast('Generando URL de subida…');
  const pres = await api('/api/admin/images/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'image/png', size: file.size })
  });
  if (!pres.ok) return toast(pres.data.error || 'No se pudo iniciar la subida.', 'error');
  await uploadImageToR2(pres.data.uploadUrl, file, pres.data.key, pres.data.id);
}

function uploadImageToR2(uploadUrl, file, key, id) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'image/png');
    const wrap = $('imageUploadProgressWrap');
    const bar = $('imageUploadProgress');
    if (wrap) wrap.hidden = false;
    const finish = () => { if (wrap) wrap.hidden = true; if (bar) bar.style.width = '0%'; };
    xhr.upload.onprogress = e => {
      if (bar && e.lengthComputable) bar.style.width = Math.round(e.loaded / e.total * 100) + '%';
    };
    xhr.onload = async () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) {
        const conf = await api('/api/admin/images/confirm', {
          method: 'POST',
          body: JSON.stringify({ id: id, key: key, filename: file.name, size: file.size, mime: file.type || 'image/png' })
        });
        if (conf.ok) toast('Imagen subida correctamente.');
        else toast(conf.data.error || 'Error al confirmar la imagen.', 'error');
      } else {
        toast('Error al subir la imagen a R2.', 'error');
      }
      await refreshImages();
      resolve();
    };
    xhr.onerror = () => { finish(); toast('Error de conexión al subir.', 'error'); resolve(); };
    xhr.send(file);
  });
}

async function deleteImage(id) {
  const res = await api('/api/admin/images/' + id, { method: 'DELETE' });
  if (!res.ok) return toast(res.data.error || 'No se pudo eliminar.', 'error');
  toast('Imagen eliminada.');
  await refreshImages();
}

async function refreshImages() {
  const res = await api('/api/admin/images').catch(() => ({ ok: false }));
  if (res.ok) {
    state.images = res.data.images || [];
    renderImagesList();
  }
}

/* ---------- Biblioteca de archivos (R2) ---------- */

function renderFiles() {
  const el = $('filesState');
  if (!el) return;
  if (!state.r2Configured) {
    el.innerHTML = filesNotConfiguredHtml();
    return;
  }
  el.innerHTML = filesPanelHtml();
  bindFileEvents();
  renderFilesList();
}

function filesNotConfiguredHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-file-lines"></i> Biblioteca de archivos</h2>' +
    '<p class="admin-block-note">R2 no está configurado todavía.</p>' +
    '<div class="r2-setup">' +
      '<p>Mientras tanto, puedes subir archivos directamente en el contenido.</p>' +
    '</div>' +
  '</div>';
}

function filesPanelHtml() {
  return '<div class="admin-block">' +
    '<h2 class="admin-block-title"><i class="fa-solid fa-file-lines"></i> Biblioteca de archivos</h2>' +
    '<p class="admin-block-note">Sube documentos y presentaciones a Cloudflare R2. Luego elígelos al contenido de tipo "Documento".</p>' +
    '<div class="dropzone" id="fileDropzone">' +
      '<i class="fa-solid fa-cloud-arrow-up"></i>' +
      '<p><strong>Arrastra un archivo aquí</strong> o haz clic para elegirlo</p>' +
      '<small>PDF, DOC, DOCX, TXT, PPT, PPTX</small>' +
      '<input type="file" id="fileLibraryInput" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx" hidden>' +
    '</div>' +
    '<div class="upload-progress-wrap" id="fileUploadProgressWrap" hidden>' +
      '<span>Subiendo…</span>' +
      '<div class="upload-progress"><i id="fileUploadProgress"></i></div>' +
    '</div>' +
    '<div class="file-filter-bar">' +
      '<button type="button" class="file-filter-btn active" data-filter="">Todos</button>' +
      '<button type="button" class="file-filter-btn" data-filter="document">Documentos</button>' +
      '<button type="button" class="file-filter-btn" data-filter="presentation">Presentaciones</button>' +
    '</div>' +
    '<div class="file-list" id="filesList"><p class="admin-loading">Cargando…</p></div>' +
  '</div>';
}

function bindFileEvents() {
  const dz = $('fileDropzone');
  const input = $('fileLibraryInput');
  if (!dz || !input) return;

  ['dragenter', 'dragover'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragover'); });
  });
  dz.addEventListener('drop', e => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFileLibraryFile(file);
  });
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) handleFileLibraryFile(input.files[0]);
    input.value = '';
  });

  $('filesList').addEventListener('click', e => {
    const del = e.target.closest('[data-del-file]');
    if (del) { if (confirm('¿Eliminar este archivo de la biblioteca?')) deleteFile(del.dataset.delFile); return; }
    const prev = e.target.closest('[data-preview-file]');
    if (prev) {
      const f = state.files.find(x => x.id === prev.dataset.previewFile);
      if (f && f.getUrl) window.open(f.getUrl, '_blank');
    }
  });

  document.querySelectorAll('.file-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.file-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderFilesList(btn.dataset.filter);
    });
  });
}

function renderFilesList(filterCategory) {
  const list = $('filesList');
  if (!list) return;
  const filtered = filterCategory
    ? state.files.filter(f => f.category === filterCategory)
    : state.files;
  if (!filtered.length) {
    list.innerHTML = '<p class="course-empty">Todavía no hay archivos' + (filterCategory ? ' en esta categoría' : '') + '.</p>';
    return;
  }
  list.innerHTML = filtered.map(f => {
    const icon = f.category === 'presentation' ? 'fa-file-powerpoint' : 'fa-file-pdf';
    return '<div class="file-item">' +
      '<span class="file-item-icon"><i class="fa-solid ' + icon + '"></i></span>' +
      '<div class="file-item-info">' +
        '<strong>' + escapeHtml(f.originalName) + '</strong>' +
        '<small>' + escapeHtml(formatBytes(f.size)) + ' · ' + escapeHtml(fmtDate(f.createdAt)) + '</small>' +
      '</div>' +
      '<div class="file-item-actions">' +
        '<button type="button" class="icon-btn" title="Vista previa" data-preview-file="' + f.id + '"><i class="fa-solid fa-eye"></i></button>' +
        '<button type="button" class="icon-btn danger" title="Eliminar" data-del-file="' + f.id + '"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function handleFileLibraryFile(file) {
  const validation = validateClientSide(file);
  if (!validation.ok) {
    toast(validation.error, 'error');
    return;
  }
  toast('Generando URL de subida…');
  const pres = await api('/api/admin/files/presign', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size })
  });
  if (!pres.ok) return toast(pres.data.error || 'No se pudo iniciar la subida.', 'error');
  await uploadFileToR2(pres.data.uploadUrl, file, pres.data.key, pres.data.id);
}

function uploadFileToR2(uploadUrl, file, key, id) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    const wrap = $('fileUploadProgressWrap');
    const bar = $('fileUploadProgress');
    if (wrap) wrap.hidden = false;
    const finish = () => { if (wrap) wrap.hidden = true; if (bar) bar.style.width = '0%'; };
    xhr.upload.onprogress = e => {
      if (bar && e.lengthComputable) bar.style.width = Math.round(e.loaded / e.total * 100) + '%';
    };
    xhr.onload = async () => {
      finish();
      if (xhr.status >= 200 && xhr.status < 300) {
        const conf = await api('/api/admin/files/confirm', {
          method: 'POST',
          body: JSON.stringify({ id: id, key: key, filename: file.name, size: file.size, mime: file.type || 'application/octet-stream' })
        });
        if (conf.ok) toast('Archivo subido correctamente.');
        else toast(conf.data.error || 'Error al confirmar el archivo.', 'error');
      } else {
        toast('Error al subir el archivo a R2.', 'error');
      }
      await refreshFiles();
      resolve();
    };
    xhr.onerror = () => { finish(); toast('Error de conexión al subir.', 'error'); resolve(); };
    xhr.send(file);
  });
}

async function deleteFile(id) {
  const res = await api('/api/admin/files/' + id, { method: 'DELETE' });
  if (!res.ok) return toast(res.data.error || 'No se pudo eliminar.', 'error');
  toast('Archivo eliminado.');
  await refreshFiles();
}

async function refreshFiles() {
  const res = await api('/api/admin/files').catch(() => ({ ok: false }));
  if (res.ok) {
    state.files = res.data.files || [];
    renderFilesList();
  }
}

/* ---------- Modal ---------- */

function openModal(html) {
  $('modalBody').innerHTML = html;
  $('adminModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (state.manager.courseId && visualPendingSave) {
    flushVisualSave(state.manager.courseId);
  }
  $('adminModal').hidden = true;
  document.body.style.overflow = '';
  $('modalBody').innerHTML = '';
}

function tipoToggle(value, options) {
  return '<div class="tipo-toggle">' + options.map(o =>
    '<button type="button" class="tipo-toggle-btn' + (o.v === value ? ' active' : '') + '" data-tipo="' + o.v + '">' +
    o.label + '</button>'
  ).join('') + '<input type="hidden" name="tipo" value="' + value + '"></div>';
}

function clientOptions(selectedId) {
  return state.users
    .filter(u => u.role === 'client')
    .map(u =>
      '<option value="' + u.id + '"' + (u.id === selectedId ? ' selected' : '') + '>' +
      escapeHtml(u.name) + ' (' + escapeHtml(u.email) + ')</option>'
    ).join('') || '<option value="">Sin clientes</option>';
}

function courseForm(course) {
  const c = course || { nombre: '', tipo: 'curso', descripcion: '', objetivoGeneral: '', resultadoEsperado: '', modulos: [], cupoMax: '', horas: '', duracionDias: 30, price: '', paymentLink: '' };
  const isEdit = !!course;
  const esServicio = c.tipo === 'servicio';
  return '<h2>' + (isEdit ? 'Editar curso' : 'Agregar curso') + '</h2>' +
    '<form id="courseForm">' +
      '<label class="admin-field"><span>Nombre</span>' +
        '<input type="text" name="nombre" value="' + escapeHtml(c.nombre) + '" required></label>' +
      '<div class="admin-field"><span>Tipo</span>' +
        tipoToggle(c.tipo, [
          { v: 'curso', label: 'Curso (cupo)' },
          { v: 'servicio', label: 'Servicio (horas)' }
        ]) + '</div>' +
      '<label class="admin-field"><span>Descripción del curso</span>' +
        '<textarea name="descripcion" placeholder="Breve descripción…">' + escapeHtml(c.descripcion) + '</textarea></label>' +
      '<label class="admin-field"><span>Objetivo general <small>(opcional)</small></span>' +
        '<textarea name="objetivoGeneral" rows="3" placeholder="Qué logrará el cliente al terminar…">' + escapeHtml(c.objetivoGeneral || '') + '</textarea></label>' +
      '<label class="admin-field"><span>Resultado esperado <small>(opcional)</small></span>' +
        '<textarea name="resultadoEsperado" rows="3" placeholder="Qué obtiene el cliente al completarlo…">' + escapeHtml(c.resultadoEsperado || '') + '</textarea></label>' +
      '<div class="admin-field"><span>Módulos <small>(opcional)</small></span>' +
        '<div class="modulos-list" id="modulosList">' + modulosRowsHtml(c.modulos || []) + '</div>' +
        '<button type="button" class="admin-btn admin-btn-sm admin-btn-gold" id="addModuloBtn">' +
          '<i class="fa-solid fa-plus"></i> Agregar módulo</button>' +
      '</div>' +
      '<div id="cupoWrap"' + (esServicio ? ' style="display:none"' : '') + '><label class="admin-field"><span>Cupo máximo <small>(vacío = ilimitado)</small></span>' +
        '<input type="number" name="cupoMax" min="1" value="' + (c.cupoMax || '') + '"></label></div>' +
      '<div id="horasWrap"' + (esServicio ? '' : ' style="display:none"') + '><label class="admin-field"><span>Horas por cliente</span>' +
        '<input type="number" name="horas" min="1" value="' + (c.horas || '') + '"></label></div>' +
      '<label class="admin-field"><span>Duración <small>(días para completar)</small></span>' +
        '<input type="number" name="duracionDias" min="1" value="' + c.duracionDias + '" required></label>' +
      '<div class="square-config-card">' +
        '<div class="square-config-head">' +
          '<div class="square-badge-icon"><i class="fa-solid fa-credit-card"></i></div>' +
          '<div>' +
            '<h4>Pasarela de Pago Square</h4>' +
            '<p>Agrega el enlace o botón de pago generado en tu cuenta de Square para cobrar este curso.</p>' +
          '</div>' +
        '</div>' +
        '<div class="square-config-body">' +
          '<div class="square-guide-box">' +
            '<i class="fa-solid fa-circle-info"></i>' +
            '<div>' +
              '<strong>¿Cómo obtener tu enlace o botón en Square?</strong>' +
              '<ol>' +
                '<li>Entra a tu cuenta de Square y ve a <strong>Enlaces de pago (Payment Links)</strong> o <strong>Botones de pago</strong>.</li>' +
                '<li>Crea un enlace con el nombre y precio del curso.</li>' +
                '<li>Copia el enlace (ej: <code>https://square.link/u/...</code>) o el código del botón y pégalo aquí abajo.</li>' +
              '</ol>' +
            '</div>' +
          '</div>' +
          '<div class="admin-field">' +
            '<span>Enlace de pago de Square (o código del botón)</span>' +
            '<div class="square-input-wrap">' +
              '<i class="fa-solid fa-link"></i>' +
              '<input type="text" id="squarePaymentLinkInput" name="paymentLink" value="' + escapeHtml(String(c.paymentLink || '')) + '" placeholder="https://square.link/u/... o pega el código del botón">' +
              '<button type="button" class="admin-btn admin-btn-sm" id="testSquareLinkBtn" title="Abrir y verificar enlace">' +
                '<i class="fa-solid fa-arrow-up-right-from-square"></i> Probar' +
              '</button>' +
            '</div>' +
            '<small style="color:var(--text-light);font-size:0.78rem;margin-top:4px;display:block;">' +
              'El alumno hará clic en el botón y será redirigido directamente a Square para pagar.' +
            '</small>' +
          '</div>' +
          '<div class="admin-field">' +
            '<span>Precio oficial en USD (opcional)</span>' +
            '<div class="square-input-wrap">' +
              '<i class="fa-solid fa-dollar-sign"></i>' +
              '<input type="number" id="squarePriceInput" name="price" min="0" step="0.01" value="' + escapeHtml(c.price != null && c.price !== '' ? String(c.price) : '') + '" placeholder="Ej: 99.00">' +
            '</div>' +
          '</div>' +
          '<div class="square-preview-box">' +
            '<span class="square-preview-label"><i class="fa-solid fa-eye"></i> Vista previa del botón que verá el alumno:</span>' +
            '<div id="squareBtnPreviewWrap">' +
              renderSquareBtnPreview(c.paymentLink, c.price) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-modal-close>Cerrar</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">' +
          (isEdit ? 'Guardar cambios' : 'Crear curso') + '</button>' +
      '</div>' +
    '</form>';
}

function squareQuickModal(course) {
  const c = course;
  const cleanUrl = extractSquareUrl(c.paymentLink || '');
  return '<h2><i class="fa-solid fa-credit-card" style="color:var(--gold-deep);margin-right:8px;"></i> Pasarela de Pago — ' + escapeHtml(c.nombre) + '</h2>' +
    '<form id="squareQuickForm" data-course-id="' + c.id + '">' +
      '<div class="square-guide-box" style="margin-top:12px;">' +
        '<i class="fa-solid fa-circle-info"></i>' +
        '<div>' +
          '<strong>Conexión directa con Square:</strong>' +
          '<p style="margin:4px 0 0;font-size:0.85rem;">Pega el enlace o botón generado en Square. Al guardar, el botón de pago seguro quedará activo de inmediato para este curso.</p>' +
        '</div>' +
      '</div>' +
      '<div class="admin-field">' +
        '<span>Enlace de Square (o código del botón) *</span>' +
        '<div class="square-input-wrap">' +
          '<i class="fa-solid fa-link"></i>' +
          '<input type="text" id="squareQuickLinkInput" name="paymentLink" value="' + escapeHtml(cleanUrl) + '" placeholder="https://square.link/u/... o código embed">' +
          '<button type="button" class="admin-btn admin-btn-sm" id="testQuickSquareLinkBtn" title="Probar enlace">' +
            '<i class="fa-solid fa-arrow-up-right-from-square"></i> Probar' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="admin-field">' +
        '<span>Precio oficial en USD (opcional)</span>' +
        '<div class="square-input-wrap">' +
          '<i class="fa-solid fa-dollar-sign"></i>' +
          '<input type="number" id="squareQuickPriceInput" name="price" min="0" step="0.01" value="' + escapeHtml(c.price != null && c.price !== '' ? String(c.price) : '') + '" placeholder="Ej: 99.00">' +
        '</div>' +
      '</div>' +
      '<div class="square-preview-box">' +
        '<span class="square-preview-label"><i class="fa-solid fa-eye"></i> Vista previa del botón:</span>' +
        '<div id="squareQuickPreviewWrap">' +
          renderSquareBtnPreview(cleanUrl, c.price) +
        '</div>' +
      '</div>' +
      '<div class="admin-modal-actions">' +
        (cleanUrl ? '<button type="button" class="admin-btn admin-btn-danger" id="removeSquareLinkBtn" style="margin-right:auto;"><i class="fa-solid fa-trash"></i> Desvincular Square</button>' : '') +
        '<button type="button" class="admin-btn" data-modal-close>Cancelar</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary"><i class="fa-solid fa-check"></i> Guardar configuración</button>' +
      '</div>' +
    '</form>';
}

async function saveSquareQuick(e) {
  e.preventDefault();
  const form = e.target;
  const courseId = form.dataset.courseId;
  const course = getCourse(courseId);
  if (!course) return toast('Curso no encontrado.', 'error');

  const rawLink = form.querySelector('[name="paymentLink"]')?.value || '';
  const cleanLink = extractSquareUrl(rawLink);
  const rawPrice = form.querySelector('[name="price"]')?.value;
  const price = (rawPrice !== '' && rawPrice != null) ? Number(rawPrice) : null;

  if (rawLink && !cleanLink) {
    return toast('El link de pago ingresado no es válido.', 'error');
  }

  const updatedCourse = {
    ...course,
    paymentLink: cleanLink || null,
    price: price
  };

  const res = await api('/api/admin/courses/' + courseId, {
    method: 'PUT',
    body: JSON.stringify(updatedCourse)
  });

  if (!res.ok) return toast(res.data?.error || 'Error al guardar configuración de Square.', 'error');
  toast('¡Configuración de Square guardada con éxito!');
  closeModal();
  await refreshCourses();
}

async function removeSquareQuick(courseId) {
  const course = getCourse(courseId);
  if (!course) return;
  if (!confirm('¿Deseas deshabilitar el enlace de Square de este curso? Los alumnos ya no verán el botón de pago directo.')) return;
  
  const updatedCourse = {
    ...course,
    paymentLink: null
  };
  const res = await api('/api/admin/courses/' + courseId, {
    method: 'PUT',
    body: JSON.stringify(updatedCourse)
  });
  if (!res.ok) return toast(res.data?.error || 'Error al desvincular.', 'error');
  toast('Enlace de Square desvinculado.');
  closeModal();
  await refreshCourses();
}

function modulosRowsHtml(items) {
  const list = (items && items.length) ? items : [''];
  return list.map((v, i) =>
    '<div class="modulo-row">' +
      '<span class="modulo-num">' + (i + 1) + '</span>' +
      '<input type="text" class="modulo-input" value="' + escapeHtml(v || '') + '" placeholder="Módulo ' + (i + 1) + '">' +
      '<button type="button" class="icon-btn danger modulo-remove" title="Quitar módulo" data-remove-modulo><i class="fa-solid fa-xmark"></i></button>' +
    '</div>'
  ).join('');
}

function addModuloRow() {
  const list = $('modulosList');
  if (!list) return;
  const n = list.querySelectorAll('.modulo-row').length + 1;
  list.insertAdjacentHTML('beforeend',
    '<div class="modulo-row">' +
      '<span class="modulo-num">' + n + '</span>' +
      '<input type="text" class="modulo-input" placeholder="Módulo ' + n + '">' +
      '<button type="button" class="icon-btn danger modulo-remove" title="Quitar módulo" data-remove-modulo><i class="fa-solid fa-xmark"></i></button>' +
    '</div>');
}

function renumberModulos() {
  const rows = document.querySelectorAll('#modulosList .modulo-row');
  rows.forEach((row, i) => {
    const num = row.querySelector('.modulo-num');
    if (num) num.textContent = String(i + 1);
    const input = row.querySelector('.modulo-input');
    if (input && !input.value) input.placeholder = 'Módulo ' + (i + 1);
  });
}

function inscribirForm(course) {
  const esServicio = course.tipo === 'servicio';
  return '<h2>Inscribir — ' + escapeHtml(course.nombre) + '</h2>' +
    '<form id="inscribirForm">' +
      '<label class="admin-field"><span>Cliente</span>' +
        '<select name="clienteId" required>' + clientOptions() + '</select></label>' +
      (esServicio
        ? '<label class="admin-field"><span>Horas asignadas</span>' +
          '<input type="number" name="horas" min="1" value="' + course.horas + '" required></label>'
        : '') +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-modal-close>Cerrar</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">Inscribir</button>' +
      '</div>' +
    '</form>';
}

/* ---------- Gestor de contenido ---------- */

const CONTENT_META = {
  texto: { icon: 'fa-file-lines', label: 'Texto' },
  video: { icon: 'fa-circle-play', label: 'Video' },
  documento: { icon: 'fa-file-pdf', label: 'Documento' },
  imagen: { icon: 'fa-image', label: 'Imagen' }
};

function renderContentListItems(course) {
  const items = (course.contenido || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  if (!items.length) {
    return '<p class="course-empty">Este curso aún no tiene contenido. Haz clic en "Agregar contenido" para comenzar.</p>';
  }

  return items.map((it, index) => {
    const meta = CONTENT_META[it.tipo] || { icon: 'fa-file', label: it.tipo };
    let extra = '';
    if (it.tipo === 'texto') extra = (it.texto || '').slice(0, 80);
    else if (it.tipo === 'video') {
      const lib = it.r2VideoId ? state.videos.find(v => v.id === it.r2VideoId) : null;
      extra = lib ? lib.originalName : (it.r2VideoId ? 'Video de la biblioteca' : 'Video de YouTube');
    } else {
      extra = it.docNombre || it.docFile || 'Archivo';
    }
    const widthPct = it.widthPct || 100;
    const isFirst = index === 0;
    const isLast = index === items.length - 1;

    return '<div class="contenido-item" data-id="' + it.id + '" data-index="' + index + '">' +
      '<span class="contenido-drag-handle" draggable="true" data-drag-id="' + it.id + '" title="Arrastrar para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>' +
      '<span class="contenido-order" title="Posición #' + it.orden + '">' + it.orden + '</span>' +
      '<span class="contenido-type ' + it.tipo + '" title="' + meta.label + '"><i class="fa-solid ' + meta.icon + '"></i></span>' +
      '<div class="contenido-info">' +
        '<strong title="' + escapeHtml(it.titulo || '') + '">' + escapeHtml(it.titulo || 'Sin título') + '</strong>' +
        '<small title="' + escapeHtml(extra) + '">' + escapeHtml(extra) + '</small>' +
      '</div>' +
      '<span class="contenido-width-badge" title="Ancho en el layout visual">' + widthPct + '%</span>' +
      '<div class="contenido-actions">' +
        '<button type="button" class="icon-btn" title="' + (isFirst ? 'Ya está en la primera posición' : 'Subir una posición') + '" data-mc-action="up" data-id="' + it.id + '"' + (isFirst ? ' disabled' : '') + '><i class="fa-solid fa-arrow-up"></i></button>' +
        '<button type="button" class="icon-btn" title="' + (isLast ? 'Ya está en la última posición' : 'Bajar una posición') + '" data-mc-action="down" data-id="' + it.id + '"' + (isLast ? ' disabled' : '') + '><i class="fa-solid fa-arrow-down"></i></button>' +
        '<button type="button" class="icon-btn" title="Duplicar" data-mc-action="duplicate" data-id="' + it.id + '"><i class="fa-solid fa-clone"></i></button>' +
        '<button type="button" class="icon-btn" title="Editar" data-mc-action="edit" data-id="' + it.id + '"><i class="fa-solid fa-pen"></i></button>' +
        '<button type="button" class="icon-btn danger" title="Eliminar" data-mc-action="delete" data-id="' + it.id + '"><i class="fa-solid fa-trash"></i></button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function contentListHtml(course) {
  const viewMode = state.manager.viewMode || 'list';
  const listBtnClass = viewMode === 'list' ? 'admin-btn-primary' : '';
  const visualBtnClass = viewMode === 'visual' ? 'admin-btn-primary' : '';
  const saveStatus = state.manager.saveStatus || 'saved';

  const canUndo = (state.manager.historyIndex || 0) > 0;
  const canRedo = (state.manager.historyIndex || 0) < ((state.manager.history || []).length - 1);

  return '<h2>Contenido — ' + escapeHtml(course.nombre) + '</h2>' +
    '<div class="visual-toolbar">' +
      '<div class="visual-toolbar-group">' +
        '<button type="button" class="admin-btn admin-btn-sm" data-modal-close>← Volver</button>' +
        '<button type="button" class="admin-btn admin-btn-sm ' + listBtnClass + '" data-view-mode="list"><i class="fa-solid fa-list"></i> Lista</button>' +
        '<button type="button" class="admin-btn admin-btn-sm ' + visualBtnClass + '" data-view-mode="visual"><i class="fa-solid fa-pen-ruler"></i> Edición Visual</button>' +
      '</div>' +
      '<div class="visual-toolbar-group visual-history-controls">' +
        '<button type="button" class="visual-action-btn ' + (canUndo ? '' : 'disabled') + '" data-history-action="undo" title="Deshacer (Ctrl+Z)" ' + (canUndo ? '' : 'disabled') + '><i class="fa-solid fa-rotate-left"></i> Deshacer</button>' +
        '<button type="button" class="visual-action-btn ' + (canRedo ? '' : 'disabled') + '" data-history-action="redo" title="Rehacer (Ctrl+Y)" ' + (canRedo ? '' : 'disabled') + '><i class="fa-solid fa-rotate-right"></i> Rehacer</button>' +
      '</div>' +
      '<div class="visual-save-badge ' + saveStatus + '" id="visualSaveBadge">' +
        '<span class="badge-saving"><i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...</span>' +
        '<span class="badge-saved"><i class="fa-solid fa-check"></i> Guardado</span>' +
        '<span class="badge-error"><i class="fa-solid fa-triangle-exclamation"></i> Error al guardar</span>' +
      '</div>' +
      '<div style="margin-left:auto">' +
        '<button type="button" class="admin-btn admin-btn-primary admin-btn-sm" data-mc-action="new"><i class="fa-solid fa-plus"></i> Agregar contenido</button>' +
      '</div>' +
    '</div>' +
    '<div class="contenido-list" id="contenidoList">' + renderContentListItems(course) + '</div>';
}

function groupContenidoIntoRows(items) {
  if (!items || !items.length) return [];
  const sorted = items.slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const rows = [];
  let currentRow = null;
  let currentWidth = 0;

  sorted.forEach(item => {
    const w = Number(item.widthPct) || 100;
    // Agrupa bloques si la suma de anchos <= 100.5% (permite 33+33+33=99%, 66+33=99%, etc.)
    if (currentRow && (currentWidth + w <= 100.5)) {
      currentRow.items.push(item);
      currentWidth += w;
    } else {
      currentRow = {
        id: item.rowId || ('row_' + item.id),
        items: [item]
      };
      rows.push(currentRow);
      currentWidth = w >= 100 ? 100 : w;
    }
  });

  return rows;
}

function renderVisualRowsHtml(rows, previewMode) {
  previewMode = previewMode || state.manager.previewMode || 'edit';
  if (!rows || !rows.length) {
    return '<p class="course-empty">Este curso aún no tiene contenido. Haz clic en "Agregar contenido" para comenzar.</p>';
  }

  return rows.map((row) => {
    const blocksHtml = row.items.map((it) => {
      const widthPct = Number(it.widthPct) || 100;
      const widthClass = 'width-' + widthPct;
      const meta = CONTENT_META[it.tipo] || { icon: 'fa-file', label: it.tipo };

      if (previewMode === 'student') {
        return '<div class="visual-content-block ' + widthClass + '" data-id="' + it.id + '">' +
          '<div class="visual-student-card">' +
            '<div class="visual-student-head">' +
              '<span class="visual-student-icon ' + it.tipo + '"><i class="fa-solid ' + meta.icon + '"></i></span>' +
              '<div><small>' + meta.label + '</small><strong>' + escapeHtml(it.titulo || meta.label) + '</strong></div>' +
            '</div>' +
            '<div class="visual-student-body">' +
              renderVisualContent(it) +
            '</div>' +
          '</div>' +
        '</div>';
      }

      return '<div class="visual-content-block ' + widthClass + '" data-id="' + it.id + '" data-row-id="' + row.id + '" data-width="' + widthPct + '">' +
        '<div class="visual-block-header">' +
          '<div class="visual-block-header-left">' +
            '<span class="visual-block-drag" draggable="true" data-drag-id="' + it.id + '" title="Arrastrar para reordenar"><i class="fa-solid fa-grip-vertical"></i></span>' +
            '<span class="visual-block-type"><i class="fa-solid ' + meta.icon + '"></i> ' + (meta.label || it.tipo) + '</span>' +
            (it.titulo ? '<span class="visual-block-title" title="' + escapeHtml(it.titulo) + '">' + escapeHtml(it.titulo) + '</span>' : '') +
          '</div>' +
          '<div class="visual-width-controls" title="Ancho del bloque">' +
            '<button type="button" class="width-btn ' + (widthPct === 25 ? 'active' : '') + '" data-set-width="25" data-id="' + it.id + '">25%</button>' +
            '<button type="button" class="width-btn ' + (widthPct === 33 ? 'active' : '') + '" data-set-width="33" data-id="' + it.id + '">33%</button>' +
            '<button type="button" class="width-btn ' + (widthPct === 50 ? 'active' : '') + '" data-set-width="50" data-id="' + it.id + '">50%</button>' +
            '<button type="button" class="width-btn ' + (widthPct === 66 ? 'active' : '') + '" data-set-width="66" data-id="' + it.id + '">66%</button>' +
            '<button type="button" class="width-btn ' + (widthPct === 75 ? 'active' : '') + '" data-set-width="75" data-id="' + it.id + '">75%</button>' +
            '<button type="button" class="width-btn ' + (widthPct === 100 ? 'active' : '') + '" data-set-width="100" data-id="' + it.id + '">100%</button>' +
          '</div>' +
          '<div class="visual-block-actions">' +
            '<button type="button" class="icon-btn" title="Mover arriba" data-mc-action="up" data-id="' + it.id + '"><i class="fa-solid fa-chevron-up"></i></button>' +
            '<button type="button" class="icon-btn" title="Mover abajo" data-mc-action="down" data-id="' + it.id + '"><i class="fa-solid fa-chevron-down"></i></button>' +
            '<button type="button" class="icon-btn" title="Duplicar" data-mc-action="duplicate" data-id="' + it.id + '"><i class="fa-solid fa-clone"></i></button>' +
            '<button type="button" class="icon-btn" title="Editar" data-mc-action="edit" data-id="' + it.id + '"><i class="fa-solid fa-pen"></i></button>' +
            '<button type="button" class="icon-btn danger" title="Eliminar" data-mc-action="delete" data-id="' + it.id + '"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</div>' +
        '<div class="visual-block-body">' +
          renderVisualContent(it) +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="visual-row" data-row-id="' + row.id + '">' +
      '<div class="visual-row-inner">' + blocksHtml + '</div>' +
    '</div>';
  }).join('');
}

function contentVisualHtml(course) {
  const items = (course.contenido || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const rows = groupContenidoIntoRows(items);

  const viewMode = state.manager.viewMode || 'list';
  const previewMode = state.manager.previewMode || 'edit';
  const previewViewport = state.manager.previewViewport || 'desktop';
  const saveStatus = state.manager.saveStatus || 'saved';

  const listBtnClass = viewMode === 'list' ? 'admin-btn-primary' : '';
  const visualBtnClass = viewMode === 'visual' ? 'admin-btn-primary' : '';

  const rowsHtml = renderVisualRowsHtml(rows, previewMode);

  const canUndo = (state.manager.historyIndex || 0) > 0;
  const canRedo = (state.manager.historyIndex || 0) < ((state.manager.history || []).length - 1);

  return '<h2>Contenido — ' + escapeHtml(course.nombre) + '</h2>' +
    '<div class="visual-toolbar">' +
      '<div class="visual-toolbar-group">' +
        '<button type="button" class="admin-btn admin-btn-sm" data-modal-close>← Volver</button>' +
        '<button type="button" class="admin-btn admin-btn-sm ' + listBtnClass + '" data-view-mode="list"><i class="fa-solid fa-list"></i> Lista</button>' +
        '<button type="button" class="admin-btn admin-btn-sm ' + visualBtnClass + '" data-view-mode="visual"><i class="fa-solid fa-pen-ruler"></i> Edición Visual</button>' +
      '</div>' +
      '<div class="visual-toolbar-group visual-mode-toggle">' +
        '<button type="button" class="visual-toggle-btn ' + (previewMode === 'edit' ? 'active' : '') + '" data-visual-preview-mode="edit" title="Modo Edición"><i class="fa-solid fa-pen-to-square"></i> Editor</button>' +
        '<button type="button" class="visual-toggle-btn ' + (previewMode === 'student' ? 'active' : '') + '" data-visual-preview-mode="student" title="Vista tal como la ve el alumno"><i class="fa-solid fa-graduation-cap"></i> Vista Alumno</button>' +
      '</div>' +
      '<div class="visual-toolbar-group visual-history-controls">' +
        '<button type="button" class="visual-action-btn ' + (canUndo ? '' : 'disabled') + '" data-history-action="undo" title="Deshacer último cambio (Ctrl+Z)" ' + (canUndo ? '' : 'disabled') + '><i class="fa-solid fa-rotate-left"></i> Deshacer</button>' +
        '<button type="button" class="visual-action-btn ' + (canRedo ? '' : 'disabled') + '" data-history-action="redo" title="Rehacer cambio (Ctrl+Y)" ' + (canRedo ? '' : 'disabled') + '><i class="fa-solid fa-rotate-right"></i> Rehacer</button>' +
      '</div>' +
      '<div class="visual-toolbar-group visual-viewport-controls">' +
        '<button type="button" class="viewport-btn ' + (previewViewport === 'desktop' ? 'active' : '') + '" data-viewport="desktop" title="Escritorio (100%)"><i class="fa-solid fa-desktop"></i></button>' +
        '<button type="button" class="viewport-btn ' + (previewViewport === 'tablet' ? 'active' : '') + '" data-viewport="tablet" title="Tablet (768px)"><i class="fa-solid fa-tablet-screen-button"></i></button>' +
        '<button type="button" class="viewport-btn ' + (previewViewport === 'mobile' ? 'active' : '') + '" data-viewport="mobile" title="Móvil (375px)"><i class="fa-solid fa-mobile-screen-button"></i></button>' +
      '</div>' +
      '<div class="visual-save-badge ' + saveStatus + '" id="visualSaveBadge">' +
        '<span class="badge-saving"><i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...</span>' +
        '<span class="badge-saved"><i class="fa-solid fa-check"></i> Guardado</span>' +
        '<span class="badge-error"><i class="fa-solid fa-triangle-exclamation"></i> Error al guardar</span>' +
      '</div>' +
      '<div style="margin-left:auto">' +
        '<button type="button" class="admin-btn admin-btn-primary admin-btn-sm" data-mc-action="new"><i class="fa-solid fa-plus"></i> Agregar contenido</button>' +
      '</div>' +
    '</div>' +
    '<div class="visual-viewport-wrap viewport-' + previewViewport + '">' +
      '<div class="visual-content-list ' + (previewMode === 'student' ? 'mode-student' : 'mode-edit') + '" id="contenidoList">' + rowsHtml + '</div>' +
    '</div>';
}

function renderVisualContent(item) {
  if (item.tipo === 'texto') {
    return '<div class="visual-texto">' +
      String(item.texto || '').split(/\n{2,}/).map(p =>
        '<p>' + escapeHtml(p.trim()) + '</p>'
      ).join('') + '</div>';
  } else if (item.tipo === 'video') {
    if (item.r2VideoId) {
      const video = state.videos.find(v => v.id === item.r2VideoId);
      if (video && video.getUrl) {
        return '<div class="visual-video"><video controls preload="metadata" playsinline>' +
          '<source src="' + escapeHtml(video.getUrl) + '">' +
          'Tu navegador no soporta video HTML5.</video></div>';
      }
      return '<div class="visual-placeholder"><i class="fa-solid fa-video-slash"></i><p>Video no disponible</p></div>';
    } else if (item.videoUrl) {
      return '<div class="visual-video"><iframe src="' + escapeHtml(item.videoUrl) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
    return '<div class="visual-placeholder"><i class="fa-solid fa-video-slash"></i><p>Video no disponible</p></div>';
  } else if (item.tipo === 'imagen') {
    if (item.docFile) {
      const img = state.images.find(i => i.key === item.docFile);
      const imgUrl = (img && img.getUrl) ? img.getUrl : adminFileUrl(item.id);
      return '<div class="visual-imagen">' +
        '<img src="' + escapeHtml(imgUrl) + '" loading="lazy" alt="' + escapeHtml(item.docNombre || '') + '">' +
        '</div>';
    }
    return '<div class="visual-placeholder"><i class="fa-solid fa-image"></i><p>Imagen no disponible</p></div>';
  } else if (item.tipo === 'documento') {
    const docMime = item.docMime || '';
    const docNombre = item.docNombre || item.docFile || 'Documento';
    const isPdf = docMime === 'application/pdf' || /\.pdf$/i.test(docNombre);
    if (isPdf) {
      return '<div class="visual-documento">' +
        '<iframe src="' + escapeHtml(adminFileUrl(item.id)) + '" loading="lazy" title="' + escapeHtml(docNombre) + '"></iframe>' +
        '</div>';
    }
    return '<div class="visual-documento-download">' +
      '<i class="fa-solid fa-file-lines"></i>' +
      '<strong>' + escapeHtml(docNombre) + '</strong>' +
      '<small>Documento</small>' +
      '</div>';
  }
  return '<div class="visual-placeholder"><p>Contenido no disponible</p></div>';
}

function contentFormHtml(course, item) {
  const it = item || { tipo: 'texto', titulo: '', texto: '', videoUrl: '', docNombre: '', docFile: '' };
  const isEdit = !!item;
  const opt = {
    texto: '<option value="texto"' + (it.tipo === 'texto' ? ' selected' : '') + '>Texto</option>',
    video: '<option value="video"' + (it.tipo === 'video' ? ' selected' : '') + '>Video</option>',
    documento: '<option value="documento"' + (it.tipo === 'documento' ? ' selected' : '') + '>Documento</option>',
    imagen: '<option value="imagen"' + (it.tipo === 'imagen' ? ' selected' : '') + '>Imagen</option>'
  };

  const esR2 = it.tipo === 'video' && !!it.r2VideoId;
  const videoYoutube = it.tipo === 'video' ? (it.videoUrl || '') : '';
  const videoSrc = '<div class="tipo-toggle" id="videoSource">' +
    '<button type="button" class="tipo-toggle-btn video-src-btn' + (!esR2 ? ' active' : '') + '" data-src="youtube">YouTube</button>' +
    '<button type="button" class="tipo-toggle-btn video-src-btn' + (esR2 ? ' active' : '') + '" data-src="r2">Mis videos R2</button>' +
  '</div>';

  const docIsLib = it.tipo === 'documento' && state.files.some(f => f.key === it.docFile);
  const docSrc = '<div class="tipo-toggle" id="docSource">' +
    '<button type="button" class="tipo-toggle-btn doc-src-btn' + (!docIsLib ? ' active' : '') + '" data-src="upload">Subir nuevo</button>' +
    '<button type="button" class="tipo-toggle-btn doc-src-btn' + (docIsLib ? ' active' : '') + '" data-src="library">Biblioteca</button>' +
  '</div>';

  const imgIsLib = it.tipo === 'imagen' && state.images.some(i => i.key === it.docFile);
  const imgSrc = '<div class="tipo-toggle" id="imageSource">' +
    '<button type="button" class="tipo-toggle-btn img-src-btn' + (imgIsLib || !isEdit ? ' active' : '') + '" data-src="library">Biblioteca</button>' +
    '<button type="button" class="tipo-toggle-btn img-src-btn' + (!imgIsLib && isEdit ? ' active' : '') + '" data-src="upload">Subir nueva</button>' +
  '</div>';

  const currentImgThumb = (it.tipo === 'imagen' && it.docFile)
    ? ('<div class="mc-doc-current" style="display:flex;align-items:center;gap:14px;margin-bottom:12px;background:rgba(200,167,107,.08);padding:10px 14px;border-radius:10px;border:1px solid rgba(200,167,107,.25)">' +
        '<img src="' + escapeHtml((state.images.find(i => i.key === it.docFile)?.getUrl) || adminFileUrl(it.id)) + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;border:1px solid rgba(63,18,32,.12)">' +
        '<div><span style="display:block;font-weight:600;font-size:13px">' + escapeHtml(it.docNombre || 'Imagen actual') + '</span>' +
        '<small style="color:var(--text-muted);font-size:11px">Si no seleccionas otra imagen ni subes una nueva, se mantendrá la actual.</small></div>' +
       '</div>')
    : '';

  const currentDocInfo = (it.tipo === 'documento' && it.docNombre)
    ? ('<div class="mc-doc-current" style="display:flex;align-items:center;gap:12px;margin-bottom:12px;background:rgba(63,18,32,.04);padding:10px 14px;border-radius:10px;border:1px solid rgba(63,18,32,.1)">' +
        '<i class="fa-solid fa-file-lines" style="font-size:24px;color:var(--gold)"></i>' +
        '<div><span style="display:block;font-weight:600;font-size:13px">' + escapeHtml(it.docNombre) + '</span>' +
        '<small style="color:var(--text-muted);font-size:11px">Si no eliges otro archivo ni subes uno nuevo, se mantendrá el actual.</small></div>' +
       '</div>')
    : '';

  return '<h2>' + (isEdit ? 'Editar contenido' : 'Agregar contenido') + '</h2>' +
    '<form id="contentForm">' +
      '<div class="admin-field"><span>Tipo</span>' +
        '<select name="tipo" id="contentTipo">' + opt.texto + opt.video + opt.documento + opt.imagen + '</select></div>' +
      '<label class="admin-field"><span>Título</span>' +
        '<input type="text" name="titulo" value="' + escapeHtml(it.titulo) + '" placeholder="Ej: Introducción al tema" required></label>' +
      '<div id="textoWrap"><label class="admin-field"><span>Texto</span>' +
        '<textarea name="texto" rows="6" placeholder="Escribe el contenido educativo o explicativo...">' + escapeHtml(it.texto || '') + '</textarea></label></div>' +
      '<div id="videoWrap" style="display:none">' +
        '<div class="admin-field"><span>Fuente del video</span>' + videoSrc + '</div>' +
        '<div id="videoYoutubeWrap"' + (esR2 ? ' style="display:none"' : '') + '>' +
          '<label class="admin-field"><span>URL de YouTube</span>' +
          '<input type="text" name="videoUrl" value="' + escapeHtml(videoYoutube) +
          '" placeholder="https://www.youtube.com/watch?v=..."></label>' +
        '</div>' +
        '<div id="videoR2Wrap"' + (esR2 ? '' : ' style="display:none"') + '>' +
          '<p class="mc-doc-note">Elige un video de la biblioteca. Si aún no has subido ninguno, ve a la sección <strong>Videos</strong>.</p>' +
          '<div class="video-picker" id="videoPicker"></div>' +
          '<input type="hidden" name="r2VideoId" value="' + escapeHtml(it.r2VideoId || '') + '">' +
          '<input type="hidden" name="r2Key" value="' + escapeHtml(it.r2Key || '') + '">' +
        '</div>' +
      '</div>' +
      '<div id="docWrap" style="display:none">' +
        currentDocInfo +
        '<div class="admin-field"><span>Fuente del archivo</span>' + docSrc + '</div>' +
        '<div id="docUploadWrap"' + (docIsLib ? ' style="display:none"' : '') + '>' +
          '<label class="admin-field"><span>Subir archivo <small>(PDF, DOC, DOCX, TXT, PPT, PPTX)</small></span>' +
          '<input type="file" name="archivo" id="contentFile" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"></label>' +
          '<p class="mc-doc-note" id="uploadStatus"></p>' +
        '</div>' +
        '<div id="docLibraryWrap"' + (!docIsLib ? ' style="display:none"' : '') + '>' +
          '<p class="mc-doc-note">Elige un archivo de la biblioteca. Ve a la sección <strong>Archivos</strong> para subir nuevos.</p>' +
          '<div class="file-picker" id="filePicker"></div>' +
          '<input type="hidden" name="fileKey" value="' + escapeHtml(it.docFile || '') + '">' +
        '</div>' +
      '</div>' +
      '<div id="imagenWrap" style="display:none">' +
        currentImgThumb +
        '<div class="admin-field"><span>Fuente de imagen</span>' + imgSrc + '</div>' +
        '<div id="imageLibraryWrap"' + ((!imgIsLib && isEdit) ? ' style="display:none"' : '') + '>' +
          '<p class="mc-doc-note">Elige una imagen de la biblioteca. Si aún no has subido ninguna, ve a la sección <strong>Imágenes</strong>.</p>' +
          '<div class="image-picker" id="imagePicker"></div>' +
          '<input type="hidden" name="imageKey" value="' + escapeHtml(it.docFile || '') + '">' +
        '</div>' +
        '<div id="imageUploadWrap"' + ((imgIsLib || !isEdit) ? ' style="display:none"' : '') + '>' +
          '<label class="admin-field"><span>Subir imagen <small>(PNG, JPG, JPEG, WEBP, GIF — máx 10MB)</small></span>' +
          '<input type="file" name="imagenArchivo" id="contentImageFile" accept=".png,.jpg,.jpeg,.webp,.gif"></label>' +
          '<p class="mc-doc-note" id="imageUploadStatus"></p>' +
        '</div>' +
      '</div>' +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-mc-action="back">← Volver</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">' + (isEdit ? 'Guardar cambios' : 'Agregar contenido') + '</button>' +
      '</div>' +
    '</form>';
}

function renderVideoPicker(selectedId) {
  const grid = $('videoPicker');
  if (!grid) return;
  if (!state.videos.length) {
    grid.innerHTML = '<p class="course-empty">No hay videos en la biblioteca. Sube uno en la sección "Videos".</p>';
    return;
  }
  grid.innerHTML = state.videos.map(v =>
    '<button type="button" class="video-pick-card' + (v.id === selectedId ? ' selected' : '') +
    '" data-id="' + v.id + '" data-key="' + escapeHtml(v.key) + '">' +
      '<i class="fa-solid fa-file-video"></i>' +
      '<strong>' + escapeHtml(v.originalName) + '</strong>' +
      '<small>' + escapeHtml(formatBytes(v.size)) + '</small>' +
      '<span class="video-pick-check"><i class="fa-solid fa-circle-check"></i></span>' +
    '</button>'
  ).join('');
}

function handleVideoSource(btn) {
  const src = btn.dataset.src;
  const form = $('contentForm');
  if (!form) return;
  const wrap = $('videoSource');
  if (wrap) wrap.querySelectorAll('.video-src-btn').forEach(b => b.classList.toggle('active', b === btn));
  $('videoYoutubeWrap').style.display = src === 'youtube' ? '' : 'none';
  $('videoR2Wrap').style.display = src === 'r2' ? '' : 'none';
  if (src === 'youtube') {
    form.querySelector('[name="r2VideoId"]').value = '';
    form.querySelector('[name="r2Key"]').value = '';
    $('videoPicker').querySelectorAll('.video-pick-card').forEach(c => c.classList.remove('selected'));
  }
}

function pickVideo(card) {
  const grid = $('videoPicker');
  if (!grid) return;
  grid.querySelectorAll('.video-pick-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  const form = $('contentForm');
  if (form) {
    form.querySelector('[name="r2VideoId"]').value = card.dataset.id;
    form.querySelector('[name="r2Key"]').value = card.dataset.key;
  }
}

function renderImagePicker(selectedKey) {
  const grid = $('imagePicker');
  if (!grid) return;
  if (!state.images.length) {
    grid.innerHTML = '<p class="course-empty">No hay imágenes en la biblioteca. Sube una en la sección "Imágenes".</p>';
    return;
  }
  grid.innerHTML = state.images.map(img =>
    '<button type="button" class="image-pick-card' + (img.key === selectedKey ? ' selected' : '') +
    '" data-key="' + escapeHtml(img.key) + '" data-name="' + escapeHtml(img.originalName) + '">' +
      '<img src="' + escapeHtml(img.getUrl || img.key) + '" loading="lazy" alt="">' +
      '<strong>' + escapeHtml(img.originalName) + '</strong>' +
      '<small>' + escapeHtml(formatBytes(img.size)) + '</small>' +
      '<span class="image-pick-check"><i class="fa-solid fa-circle-check"></i></span>' +
    '</button>'
  ).join('');
}

function pickImage(card) {
  const grid = $('imagePicker');
  if (!grid) return;
  grid.querySelectorAll('.image-pick-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  const form = $('contentForm');
  if (form) {
    form.querySelector('[name="imageKey"]').value = card.dataset.key;
  }
}

function renderFilePicker(selectedKey) {
  const list = $('filePicker');
  if (!list) return;
  if (!state.files.length) {
    list.innerHTML = '<p class="course-empty">No hay archivos en la biblioteca. Sube uno en la sección "Archivos".</p>';
    return;
  }
  list.innerHTML = state.files.map(f => {
    const icon = f.category === 'presentation' ? 'fa-file-powerpoint' : 'fa-file-pdf';
    return '<button type="button" class="file-pick-card' + (f.key === selectedKey ? ' selected' : '') +
      '" data-key="' + escapeHtml(f.key) + '" data-name="' + escapeHtml(f.originalName) +
      '" data-mime="' + escapeHtml(f.mime) + '" data-size="' + f.size + '">' +
      '<i class="fa-solid ' + icon + '"></i>' +
      '<strong>' + escapeHtml(f.originalName) + '</strong>' +
      '<small>' + escapeHtml(formatBytes(f.size)) + '</small>' +
      '<span class="file-pick-check"><i class="fa-solid fa-circle-check"></i></span>' +
    '</button>';
  }).join('');
}

function pickFile(card) {
  const list = $('filePicker');
  if (!list) return;
  list.querySelectorAll('.file-pick-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  const form = $('contentForm');
  if (form) {
    form.querySelector('[name="fileKey"]').value = card.dataset.key;
  }
}

function syncContentFormTipo(tipo) {
  $('textoWrap').style.display = tipo === 'texto' ? '' : 'none';
  $('videoWrap').style.display = tipo === 'video' ? '' : 'none';
  $('docWrap').style.display = tipo === 'documento' ? '' : 'none';
  $('imagenWrap').style.display = tipo === 'imagen' ? '' : 'none';
  if (tipo === 'video') {
    const selected = state.manager.editVideoR2 || null;
    if ($('videoPicker')) renderVideoPicker(selected);
  }
  if (tipo === 'imagen') {
    if ($('imagePicker')) renderImagePicker(state.manager.editImageKey || null);
  }
  if (tipo === 'documento') {
    if ($('filePicker')) renderFilePicker(state.manager.editFileKey || null);
  }
}

function openContentManager(courseId) {
  state.manager.courseId = courseId;
  state.manager.itemId = null;
  state.manager.viewMode = state.manager.viewMode || 'list';
  state.manager.previewMode = state.manager.previewMode || 'edit';
  state.manager.previewViewport = state.manager.previewViewport || 'desktop';
  state.manager.saveStatus = 'saved';
  const course = getCourse(courseId);
  state.manager.history = course ? [JSON.parse(JSON.stringify(course.contenido || []))] : [];
  state.manager.historyIndex = 0;
  renderContentManager(false);
}

function renderContentManager(preserveScroll = true) {
  const course = getCourse(state.manager.courseId);
  if (!course) { closeModal(); return; }

  const viewMode = state.manager.viewMode || 'list';
  const modalElem = $('adminModal');
  const contentListElem = $('contenidoList');

  // Fast in-place DOM update when modal is already open
  if (modalElem && !modalElem.hidden && contentListElem) {
    if (viewMode === 'visual' && contentListElem.classList.contains('visual-content-list')) {
      const items = (course.contenido || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
      const rows = groupContenidoIntoRows(items);
      contentListElem.innerHTML = renderVisualRowsHtml(rows, state.manager.previewMode || 'edit');
      updateHistoryButtons();
      setVisualSaveStatus(state.manager.saveStatus || 'saved');
      bindDragAndDrop();
      return;
    }
    if (viewMode === 'list' && contentListElem.classList.contains('contenido-list')) {
      contentListElem.innerHTML = renderContentListItems(course);
      updateHistoryButtons();
      setVisualSaveStatus(state.manager.saveStatus || 'saved');
      bindDragAndDrop();
      return;
    }
  }

  let prevScroll = 0;
  const card = modalElem ? modalElem.querySelector('.admin-modal-card') : null;
  if (preserveScroll && card) {
    prevScroll = card.scrollTop;
  }

  if (viewMode === 'visual') {
    openModal(contentVisualHtml(course));
  } else {
    openModal(contentListHtml(course));
  }

  if (preserveScroll && card) {
    const newCard = modalElem.querySelector('.admin-modal-card');
    if (newCard) newCard.scrollTop = prevScroll;
  }

  // Bind drag & drop after modal is rendered
  setTimeout(() => bindDragAndDrop(), 30);
}

function switchViewMode(mode) {
  state.manager.viewMode = mode;
  renderContentManager();
}

function openContentForm(courseId, itemId) {
  state.manager.courseId = courseId;
  state.manager.itemId = itemId || null;
  const course = getCourse(courseId);
  const item = itemId ? (course.contenido || []).find(x => x.id === itemId) : null;
  state.manager.editVideoR2 = (item && item.tipo === 'video') ? (item.r2VideoId || null) : null;
  state.manager.editImageKey = (item && item.tipo === 'imagen') ? (item.docFile || null) : null;
  state.manager.editFileKey = (item && item.tipo === 'documento') ? (item.docFile || null) : null;
  openModal(contentFormHtml(course, item));
  syncContentFormTipo(item ? item.tipo : 'texto');
}

/* ---------- Acciones: curso ---------- */

async function createOrUpdateCourse(e, id) {
  e.preventDefault();
  const form = new FormData(e.target);
  const tipo = form.get('tipo');
  const modulos = Array.from(e.target.querySelectorAll('.modulo-input'))
    .map(i => i.value.trim())
    .filter(Boolean);
  const rawPaymentLink = form.get('paymentLink') || '';
  const cleanPaymentLink = extractSquareUrl(rawPaymentLink);
  const body = {
    nombre: form.get('nombre'),
    tipo: tipo,
    descripcion: form.get('descripcion'),
    objetivoGeneral: form.get('objetivoGeneral'),
    resultadoEsperado: form.get('resultadoEsperado'),
    modulos: modulos,
    cupoMax: tipo === 'curso' ? (form.get('cupoMax') || '') : null,
    horas: tipo === 'servicio' ? form.get('horas') : null,
    duracionDias: form.get('duracionDias'),
    price: form.get('price') !== '' ? Number(form.get('price')) : null,
    paymentLink: cleanPaymentLink || null
  };
  const res = await api(id ? ('/api/admin/courses/' + id) : '/api/admin/courses', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) return toast(res.data.error || 'Error al guardar.', 'error');
  toast(id ? 'Curso actualizado.' : 'Curso creado.');
  closeModal();
  await refreshCourses();
}

async function deleteCourse(id) {
  if (!confirm('¿Eliminar este curso/servicio? También se borran sus inscripciones y contenido.')) return;
  const res = await api('/api/admin/courses/' + id, { method: 'DELETE' });
  if (!res.ok) return toast(res.data.error || 'Error al eliminar.', 'error');
  toast('Curso eliminado.');
  await refreshCourses();
}

async function inscribirCliente(e, courseId) {
  e.preventDefault();
  const form = new FormData(e.target);
  const body = { clienteId: form.get('clienteId') };
  const horas = form.get('horas');
  if (horas) body.horas = horas;

  const res = await api('/api/admin/courses/' + courseId + '/inscribir', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) return toast(res.data.error || 'Error al inscribir.', 'error');
  toast('Cliente inscrito correctamente.');
  closeModal();
  await refreshCourses();
}

async function registrarProgreso(e, courseId, clienteId) {
  e.preventDefault();
  const input = e.target.querySelector('.progreso-input');
  const horasUsadas = Number(input.value);
  if (!horasUsadas || horasUsadas < 1) return toast('Indica cuántas horas se usaron.', 'error');

  const res = await api('/api/admin/courses/' + courseId + '/progreso', {
    method: 'POST',
    body: JSON.stringify({ clienteId: clienteId, horasUsadas: horasUsadas })
  });
  if (!res.ok) return toast(res.data.error || 'Error al registrar progreso.', 'error');
  toast('Progreso registrado.');
  await refreshCourses();
}

/* ---------- Acciones: contenido ---------- */

async function saveContenido(e) {
  e.preventDefault();
  const form = new FormData(e.target);
  const tipo = form.get('tipo');
  const courseId = state.manager.courseId;
  const itemId = state.manager.itemId;
  const titulo = (form.get('titulo') || '').trim();
  if (!titulo) return toast('El título es obligatorio.', 'error');
  const body = { tipo: tipo, titulo: titulo };

  if (tipo === 'texto') {
    const texto = (form.get('texto') || '').trim();
    if (!texto) return toast('El texto es obligatorio.', 'error');
    body.texto = texto;
  }

  if (tipo === 'video') {
    const videoSrc = document.querySelector('.video-src-btn.active')?.dataset.src;
    if (videoSrc === 'r2') {
      const r2Id = form.get('r2VideoId');
      if (!r2Id) return toast('Selecciona un video de la biblioteca.', 'error');
      body.r2VideoId = r2Id;
      body.r2Key = form.get('r2Key') || '';
    } else {
      const videoUrl = (form.get('videoUrl') || '').trim();
      if (!videoUrl) return toast('Ingresa una URL de YouTube.', 'error');
      body.videoUrl = videoUrl;
    }
  }

  if (tipo === 'documento') {
    const docSrc = document.querySelector('.doc-src-btn.active')?.dataset.src;
    const file = form.get('archivo');
    const fileKey = form.get('fileKey');
    const existing = itemId ? (getCourse(courseId)?.contenido || []).find(x => x.id === itemId) : null;

    if (docSrc === 'upload' && file && file.size) {
      const validation = validateClientSide(file);
      if (!validation.ok) return toast(validation.error, 'error');
      try {
        const presRes = await authFetch('/api/admin/documents/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size })
        });
        if (!presRes || !presRes.ok) {
          const errData = presRes ? await presRes.json().catch(() => ({})) : {};
          return toast(errData.error || 'Error al generar URL de subida.', 'error');
        }
        const presData = await presRes.json();

        const uploadRes = await fetch(presData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!uploadRes.ok) return toast('Error al subir el archivo.', 'error');

        const confirmRes = await authFetch('/api/admin/documents/confirm', {
          method: 'POST',
          body: JSON.stringify({
            key: presData.key,
            filename: file.name,
            size: file.size,
            mime: file.type
          })
        });
        const confirmData = await confirmRes.json().catch(() => ({}));
        if (!confirmRes.ok) return toast(confirmData.error || 'Error al confirmar el archivo.', 'error');

        body.docFile = confirmData.docFile || presData.key;
        body.docNombre = confirmData.docNombre || file.name;
        body.docMime = confirmData.docMime || file.type;
        body.docSize = confirmData.docSize || file.size;
        body.docCategory = confirmData.docCategory || 'document';
      } catch (e) {
        return toast('Error al subir el archivo.', 'error');
      }
    } else if (docSrc === 'library' && fileKey) {
      const f = state.files.find(x => x.key === fileKey);
      if (f) {
        body.docFile = f.key;
        body.docNombre = f.originalName;
        body.docMime = f.mime;
        body.docSize = f.size;
        body.docCategory = f.category;
      } else if (existing && existing.docFile) {
        body.docFile = existing.docFile;
        body.docNombre = existing.docNombre;
        body.docMime = existing.docMime;
        body.docSize = existing.docSize;
        body.docCategory = existing.docCategory;
      } else {
        return toast('Selecciona un archivo de la biblioteca.', 'error');
      }
    } else if (existing && existing.docFile) {
      body.docFile = existing.docFile;
      body.docNombre = existing.docNombre;
      body.docMime = existing.docMime;
      body.docSize = existing.docSize;
      body.docCategory = existing.docCategory;
    } else {
      return toast('Selecciona o sube un documento.', 'error');
    }
  }

  if (tipo === 'imagen') {
    const imgSrc = document.querySelector('.img-src-btn.active')?.dataset.src;
    const file = form.get('imagenArchivo');
    const imageKey = form.get('imageKey');
    const existing = itemId ? (getCourse(courseId)?.contenido || []).find(x => x.id === itemId) : null;

    if (imgSrc === 'upload' && file && file.size) {
      const validation = validateClientSide(file);
      if (!validation.ok) return toast(validation.error, 'error');
      try {
        const presRes = await authFetch('/api/admin/images/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size })
        });
        if (!presRes || !presRes.ok) {
          const errData = presRes ? await presRes.json().catch(() => ({})) : {};
          return toast(errData.error || 'Error al generar URL de subida.', 'error');
        }
        const presData = await presRes.json();
        const uploadRes = await fetch(presData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
        if (!uploadRes.ok) return toast('Error al subir la imagen.', 'error');
        body.docFile = presData.key;
        body.docNombre = file.name;
        body.docMime = file.type;
        body.docSize = file.size;
        body.docCategory = 'image';
      } catch (e) {
        return toast('Error al subir la imagen.', 'error');
      }
    } else if (imgSrc === 'library' && imageKey) {
      const img = state.images.find(i => i.key === imageKey);
      if (img) {
        body.docFile = img.key;
        body.docNombre = img.originalName;
        body.docMime = img.mime;
        body.docSize = img.size;
        body.docCategory = 'image';
      } else if (existing && existing.docFile) {
        body.docFile = existing.docFile;
        body.docNombre = existing.docNombre;
        body.docMime = existing.docMime;
        body.docSize = existing.docSize;
        body.docCategory = 'image';
      } else {
        return toast('Selecciona una imagen de la biblioteca.', 'error');
      }
    } else if (existing && existing.docFile) {
      body.docFile = existing.docFile;
      body.docNombre = existing.docNombre;
      body.docMime = existing.docMime;
      body.docSize = existing.docSize;
      body.docCategory = 'image';
    } else {
      return toast('Selecciona o sube una imagen.', 'error');
    }
  }

  const res = await api('/api/admin/courses/' + courseId + '/contenido' + (itemId ? ('/' + itemId) : ''), {
    method: itemId ? 'PUT' : 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) return toast(res.data?.error || 'Error al guardar.', 'error');
  toast(itemId ? 'Contenido actualizado.' : 'Contenido agregado.');
  await refreshCourses();
  pushHistory(courseId);
  renderContentManager(true);
}

async function deleteContenidoItem(courseId, itemId) {
  if (!confirm('¿Eliminar este contenido?')) return;
  setVisualSaveStatus('saving');
  const res = await api('/api/admin/courses/' + courseId + '/contenido/' + itemId, { method: 'DELETE' });
  if (!res.ok) {
    setVisualSaveStatus('error');
    return toast(res.data?.error || 'Error al eliminar.', 'error');
  }
  const course = getCourse(courseId);
  if (course) {
    course.contenido = (course.contenido || []).filter(x => x.id !== itemId);
    course.contenido.forEach((it, idx) => { it.orden = idx + 1; });
    pushHistory(courseId);
    setVisualSaveStatus('saved');
    renderContentManager(true);
    toast('Contenido eliminado.');
  }
  await refreshCourses();
}

function moveContenido(courseId, itemId, dir) {
  const course = getCourse(courseId);
  if (!course) return;

  const items = (course.contenido || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const idx = items.findIndex(x => String(x.id) === String(itemId));
  const targetIdx = idx + dir;

  if (idx === -1 || targetIdx < 0 || targetIdx >= items.length) return;

  const [moved] = items.splice(idx, 1);
  items.splice(targetIdx, 0, moved);

  items.forEach((it, index) => {
    it.orden = index + 1;
  });

  course.contenido = items;
  pushHistory(courseId);
  renderContentManager(true);
  scheduleVisualSave(courseId);
}

function moveContenidoToPosition(courseId, sourceId, targetIdOrOrder) {
  const course = getCourse(courseId);
  if (!course) return;

  const items = (course.contenido || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const fromIdx = items.findIndex(x => String(x.id) === String(sourceId));
  if (fromIdx === -1) return;

  let toIdx = items.findIndex(x => String(x.id) === String(targetIdOrOrder));
  if (toIdx === -1 && Number.isFinite(Number(targetIdOrOrder))) {
    toIdx = items.findIndex(x => Number(x.orden) === Number(targetIdOrOrder));
  }
  if (toIdx === -1 || toIdx === fromIdx) return;

  const [moved] = items.splice(fromIdx, 1);
  items.splice(toIdx, 0, moved);

  items.forEach((it, index) => {
    it.orden = index + 1;
  });

  course.contenido = items;
  pushHistory(courseId);
  renderContentManager(true);
  scheduleVisualSave(courseId);
}

function scheduleVisualSave(courseId) {
  setVisualSaveStatus('saving');
  visualPendingSave = true;
  if (visualSaveTimer) clearTimeout(visualSaveTimer);
  visualSaveTimer = setTimeout(() => {
    flushVisualSave(courseId);
  }, 350);
}

async function flushVisualSave(courseId) {
  if (visualSaveTimer) {
    clearTimeout(visualSaveTimer);
    visualSaveTimer = null;
  }
  if (!visualPendingSave) return;
  visualPendingSave = false;

  const course = getCourse(courseId);
  if (!course) return;

  const items = (course.contenido || []).map(it => ({
    id: it.id,
    orden: it.orden,
    width_pct: it.widthPct || 100,
    row_id: it.rowId || null
  }));

  try {
    const res = await api('/api/admin/courses/' + courseId + '/contenido', {
      method: 'PUT',
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error(res.data?.error || 'Error al guardar');
    setVisualSaveStatus('saved');
  } catch (e) {
    setVisualSaveStatus('error');
    console.error('Error saving visual layout:', e);
  }
}

function setVisualSaveStatus(status) {
  state.manager.saveStatus = status;
  const badge = $('visualSaveBadge');
  if (badge) {
    badge.className = 'visual-save-badge ' + status;
  }
}

function updateHistoryButtons() {
  const undoBtn = document.querySelector('[data-history-action="undo"]');
  const redoBtn = document.querySelector('[data-history-action="redo"]');
  const canUndo = (state.manager.historyIndex || 0) > 0;
  const canRedo = (state.manager.historyIndex || 0) < ((state.manager.history || []).length - 1);
  if (undoBtn) {
    undoBtn.classList.toggle('disabled', !canUndo);
    undoBtn.disabled = !canUndo;
  }
  if (redoBtn) {
    redoBtn.classList.toggle('disabled', !canRedo);
    redoBtn.disabled = !canRedo;
  }
}

function pushHistory(courseId) {
  const course = getCourse(courseId);
  if (!course) return;
  state.manager.history = state.manager.history || [];
  state.manager.historyIndex = Number.isInteger(state.manager.historyIndex) ? state.manager.historyIndex : -1;

  const currentSnapshot = JSON.stringify(course.contenido || []);
  const lastSnapshot = state.manager.history[state.manager.historyIndex] 
    ? JSON.stringify(state.manager.history[state.manager.historyIndex]) 
    : null;

  if (currentSnapshot === lastSnapshot) return;

  if (state.manager.historyIndex < state.manager.history.length - 1) {
    state.manager.history = state.manager.history.slice(0, state.manager.historyIndex + 1);
  }

  state.manager.history.push(JSON.parse(currentSnapshot));
  if (state.manager.history.length > 40) {
    state.manager.history.shift();
  }
  state.manager.historyIndex = state.manager.history.length - 1;
  updateHistoryButtons();
}

const recordHistory = pushHistory;

function undoHistory() {
  if (!state.manager.history || state.manager.historyIndex <= 0) return;
  state.manager.historyIndex--;
  const snapshot = JSON.parse(JSON.stringify(state.manager.history[state.manager.historyIndex]));
  applyHistorySnapshot(snapshot);
}

function redoHistory() {
  if (!state.manager.history || state.manager.historyIndex >= state.manager.history.length - 1) return;
  state.manager.historyIndex++;
  const snapshot = JSON.parse(JSON.stringify(state.manager.history[state.manager.historyIndex]));
  applyHistorySnapshot(snapshot);
}

function applyHistorySnapshot(snapshot) {
  const courseId = state.manager.courseId;
  const course = getCourse(courseId);
  if (!course) return;

  course.contenido = snapshot;
  renderContentManager(true);
  updateHistoryButtons();
  scheduleVisualSave(courseId);
}

async function duplicateContenidoItem(courseId, contenidoId) {
  const course = getCourse(courseId);
  if (!course) return;
  const item = (course.contenido || []).find(x => x.id === contenidoId);
  if (!item) return;

  if (visualPendingSave) await flushVisualSave(courseId);

  setVisualSaveStatus('saving');
  try {
    const targetOrden = (Number(item.orden) || 0) + 1;
    const payload = {
      tipo: item.tipo,
      titulo: (item.titulo || '') + ' (copia)',
      texto: item.texto || null,
      videoUrl: item.videoUrl || null,
      r2VideoId: item.r2VideoId || null,
      r2Key: item.r2Key || null,
      docFile: item.docFile || null,
      docNombre: item.docNombre || null,
      docMime: item.docMime || null,
      docSize: item.docSize || null,
      docCategory: item.docCategory || null,
      width_pct: item.widthPct || 100,
      orden: targetOrden
    };
    const res = await api('/api/admin/courses/' + courseId + '/contenido', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.data?.error || 'Error al duplicar el contenido.');
    await refreshCourses();
    pushHistory(courseId);
    setVisualSaveStatus('saved');
    renderContentManager(true);
    toast('Contenido duplicado correctamente.');
  } catch (e) {
    setVisualSaveStatus('error');
    toast(e.message || 'Error al duplicar el contenido.', 'error');
  }
}

function setContenidoWidth(contenidoId, widthPct) {
  const courseId = state.manager.courseId;
  const course = getCourse(courseId);
  if (!course) return;

  const item = (course.contenido || []).find(x => x.id === contenidoId);
  if (!item) return;

  if (item.widthPct === widthPct) return;

  item.widthPct = widthPct;
  pushHistory(courseId);
  renderContentManager(true);
  scheduleVisualSave(courseId);
}

function bindDragAndDrop() {
  const list = $('contenidoList');
  if (!list) return;

  const viewMode = state.manager.viewMode || 'list';
  const isVisual = viewMode === 'visual';

  let draggedId = null;
  let draggedElement = null;

  // Bind drag events to handles
  const handles = list.querySelectorAll(isVisual ? '.visual-block-drag' : '.contenido-drag-handle');
  handles.forEach(handle => {
    handle.addEventListener('click', e => {
      e.stopPropagation();
    });

    handle.addEventListener('dragstart', e => {
      draggedId = handle.dataset.dragId;
      draggedElement = handle.closest(isVisual ? '.visual-content-block' : '.contenido-item');
      if (draggedElement) draggedElement.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedId));
    });

    handle.addEventListener('dragend', () => {
      if (draggedElement) {
        draggedElement.classList.remove('dragging');
      }
      const allItems = list.querySelectorAll(isVisual ? '.visual-content-block' : '.contenido-item');
      allItems.forEach(i => i.classList.remove('drag-over'));
      draggedId = null;
      draggedElement = null;
    });
  });

  // Bind drop events to items
  const items = list.querySelectorAll(isVisual ? '.visual-content-block' : '.contenido-item');
  items.forEach(item => {
    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedId && String(draggedId) !== String(item.dataset.id)) {
        item.classList.add('drag-over');
      }
    });

    item.addEventListener('dragleave', e => {
      if (!item.contains(e.relatedTarget)) {
        item.classList.remove('drag-over');
      }
    });

    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const targetId = item.dataset.id;
      if (!draggedId || String(draggedId) === String(targetId)) return;

      const courseId = state.manager.courseId;
      moveContenidoToPosition(courseId, draggedId, targetId);
    });
  });
}

async function refreshCourses() {
  const res = await api('/api/admin/courses');
  if (!res.ok) return;
  state.courses = res.data.courses || [];
  renderCourses();
  renderSolicitudes();
  const dash = await api('/api/admin/dashboard');
  if (dash.ok) { state.dashboard = dash.data; renderDashboard(); }
  const usersRes = await api('/api/admin/users');
  if (usersRes.ok) { state.users = usersRes.data.users || []; renderClients(); }
}

/* ---------- Eventos ---------- */

function bindEvents() {
  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('addCourseBtn').addEventListener('click', () => openModal(courseForm(null)));

  $('modalClose').addEventListener('click', closeModal);
  $('adminModal').addEventListener('click', e => {
    if (e.target === $('adminModal')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('adminModal').hidden) {
      closeModal();
      return;
    }
    if (!$('adminModal').hidden && state.manager.viewMode === 'visual') {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (!isInput) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
          e.preventDefault();
          undoHistory();
        } else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
          e.preventDefault();
          redoHistory();
        }
      }
    }
  });

  $('modalBody').addEventListener('click', e => {
    const histBtn = e.target.closest('[data-history-action]');
    if (histBtn) {
      if (histBtn.dataset.historyAction === 'undo') undoHistory();
      else if (histBtn.dataset.historyAction === 'redo') redoHistory();
      return;
    }

    const closeBtn = e.target.closest('[data-modal-close]');
    if (closeBtn) { closeModal(); return; }

    if (e.target.closest('#addModuloBtn')) { addModuloRow(); return; }

    if (e.target.closest('[data-remove-modulo]')) {
      const row = e.target.closest('.modulo-row');
      if (row && $('modulosList') && $('modulosList').querySelectorAll('.modulo-row').length > 1) {
        row.remove();
        renumberModulos();
      }
      return;
    }

    const vp = e.target.closest('.video-pick-card');
    if (vp) { pickVideo(vp); return; }

    const vs = e.target.closest('.video-src-btn');
    if (vs) { handleVideoSource(vs); return; }

    const ip = e.target.closest('.image-pick-card');
    if (ip) { pickImage(ip); return; }

    const fp = e.target.closest('.file-pick-card');
    if (fp) { pickFile(fp); return; }

    const imgSrc = e.target.closest('.img-src-btn');
    if (imgSrc) {
      const wrap = imgSrc.closest('.tipo-toggle');
      if (wrap) wrap.querySelectorAll('.img-src-btn').forEach(b => b.classList.toggle('active', b === imgSrc));
      const src = imgSrc.dataset.src;
      $('imageLibraryWrap').style.display = src === 'library' ? '' : 'none';
      $('imageUploadWrap').style.display = src === 'upload' ? '' : 'none';
      return;
    }

    const docSrc = e.target.closest('.doc-src-btn');
    if (docSrc) {
      const wrap = docSrc.closest('.tipo-toggle');
      if (wrap) wrap.querySelectorAll('.doc-src-btn').forEach(b => b.classList.toggle('active', b === docSrc));
      const src = docSrc.dataset.src;
      $('docUploadWrap').style.display = src === 'upload' ? '' : 'none';
      $('docLibraryWrap').style.display = src === 'library' ? '' : 'none';
      return;
    }

    const vpBtn = e.target.closest('[data-viewport]');
    if (vpBtn) {
      state.manager.previewViewport = vpBtn.dataset.viewport;
      const wrap = $('modalBody')?.querySelector('.visual-viewport-wrap');
      if (wrap) {
        wrap.className = 'visual-viewport-wrap viewport-' + state.manager.previewViewport;
        $('modalBody').querySelectorAll('.viewport-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.viewport === state.manager.previewViewport);
        });
      } else {
        renderContentManager();
      }
      return;
    }

    const prevModeBtn = e.target.closest('[data-visual-preview-mode]');
    if (prevModeBtn) {
      state.manager.previewMode = prevModeBtn.dataset.visualPreviewMode;
      renderContentManager();
      return;
    }

    const widthBtn = e.target.closest('[data-set-width]');
    if (widthBtn) {
      const contenidoId = widthBtn.dataset.id;
      const widthPct = Number(widthBtn.dataset.setWidth);
      setContenidoWidth(contenidoId, widthPct);
      return;
    }

    const viewModeBtn = e.target.closest('[data-view-mode]');
    if (viewModeBtn) {
      switchViewMode(viewModeBtn.dataset.viewMode);
      return;
    }

    const mc = e.target.closest('[data-mc-action]');
    if (mc) {
      const action = mc.dataset.mcAction;
      const id = mc.dataset.id;
      if (action === 'back') renderContentManager();
      else if (action === 'new') openContentForm(state.manager.courseId, null);
      else if (action === 'edit') openContentForm(state.manager.courseId, id);
      else if (action === 'duplicate') duplicateContenidoItem(state.manager.courseId, id);
      else if (action === 'up') moveContenido(state.manager.courseId, id, -1);
      else if (action === 'down') moveContenido(state.manager.courseId, id, 1);
      else if (action === 'delete') deleteContenidoItem(state.manager.courseId, id);
      return;
    }

    const tt = e.target.closest('.tipo-toggle-btn');
    if (tt) handleTipoToggle(tt);
  });

  $('modalBody').addEventListener('change', e => {
    if (e.target.id === 'contentTipo') syncContentFormTipo(e.target.value);
    if (e.target.id === 'contentFile' && e.target.files.length) {
      const file = e.target.files[0];
      const status = $('uploadStatus');
      const validation = validateClientSide(file);
      if (!validation.ok) {
        toast(validation.error, 'error');
        e.target.value = '';
        if (status) status.textContent = '';
        return;
      }
      if (status) status.textContent = 'Archivo seleccionado: ' + file.name;
    }
    if (e.target.id === 'contentImageFile' && e.target.files.length) {
      const file = e.target.files[0];
      const status = $('imageUploadStatus');
      const validation = validateClientSide(file);
      if (!validation.ok) {
        toast(validation.error, 'error');
        e.target.value = '';
        if (status) status.textContent = '';
        return;
      }
      if (status) status.textContent = 'Imagen seleccionada: ' + file.name;
    }
  });

  $('modalBody').addEventListener('submit', e => {
    const form = e.target;
    if (form.id === 'courseForm') createOrUpdateCourse(e, form.dataset.courseId || null);
    else if (form.id === 'squareQuickForm') saveSquareQuick(e);
    else if (form.id === 'inscribirForm') inscribirCliente(e, form.dataset.courseId);
    else if (form.id === 'contentForm') saveContenido(e);
    else if (form.id === 'paymentForm') savePayment(e);
  });

  $('modalBody').addEventListener('input', e => {
    if (e.target.id === 'squarePaymentLinkInput' || e.target.id === 'squarePriceInput') {
      const wrap = $('squareBtnPreviewWrap');
      if (wrap) {
        const link = $('squarePaymentLinkInput')?.value || '';
        const price = $('squarePriceInput')?.value || '';
        wrap.innerHTML = renderSquareBtnPreview(link, price);
      }
    }
    if (e.target.id === 'squareQuickLinkInput' || e.target.id === 'squareQuickPriceInput') {
      const wrap = $('squareQuickPreviewWrap');
      if (wrap) {
        const link = $('squareQuickLinkInput')?.value || '';
        const price = $('squareQuickPriceInput')?.value || '';
        wrap.innerHTML = renderSquareBtnPreview(link, price);
      }
    }
  });

  $('modalBody').addEventListener('change', e => {
    if (e.target.id === 'contentTipo') syncContentFormTipo(e.target.value);
    if (e.target.id === 'paymentCourseSelect') {
      const opt = e.target.options[e.target.selectedIndex];
      const price = opt?.dataset.price;
      const montoInput = $('paymentMontoInput');
      if (montoInput && price !== undefined && (montoInput.value === '' || montoInput.value === '0.00' || montoInput.value === '0')) {
        montoInput.value = Number(price).toFixed(2);
      }
    }
    if (e.target.id === 'contentFile' && e.target.files.length) {
      const file = e.target.files[0];
      const status = $('uploadStatus');
      const validation = validateClientSide(file);
      if (!validation.ok) {
        toast(validation.error, 'error');
        e.target.value = '';
        if (status) status.textContent = '';
        return;
      }
      if (status) status.textContent = 'Archivo seleccionado: ' + file.name;
    }
    if (e.target.id === 'contentImageFile' && e.target.files.length) {
      const file = e.target.files[0];
      const status = $('imageUploadStatus');
      const validation = validateClientSide(file);
      if (!validation.ok) {
        toast(validation.error, 'error');
        e.target.value = '';
        if (status) status.textContent = '';
        return;
      }
      if (status) status.textContent = 'Imagen seleccionada: ' + file.name;
    }
  });

  $('modalBody').addEventListener('click', e => {
    const payApproveBtn = e.target.closest('[data-pay-approve-id]');
    if (payApproveBtn) {
      approvePayment(payApproveBtn.dataset.payApproveId);
      return;
    }
    if (e.target.id === 'testSquareLinkBtn' || e.target.closest('#testSquareLinkBtn')) {
      const input = $('squarePaymentLinkInput');
      const url = extractSquareUrl(input?.value);
      if (!url) return toast('Ingresa primero el enlace de Square.', 'error');
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (e.target.id === 'testQuickSquareLinkBtn' || e.target.closest('#testQuickSquareLinkBtn')) {
      const input = $('squareQuickLinkInput');
      const url = extractSquareUrl(input?.value);
      if (!url) return toast('Ingresa primero el enlace de Square.', 'error');
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (e.target.id === 'removeSquareLinkBtn' || e.target.closest('#removeSquareLinkBtn')) {
      const form = $('squareQuickForm');
      if (form) removeSquareQuick(form.dataset.courseId);
      return;
    }
  });

  $('clientsSearch').addEventListener('input', e => {
    state.clientsFilter = e.target.value;
    renderClients();
  });

  if ($('addPaymentBtn')) {
    $('addPaymentBtn').addEventListener('click', () => openModal(paymentForm()));
  }

  if ($('paymentsSearch')) {
    $('paymentsSearch').addEventListener('input', e => {
      state.paymentsFilter = e.target.value;
      renderPayments();
    });
  }

  if ($('paymentsStatusFilter')) {
    $('paymentsStatusFilter').addEventListener('change', e => {
      state.paymentsStatusFilter = e.target.value;
      renderPayments();
    });
  }

  if ($('paymentsMethodFilter')) {
    $('paymentsMethodFilter').addEventListener('change', e => {
      state.paymentsMethodFilter = e.target.value;
      renderPayments();
    });
  }

  if ($('paymentsBody')) {
    $('paymentsBody').addEventListener('click', e => {
      const btn = e.target.closest('[data-pay-action]');
      if (!btn) return;
      const action = btn.dataset.payAction;
      const id = btn.dataset.id;
      if (action === 'approve') approvePayment(id);
      else if (action === 'view') openModal(viewPaymentDetailsModal(id));
      else if (action === 'delete') deletePayment(id);
    });
  }

  $('coursesList').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const course = state.courses.find(c => c.id === id);
    if (!course) return;

    if (btn.dataset.action === 'preview') {
      openPreview(id);
    } else if (btn.dataset.action === 'square-modal') {
      openModal(squareQuickModal(course));
    } else if (btn.dataset.action === 'edit') {
      openModal(courseForm(course));
      $('courseForm').dataset.courseId = id;
      $('cupoWrap').style.display = course.tipo === 'curso' ? '' : 'none';
      $('horasWrap').style.display = course.tipo === 'servicio' ? '' : 'none';
    } else if (btn.dataset.action === 'delete') {
      deleteCourse(id);
    } else if (btn.dataset.action === 'inscribir') {
      openModal(inscribirForm(course));
      $('inscribirForm').dataset.courseId = id;
    } else if (btn.dataset.action === 'contenido') {
      openContentManager(id);
    }
  });

  $('coursesList').addEventListener('submit', e => {
    if (e.target.classList.contains('progreso-form')) {
      registrarProgreso(e, e.target.dataset.curso, e.target.dataset.cliente);
    }
  });

  $('solicitudesList').addEventListener('click', e => {
    const btn = e.target.closest('[data-sol]');
    if (!btn) return;
    if (btn.dataset.sol === 'aprobar') {
      aprobarSolicitud(btn.dataset.curso, btn.dataset.cliente);
    } else if (btn.dataset.sol === 'rechazar') {
      if (confirm('¿Rechazar esta solicitud? El cliente podrá solicitarla de nuevo.')) {
        rechazarSolicitud(btn.dataset.curso, btn.dataset.cliente);
      }
    }
  });

  $('adminLogout').addEventListener('click', logout);
}

function handleTipoToggle(btn) {
  const wrap = btn.closest('.tipo-toggle');
  if (!wrap) return;
  const value = btn.dataset.tipo;
  wrap.querySelectorAll('.tipo-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
  const input = wrap.querySelector('input[name="tipo"]');
  if (input) input.value = value;
  const form = wrap.closest('form');
  if (form && form.id === 'courseForm') {
    $('cupoWrap').style.display = value === 'curso' ? '' : 'none';
    $('horasWrap').style.display = value === 'servicio' ? '' : 'none';
  }
}

async function logout() {
  await doLogout();
  window.location.href = '/login.html';
}

/* ---------- Init ---------- */

bindEvents();
initSession();
