const url = document.getElementById('url');
const btnExtrair = document.getElementById('extrair');
const btnUltimo = document.getElementById('ultimo');
const btnHistorico = document.getElementById('historico');
const btnPasta = document.getElementById('pasta');
const btnLimpar = document.getElementById('limpar');
const btnCopiar = document.getElementById('copiar');
const status = document.getElementById('status');
const statusPill = document.getElementById('statusPill');
const resultado = document.getElementById('resultado');
const resultadoVazio = document.getElementById('resultadoVazio');
const info = document.getElementById('info');
const versao = document.getElementById('versao');
const versaoSidebar = document.getElementById('versaoSidebar');
const usarProxy = document.getElementById('usarProxy');
const camposProxy = document.getElementById('camposProxy');
const usuario = document.getElementById('usuario');
const senha = document.getElementById('senha');
const successMark = document.getElementById('successMark');

const metaTitulo = document.getElementById('metaTitulo');
const metaVeiculo = document.getElementById('metaVeiculo');
const metaData = document.getElementById('metaData');
const metaAutor = document.getElementById('metaAutor');
const metaSubtitulo = document.getElementById('metaSubtitulo');
const metaLink = document.getElementById('metaLink');

function classificarStatus(mensagem = '') {
  const t = String(mensagem).toLowerCase();
  if (/erro|não foi|nao foi|precisa|informe|cole o link|já existe|ja existe/.test(t)) return 'error';
  if (/^✓|salva|concluída|concluida|extraída|extraida/.test(t)) return 'success';
  if (/lendo|limpando|process|salvando|conexão|conexao|proxy/.test(t)) return 'busy';
  return 'ready';
}

function definirStatus(mensagem, estado) {
  status.textContent = mensagem;
  statusPill.dataset.state = estado || classificarStatus(mensagem);
}

window.extratorAPI.onStatus((mensagem) => definirStatus(mensagem));

usarProxy.addEventListener('change', () => {
  camposProxy.classList.toggle('oculto', !usarProxy.checked);
  if (usarProxy.checked) usuario.focus();
});

function preencherMetadados(retorno) {
  metaTitulo.textContent = retorno.titulo || 'Não identificado';
  metaVeiculo.textContent = retorno.veiculo || 'Não identificado';
  metaData.textContent = retorno.data || 'Não identificada';
  metaAutor.textContent = retorno.autor || 'Não informado';
  metaSubtitulo.textContent = retorno.subtitulo || 'Não informado';
  metaLink.textContent = retorno.url || '—';
  metaLink.title = retorno.url || '';
  successMark.classList.add('ativo');
}

function limparMetadados() {
  metaTitulo.textContent = 'Aguardando extração';
  metaVeiculo.textContent = '—';
  metaData.textContent = '—';
  metaAutor.textContent = '—';
  metaSubtitulo.textContent = '—';
  metaLink.textContent = '—';
  metaLink.title = '';
  successMark.classList.remove('ativo');
}

function exibirResultado(texto = '') {
  resultado.textContent = texto;
  const temTexto = !!texto.trim();
  resultadoVazio.classList.toggle('oculto', temTexto);
  btnCopiar.disabled = !temTexto;
}

async function atualizarEstado() {
  const estado = await window.extratorAPI.obterEstado();
  btnUltimo.disabled = !estado.ultimoExiste;

  if (estado.versaoMotor) {
    const texto = 'Motor ' + estado.versaoMotor;
    versao.textContent = texto;
    versaoSidebar.textContent = estado.versaoMotor;
  }

  if (estado.proxyConfigurado) {
    usarProxy.checked = true;
    camposProxy.classList.remove('oculto');
    usarProxy.title = `Proxy embutido: ${estado.proxyServidor || 'proxy-7dn.mb'}:${estado.proxyPorta || '6060'}`;
    definirStatus(`Proxy configurado no aplicativo: ${estado.proxyServidor || 'proxy-7dn.mb'}:${estado.proxyPorta || '6060'}. Informe usuário e senha para extrair.`, 'ready');
  }
}

