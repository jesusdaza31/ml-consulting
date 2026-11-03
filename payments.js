/* =============================================
   ML CONSULTING — payments.js
   Persistencia y lógica de pagos de cursos
   (JSON local, sin BD para dev local).
============================================= */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readPayments() {
  ensureDataDir();
  if (!fs.existsSync(PAYMENTS_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    return Array.isArray(parsed.payments) ? parsed.payments : [];
  } catch (e) {
    return [];
  }
}

function writePayments(list) {
  ensureDataDir();
  const tmp = PAYMENTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ payments: list }, null, 2), 'utf8');
  fs.renameSync(tmp, PAYMENTS_FILE);
}

let payments = readPayments();

function save() {
  writePayments(payments);
}

function allPayments() {
  return payments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function findPayment(id) {
  return payments.find(p => p.id === id);
}

function createPayment(data) {
  const item = {
    id: crypto.randomUUID(),
    clientId: String(data.clientId || ''),
    courseId: String(data.courseId || ''),
    monto: Number(data.monto) || 0,
    moneda: data.moneda || 'USD',
    metodo: data.metodo || 'manual', // 'square', 'tarjeta', 'transferencia', 'efectivo', 'zelle', 'manual', 'cortesia'
    estado: data.estado || 'completado', // 'completado', 'pendiente', 'fallido', 'reembolsado'
    referencia: String(data.referencia || '').trim(),
    notas: String(data.notas || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  payments.push(item);
  save();
  return item;
}

function updatePayment(id, data) {
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const curr = payments[idx];

  if (data.monto !== undefined) curr.monto = Number(data.monto) || 0;
  if (data.metodo !== undefined) curr.metodo = data.metodo;
  if (data.estado !== undefined) curr.estado = data.estado;
  if (data.referencia !== undefined) curr.referencia = String(data.referencia).trim();
  if (data.notas !== undefined) curr.notas = String(data.notas).trim();
  curr.updatedAt = new Date().toISOString();

  save();
  return curr;
}

function deletePayment(id) {
  const idx = payments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  payments.splice(idx, 1);
  save();
  return true;
}

function stats() {
  const completados = payments.filter(p => p.estado === 'completado');
  const pendientes = payments.filter(p => p.estado === 'pendiente');
  const manuales = payments.filter(p => ['manual', 'cortesia', 'efectivo', 'transferencia', 'zelle'].includes(p.metodo));
  const totalRecaudado = completados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

  return {
    totalRecaudado: Number(totalRecaudado.toFixed(2)),
    totalCompletados: completados.length,
    totalPendientes: pendientes.length,
    totalManuales: manuales.length,
    totalPagos: payments.length
  };
}

module.exports = {
  allPayments,
  findPayment,
  createPayment,
  updatePayment,
  deletePayment,
  stats
};
