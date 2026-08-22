const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

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

function keyForUpload(type, filename) {
  const ext = path.extname(String(filename || '')).toLowerCase() || (type === 'video' ? '.mp4' : '.pdf');
  return type + 's/' + crypto.randomUUID() + ext;
}

async function presignUpload({ type, filename, contentType }) {
  const key = keyForUpload(type, filename);
  const uploadUrl = await getSignedUrl(client(), new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType || (type === 'video' ? 'video/mp4' : 'application/pdf')
  }), { expiresIn: 600 });
  return { uploadUrl: uploadUrl, key: key };
}

async function signGetUrl(key) {
  if (!key) return null;
  if (PUBLIC_HOST) return 'https://' + PUBLIC_HOST + '/' + key;
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

async function deleteObject(key) {
  if (!key) return;
  try {
    await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    // best-effort
  }
}

module.exports = {
  isConfigured,
  presignUpload,
  signGetUrl,
  deleteObject
};
