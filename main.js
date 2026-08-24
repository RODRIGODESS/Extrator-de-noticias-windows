const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');

// V1.25.10 usa uma camada de correções sobre o motor V1.25.1.
// O arquivo original permanece preservado e pode ser reutilizado sem alterações.
const motor = require('./engine/extrator-materia-v1.25.10.js');

const PASTA_NOME = 'ExtratorMaterias';
const ARQUIVO_ULTIMO = 'materia-extraida.txt';
const ARQUIVO_HISTORICO = 'materias-extraidas.txt';
const SEPARADOR = '\n' + '#'.repeat(70) + '\n\n';

let mainWindow = null;
let extractionBusy = false;

function pastaDownload() {
  return path.join(app.getPath('downloads'), PASTA_NOME);
}
function caminhoUltimo() { return path.join(pastaDownload(), ARQUIVO_ULTIMO); }
function caminhoHistorico() { return path.join(pastaDownload(), ARQUIVO_HISTORICO); }

function status(mensagem) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('extracao-status', mensagem);
  }
}

function carregarConfigProxyLocal() {
  const arquivo = path.join(__dirname, 'engine', 'config-proxy.json');
  const padrao = {
    ATIVADO: false,
    SERVIDOR: '',
    PORTA: '',
    TIMEOUT_MS: 45000,
    CERTIFICADO_CA: ''
  };
  try {
    if (!fs.existsSync(arquivo)) return padrao;
    return { ...padrao, ...JSON.parse(fs.readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '')) };
  } catch (_) {
    return padrao;
  }
}

function configurarConexao(opcoes = {}) {
  const usarProxy = opcoes.usarProxy === true;
  const config = carregarConfigProxyLocal();

  if (!usarProxy) {
    motor.prepararProxy('', '', { ...config, ATIVADO: false });
    return { proxy: false, descricao: 'Conexão direta' };
  }

  const usuario = String(opcoes.usuario || '').trim();
  const senha = String(opcoes.senha || '');
  if (!usuario) throw new Error('Informe o usuário do proxy.');
  if (!senha) throw new Error('Informe a senha do proxy.');

  motor.prepararProxy(usuario, senha, { ...config, ATIVADO: true });
  return { proxy: true, descricao: 'Proxy corporativo ativo' };
}

function salvarResultado(materia) {
  fs.mkdirSync(pastaDownload(), { recursive: true });
  fs.writeFileSync(caminhoUltimo(), materia.resultado, 'utf8');

  const repetida = motor.historicoContemUrl(materia.url, caminhoHistorico());
  if (!repetida) {
    fs.appendFileSync(caminhoHistorico(), materia.resultado + SEPARADOR, 'utf8');
  }

  try { clipboard.writeText(materia.resultado); } catch (_) {}
  return repetida;
}

async function extrairMateriaGUI(opcoes) {
  if (extractionBusy) return { ok: false, erro: 'Já existe uma extração em andamento.' };

  const url = String(opcoes?.url || '').trim();
  if (!url) return { ok: false, erro: 'Cole o link da matéria.' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, erro: 'O link precisa começar com http:// ou https://' };

  extractionBusy = true;
  try {
    const conexao = configurarConexao(opcoes || {});
    status(`${conexao.descricao}. Lendo e limpando a matéria com o motor ${motor.VERSAO}...`);

    const materia = await motor.extrairMateria(url);

    if (!materia || !materia.resultado || !materia.texto) {
      throw new Error('O motor não retornou o corpo completo da matéria.');
    }

    status('Matéria extraída. Salvando TXT e copiando para a área de transferência...');
    const repetida = salvarResultado(materia);

    const detalhe = repetida
      ? ' A URL já existia e não foi repetida no histórico.'
      : ' Também foi adicionada ao histórico.';

    status('✓ Matéria salva em Downloads/ExtratorMaterias.' + detalhe + ' Texto copiado.');
    return {
      ok: true,
      formatado: materia.resultado,
      url: materia.url,
      veiculo: materia.veiculo,
      titulo: materia.titulo,
      subtitulo: materia.subtitulo,
      autor: materia.autor,
      data: materia.data,
      corpoCaracteres: String(materia.texto || '').length,
      repetida,
      pasta: pastaDownload(),
      versaoMotor: motor.VERSAO
    };
  } catch (erro) {
    const mensagem = erro?.message || String(erro);
    status('Erro: ' + mensagem);
    return { ok: false, erro: mensagem };
  } finally {
    extractionBusy = false;
  }
}

function criarJanelaPrincipal() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 820,
    minWidth: 760,
    minHeight: 620,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'extratonoticias.webp'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  try {
    const config = carregarConfigProxyLocal();
    motor.prepararProxy('', '', { ...config, ATIVADO: false });
  } catch (_) {}

  criarJanelaPrincipal();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanelaPrincipal();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('extrair-materia', async (_event, opcoes) => extrairMateriaGUI(opcoes));
ipcMain.handle('obter-estado', async () => ({
  ultimoExiste: fs.existsSync(caminhoUltimo()),
  historicoExiste: fs.existsSync(caminhoHistorico()),
  pasta: pastaDownload(),
  versaoMotor: motor.VERSAO,
  proxyConfigurado: (() => {
    const c = carregarConfigProxyLocal();
    return !!(String(c.SERVIDOR || '').trim() && String(c.PORTA || '').trim());
  })()
}));
ipcMain.handle('abrir-ultimo', async () => {
  if (!fs.existsSync(caminhoUltimo())) return { ok: false, erro: 'O arquivo ainda não foi criado.' };
  const erro = await shell.openPath(caminhoUltimo());
  return erro ? { ok: false, erro } : { ok: true };
});
ipcMain.handle('abrir-historico', async () => {
  if (!fs.existsSync(caminhoHistorico())) return { ok: false, erro: 'O arquivo ainda não foi criado.' };
  const erro = await shell.openPath(caminhoHistorico());
  return erro ? { ok: false, erro } : { ok: true };
});
ipcMain.handle('abrir-pasta', async () => {
  fs.mkdirSync(pastaDownload(), { recursive: true });
  const erro = await shell.openPath(pastaDownload());
  return erro ? { ok: false, erro } : { ok: true };
});
