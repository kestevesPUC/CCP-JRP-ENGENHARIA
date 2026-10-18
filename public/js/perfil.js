import { api } from './api.js';
import { esc } from './format.js';
import { avatarHtml } from './avatar.js';
import { nivelNome } from './niveis.js';
import { state } from './state.js';
import { notify, openDialog } from './ui.js';

const SIZE = 256;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

/** Recorta o centro da imagem em quadrado, reduz para 256 px e exporta como JPEG (poucos KB). */
async function toSquareJpeg(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

const announceUpdate = () => window.dispatchEvent(new CustomEvent('ccp:me-updated'));

/** Diálogo "Meu perfil": mostra os dados de acesso e permite trocar ou remover a foto. */
export function openProfile() {
  const { me } = state;
  openDialog(`<h2>Meu perfil</h2>
    <div class="profile">
      <div class="profile-photo" id="preview">${avatarHtml(me, 'avatar xl')}</div>
      <div>
        <p class="profile-name"><b>${esc(me.usuario)}</b><br><small>Nível ${me.nivel} — ${nivelNome(me.nivel)}</small></p>
        <label>Foto de perfil<input type="file" id="photoFile" accept="${ACCEPT.join(',')}"></label>
        <input type="hidden" name="foto">
        <p><small>A imagem é recortada em quadrado e reduzida automaticamente (PNG, JPEG ou WebP).</small></p>
        ${me.temFoto ? '<button type="button" class="btn alt sm" id="removePhoto">Remover foto</button>' : ''}
      </div>
    </div>`,
  async (data) => {
    if (!data.foto) throw new Error('Escolha uma imagem antes de confirmar.');
    state.me = await api('POST', '/api/me/foto', { foto: data.foto });
  },
  () => { announceUpdate(); notify('Foto de perfil atualizada'); });

  document.getElementById('photoFile').onchange = async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const form = event.target.form;
    try {
      if (!ACCEPT.includes(file.type)) throw new Error('Formato não suportado. Use PNG, JPEG ou WebP.');
      const dataUrl = await toSquareJpeg(file);
      form.elements.foto.value = dataUrl;
      document.getElementById('preview').innerHTML = `<img class="avatar xl" src="${dataUrl}" alt="Pré-visualização da foto">`;
      document.getElementById('dmsg').innerHTML = '';
    } catch (error) {
      form.elements.foto.value = '';
      event.target.value = '';
      document.getElementById('dmsg').innerHTML = `<div class="msg err" role="alert"><span>${esc(error.message || 'Não foi possível ler a imagem.')}</span></div>`;
    }
  };

  const remove = document.getElementById('removePhoto');
  if (remove) {
    remove.onclick = async () => {
      state.me = await api('DELETE', '/api/me/foto');
      document.getElementById('dlg').close();
      announceUpdate();
      notify('Foto de perfil removida');
    };
  }
}
