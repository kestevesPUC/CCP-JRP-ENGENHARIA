'use strict';
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

/** Serve os arquivos estáticos da interface, impedindo saída do diretório público. */
class StaticFileHandler {
  constructor(root) {
    this.root = path.resolve(root);
  }

  /** @returns {boolean} true se respondeu a requisição */
  handle(pathname, res) {
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname);
    const file = path.resolve(this.root, `.${path.sep}${relative}`);
    const inside = file === this.root || file.startsWith(this.root + path.sep);
    if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return true;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(fs.readFileSync(file));
    return true;
  }
}

module.exports = StaticFileHandler;
