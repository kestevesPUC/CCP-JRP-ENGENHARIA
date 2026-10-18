'use strict';

/** Resposta de arquivo (download de CSV/backup ou imagem inline). Controladores retornam isto no lugar de um objeto JSON. */
class FileResponse {
  constructor({ filename, contentType, body, disposition = 'attachment', cacheControl = null }) {
    this.filename = filename;
    this.contentType = contentType;
    this.body = body;
    this.disposition = disposition;
    this.cacheControl = cacheControl;
  }

  static csv(filename, csv) {
    return new FileResponse({ filename, contentType: 'text/csv; charset=utf-8', body: csv });
  }
}

module.exports = FileResponse;