async function extrair() {
  const informado = url.value.trim();
  if (!informado) {
    definirStatus('Cole o link da matéria.', 'error');
    url.focus();
    return;
  }
  if (!/^https?:\/\/.+/i.test(informado)) {
    definirStatus('O link precisa começar com http:// ou https://', 'error');
    url.focus();
    return;
  }
  if (usarProxy.checked && !usuario.value.trim()) {
    definirStatus('Informe o usuário do proxy.', 'error');
    usuario.focus();
    return;
  }
  if (usarProxy.checked && !senha.value) {
    definirStatus('Informe a senha do proxy.', 'error');
    senha.focus();
    return;
  }

  btnExtrair.disabled = true;
  btnExtrair.setAttribute('aria-busy', 'true');
  exibirResultado('');
  limparMetadados();
  info.textContent = 'Processando…';
  definirStatus(usarProxy.checked ? 'Conectando ao proxy e extraindo matéria…' : 'Preparando a extração…', 'busy');

  try {
    const retorno = await window.extratorAPI.extrair({
      url: informado,
      usarProxy: usarProxy.checked,
      usuario: usuario.value,
      senha: senha.value
    });

    if (retorno.ok) {
      exibirResultado(retorno.formatado || '');
      preencherMetadados(retorno);
      info.textContent = `${retorno.corpoCaracteres.toLocaleString('pt-BR')} caracteres`;
      definirStatus('✓ Extração concluída e salva.', 'success');
      await atualizarEstado();
    } else {
      definirStatus(retorno.erro || 'Não foi possível concluir a extração.', 'error');
      info.textContent = 'Falha na extração';
    }
  } catch (e) {
    definirStatus('Erro ao processar: ' + (e?.message || e), 'error');
    info.textContent = 'Falha na extração';
  } finally {
    btnExtrair.disabled = false;
    btnExtrair.removeAttribute('aria-busy');
  }
}

async function abrirUltimo() {
  const r = await window.extratorAPI.abrirUltimo();
  if (!r.ok) definirStatus(r.erro, 'error');
}

async function abrirHistorico() {
  const r = await window.extratorAPI.abrirHistorico();
  if (!r.ok) definirStatus(r.erro, 'error');
}

async function abrirPasta() {
  const r = await window.extratorAPI.abrirPasta();
  if (!r.ok) definirStatus(r.erro, 'error');
}

async function copiarResultado() {
  const texto = resultado.textContent || '';
  if (!texto.trim()) return;

  try {
    await navigator.clipboard.writeText(texto);
    definirStatus('✓ Texto copiado para a área de transferência.', 'success');
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    definirStatus(ok ? '✓ Texto copiado para a área de transferência.' : 'Não foi possível copiar o texto.', ok ? 'success' : 'error');
  }
}

function limparTela() {
  url.value = '';
  exibirResultado('');
  limparMetadados();
  info.textContent = 'Nenhuma matéria extraída';
  definirStatus('Pronto para receber um link.', 'ready');
  url.focus();
}

btnExtrair.addEventListener('click', extrair);
btnUltimo.addEventListener('click', abrirUltimo);
btnHistorico.addEventListener('click', abrirHistorico);
btnPasta.addEventListener('click', abrirPasta);
btnLimpar.addEventListener('click', limparTela);
btnCopiar.addEventListener('click', copiarResultado);

document.querySelectorAll('[data-action="historico"]').forEach(el => el.addEventListener('click', abrirHistorico));
document.querySelectorAll('[data-action="pasta"]').forEach(el => el.addEventListener('click', abrirPasta));
document.querySelectorAll('[data-scroll]').forEach(el => {
  el.addEventListener('click', () => {
    const alvo = document.getElementById(el.dataset.scroll);
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('ativo'));
    if (el.classList.contains('nav-item')) el.classList.add('ativo');
  });
});

url.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey && !btnExtrair.disabled) {
    e.preventDefault();
    extrair();
  }
});

atualizarEstado().catch(() => {});
