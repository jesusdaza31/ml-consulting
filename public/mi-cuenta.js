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
  if (c.estado === 'activo') {
    return '<button type="button" class="mc-btn-ver mc-btn-inscrito" data-open="' + c.id + '">' +
      '<i class="fa-solid fa-circle-check"></i> Inscrito · Ver curso <i class="fa-solid fa-arrow-right"></i></button>';
  }
  if (c.estado === 'pendiente') {
    return '<button type="button" class="mc-btn-disabled" disabled><i class="fa-solid fa-clock"></i> En revisión / Verificando acceso</button>';
  }
  if (c.estado === 'completado') {
    return '<button type="button" class="mc-btn-disabled" disabled><i class="fa-solid fa-circle-check"></i> Completado</button>';
  }
  if (c.paymentLink) {
    const priceText = (c.price != null && c.price !== '') ? ' · USD $' + Number(c.price).toFixed(2) : '';
    return '<div class="mc-square-cta-wrap">' +
      '<a href="' + escapeHtml(c.paymentLink) + '" target="_blank" rel="noopener" class="mc-btn-square" title="Pagar de forma segura en Square">' +
        '<span class="mc-square-btn-icon"><i class="fa-solid fa-credit-card"></i></span>' +
        '<span class="mc-square-btn-text">' +
          '<strong>Pagar con Square' + escapeHtml(priceText) + '</strong>' +
          '<small><i class="fa-solid fa-lock"></i> Pasarela de pago segura</small>' +
        '</span>' +
        '<i class="fa-solid fa-arrow-up-right-from-square mc-square-external"></i>' +
      '</a>' +
      '<div class="mc-square-cta-sub">' +
        '<button type="button" class="mc-btn-report-pay" data-report-payment="' + c.id + '">' +
          '<i class="fa-solid fa-receipt"></i> ¿Ya pagaste en Square? Confirmar pago' +
        '</button>' +
      '</div>' +
    '</div>';
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
  if (!mis.ok) { toast('No se pudieron cargar tus cursos.', 'error'); return; }
  state.courses = mis.data.cursos || [];
  state.catalog = (cat.ok && cat.data.cursos) ? cat.data.cursos : [];
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

function authUrl(url) {
  const token = localStorage.getItem('sb_access_token');
  if (!token) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token);
}

