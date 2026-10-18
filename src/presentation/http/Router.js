'use strict';

/**
 * Tabela de rotas. Opções por rota: `public` (sem login), `nivel` (nível mínimo exigido, ex.: 'A'),
 * `allowMustChange` (acessível mesmo com senha provisória pendente).
 */
class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler, options = {}) {
    const keys = [];
    const source = pattern.replace(/:(\w+)/g, (_, key) => (keys.push(key), '([^/]+)'));
    this.routes.push({ method, regex: new RegExp(`^${source}$`), keys, handler, options });
    return this;
  }

  /** @returns {{handler:Function, options:object, params:object}|null} */
  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const found = route.regex.exec(pathname);
      if (!found) continue;
      const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]));
      return { handler: route.handler, options: route.options, params };
    }
    return null;
  }
}

module.exports = Router;
