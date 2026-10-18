'use strict';
const ValidationError = require('../../domain/errors/ValidationError');
const AppError = require('../../domain/errors/AppError');

const MAX_BODY_BYTES = 1_000_000;

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new AppError('Requisição muito grande', 413);
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ValidationError('JSON inválido');
  }
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || '').split(';').map((part) => part.trim().split('=')).filter(([name]) => name),
  );
}

module.exports = { readJsonBody, parseCookies };
