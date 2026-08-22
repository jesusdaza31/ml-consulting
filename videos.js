/* =============================================
   ML CONSULTING — videos.js
   Biblioteca de videos en Cloudflare R2.
   - Subida directa navegador -> R2 con URLs firmadas
   - videos.json como catálogo de la biblioteca
   - Reproducción con URLs firmadas de corta duración

   CONFIGURACIÓN (ver .env.example):
   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
   (opcional) R2_PUBLIC_HOST — si está vacío, siempre URL firmada.
   Sin R2 configurado el servidor funciona: la sección Videos
   muestra el estado "R2 no configurado" y el contenido de curso
   cae al modo YouTube.
============================================= */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || '';
const SECRET = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET || '';
const PUBLIC_HOST = process.env.R2_PUBLIC_HOST || '';

let s3 = null;

function isConfigured() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY && SECRET && BUCKET);
}

function client() {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://' + ACCOUNT_ID + '.r2.cloudflarestorage.com',
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET }
    });
  }
  return s3;
}

/* ---------- Persistencia videos.json (escritura atómica) ---------- */

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readVideos() {
  ensureDataDir();
  if (!fs.existsSync(VIDEOS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(VIDEOS_FILE, 'utf8'));
    return Array.isArray(parsed.videos) ? parsed.videos : [];
  } catch (e) {
    return [];
  }
}

function writeVideos(list) {
  ensureDataDir();
  const tmp = VIDEOS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ videos: list }, null, 2), 'utf8');
  fs.renameSync(tmp, VIDEOS_FILE);
}

let videos = readVideos();

function save() { writeVideos(videos); }
function allVideos() { return videos; }
function findVideo(id) { return videos.find(v => v.id === id); }
function addVideo(record) { videos.push(record); save(); return record; }
function removeVideo(id) {
  const idx = videos.findIndex(v => v.id === id);
  if (idx === -1) return null;
  const [removed] = videos.splice(idx, 1);
  save();
  return removed;
}

/* ---------- Operaciones R2 ---------- */

function keyForUpload(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase() || '.mp4';
  return 'videos/' + crypto.randomUUID() + ext;
}

async function presignUpload({ filename, contentType }) {
  const key = keyForUpload(filename);
  const uploadUrl = await getSignedUrl(client(), new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || 'video/mp4'
  }), { expiresIn: 600 });
  return { uploadUrl: uploadUrl, key: key };
}

async function signGetUrl(key) {
  if (!key) return null;
  // Modo público opcional: URL fija en vez de firmada.
  if (PUBLIC_HOST) return 'https://' + PUBLIC_HOST + '/' + key;
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

async function deleteObject(key) {
  if (!key) return;
  try {
    await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    /* best-effort */
  }
}

module.exports = {
  isConfigured,
  presignUpload,
  signGetUrl,
  deleteObject,
  allVideos,
  findVideo,
  addVideo,
  removeVideo
};
