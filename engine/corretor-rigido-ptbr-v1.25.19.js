let cspellModulePromise = null;

function carregarCSpell() {
  if (!cspellModulePromise) cspellModulePromise = import('cspell-lib');
  return cspellModulePromise;
}

function caminhoDicionarioPtBr() {
  return require.resolve('cspell-dict-pt-br/cspell-ext.json');
}

function normalizarSugestoes(issue) {
  const sugestoes = Array.isArray(issue?.suggestions) ? issue.suggestions : [];
  return [...new Set(sugestoes.map(s => String(s || '').trim()).filter(Boolean))].slice(0, 8);
}

function ignorarIssue(issue) {
  const palavra = String(issue?.text || '').trim();
  if (!palavra) return true;
  if (palavra.length <= 1) return true;
  if (/^https?:\/\//i.test(palavra)) return true;
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(palavra)) return true;
  if (/^[A-ZÀ-Ý0-9][A-ZÀ-Ý0-9._/-]{1,}$/.test(palavra)) return true;
  return false;
}

async function revisarTexto(texto = '') {
  const conteudo = String(texto || '');
  if (!conteudo.trim()) return [];

  const { spellCheckDocument } = await carregarCSpell();

  const resultado = await spellCheckDocument(
    {
      uri: 'file:///texto-materia.txt',
      text: conteudo,
      languageId: 'plaintext',
      locale: 'pt_BR'
    },
    {
      generateSuggestions: true,
      noConfigSearch: true,
      numSuggestions: 8,
      unknownWords: 'report-all'
    },
    {
      import: [caminhoDicionarioPtBr()],
      language: 'pt,pt_BR',
      locale: 'pt_BR',
      dictionaries: ['pt-br'],
      caseSensitive: true,
      allowCompoundWords: false,
      unknownWords: 'report-all',
      suggestionsTimeout: 2500,
      flagWords: [
        'marinhe->marinha, marinheiro'
      ]
    }
  );

  return (resultado?.issues || [])
    .filter(issue => !ignorarIssue(issue))
    .map(issue => {
      const palavra = String(issue?.text || '');
      const offset = Number.isFinite(issue?.offset) ? issue.offset : 0;
      const length = Number.isFinite(issue?.length) ? issue.length : palavra.length;
      return {
        palavra,
        offset,
        length,
        sugestoes: normalizarSugestoes(issue)
      };
    });
}

module.exports = {
  revisarTexto,
  caminhoDicionarioPtBr,
  ignorarIssue
};
