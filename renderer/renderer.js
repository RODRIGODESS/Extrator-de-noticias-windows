const url = document.getElementById('url');
const btnExtrair = document.getElementById('extrair');
const btnUltimo = document.getElementById('ultimo');
const btnHistorico = document.getElementById('historico');
const btnPasta = document.getElementById('pasta');
const status = document.getElementById('status');
const resultado = document.getElementById('resultado');
const info = document.getElementById('info');
const versao = document.getElementById('versao');
const usarProxy = document.getElementById('usarProxy');
const camposProxy = document.getElementById('camposProxy');
const usuario = document.getElementById('usuario');
const senha = document.getElementById('senha');

window.extratorAPI.onStatus((mensagem) => { status.textContent = mensagem; });

usarProxy.addEventListener('change', () => {
  camposProxy.classList.toggle('oculto', !usarProxy.checked);
  if (usarProxy.checked) usuario.focus();
});

async function atualizarEstado() {
  const estado = await window.extratorAPI.obterEstado();
  btnUltimo.disabled = !estado.ultimoExiste;
  if (estado.versaoMotor) versao.textContent = 'Motor ' + estado.versaoMotor;
}

btnExtrair.addEventListener('click', async () => {
  const informado = url.value.trim();
  if (!informado) { status.textContent = 'Cole o link da matéria.'; return; }
  if (!/^https?:\/\/.+/i.test(informado)) { status.textContent = 'O link precisa começar com http:// ou https://'; return; }
  if (usarProxy.checked && !usuario.value.trim()) { status.textContent = 'Informe o usuário do proxy.'; return; }
  if (usarProxy.checked && !senha.value) { status.textContent = 'Informe a senha do proxy.'; return; }

  btnExtrair.disabled = true;
  resultado.textContent = '';
  info.textContent = '';
  try {
    const retorno = await window.extratorAPI.extrair({
      url: informado,
      usarProxy: usarProxy.checked,
      usuario: usuario.value,
      senha: senha.value
    });
    if (retorno.ok) {
      resultado.textContent = retorno.formatado;
      info.textContent = `Corpo extraído: ${retorno.corpoCaracteres.toLocaleString('pt-BR')} caracteres • ${retorno.versaoMotor}`;
      await atualizarEstado();
    } else {
      status.textContent = retorno.erro || 'Não foi possível concluir a extração.';
    }
  } catch (e) {
    status.textContent = 'Erro ao processar: ' + (e?.message || e);
  } finally {
    btnExtrair.disabled = false;
  }
});

btnUltimo.addEventListener('click', async () => {
  const r = await window.extratorAPI.abrirUltimo();
  if (!r.ok) status.textContent = r.erro;
});
btnHistorico.addEventListener('click', async () => {
  const r = await window.extratorAPI.abrirHistorico();
  if (!r.ok) status.textContent = r.erro;
});
btnPasta.addEventListener('click', async () => {
  const r = await window.extratorAPI.abrirPasta();
  if (!r.ok) status.textContent = r.erro;
});

url.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey && !btnExtrair.disabled) btnExtrair.click();
});

atualizarEstado();
