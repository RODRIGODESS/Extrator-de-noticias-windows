const assert = require('assert');
const corretor = require('../engine/corretor-rigido-ptbr-v1.25.19.js');

(async () => {
  const texto = 'A materia foi publicada com uma noticia. A analise citou o numero do periodo e tambem apontou o marinhe.';
  const issues = await corretor.revisarTexto(texto);
  const palavras = issues.map(i => String(i.palavra || '').toLocaleLowerCase('pt-BR'));

  for (const esperada of ['marinhe', 'materia', 'noticia', 'analise', 'numero', 'periodo', 'tambem']) {
    assert(palavras.includes(esperada), `O modo rígido deve marcar "${esperada}".`);
  }

  const porPalavra = palavra => issues.find(i => String(i.palavra || '').toLocaleLowerCase('pt-BR') === palavra);
  assert(porPalavra('materia')?.sugestoes?.includes('matéria'), 'Deve sugerir "matéria" para materia.');
  assert(porPalavra('noticia')?.sugestoes?.includes('notícia'), 'Deve sugerir "notícia" para noticia.');
  assert(porPalavra('analise')?.sugestoes?.includes('análise'), 'Deve sugerir "análise" para analise.');
  assert(porPalavra('numero')?.sugestoes?.includes('número'), 'Deve sugerir "número" para numero.');
  assert(porPalavra('periodo')?.sugestoes?.includes('período'), 'Deve sugerir "período" para periodo.');
  assert(porPalavra('tambem')?.sugestoes?.includes('também'), 'Deve sugerir "também" para tambem.');
  assert(porPalavra('marinhe')?.sugestoes?.length, 'Deve sugerir correção para marinhe.');

  console.log('OK - V1.25.19 marca grafia suspeita e reforça acentuação PT-BR em modo rígido.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
