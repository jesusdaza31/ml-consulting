/* =============================================
   ML CONSULTING — testimonials-storage.js
   Persistencia y gestión de testimonios
   (Soporte dual: Supabase + Fallback local JSON)
============================================= */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const TESTIMONIALS_FILE = path.join(DATA_DIR, 'testimonials.json');

// Inicializar Supabase si las credenciales están presentes
let supabaseAdmin = null;
try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseSecretKey) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (err) {
  // Ignorar y usar fallback a archivo local
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_TESTIMONIALS = [
  {
    id: "t1",
    name: "María G.",
    service: "Preparación de impuestos",
    content: "Por años hice mis impuestos por mi cuenta y siempre terminaba con miedo de haber cometido un error. Con ML Consulting por fin me siento tranquila; todo quedó claro y a tiempo.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-01-15T10:00:00.000Z"
  },
  {
    id: "t2",
    name: "Carlos R.",
    service: "Formas migratorias",
    content: "Necesitaba ayuda con unos trámites migratorios y me atendieron con mucha paciencia, explicándome cada paso en español. Se sintieron como de la familia.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-02-10T11:00:00.000Z"
  },
  {
    id: "t3",
    name: "Lucía M.",
    service: "Seguros de salud",
    content: "Me ayudaron a encontrar un seguro de salud que sí podía pagar y que cubre a mi familia. El trato fue honesto y profesional desde el primer día.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-03-05T14:30:00.000Z"
  },
  {
    id: "t4",
    name: "Jorge P.",
    service: "Registro de empresas",
    content: "Registré mi negocio en Georgia con su ayuda y no tuve que preocuparme por nada. Documentos listos, sin estrés y en el tiempo prometido.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-04-12T16:20:00.000Z"
  },
  {
    id: "t5",
    name: "Ana S.",
    service: "Trámites de ITIN y Notaría",
    content: "Excelente servicio con el trámite de mi número ITIN y la notarización de documentos. La atención fue clara, humana y rápida. Muy agradecida con la Lic. María y su equipo.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-05-20T09:15:00.000Z"
  },
  {
    "id": "t6",
    name: "Roberto D.",
    service: "Asesoría Contable y Payroll",
    content: "Llevar la contabilidad de mi compañía solía ser un dolor de cabeza hasta que encontré a ML Consulting. Gran profesionalismo, puntualidad y siempre atentos a resolver dudas.",
    rating: 5,
    status: "approved",
    featured: true,
    createdAt: "2026-06-18T12:45:00.000Z"
  }
];

function readLocalTestimonials() {
  ensureDataDir();
  if (!fs.existsSync(TESTIMONIALS_FILE)) {
    writeLocalTestimonials(DEFAULT_TESTIMONIALS);
    return DEFAULT_TESTIMONIALS;
  }
  try {
    const data = JSON.parse(fs.readFileSync(TESTIMONIALS_FILE, 'utf8'));
    return Array.isArray(data) ? data : DEFAULT_TESTIMONIALS;
  } catch (e) {
    return DEFAULT_TESTIMONIALS;
  }
}

function writeLocalTestimonials(items) {
  ensureDataDir();
  const tmp = TESTIMONIALS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, TESTIMONIALS_FILE);
}

// Obtener solo testimonios aprobados (para el portal público)
async function getApprovedTestimonials() {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('testimonials')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          name: item.name,
          service: item.service,
          content: item.content,
          rating: item.rating || 5,
          status: item.status,
          featured: item.featured ?? true,
          createdAt: item.created_at || item.createdAt
        }));
      }
    } catch (e) {
      // Usar fallback
    }
  }

  const all = readLocalTestimonials();
  return all.filter(t => t.status === 'approved');
}

// Obtener todos los testimonios (para el panel de administración)
async function getAllTestimonials() {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          name: item.name,
          service: item.service,
          content: item.content,
          rating: item.rating || 5,
          status: item.status,
          featured: item.featured ?? true,
          createdAt: item.created_at || item.createdAt
        }));
      }
    } catch (e) {
      // Usar fallback
    }
  }

  return readLocalTestimonials();
}

// Crear testimonio (inicialmente 'pending' por defecto)
async function createTestimonial({ name, service, content, rating = 5, status = 'pending', featured = false }) {
  const cleanName = String(name || '').trim();
  const cleanService = String(service || '').trim();
  const cleanContent = String(content || '').trim();
  const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));

  if (!cleanName || !cleanService || !cleanContent) {
    throw new Error('Todos los campos son obligatorios.');
  }

  const id = crypto.randomUUID ? crypto.randomUUID() : ('t_' + Date.now());
  const now = new Date().toISOString();

  const newRecord = {
    id,
    name: cleanName,
    service: cleanService,
    content: cleanContent,
    rating: numRating,
    status: status || 'pending',
    featured: !!featured,
    createdAt: now
  };

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('testimonials')
        .insert([{
          id,
          name: cleanName,
          service: cleanService,
          content: cleanContent,
          rating: numRating,
          status: newRecord.status,
          featured: newRecord.featured,
          created_at: now
        }])
        .select()
        .single();
      if (!error && data) {
        // También guardar en local para redundancia
        const local = readLocalTestimonials();
        local.unshift(newRecord);
        writeLocalTestimonials(local);
        return newRecord;
      }
    } catch (e) {
      // Continuar con local
    }
  }

  const local = readLocalTestimonials();
  local.unshift(newRecord);
  writeLocalTestimonials(local);
  return newRecord;
}

// Actualizar estado del testimonio (aprobar, rechazar, cambiar featured)
async function updateTestimonial(id, updates) {
  if (supabaseAdmin) {
    try {
      const payload = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.featured !== undefined) payload.featured = updates.featured;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.rating !== undefined) payload.rating = updates.rating;

      const { data, error } = await supabaseAdmin
        .from('testimonials')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Actualizar copia local
        const local = readLocalTestimonials();
        const idx = local.findIndex(t => t.id === id);
        if (idx !== -1) {
          local[idx] = { ...local[idx], ...updates };
          writeLocalTestimonials(local);
        }
        return data;
      }
    } catch (e) {
      // Continuar con local
    }
  }

  const local = readLocalTestimonials();
  const idx = local.findIndex(t => t.id === id);
  if (idx === -1) {
    throw new Error('Testimonio no encontrado.');
  }

  local[idx] = { ...local[idx], ...updates };
  writeLocalTestimonials(local);
  return local[idx];
}

// Eliminar testimonio
async function deleteTestimonial(id) {
  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('testimonials').delete().eq('id', id);
    } catch (e) {
      // Continuar con local
    }
  }

  const local = readLocalTestimonials();
  const filtered = local.filter(t => t.id !== id);
  writeLocalTestimonials(filtered);
  return true;
}

module.exports = {
  getApprovedTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
};
