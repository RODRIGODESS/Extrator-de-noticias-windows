const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(raiz, 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(raiz, 'preload.js'), 'utf8');
const html = fs.readFileSync(path.join(raiz, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(raiz, 'renderer', 'renderer.js'), 'utf8');
const motor = require('../engine/extrator-materia-v1.25.17-runtime.js');

assert.ok(/^1\.25\.17-/.test(motor.VERSAO), 'Motor ativo deve identificar V1.25.17.');
assert.ok(/safeStorage/.test(main), 'main.js deve usar safeStorage do Electron.');
assert.ok(/encryptString/.test(main), 'Credenciais devem ser criptografadas antes de gravar.');
assert.ok(/decryptString/.test(main), 'Credenciais salvas devem ser recuperáveis pelo Windows.');
assert.ok(/credenciais-assinante\.json/.test(main), 'Arquivo local de credenciais deve ficar no userData do app.');
assert.ok(/salvar-credenciais-assinante/.test(main), 'IPC para salvar acesso deve existir.');
assert.ok(/obter-credenciais-assinante/.test(main), 'IPC para recuperar acesso deve existir.');
assert.ok(/apagar-credenciais-assinante/.test(main), 'IPC para apagar acesso deve existir.');
assert.ok(/salvarCredenciaisAssinante/.test(preload), 'Preload deve expor salvamento de acesso.');
assert.ok(/obterCredenciaisAssinante/.test(preload), 'Preload deve expor consulta segura de acesso.');
assert.ok(/apagarCredenciaisAssinante/.test(preload), 'Preload deve expor exclusão de acesso.');
assert.ok(/id="assinanteCard"/.test(html), 'Interface deve conter a área Acesso de assinante.');
assert.ok(/id="assinanteUsuario"/.test(html), 'Interface deve conter usuário do Valor\/Globo.');
assert.ok(/id="assinanteSenha"\s+type="password"/.test(html), 'Senha de assinante deve permanecer mascarada na interface.');
assert.ok(/Salvar acesso/.test(html), 'Interface deve permitir salvar o acesso.');
assert.ok(/Apagar acesso salvo/.test(html), 'Interface deve permitir apagar o acesso local.');
assert.ok(/carregarAcessoAssinante/.test(renderer), 'Renderer deve recuperar acesso salvo ao iniciar.');
assert.ok(/salvarAcessoAssinante/.test(renderer), 'Renderer deve salvar acesso informado.');

console.log('OK - V1.25.17 salva acesso de assinante localmente com safeStorage e permite recuperar/apagar.');
