const assert = require('assert');
const motor = require('../engine/extrator-materia-v1.25.12-runtime.js');

const normal = 'https://valor.globo.com/brasil/noticia/2026/08/28/proposta-para-previdencia-preve-mudanca-estrutural.ghtml';
const amp = 'https://valor.globo.com/google/amp/brasil/noticia/2026/08/28/proposta-para-previdencia-preve-mudanca-estrutural.ghtml';

assert.strictEqual(motor.montarAlternativaValor(normal), amp);
assert.strictEqual(motor.montarAlternativaValor(amp), normal);
assert.strictEqual(motor.montarAlternativaValor('https://g1.globo.com/mundo/noticia/2026/08/28/teste.ghtml'), '');
assert.strictEqual(motor.VERSAO, '1.25.12-VALOR-AMP-FALLBACK');

console.log('OK - V1.25.12 adiciona fallback AMP somente para o Valor.');
