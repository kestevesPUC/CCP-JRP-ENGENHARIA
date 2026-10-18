'use strict';
const ValidationError = require('../errors/ValidationError');

const MAX_BYTES = 300 * 1024;
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

// Assinaturas (magic bytes) para não aceitar arquivos que apenas declaram ser imagem.
const SIGNATURES = {
  'image/png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  'image/jpeg': (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

/** Valida a foto de perfil enviada como data URL (PNG, JPEG ou WebP até 300 KB). */
class ProfilePhotoValidator {
  /** @returns {{tipo: string, dados: Buffer}} */
  parse(dataUrl) {
    const match = DATA_URL.exec(String(dataUrl || ''));
    if (!match) throw new ValidationError('Envie uma imagem PNG, JPEG ou WebP.');
    const [, tipo, base64] = match;
    const dados = Buffer.from(base64, 'base64');
    if (dados.length === 0) throw new ValidationError('Imagem vazia.');
    if (dados.length > MAX_BYTES) throw new ValidationError('A imagem é muito grande (máximo de 300 KB).');
    if (!SIGNATURES[tipo](dados)) throw new ValidationError('O arquivo enviado não é uma imagem válida.');
    return { tipo, dados };
  }
}

module.exports = ProfilePhotoValidator;
