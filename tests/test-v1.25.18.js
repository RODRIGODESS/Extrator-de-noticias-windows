const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(raiz, 'main.js'), 'utf8');
const runtime = fs.readFileSync(path.join(raiz, 'engine', 'extrator-materia-v1.25.18-runtime.js'), 'utf8');

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

exigir(/spellcheck:\s*true/.test(main), 'BrowserWindow deve manter spellcheck habilitado.');
exigir(/setSpellCheckerEnabled\(true\)/.test(main), 'Corretor nativo deve ser habilitado.');
exigir(/setSpellCheckerLanguages\(\[escolhido\]\)/.test(main), 'Idioma PT-BR deve ser configurado quando disponível.');
exigir(/availableSpellCheckerLanguages/.test(main), 'Idiomas disponíveis devem ser validados antes da configuração.');
exigir(/dictionarySuggestions/.test(main), 'Menu contextual deve oferecer sugestões ortográficas.');
exigir(/replaceMisspelling/.test(main), 'Sugestões devem substituir a palavra incorreta.');
exigir(/addWordToSpellCheckerDictionary/.test(main), 'Deve existir opção de adicionar palavra ao dicionário.');
exigir(/resultado\.spellcheck\s*=\s*true/.test(main), 'Área de conteúdo deve ter spellcheck habilitado.');
exigir(/resultado\.lang\s*=\s*['"]pt-BR['"]/.test(main), 'Área de conteúdo deve declarar idioma pt-BR.');
exigir(/1\.25\.18-CORRETOR-ORTOGRAFICO-PTBR/.test(runtime), 'Runtime deve preservar a camada V1.25.18.');

console.log('OK - V1.25.18 preserva o corretor ortográfico PT-BR com sugestões e dicionário.');
