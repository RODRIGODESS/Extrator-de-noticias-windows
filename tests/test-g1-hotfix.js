const assert = require('assert');
const { JSDOM } = require('jsdom');
const {
  coletarBlocosG1,
  completarSomenteDepoisDoUltimoParagrafo
} = require('../engine/correcoes-g1-v1.25.10.js');

const html = `<!doctype html><html><body>
  <div class="summary-card">
    <p class="content-text__container">RESUMO AUTOMÁTICO QUE NÃO PODE ENTRAR NO CORPO DA MATÉRIA MESMO TENDO TEXTO LONGO SUFICIENTE.</p>
  </div>
  <main>
    <div class="mc-article-body">
      <div class="mc-column content-text">
        <p class="content-text__container">Primeiro parágrafo literal da matéria com conteúdo jornalístico suficiente para validação.</p>
        <p class="content-text__container">Segundo parágrafo literal da matéria com conteúdo jornalístico suficiente para validação.</p>
        <div class="recommend-box">
          <p class="content-text__container">RECOMENDAÇÃO QUE NÃO PODE ENTRAR NO CORPO DA MATÉRIA MESMO TENDO TEXTO LONGO SUFICIENTE.</p>
        </div>
        <p class="content-text__container">Terceiro parágrafo literal da matéria que aparece depois do trecho já extraído.</p>
      </div>
    </div>
  </main>
</body></html>`;

const doc = new JSDOM(html).window.document;
const blocos = coletarBlocosG1(doc, {});

assert.deepStrictEqual(blocos, [
  'Primeiro parágrafo literal da matéria com conteúdo jornalístico suficiente para validação.',
  'Segundo parágrafo literal da matéria com conteúdo jornalístico suficiente para validação.',
  'Terceiro parágrafo literal da matéria que aparece depois do trecho já extraído.'
]);

const atual = [blocos[0], blocos[1]].join('\n\n');
const completo = completarSomenteDepoisDoUltimoParagrafo(atual, blocos);

assert.strictEqual(completo, blocos.join('\n\n'));
assert.ok(!completo.includes('RESUMO AUTOMÁTICO'));
assert.ok(!completo.includes('RECOMENDAÇÃO'));

const semCorrespondencia = completarSomenteDepoisDoUltimoParagrafo(
  'Texto diferente que não existe literalmente no corpo principal da página.',
  blocos
);
assert.strictEqual(
  semCorrespondencia,
  'Texto diferente que não existe literalmente no corpo principal da página.'
);

console.log('OK - hotfix G1 aceita somente corpo literal e não injeta resumo/recomendação.');
