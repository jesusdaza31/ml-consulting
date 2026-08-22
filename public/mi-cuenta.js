/* ==========================================
   ML CONSULTING — mi-cuenta.js
   Mis cursos + catálogo con solicitudes.
========================================= */

const $ = id => document.getElementById(id);

let state = {
  user: null,
  courses: [],     // /api/client/courses (cualquier estado)
  catalog: [],     // /api/client/catalog
  detail: null,
  currentTab: 'miscursos'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function api(path, opts) {
  const res = await authFetch(path, opts);
  if (!res) return { ok: false, status: 401, data: {} };
  let data = {};
  try { data = await res.json(); } catch (e) { /* empty */ }
  return { ok: res.ok, status: res.status, data };
}

function toast(message, type) {
  const el = $('mcToast');
  el.textContent = message;
  el.className = 'admin-toast ' + (type || 'ok');
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3800);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function timeBadge(ins) {
  if (!ins) return '';
  if (ins.vencido) {
    return '<span class="mc-time-badge danger">Vencido</span>';
  }
  if (ins.diasRestantes === 0) return '<span class="mc-time-badge danger">Vence hoy</span>';
  if (ins.diasRestantes <= 3) {
    return '<span class="mc-time-badge danger">' + ins.diasRestantes + ' días</span>';
  }
  if (ins.diasRestantes <= 7) {
    return '<span class="mc-time-badge warn">' + ins.diasRestantes + ' días</span>';
  }
  return '<span class="mc-time-badge ok">' + ins.diasRestantes + ' días</span>';
}

function typeBadge(c) {
  return '<span class="type-badge type-' + c.tipo + '">' +
    (c.tipo === 'curso' ? 'Curso' : 'Servicio') + '</span>';
}

function hoursChips(c) {
  const ins = c.inscripcion;
  if (c.tipo !== 'servicio' || !ins || ins.horasAsignadas == null) return '';
  return '<div class="mc-hours-line">' +
    '<span class="mc-hours-chip">' + ins.horasUsadas + ' / ' + ins.horasAsignadas + 'h usadas</span>' +
    (ins.horasRestantes != null
      ? '<span class="mc-hours-chip">' + ins.horasRestantes + 'h restantes</span>'
      : '') +
    '</div>';
}

function estadoChip(estado) {
  if (estado === 'pendiente') {
    return '<div class="mc-estado-chip mc-estado-pendiente"><i class="fa-solid fa-clock"></i> En revisión</div>';
  }
  if (estado === 'completado') {
    return '<div class="mc-estado-chip mc-estado-completado"><i class="fa-solid fa-circle-check"></i> Completado</div>';
  }
  if (estado === 'cancelado') {
    return '<div class="mc-estado-chip mc-estado-cancelado"><i class="fa-solid fa-circle-xmark"></i> Rechazada</div>';
  }
  return '';
}

function catalogMeta(c) {
  let meta = '';
  if (c.tipo === 'curso') {
    const libres = c.cuposLibres === null ? '∞' : c.cuposLibres;
    const total = c.cupoMax ? c.cupoMax : 'Ilimitado';
    meta += '<span class="mc-hours-chip">Cupo: ' + libres + ' libres / ' + total + '</span>';
  } else {
    meta += '<span class="mc-hours-chip">Horas: ' + c.horas + 'h por cliente</span>';
  }
  meta += '<span class="mc-hours-chip">' + c.duracionDias + ' días</span>';
  if (c.price != null) {
    meta += '<span class="mc-hours-chip">$' + c.price.toFixed(2) + '</span>';
  }
  return '<div class="mc-hours-line">' + meta + '</div>';
}

function resultadoBlock(c) {
  return c.resultadoEsperado
    ? '<div class="mc-resultado-block"><span class="mc-resultado-label"><i class="fa-solid fa-medal"></i> Resultado esperado</span>' +
      '<p>' + escapeHtml(c.resultadoEsperado) + '</p></div>'
    : '';
}

function catalogAction(c) {
  if (c.paymentLink) {
    return '<a href="' + escapeHtml(c.paymentLink) + '" target="_blank" rel="noopener" class="mc-btn-ver mc-btn-inscrito" style="display:inline-block;text-decoration:none;text-align:center;">Pagar e inscribirse</a>';
  }
  if (c.estado === 'activo') {
    return '<button type="button" class="mc-btn-ver mc-btn-inscrito" data-open="' + c.id + '">' +
      '<i class="fa-solid fa-circle-check"></i> Inscrito · Ver curso <i class="fa-solid fa-arrow-right"></i></button>';
  }
  if (c.estado === 'pendiente') {
    return '<button type="button" class="mc-btn-disabled" disabled><i class="fa-solid fa-clock"></i> En revisión</button>';
  }
  if (c.estado === 'completado') {
    return '<button type="button" class="mc-btn-disabled" disabled><i class="fa-solid fa-circle-check"></i> Completado</button>';
  }
  if (c.estado === 'cancelado') {
    return '<button type="button" class="mc-btn-ver" data-solicitar="' + c.id + '">Solicitar de nuevo</button>';
  }
  return '<button type="button" class="mc-btn-ver" data-solicitar="' + c.id + '">' +
    '<i class="fa-solid fa-paper-plane"></i> Solicitar inscripción</button>';
}

/* ---------- Render: Mis cursos ---------- */

function misCursosCard(c) {
  const head = '<div class="mc-card-head"><h2>' + escapeHtml(c.nombre) + '</h2>' + typeBadge(c) + '</div>';
  const desc = '<p class="mc-desc">' + escapeHtml(c.descripcion || 'Sin descripción.') + '</p>';

  let middle = '';
  let footer = '';

  if (c.estado === 'activo') {
    middle = '<div class="mc-time-row">' +
        '<span class="mc-time-label">Tiempo restante</span>' + timeBadge(c.inscripcion) +
      '</div>' + hoursChips(c);
    footer = '<button type="button" class="mc-btn-ver" data-open="' + c.id + '">Ver curso <i class="fa-solid fa-arrow-right"></i></button>';
  } else if (c.estado === 'pendiente') {
    middle = estadoChip('pendiente') +
      '<p class="mc-solicitud-note">Solicitado el ' + escapeHtml(fmtDate(c.fechaInscripcion)) + '. ' +
      'El equipo revisará tu solicitud.</p>';
  } else {
    middle = estadoChip(c.estado);
    if (c.estado === 'cancelado') {
      footer = '<button type="button" class="mc-btn-ver" data-solicitar="' + c.id + '">Solicitar de nuevo</button>';
    }
  }

  return '<div class="mc-course-card">' + head + desc + middle + footer + '</div>';
}

function renderList() {
  const wrap = $('mcCourses');
  if (!state.courses.length) {
    wrap.innerHTML = '<div class="mc-empty">' +
      '<i class="fa-solid fa-graduation-cap"></i>' +
      '<h3>Aún no tienes cursos asignados</h3>' +
      '<p>Explora el catálogo y solicita tu inscripción.</p>' +
      '<a class="mc-btn-ver mc-goto-catalogo" href="#catalogo">Ver catálogo</a>' +
      '</div>';
    return;
  }
  wrap.innerHTML = state.courses.map(misCursosCard).join('');
}

/* ---------- Render: Catálogo ---------- */

function catalogCard(c) {
  return '<div class="mc-course-card mc-cat-card" data-open-cat="' + c.id + '">' +
    '<div class="mc-card-head"><h2>' + escapeHtml(c.nombre) + '</h2>' + typeBadge(c) + '</div>' +
    '<p class="mc-desc mc-desc-clamp">' + escapeHtml(c.descripcion || 'Sin descripción.') + '</p>' +
    catalogMeta(c) +
    '<div class="mc-catalog-footer">' + catalogAction(c) + '</div>' +
  '</div>';
}

function renderCatalog() {
  const wrap = $('mcCatalog');
  if (!state.catalog.length) {
    wrap.innerHTML = '<div class="mc-empty"><i class="fa-solid fa-box-open"></i>' +
      '<h3>No hay cursos disponibles</h3><p>El equipo aún no publica cursos.</p></div>';
    return;
  }
  wrap.innerHTML = state.catalog.map(catalogCard).join('');
}

/* ---------- Solicitar ---------- */

async function solicitar(id) {
  const res = await api('/api/client/courses/' + id + '/solicitar', { method: 'POST' });
  if (!res.ok) return toast(res.data.error || 'No se pudo solicitar.', 'error');
  toast('Solicitud enviada. ¡Revisaremos tu inscripción!');
  await loadLists();
  showView(state.currentTab);
}

async function loadLists() {
  const [mis, cat] = await Promise.all([
    api('/api/client/courses'),
    api('/api/client/catalog')
  ]);
  if (mis.status === 401 || cat.status === 401) { window.location.href = '/login.html'; return; }
  if (!mis.ok || !cat.ok) { toast('No se pudieron cargar tus cursos.', 'error'); return; }
  state.courses = mis.data.cursos || [];
  state.catalog = cat.data.cursos || [];
  renderList();
  renderCatalog();
}

/* ---------- Detalle del catálogo (sin inscripción) ---------- */

function openCatDetail(id) {
  const c = state.catalog.find(x => x.id === id);
  if (!c) return;

  const objetivo = c.objetivoGeneral
    ? '<div class="mc-objetivo-block"><span class="mc-objetivo-label"><i class="fa-solid fa-bullseye"></i> Objetivo general</span>' +
      '<p>' + escapeHtml(c.objetivoGeneral) + '</p></div>'
    : '';

  const modulosHtml = (c.modulos && c.modulos.length)
    ? '<div class="mc-aprender"><h3><i class="fa-solid fa-list-check"></i> Qué aprenderás</h3>' +
      '<ol>' + c.modulos.map(m =>
        '<li><i class="fa-solid fa-circle-check"></i><span>' + escapeHtml(m) + '</span></li>'
      ).join('') + '</ol></div>'
    : '';

  $('catDetail').innerHTML =
    '<div class="mc-detail-hero">' +
      typeBadge(c) +
      '<h1>' + escapeHtml(c.nombre) + '</h1>' +
      (c.price != null ? '<div style="font-size:1.5rem;font-weight:700;color:var(--primary);margin:0.5rem 0;">USD $' + c.price.toFixed(2) + '</div>' : '') +
      '<p class="mc-desc">' + escapeHtml(c.descripcion || '') + '</p>' +
      objetivo +
      resultadoBlock(c) +
      catalogMeta(c) +
    '</div>' +
    modulosHtml +
    '<div class="mc-catalog-detail-action">' + catalogAction(c) + '</div>';

  showView('catdetail');
}

/* ---------- Detalle (inscrito) ---------- */

function contentItemHtml(item) {
  const meta = {
    texto: { icon: 'fa-file-lines', label: 'Texto' },
    video: { icon: 'fa-circle-play', label: 'Video' },
    documento: { icon: 'fa-file-pdf', label: 'Documento' }
  }[item.tipo] || { icon: 'fa-file', label: item.tipo };

  let body = '';
  if (item.tipo === 'texto') {
    body = '<div class="mc-texto">' +
      String(item.texto || '').split(/\n{2,}/).map(p =>
        '<p>' + escapeHtml(p.trim()) + '</p>'
      ).join('') + '</div>';
  } else if (item.tipo === 'video') {
    if (item.r2VideoId) {
      // Video privado en R2: se reproduce vía /api/client/video/:id (302 → URL firmada)
      body = '<div class="mc-video"><video controls preload="metadata" playsinline>' +
        '<source src="/api/client/video/' + item.id + '">' +
        'Tu navegador no soporta video HTML5.</video></div>';
    } else {
      body = '<div class="mc-video"><iframe src="' + escapeHtml(item.videoUrl) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
  } else if (item.tipo === 'documento') {
    body = '<div class="mc-doc">' +
      '<div class="mc-doc-info">' +
        '<strong>' + escapeHtml(item.docNombre || item.docFile || 'Documento') + '</strong>' +
        '<small>Archivo adjunto de este curso</small>' +
      '</div>' +
      '<a class="mc-doc-link" href="/api/client/file/' + item.id + '" target="_blank" rel="noopener">' +
        '<i class="fa-solid fa-download"></i> Ver documento</a>' +
    '</div>';
  }

  return '<div class="mc-content-item">' +
    '<div class="mc-content-head">' +
      '<span class="mc-content-icon ' + item.tipo + '"><i class="fa-solid ' + meta.icon + '"></i></span>' +
      '<div><small>' + meta.label + '</small><strong>' + escapeHtml(item.titulo) + '</strong></div>' +
    '</div>' +
    '<div class="mc-content-body">' + body + '</div>' +
  '</div>';
}

async function openDetail(id) {
  try {
    const res = await api('/api/client/courses/' + id);
    if (res.status === 401) { window.location.href = '/login.html'; return; }
    if (res.status === 403) { toast('No estás inscrito en este curso.', 'error'); return; }
    if (!res.ok) { toast(res.data.error || 'Error al cargar el curso.', 'error'); return; }
    state.detail = res.data.curso;
  } catch (e) {
    toast('No se pudo cargar el curso.', 'error');
    return;
  }

  const c = state.detail;
  const ins = c.inscripcion;

  const banner = ins
    ? '<div class="mc-time-banner">' +
        '<span><i class="fa-solid fa-hourglass-half"></i> <strong>Tiempo restante:</strong></span>' +
        timeBadge(ins) +
      '</div>'
    : '';

  const contenido = (c.contenido && c.contenido.length)
    ? '<div class="mc-content-list">' + c.contenido.map(contentItemHtml).join('') + '</div>'
    : '<p class="mc-no-content">Este curso aún no tiene contenido publicado.</p>';

  $('mcDetail').innerHTML =
    '<div class="mc-detail-hero">' +
      typeBadge(c) +
      '<h1>' + escapeHtml(c.nombre) + '</h1>' +
      '<p class="mc-desc">' + escapeHtml(c.descripcion || '') + '</p>' +
      resultadoBlock(c) +
      hoursChips(c) +
      banner +
    '</div>' +
    '<h2 class="mc-section-title">Contenido</h2>' +
    contenido;

  showView('detail');
}

/* ---------- Navegación por pestañas ---------- */

function showView(name) {
  $('view-list').hidden = name !== 'miscursos';
  $('view-catalogo').hidden = name !== 'catalogo';
  $('view-cat-detail').hidden = name !== 'catdetail';
  $('view-detail').hidden = name !== 'detail';
  document.querySelectorAll('.mc-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.mcTab === state.currentTab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchMcTab(name) {
  state.currentTab = name;
  showView(name);
  if (name === 'miscursos') renderList();
  else renderCatalog();
}

async function logout() {
  await doLogout();
  window.location.href = '/login.html';
}

/* ---------- Eventos ---------- */

function handleCardClick(e) {
  const open = e.target.closest('[data-open]');
  if (open) { openDetail(open.dataset.open); return; }
  const sol = e.target.closest('[data-solicitar]');
  if (sol) { solicitar(sol.dataset.solicitar); }
}

function handleCatalogClick(e) {
  const sol = e.target.closest('[data-solicitar]');
  if (sol) { solicitar(sol.dataset.solicitar); return; }
  const open = e.target.closest('[data-open]');
  if (open) { openDetail(open.dataset.open); return; }
  const cat = e.target.closest('[data-open-cat]');
  if (cat) { openCatDetail(cat.dataset.openCat); }
}

/* ---------- Init ---------- */

async function init() {
  try {
    const sbUser = await checkAuth();
    if (!sbUser) return;

    const res = await api('/api/auth/me');
    if (res.status === 401 || !res.data.user) {
      window.location.href = '/login.html';
      return;
    }
    state.user = res.data.user;
    $('mcUserName').textContent = state.user.name.split(' ')[0];
    $('mcLogout').addEventListener('click', logout);
    $('mcBack').addEventListener('click', () => showView(state.currentTab));
    $('mcCatBack').addEventListener('click', () => showView('catalogo'));
    document.querySelectorAll('.mc-tab').forEach(btn => {
      btn.addEventListener('click', () => switchMcTab(btn.dataset.mcTab));
    });
    $('mcCourses').addEventListener('click', handleCardClick);
    $('mcCatalog').addEventListener('click', handleCatalogClick);
    $('mcCourses').addEventListener('click', e => {
      if (e.target.closest('.mc-goto-catalogo')) switchMcTab('catalogo');
    });

    await loadLists();
    if (window.location.hash === '#catalogo') {
      switchMcTab('catalogo');
    } else {
      showView('miscursos');
    }
  } catch (e) {
    window.location.href = '/login.html';
  }
}

init();
