const assert = require('assert');
const corretor = require('../engine/corretor-rigido-ptbr-v1.25.19.js');

(async () => {
  const texto = 'A materia foi publicada com uma noticia sobre a Marinha. O marinhe revisou o texto.';
  const issues = await corretor.revisarTexto(texto);
  const palavras = issues.map(i => String(i.palavra || '').toLowerCase());

  assert(palavras.includes('marinhe'), 'O modo rígido deve marcar "marinhe" como suspeito.');
  assert(palavras.includes('materia'), 'O modo rígido deve marcar "materia" sem acento.');
  assert(palavras.includes('noticia'), 'O modo rígido deve marcar "noticia" sem acento.');

  const materia = issues.find(i => String(i.palavra).toLowerCase() === 'materia');
  const noticia = issues.find(i => String(i.palavra).toLowerCase() === 'noticia');

  assert(Array.isArray(materia?.sugestoes), 'A revisão deve retornar sugestões para materia.');
  assert(Array.isArray(noticia?.sugestoes), 'A revisão deve retornar sugestões para noticia.');

  console.log('OK - V1.25.19 marca marinhe e reforça acentuação PT-BR.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
