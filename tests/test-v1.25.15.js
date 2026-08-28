const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(raiz, 'renderer', 'renderer.js'), 'utf8');
const motor = require('../engine/extrator-materia-v1.25.15-runtime.js');

const dom = new JSDOM(html, {
  url: 'https://app.local/',
  runScripts: 'outside-only'
});

const { window } = dom;
window.extratorAPI = {
  onStatus: () => {},
  obterEstado: async () => ({ ultimoExiste: false, versaoMotor: motor.VERSAO }),
  extrair: async () => ({ ok: false, erro: 'teste' }),
  abrirUltimo: async () => ({ ok: true }),
  abrirHistorico: async () => ({ ok: true }),
  abrirPasta: async () => ({ ok: true })
};
window.navigator.clipboard = { writeText: async () => {} };
window.eval(renderer);

const campo = window.document.getElementById('url');
const botao = window.document.getElementById('extrair');

assert.strictEqual(botao.disabled, true, 'Com o campo vazio, o botão deve iniciar desabilitado.');

campo.value = 'https://valor.globo.com/brasil/noticia/teste.ghtml';
campo.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.strictEqual(botao.disabled, false, 'Ao colar/digitar URL https válida, o botão deve habilitar.');

campo.value = 'texto sem url';
campo.dispatchEvent(new window.Event('change', { bubbles: true }));
assert.strictEqual(botao.disabled, true, 'Texto sem http/https não deve habilitar o botão.');

campo.value = 'http://exemplo.com/noticia';
campo.dispatchEvent(new window.Event('input', { bubbles: true }));
assert.strictEqual(botao.disabled, false, 'URL http válida também deve habilitar o botão.');

window.document.getElementById('limpar').click();
assert.strictEqual(botao.disabled, true, 'Depois de Limpar, o botão deve voltar a ficar desabilitado.');

assert.ok(/^1\.25\.15-/.test(motor.VERSAO), 'Versão ativa deve ser V1.25.15.');
console.log('OK - V1.25.15 habilita/desabilita o botão Extrair conforme a URL informada.');
