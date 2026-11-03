/* ==========================================
   ML CONSULTING — file-validation.js
   Server-side file validation: extension, MIME, size, anti-spoofing.
   ========================================= */

const path = require('path');

const ALLOWED = {
  image:        ['png', 'jpg', 'jpeg', 'webp', 'gif'],
  document:     ['pdf', 'doc', 'docx', 'txt'],
  presentation: ['ppt', 'pptx']
};

const SIZE_LIMITS = {
  image:        10 * 1024 * 1024,   // 10 MB
  document:     25 * 1024 * 1024,   // 25 MB
  presentation: 50 * 1024 * 1024    // 50 MB
};

const MIME_BY_EXT = {
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif:  'image/gif',
  pdf:  'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt:  'text/plain',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

/**
 * Infer file category from filename extension.
 * @param {string} filename
 * @returns {string|null} 'image' | 'document' | 'presentation' | null
 */
function inferCategory(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase().slice(1);
  for (const [category, exts] of Object.entries(ALLOWED)) {
    if (exts.includes(ext)) return category;
  }
  return null;
}

/**
 * Validate a file upload request.
 * @param {{ filename: string, contentType: string, size: number }} opts
 * @returns {{ ok: boolean, error?: string, category?: string }}
 */
function validateFile({ filename, contentType, size }) {
  const ext = path.extname(String(filename || '')).toLowerCase().slice(1);

  // 1. Find category by extension
  const category = inferCategory(filename);
  if (!category) {
    return { ok: false, error: 'Tipo de archivo no permitido' };
  }

  // 2. Anti-spoofing: reported MIME must match expected MIME for extension
  const expectedMime = MIME_BY_EXT[ext];
  if (expectedMime && expectedMime !== contentType) {
    return { ok: false, error: 'Tipo de archivo no coincide con extension' };
  }

  // 3. Size limit by category
  if (size > SIZE_LIMITS[category]) {
    const limitMB = SIZE_LIMITS[category] / 1024 / 1024;
    return { ok: false, error: `${category} excede el limite de ${limitMB}MB` };
  }

  return { ok: true, category };
}

module.exports = {
  ALLOWED,
  SIZE_LIMITS,
  MIME_BY_EXT,
  inferCategory,
  validateFile
};
