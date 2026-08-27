const assert = require('assert');
const motor = require('../engine/extrator-materia-v1.25.11-runtime.js');

// Defesa Aérea & Naval: dateline de press release não pode virar subtítulo.
{
  const m = {
    url: 'https://www.defesaaereanaval.com.br/aviacao/exemplo/amp',
    veiculo: 'Defesa Aérea & Naval',
    titulo: 'Título de teste',
    subtitulo: 'Abu Dhabi / São José dos Campos: 26 de agosto de 2026 – Primeiro parágrafo real da matéria com conteúdo suficiente para o teste.',
    autor: 'Autor', data: '27/08/2026', texto: 'Segundo parágrafo da matéria.'
  };
  motor.corrigirMateria(m);
  assert.strictEqual(m.subtitulo, '');
  assert.ok(m.texto.startsWith('Abu Dhabi / São José dos Campos: 26 de agosto de 2026'));
}

// G1: se a página normal falhar, deve existir tentativa pela rota Google AMP.
{
  const a = motor.montarAlternativas('https://g1.globo.com/mundo/noticia/2026/08/27/exemplo.ghtml');
  assert.ok(a.some(x => x.includes('/google/amp/mundo/noticia/2026/08/27/exemplo.ghtml')));
}

// BNews AMP: deve tentar também a URL canônica sem /amp.
{
  const a = motor.montarAlternativas('https://www.bnews.com.br/amp/noticias/policia/exemplo.html');
  assert.ok(a.some(x => x.includes('bnews.com.br/noticias/policia/exemplo.html')));
}

// Fator Brasil: fallback preserva título, linha fina, data e corpo.
{
  const html = `<!doctype html><html><head>
    <meta property="og:site_name" content="Portal e TV Fator Brasil">
    <meta property="og:description" content="Linha fina correta com detalhes suficientes para ser reconhecida como subtítulo da matéria.">
  </head><body><main><article>
    <div class="date">27/08/2026</div>
    <h1>Rio Ocean Week 2026 coloca poluição marinha no centro do debate</h1>
    <p>Linha fina correta com detalhes suficientes para ser reconhecida como subtítulo da matéria.</p>
    <p>Primeiro parágrafo real da matéria, com conteúdo suficientemente longo para que o fallback reconheça o início do corpo principal e preserve o texto.</p>
    <p>Segundo parágrafo real da matéria, também suficientemente longo para validar a extração de múltiplos blocos sem depender do Readability.</p>
  </article></main></body></html>`;
  const m = motor.extrairFallbackDoHtml(html, 'https://www.revistafatorbrasil.com.br/2026/08/27/exemplo/');
  assert.strictEqual(m.data, '27/08/2026');
  assert.ok(m.subtitulo.startsWith('Linha fina correta'));
  assert.ok(m.texto.startsWith('Primeiro parágrafo real'));
}

// Zona Militar: não inventar subtítulo quando a página não tiver linha fina.
{
  const html = `<!doctype html><html><head><meta property="og:site_name" content="Zona Militar"></head><body><article>
    <h1>Fragatas Tamandaré e submarinos Riachuelo, as propostas brasileiras</h1>
    <a rel="author">Juan José Roldán</a><time>27 agosto, 2026</time>
    <div class="td-post-content">
      <p>Primeiro parágrafo real da matéria com extensão suficiente para iniciar corretamente a extração do conteúdo principal no fallback específico.</p>
      <p>Segundo parágrafo real da matéria, garantindo que o corpo seja longo o bastante para a validação conservadora do novo motor.</p>
    </div>
  </article></body></html>`;
  const m = motor.extrairFallbackDoHtml(html, 'https://www.zona-militar.com/pt/2026/08/27/exemplo/');
  assert.strictEqual(m.subtitulo, '');
  assert.strictEqual(m.autor, 'Juan José Roldán');
  assert.strictEqual(m.data, '27/08/2026');
}

console.log('OK V1.25.11');
