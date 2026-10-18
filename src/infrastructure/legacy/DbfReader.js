'use strict';
const fs = require('node:fs');

// Tabela CP850 (DOS) para os bytes 0x80-0xFF, usada pelo Clipper/FoxPlus.
const CP850_HIGH = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';
const HEADER_FIELDS_START = 32;
const DELETED_MARK = 0x2a;

/** Leitor de arquivos dBase III (.dbf) do sistema Clipper original. */
class DbfReader {
  /** @returns {object[]} registros (sem os marcados como excluídos), com campos em minúsculas */
  read(file) {
    const buffer = fs.readFileSync(file);
    const recordCount = buffer.readUInt32LE(4);
    const headerLength = buffer.readUInt16LE(8);
    const recordLength = buffer.readUInt16LE(10);
    const fields = this.#readFields(buffer, headerLength);

    const rows = [];
    for (let i = 0; i < recordCount; i++) {
      const start = headerLength + i * recordLength;
      if (start + recordLength > buffer.length) break;
      if (buffer[start] === DELETED_MARK) continue;
      rows.push(this.#readRecord(buffer, start + 1, fields));
    }
    return rows;
  }

  #readFields(buffer, headerLength) {
    const fields = [];
    for (let o = HEADER_FIELDS_START; o < headerLength && buffer[o] !== 0x0d; o += 32) {
      fields.push({
        name: buffer.toString('latin1', o, o + 11).replace(/\0.*/, '').toLowerCase(),
        type: String.fromCharCode(buffer[o + 11]),
        length: buffer[o + 16],
      });
    }
    return fields;
  }

  #readRecord(buffer, offset, fields) {
    const row = {};
    let position = offset;
    for (const field of fields) {
      const raw = this.#decode(buffer.subarray(position, position + field.length)).trim();
      position += field.length;
      row[field.name] = this.#convert(field.type, raw);
    }
    return row;
  }

  #convert(type, raw) {
    if (type === 'N') return raw === '' ? 0 : Number(raw);
    if (type === 'D') return /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : '';
    if (type === 'L') return /^[TtYy]/.test(raw);
    return raw;
  }

  #decode(bytes) {
    let text = '';
    for (const byte of bytes) text += byte < 0x80 ? String.fromCharCode(byte) : CP850_HIGH[byte - 0x80];
    return text;
  }
}

module.exports = DbfReader;
