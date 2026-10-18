import { esc } from './format.js';

/** Avatar do usuário: foto de perfil (se houver) ou a inicial do nome. `fotoVersao` evita cache antigo após trocar a foto. */
export const avatarHtml = (user, cls = 'avatar') => (user.temFoto
  ? `<img class="${cls}" src="/api/usuarios/${user.id}/foto?v=${encodeURIComponent(user.fotoVersao)}" alt="">`
  : `<div class="${cls}" aria-hidden="true">${esc(user.usuario[0])}</div>`);
