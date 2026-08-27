const camada = require('./extrator-materia-v1.25.10.js');
const { recuperarCorpoCompletoG1 } = require('./correcoes-g1-v1.25.10.js');
const { ehEstadao, recuperarEstadao } = require('./correcoes-estadao-v1.25.12.js');

const VERSAO = '1.25.12-CORRECOES-FONTES-G1-ESTADAO-PROXY';

function formatar(m) {
  const p = [m.url, '', m.veiculo, '', `*${m.titulo || 'Título não identificado'}*`];
  if (m.subtitulo) p.push('', `_${m.subtitulo}_`);
  p.push('');
  if (m.autor) p.push(m.autor);
  p.push(m.data || 'Data não identificada', '', m.texto || '');
  m.resultado = p.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return m;
}

async function extrairMateria(url) {
  let materia = null;
  let erroBase = null;

  try {
    materia = await camada.extrairMateria(url);
  } catch (e) {
    erroBase = e;
    if (!ehEstadao(url)) throw e;
  }

  if (ehEstadao(url)) {
    try {
      materia = await recuperarEstadao(materia, url, camada);
    } catch (e) {
      if (!materia || !materia.texto) throw (erroBase || e);
    }
  }

  if (materia) await recuperarCorpoCompletoG1(materia, camada);

  if (!materia || !materia.texto) throw new Error('O corpo da matéria ficou vazio após as correções.');
  return formatar(materia);
}

module.exports = {
  ...camada,
  VERSAO,
  extrairMateria
};