function renderRichText(raw) {
  if (!raw) return '';
  raw = String(raw).trim();
  if (/^\s*<[a-z]+[\s\S]*>[\s\S]*<\/[a-z]+>\s*$/i.test(raw)) {
    return raw;
  }

  function inlineFormat(text) {
    let t = escapeHtml(text);
    t = t.replace(/\[btn:(https?:\/\/[^\s:\]]+):([^\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener" class="mc-action-btn"><i class="fa-solid fa-arrow-up-right-from-square"></i> $2</a>');
    t = t.replace(/\[whatsapp:(https?:\/\/[^\s:\]]+):([^\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener" class="mc-action-btn mc-action-whatsapp"><i class="fa-brands fa-whatsapp"></i> $2</a>');
    t = t.replace(/\[badge:([a-z0-9_-]+):([^\]]+)\]/g, '<span class="mc-badge mc-badge-$1">$2</span>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|\s)\*([^*\n:]+:)(\s|$)/g, '$1<strong>$2</strong>$3');
    t = t.replace(/_([^_]+)_/g, '<em>$1</em>');
    return t;
  }

  const lines = raw.split(/\r?\n/);
  const output = [];
  let currentList = null;

  function closeList() {
    if (currentList) {
      if (currentList === 'ul') output.push('</ul>');
      else if (currentList === 'ol') output.push('</ol>');
      else if (currentList === 'checklist') output.push('</div>');
      currentList = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      closeList();
      continue;
    }

    const calloutMatch = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*(.*)$/i);
    if (calloutMatch) {
      closeList();
      const type = calloutMatch[1].toLowerCase();
      const content = calloutMatch[2] || '';
      const titles = {
        note: '<i class="fa-solid fa-circle-info"></i> Nota Informativa',
        tip: '<i class="fa-solid fa-lightbulb"></i> Consejo Práctico',
        important: '<i class="fa-solid fa-circle-exclamation"></i> Punto Importante',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i> Advertencia Legal'
      };
      output.push('<div class="mc-callout mc-callout-' + type + '"><div class="mc-callout-head">' + (titles[type] || type) + '</div><div class="mc-callout-body">' + inlineFormat(content) + '</div></div>');
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      output.push('<h3 class="mc-rich-h3"><i class="fa-solid fa-bookmark"></i> ' + inlineFormat(line.slice(4)) + '</h3>');
      continue;
    }
    if (line.startsWith('#### ')) {
      closeList();
      output.push('<h4 class="mc-rich-h4">' + inlineFormat(line.slice(5)) + '</h4>');
      continue;
    }

    const checkMatch = line.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      if (currentList !== 'checklist') {
        closeList();
        output.push('<div class="mc-checklist">');
        currentList = 'checklist';
      }
      const rawText = checkMatch[2];
      const checkId = 'ptin_chk_' + Math.abs(rawText.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));
      const isSavedChecked = typeof localStorage !== 'undefined' && localStorage.getItem(checkId) === '1';
      const isChecked = isSavedChecked || checkMatch[1].toLowerCase() === 'x';
      output.push('<label class="mc-check-item' + (isChecked ? ' is-checked' : '') + '"><input type="checkbox" class="mc-check-box" data-check-id="' + checkId + '"' + (isChecked ? ' checked' : '') + ' onchange="window.handleCheckChange(this)"><span class="mc-check-label">' + inlineFormat(rawText) + '</span></label>');
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (currentList !== 'ul') {
        closeList();
        output.push('<ul class="mc-rich-ul">');
        currentList = 'ul';
      }
      output.push('<li><i class="fa-solid fa-circle-check"></i> <span>' + inlineFormat(ulMatch[1]) + '</span></li>');
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (currentList !== 'ol') {
        closeList();
        output.push('<ol class="mc-rich-ol">');
        currentList = 'ol';
      }
      output.push('<li><span class="mc-step-num">' + olMatch[1] + '</span> <span>' + inlineFormat(olMatch[2]) + '</span></li>');
      continue;
    }

    closeList();
    output.push('<p>' + inlineFormat(line) + '</p>');
  }

  closeList();
  return output.join('\n');
}

window.handleCheckChange = function(el) {
  if (!el) return;
  const item = el.closest('.mc-check-item');
  const checkId = el.getAttribute('data-check-id');
  if (item) {
    if (el.checked) {
      item.classList.add('is-checked');
      if (checkId) localStorage.setItem(checkId, '1');
    } else {
      item.classList.remove('is-checked');
      if (checkId) localStorage.removeItem(checkId);
    }
  }
};

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
    body = '<div class="mc-texto mc-rich-content">' +
      renderRichText(item.texto) +
    '</div>';
  } else if (item.tipo === 'video') {
    if (item.r2VideoId) {
      // Video privado en R2: se reproduce vía /api/client/video/:id (302 → URL firmada)
      body = '<div class="mc-video"><video controls preload="metadata" playsinline>' +
        '<source src="' + authUrl('/api/client/video/' + item.id) + '">' +
        'Tu navegador no soporta video HTML5.</video></div>';
    } else {
      body = '<div class="mc-video"><iframe src="' + escapeHtml(item.videoUrl) +
        '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
    }
  } else if (item.tipo === 'imagen') {
    if (item.docFile) {
      body = '<div class="mc-doc-preview">' +
        '<img src="' + authUrl('/api/client/file/' + item.id) + '" loading="lazy" alt="' + escapeHtml(item.docNombre || '') + '">' +
        '</div>';
    } else {
      body = '<div class="mc-doc-preview"><p class="mc-doc-note">Imagen no disponible</p></div>';
    }
  } else if (item.tipo === 'documento') {
    const docCategory = item.docCategory || 'document';
    const docMime = item.docMime || '';
    const docFile = item.docFile || '';
    const docNombre = item.docNombre || docFile || 'Documento';
    const fileUrl = authUrl('/api/client/file/' + item.id);
    // Detectar PDF por mime o por extensión del nombre
    const isPdf = docMime === 'application/pdf' || /\.pdf$/i.test(docNombre) || /\.pdf$/i.test(docFile);
    if (docCategory === 'image') {
      // Inline image preview
      body = '<div class="mc-doc-preview">' +
        '<img src="' + fileUrl + '" loading="lazy" alt="' + escapeHtml(docNombre) + '">' +
        '</div>';
    } else if (isPdf) {
      // Inline PDF preview with iframe + fallback
      body = '<div class="mc-doc-preview">' +
        '<iframe src="' + fileUrl + '" loading="lazy" title="' + escapeHtml(docNombre) + '">' +
        '</iframe>' +
        '<a href="' + fileUrl + '" download="' + escapeHtml(docNombre) + '" class="mc-doc-link">' +
          '<i class="fa-solid fa-download"></i> Descargar PDF' +
        '</a>' +
        '</div>';
    } else if (docCategory === 'presentation') {
      // PowerPoint download with icon
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Presentación</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + fileUrl + '" download="' + escapeHtml(docNombre) + '" target="_blank" rel="noopener">' +
          '<i class="fa-brands fa-microsoft-powerpoint"></i> Descargar presentación</a>' +
        '</div>';
    } else if (docCategory === 'document') {
      // Word / TXT download
      const icon = docMime && docMime.includes('word') ? 'fa-file-word' : 'fa-file-lines';
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Documento</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + fileUrl + '" download="' + escapeHtml(docNombre) + '" target="_blank" rel="noopener">' +
          '<i class="fa-solid ' + icon + '"></i> Descargar documento</a>' +
        '</div>';
    } else {
      // Generic fallback
      body = '<div class="mc-doc-download">' +
        '<div class="mc-doc-info">' +
          '<strong>' + escapeHtml(docNombre) + '</strong>' +
          '<small>Archivo adjunto</small>' +
        '</div>' +
        '<a class="mc-doc-link" href="' + fileUrl + '" target="_blank" rel="noopener">' +
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

function groupContenidoIntoRows(items) {
  if (!items || !items.length) return [];
  const sorted = items.slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  const rows = [];
  let currentRow = null;
  let currentWidth = 0;

  sorted.forEach(item => {
    const w = Number(item.widthPct) || 100;
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

  // Agrupar contenido en filas automáticamente según el ancho
  const contenidoItems = c.contenido || [];
  const rows = groupContenidoIntoRows(contenidoItems);

  const contenido = rows.length
    ? '<div class="mc-content-list">' + rows.map(row =>
        '<div class="mc-content-row"><div class="mc-content-row-inner">' +
          row.items.map(contentItemHtml).join('') +
        '</div></div>'
      ).join('') + '</div>'
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

function openPaymentModal(courseId) {
  const c = state.catalog.find(x => x.id === courseId) || state.courses.find(x => x.id === courseId);
  if (!c) return;
  $('payCourseId').value = c.id;
  const priceText = c.price != null ? ' | Precio: USD $' + c.price.toFixed(2) : '';
  $('payCourseInfo').innerHTML = '<strong>' + escapeHtml(c.nombre) + '</strong>' +
    '<br><span style="font-size:0.85rem;color:var(--text-muted);">' + escapeHtml(c.tipo === 'servicio' ? 'Servicio / Asesoría' : 'Curso') + priceText + '</span>';
  $('payReferencia').value = '';
  $('payNotas').value = '';
  $('mcPaymentModal').hidden = false;
  $('payReferencia').focus();
}

function closePaymentModal() {
  $('mcPaymentModal').hidden = true;
}

async function submitPaymentReport(e) {
  e.preventDefault();
  const courseId = $('payCourseId').value;
  const metodo = $('payMetodo').value;
  const referencia = $('payReferencia').value.trim();
  const notas = $('payNotas').value.trim();

  if (!referencia) {
    toast('Por favor ingresa la referencia o comprobante del pago.', 'error');
    return;
  }

  const submitBtn = $('mcPaymentSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

  try {
    const res = await api('/api/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        metodo,
        referencia,
        notas
      })
    });

    if (!res.ok) {
      toast(res.data.error || 'No se pudo registrar la confirmación del pago.', 'error');
      return;
    }

    closePaymentModal();
    toast(res.data.message || 'Confirmación de pago registrada con éxito.');
    await loadLists();

    if (res.data.activated) {
      switchMcTab('miscursos');
    } else {
      showView(state.currentTab);
    }
  } catch (err) {
    toast('Error de conexión al enviar el comprobante.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Enviar confirmación';
  }
}

function handleCardClick(e) {
  const open = e.target.closest('[data-open]');
  if (open) { openDetail(open.dataset.open); return; }
  const rep = e.target.closest('[data-report-payment]');
  if (rep) { openPaymentModal(rep.dataset.reportPayment); return; }
  const sol = e.target.closest('[data-solicitar]');
  if (sol) { solicitar(sol.dataset.solicitar); }
}

function handleCatalogClick(e) {
  const rep = e.target.closest('[data-report-payment]');
  if (rep) {
    e.stopPropagation();
    openPaymentModal(rep.dataset.reportPayment);
    return;
  }
  const squareBtn = e.target.closest('.mc-btn-square');
  if (squareBtn) {
    e.stopPropagation();
    return;
  }
  const sol = e.target.closest('[data-solicitar]');
  if (sol) {
    e.stopPropagation();
    solicitar(sol.dataset.solicitar);
    return;
  }
  const open = e.target.closest('[data-open]');
  if (open) {
    e.stopPropagation();
    openDetail(open.dataset.open);
    return;
  }
  const cat = e.target.closest('[data-open-cat]');
  if (cat) {
    openCatDetail(cat.dataset.openCat);
  }
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
    if ($('catDetail')) {
      $('catDetail').addEventListener('click', handleCatalogClick);
    }
    $('mcCourses').addEventListener('click', e => {
      if (e.target.closest('.mc-goto-catalogo')) switchMcTab('catalogo');
    });

    // Modal de pago
    $('mcPaymentModalClose').addEventListener('click', closePaymentModal);
    $('mcPaymentModalCancel').addEventListener('click', closePaymentModal);
    $('mcPaymentForm').addEventListener('submit', submitPaymentReport);
    $('mcPaymentModal').addEventListener('click', e => {
      if (e.target === $('mcPaymentModal')) closePaymentModal();
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
