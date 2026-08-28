const assert = require('assert');
const motor = require('../engine/extrator-materia-v1.25.14-runtime.js');

assert.strictEqual(motor.ehValor('https://valor.globo.com/brasil/noticia/teste.ghtml'), true);
assert.strictEqual(motor.ehValor('https://g1.globo.com/teste'), false);
assert.strictEqual(motor.corpoCurto('Parágrafo curto.'), true);

const html = `<!doctype html><html><body>
<main>
  <article class="mc-article-body">
    <p>Primeiro parágrafo público com conteúdo suficiente para representar o início real da matéria e testar a recuperação visível.</p>
    <p>Segundo parágrafo público, também longo, que deve permanecer no corpo recuperado pelo extrator quando o Readability trouxer apenas um trecho curto.</p>
    <h2>Um intertítulo válido</h2>
    <p>Terceiro parágrafo público, com mais informações visíveis, usado para confirmar que o motor escolhe o conjunto mais completo de parágrafos da página.</p>
    <div class="paywall subscription"><p>Este texto não pode ser usado porque está marcado como conteúdo restrito por assinatura.</p></div>
    <p hidden>Este parágrafo oculto também não pode entrar.</p>
  </article>
</main>
</body></html>`;

const corpo = motor.extrairCorpoVisivelValorHtml(html, 'https://valor.globo.com/brasil/noticia/teste.ghtml', {});
assert.ok(corpo.includes('Primeiro parágrafo público'));
assert.ok(corpo.includes('Segundo parágrafo público'));
assert.ok(corpo.includes('Terceiro parágrafo público'));
assert.ok(corpo.includes('Um intertítulo válido'));
assert.ok(!corpo.includes('conteúdo restrito por assinatura'));
assert.ok(!corpo.includes('parágrafo oculto'));

const curta = { texto: 'Texto curto.' };
const longa = { texto: 'A'.repeat(1800) };
assert.strictEqual(motor.escolherMelhorMateria(curta, longa), longa, 'Deve escolher o corpo mais longo do Valor.');

const materia = { texto: 'Trecho curto original.' };
motor.aplicarCorpoSeMaior(materia, 'B'.repeat(1000));
assert.strictEqual(materia.texto.length, 1000, 'Deve substituir um corpo curto por versão visível significativamente maior.');

assert.ok(/^1\.25\.14-/.test(motor.VERSAO));
console.log('OK - V1.25.14 compara rotas e recupera apenas parágrafos públicos visíveis do Valor.');
