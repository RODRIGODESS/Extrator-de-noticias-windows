const assert = require('assert');
const motor = require('../engine/extrator-materia-v1.25.16-runtime.js');

const url = 'https://valor.globo.com/brasil/noticia/2026/08/28/proposta-para-previdencia-preve-mudanca-estrutural.ghtml';

assert.ok(/^1\.25\.16-/.test(motor.VERSAO), 'Versão ativa deve ser V1.25.16.');
assert.strictEqual(motor.ehValor(url), true, 'URL do Valor deve ser reconhecida.');
assert.strictEqual(motor.rotasValor(url).length, 2, 'Valor deve testar URL normal e AMP de forma independente.');

(async () => {
  const parcial = {
    url,
    veiculo: 'Valor Econômico',
    titulo: 'Proposta para Previdência prevê mudança estrutural',
    subtitulo: 'Plano de especialistas inclui idade mínima de 67 anos e alterações em modalidade de benefícios e regime financeiro',
    autor: '',
    data: '28/08/2026',
    texto: 'Este é um primeiro parágrafo válido entregue publicamente pelo site. '.repeat(7).trim()
  };

  let chamadas = 0;
  const resultado = await motor.recuperarValorPublico(url, {
    extrairDireto: async (rota) => {
      chamadas++;
      if (rota === url) return { ...parcial };
      throw new Error('HTTP 403 na rota AMP');
    },
    baixarHtml: async () => {
      throw new Error('HTTP 403 no HTML complementar');
    }
  });

  assert.ok(chamadas >= 2, 'As duas rotas devem ser testadas quando o corpo está curto.');
  assert.strictEqual(resultado.titulo, parcial.titulo, 'Título válido já obtido não pode ser descartado.');
  assert.ok(String(resultado.texto || '').includes('primeiro parágrafo válido'), 'Conteúdo parcial válido deve sobreviver à falha da rota complementar.');

  const html = `<!doctype html><html><head>
    <meta property="og:site_name" content="Valor Econômico">
    <meta property="og:title" content="Título de teste do Valor">
    <meta property="og:description" content="Subtítulo público de teste com informações suficientes para a matéria.">
    <meta property="article:published_time" content="2026-08-28T08:00:00-03:00">
  </head><body><main><article><h1>Título de teste do Valor</h1>
    <p>${'Parágrafo público completo da matéria para teste de recuperação pelo HTML. '.repeat(5)}</p>
    <p>${'Segundo parágrafo público completo da matéria para confirmar a seleção do corpo. '.repeat(5)}</p>
    <p>${'Terceiro parágrafo público completo da matéria, sem área de login ou assinatura. '.repeat(5)}</p>
  </article></main></body></html>`;

  const recuperadoHtml = await motor.recuperarValorPublico(url, {
    extrairDireto: async () => { throw new Error('parser indisponível'); },
    baixarHtml: async (rota) => rota === url ? html : (() => { throw new Error('AMP indisponível'); })()
  });

  assert.ok(String(recuperadoHtml.texto || '').length > 600, 'Fallback HTML público deve recuperar corpo quando disponível.');
  assert.ok(/Título de teste do Valor/i.test(recuperadoHtml.titulo || ''), 'Fallback HTML deve preservar título público.');

  let bloqueado = false;
  try {
    await motor.recuperarValorPublico(url, {
      extrairDireto: async () => { throw new Error('HTTP 403'); },
      baixarHtml: async () => { throw new Error('HTTP 403'); }
    });
  } catch (e) {
    bloqueado = /sessão autenticada autorizada/i.test(e.message);
  }
  assert.strictEqual(bloqueado, true, 'Quando todas as rotas retornam 403, deve haver mensagem clara sobre sessão autenticada autorizada.');

  console.log('OK - V1.25.16 preserva resultado válido e trata falhas independentes das rotas do Valor.');
})().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
