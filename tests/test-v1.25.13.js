const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(raiz, 'engine', 'config-proxy.json'), 'utf8').replace(/^\uFEFF/, ''));
const html = fs.readFileSync(path.join(raiz, 'renderer', 'index.html'), 'utf8');
const motor = require('../engine/extrator-materia-v1.25.13-runtime.js');

assert.strictEqual(String(config.SERVIDOR || '').trim(), 'proxy-7dn.mb', 'Servidor do proxy corporativo não pode ficar vazio.');
assert.strictEqual(String(config.PORTA || '').trim(), '6060', 'Porta do proxy corporativo deve ser 6060.');
assert.ok(/<input\s+id="senha"\s+type="text"/i.test(html), 'Campo de senha deve permanecer visível na V1.25.13.');
assert.strictEqual(typeof motor.extrairMateria, 'function', 'Motor deve continuar exportando extrairMateria.');
assert.strictEqual(typeof motor.prepararProxy, 'function', 'Motor deve continuar exportando prepararProxy.');
assert.ok(/^1\.25\.13-/.test(motor.VERSAO), 'Versão ativa deve ser V1.25.13.');

console.log('OK - V1.25.13 preserva o motor, restaura proxy e mantém senha visível.');
