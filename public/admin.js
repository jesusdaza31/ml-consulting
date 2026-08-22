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
  manager: { courseId: null, itemId: null },
  videos: [],
  r2Configured: true
};

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
  const [dash, usersRes, coursesRes, videosRes] = await Promise.all([
    api('/api/admin/dashboard'),
    api('/api/admin/users'),
    api('/api/admin/courses'),
    api('/api/admin/videos').catch(() => ({ ok: false, status: 503, data: {} }))
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
  render();
}

/* ---------- Tabs ---------- */

function switchTab(name) {
  document.querySelectorAll('.admin-nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.admin-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'panel-' + name));
  const titles = { resumen: 'Resumen', clientes: 'Clientes', cursos: 'Cursos', solicitudes: 'Solicitudes', videos: 'Videos' };
  $('panelTitle').textContent = titles[name] || 'Panel';
}

/* ---------- Render ---------- */

function render() {
  renderDashboard();
  renderClients();
  renderCourses();
  renderSolicitudes();
  renderVideos();
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

/* ---------- Modal ---------- */

function openModal(html) {
  $('modalBody').innerHTML = html;
  $('adminModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
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
  const c = course || { nombre: '', tipo: 'curso', descripcion: '', objetivoGeneral: '', resultadoEsperado: '', modulos: [], cupoMax: '', horas: '', duracionDias: 30, price: course?.price || '', paymentLink: course?.paymentLink || '' };
  const isEdit = !!course;
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
      '<div id="cupoWrap"><label class="admin-field"><span>Cupo máximo <small>(vacío = ilimitado)</small></span>' +
        '<input type="number" name="cupoMax" min="1" value="' + (c.cupoMax || '') + '"></label></div>' +
      '<div id="horasWrap" style="display:none"><label class="admin-field"><span>Horas por cliente</span>' +
        '<input type="number" name="horas" min="1" value="' + (c.horas || '') + '"></label></div>' +
      '<label class="admin-field"><span>Duración <small>(días para completar)</small></span>' +
        '<input type="number" name="duracionDias" min="1" value="' + c.duracionDias + '" required></label>' +
      '<label class="admin-field"><span>Precio (USD, opcional)</span>' +
        '<input type="number" name="price" min="0" step="0.01" value="' + escapeHtml(String(c.price || '')) + '" placeholder="Ej: 99.99"></label>' +
      '<label class="admin-field"><span>Link de pago (Square, opcional)</span>' +
        '<input type="url" name="paymentLink" value="' + escapeHtml(String(c.paymentLink || '')) + '" placeholder="https://square.link/..."></label>' +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-modal-close>Cerrar</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">' +
          (isEdit ? 'Guardar cambios' : 'Crear curso') + '</button>' +
      '</div>' +
    '</form>';
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
  documento: { icon: 'fa-file-pdf', label: 'Documento' }
};

function contentListHtml(course) {
  const items = (course.contenido || []).slice().sort((a, b) => a.orden - b.orden);
  const list = items.length
    ? items.map(it => {
        const meta = CONTENT_META[it.tipo] || { icon: 'fa-file', label: it.tipo };
        let extra = '';
        if (it.tipo === 'texto') extra = (it.texto || '').slice(0, 70);
        else if (it.tipo === 'video') {
          const lib = it.r2VideoId ? state.videos.find(v => v.id === it.r2VideoId) : null;
          extra = lib ? lib.originalName : (it.r2VideoId ? 'Video de la biblioteca' : 'Video de YouTube');
        }
        else extra = it.docNombre || it.docFile || 'Archivo';
        return '<div class="contenido-item">' +
          '<span class="contenido-order">' + it.orden + '</span>' +
          '<span class="contenido-type ' + it.tipo + '" title="' + meta.label + '"><i class="fa-solid ' + meta.icon + '"></i></span>' +
          '<div class="contenido-info"><strong>' + escapeHtml(it.titulo) + '</strong>' +
          '<small>' + escapeHtml(extra) + '</small></div>' +
          '<div class="contenido-actions">' +
            '<button type="button" class="icon-btn" title="Subir" data-mc-action="up" data-id="' + it.id + '"><i class="fa-solid fa-arrow-up"></i></button>' +
            '<button type="button" class="icon-btn" title="Bajar" data-mc-action="down" data-id="' + it.id + '"><i class="fa-solid fa-arrow-down"></i></button>' +
            '<button type="button" class="icon-btn" title="Editar" data-mc-action="edit" data-id="' + it.id + '"><i class="fa-solid fa-pen"></i></button>' +
            '<button type="button" class="icon-btn danger" title="Eliminar" data-mc-action="delete" data-id="' + it.id + '"><i class="fa-solid fa-trash"></i></button>' +
          '</div>' +
        '</div>';
      }).join('')
    : '<p class="course-empty">Este curso aún no tiene contenido.</p>';

  return '<h2>Contenido — ' + escapeHtml(course.nombre) + '</h2>' +
    '<div class="admin-modal-actions" style="justify-content:flex-start;margin-top:0;margin-bottom:18px">' +
      '<button type="button" class="admin-btn admin-btn-sm" data-modal-close>← Volver</button>' +
      '<button type="button" class="admin-btn admin-btn-primary admin-btn-sm" data-mc-action="new"><i class="fa-solid fa-plus"></i> Agregar contenido</button>' +
    '</div>' +
    '<div class="contenido-list">' + list + '</div>';
}

function contentFormHtml(course, item) {
  const it = item || { tipo: 'texto', titulo: '', texto: '', videoUrl: '', docNombre: '' };
  const isEdit = !!item;
  const opt = {
    texto: '<option value="texto"' + (it.tipo === 'texto' ? ' selected' : '') + '>Texto</option>',
    video: '<option value="video"' + (it.tipo === 'video' ? ' selected' : '') + '>Video</option>',
    documento: '<option value="documento"' + (it.tipo === 'documento' ? ' selected' : '') + '>Documento</option>'
  };

  const esR2 = it.tipo === 'video' && !!it.r2VideoId;
  const videoYoutube = it.tipo === 'video' ? (it.videoUrl || '') : '';
  const videoSrc = esR2
    ? '<div class="tipo-toggle" id="videoSource">' +
        '<button type="button" class="tipo-toggle-btn video-src-btn" data-src="youtube">YouTube</button>' +
        '<button type="button" class="tipo-toggle-btn video-src-btn active" data-src="r2">Mis videos R2</button>' +
      '</div>'
    : '<div class="tipo-toggle" id="videoSource">' +
        '<button type="button" class="tipo-toggle-btn video-src-btn active" data-src="youtube">YouTube</button>' +
        '<button type="button" class="tipo-toggle-btn video-src-btn" data-src="r2">Mis videos R2</button>' +
      '</div>';

  return '<h2>' + (isEdit ? 'Editar contenido' : 'Agregar contenido') + '</h2>' +
    '<form id="contentForm">' +
      '<div class="admin-field"><span>Tipo</span>' +
        '<select name="tipo" id="contentTipo">' + opt.texto + opt.video + opt.documento + '</select></div>' +
      '<label class="admin-field"><span>Título</span>' +
        '<input type="text" name="titulo" value="' + escapeHtml(it.titulo) + '" required></label>' +
      '<div id="textoWrap"><label class="admin-field"><span>Texto</span>' +
        '<textarea name="texto" rows="5">' + escapeHtml(it.texto || '') + '</textarea></label></div>' +
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
        (it.tipo === 'documento' && it.docNombre
          ? '<p class="mc-doc-current">Archivo actual: <strong>' + escapeHtml(it.docNombre) + '</strong></p>'
          : '') +
        '<label class="admin-field"><span>Subir archivo <small>(PDF, DOC, imágenes…)</small></span>' +
        '<input type="file" name="archivo" id="contentFile" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp"></label>' +
        '<p class="mc-doc-note" id="uploadStatus"></p>' +
      '</div>' +
      '<div class="admin-modal-actions">' +
        '<button type="button" class="admin-btn" data-mc-action="back">← Volver</button>' +
        '<button type="submit" class="admin-btn admin-btn-primary">' + (isEdit ? 'Guardar' : 'Agregar') + '</button>' +
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

function syncContentFormTipo(tipo) {
  $('textoWrap').style.display = tipo === 'texto' ? '' : 'none';
  $('videoWrap').style.display = tipo === 'video' ? '' : 'none';
  $('docWrap').style.display = tipo === 'documento' ? '' : 'none';
  if (tipo === 'video') {
    const selected = state.manager.editVideoR2 || null;
    if ($('videoPicker')) renderVideoPicker(selected);
  }
}

function openContentManager(courseId) {
  state.manager.courseId = courseId;
  state.manager.itemId = null;
  renderContentManager();
}

function renderContentManager() {
  const course = getCourse(state.manager.courseId);
  if (!course) { closeModal(); return; }
  openModal(contentListHtml(course));
}

function openContentForm(courseId, itemId) {
  state.manager.courseId = courseId;
  state.manager.itemId = itemId || null;
  const course = getCourse(courseId);
  const item = itemId ? (course.contenido || []).find(x => x.id === itemId) : null;
  state.manager.editVideoR2 = (item && item.tipo === 'video') ? (item.r2VideoId || null) : null;
  openModal(contentFormHtml(course, item));
  if (item) syncContentFormTipo(item.tipo);
}

/* ---------- Acciones: curso ---------- */

async function createOrUpdateCourse(e, id) {
  e.preventDefault();
  const form = new FormData(e.target);
  const tipo = form.get('tipo');
  const modulos = Array.from(e.target.querySelectorAll('.modulo-input'))
    .map(i => i.value.trim())
    .filter(Boolean);
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
    paymentLink: form.get('paymentLink') || null
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
  const body = { tipo: tipo, titulo: form.get('titulo') };

  if (tipo === 'texto') body.texto = form.get('texto');
  if (tipo === 'video') {
    const r2Id = form.get('r2VideoId');
    if (r2Id) {
      body.r2VideoId = r2Id;
      body.r2Key = form.get('r2Key') || '';
    } else {
      body.videoUrl = form.get('videoUrl');
    }
  }

  if (tipo === 'documento') {
    const file = form.get('archivo');
    if (file && file.size) {
      try {
        const presRes = await authFetch('/api/admin/documents/presign', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, contentType: file.type })
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
      } catch (e) {
        return toast('Error al subir el archivo.', 'error');
      }
    } else if (!itemId) {
      return toast('Selecciona un archivo para el documento.', 'error');
    }
  }

  const res = await api('/api/admin/courses/' + courseId + '/contenido' + (itemId ? ('/' + itemId) : ''), {
    method: itemId ? 'PUT' : 'POST',
    body: JSON.stringify(body)
  });
  if (!res.ok) return toast(res.data.error || 'Error al guardar.', 'error');
  toast(itemId ? 'Contenido actualizado.' : 'Contenido agregado.');
  await refreshCourses();
  renderContentManager();
}

async function deleteContenidoItem(courseId, itemId) {
  if (!confirm('¿Eliminar este contenido?')) return;
  const res = await api('/api/admin/courses/' + courseId + '/contenido/' + itemId, { method: 'DELETE' });
  if (!res.ok) return toast(res.data.error || 'Error al eliminar.', 'error');
  toast('Contenido eliminado.');
  await refreshCourses();
  renderContentManager();
}

async function moveContenido(courseId, itemId, dir) {
  const course = getCourse(courseId);
  if (!course) return;
  const items = (course.contenido || []).slice().sort((a, b) => a.orden - b.orden);
  const idx = items.findIndex(x => x.id === itemId);
  const swapIdx = idx + dir;
  if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
  const a = items[idx];
  const b = items[swapIdx];
  await Promise.all([
    api('/api/admin/courses/' + courseId + '/contenido/' + a.id, { method: 'PUT', body: JSON.stringify({ orden: b.orden }) }),
    api('/api/admin/courses/' + courseId + '/contenido/' + b.id, { method: 'PUT', body: JSON.stringify({ orden: a.orden }) })
  ]);
  await refreshCourses();
  renderContentManager();
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
    if (e.key === 'Escape' && !$('adminModal').hidden) closeModal();
  });

  $('modalBody').addEventListener('click', e => {
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

    const mc = e.target.closest('[data-mc-action]');
    if (mc) {
      const action = mc.dataset.mcAction;
      const id = mc.dataset.id;
      if (action === 'back') renderContentManager();
      else if (action === 'new') openContentForm(state.manager.courseId, null);
      else if (action === 'edit') openContentForm(state.manager.courseId, id);
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
      const status = $('uploadStatus');
      if (status) status.textContent = 'Archivo seleccionado: ' + e.target.files[0].name;
    }
  });

  $('modalBody').addEventListener('submit', e => {
    const form = e.target;
    if (form.id === 'courseForm') createOrUpdateCourse(e, form.dataset.courseId || null);
    else if (form.id === 'inscribirForm') inscribirCliente(e, form.dataset.courseId);
    else if (form.id === 'contentForm') saveContenido(e);
  });

  $('clientsSearch').addEventListener('input', e => {
    state.clientsFilter = e.target.value;
    renderClients();
  });

  $('coursesList').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const course = state.courses.find(c => c.id === id);
    if (!course) return;

    if (btn.dataset.action === 'edit') {
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
