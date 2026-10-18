'use strict';
const http = require('node:http');
const AppError = require('../../domain/errors/AppError');
const UnauthorizedError = require('../../domain/errors/UnauthorizedError');
const ForbiddenError = require('../../domain/errors/ForbiddenError');
const NotFoundError = require('../../domain/errors/NotFoundError');
const FileResponse = require('./FileResponse');
const { NIVEL_CONSULTA } = require('../../domain/niveis');
const { readJsonBody, parseCookies } = require('./requestParsing');

const SESSION_COOKIE = 'sid';
const COOKIE_MAX_AGE = 8 * 60 * 60;

/** Servidor HTTP: autenticação, autorização por nível, contexto da requisição e tradução de erros. */
class HttpServer {
  /**
   * @param {object} deps
   * @param {import('./Router')} deps.router
   * @param {import('../../application/AuthService')} deps.authService
   * @param {import('./StaticFileHandler')} deps.staticHandler
   * @param {Pick<Console,'error'>} [deps.logger]
   */
  constructor({ router, authService, staticHandler, logger = console }) {
    this.router = router;
    this.authService = authService;
    this.staticHandler = staticHandler;
    this.logger = logger;
    this.server = http.createServer((req, res) => this.#handle(req, res));
  }

  listen(port, host = '127.0.0.1') {
    return new Promise((resolve) => this.server.listen(port, host, () => resolve(this.server.address())));
  }

  close() {
    return new Promise((resolve) => this.server.close(resolve));
  }

  async #handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!url.pathname.startsWith('/api/')) return this.staticHandler.handle(url.pathname, res);

      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      const headers = {};
      const match = this.router.match(req.method, url.pathname);
      if (!match) throw new NotFoundError('Rota não encontrada');

      const user = this.authService.resolveUser(token);
      this.#authorize(match.options, user, req.method);

      const ctx = {
        user,
        token,
        params: match.params,
        query: Object.fromEntries(url.searchParams),
        body: ['GET', 'DELETE'].includes(req.method) ? {} : await readJsonBody(req),
        setCookie: (value, maxAge = COOKIE_MAX_AGE) => {
          headers['Set-Cookie'] = `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
        },
      };
      const result = await match.handler(ctx);
      return this.#send(res, result, headers);
    } catch (error) {
      return this.#sendError(res, error);
    }
  }

  #authorize(options, user, method) {
    if (options.public) return;
    if (!user) throw new UnauthorizedError();
    if (user.mustChange && !options.allowMustChange) throw new ForbiddenError('Troque a senha provisória antes de continuar');
    const readOnly = method === 'GET' || options.selfService;
    if (user.nivel === NIVEL_CONSULTA && !readOnly) throw new ForbiddenError('Seu nível (Consulta) permite apenas visualizar');
    if (options.nivel && user.nivel !== options.nivel) throw new ForbiddenError(`Acesso restrito ao nível ${options.nivel}`);
  }

  #send(res, result, headers) {
    if (result instanceof FileResponse) {
      res.writeHead(200, {
        ...headers,
        'Content-Type': result.contentType,
        'Content-Disposition': `${result.disposition}; filename="${result.filename}"`,
        ...(result.cacheControl && { 'Cache-Control': result.cacheControl }),
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(result.body);
    }
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    return res.end(JSON.stringify(result ?? {}));
  }

  #sendError(res, error) {
    const known = error instanceof AppError;
    if (!known) this.logger.error(error);
    res.writeHead(known ? error.status : 500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: known ? error.message : 'Erro interno' }));
  }
}

module.exports = HttpServer;
