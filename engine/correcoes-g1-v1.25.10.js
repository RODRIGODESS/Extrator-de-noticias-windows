const { JSDOM } = require('jsdom');

function norm(v = '') {
  return String(v || '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
}

function host(url = '') {
  try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ''; }
}

function palavras(t = '') {
  return new Set(
    norm(t)
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]{4,}/g) || []
  );
}

function semelhanca(a = '', b = '') {
  const A = palavras(a);
  const B = palavras(b);
  if (A.size < 4 || B.size < 4) return 0;
  let inter = 0;
  for (const p of A) if (B.has(p)) inter++;
  return inter / Math.min(A.size, B.size);
}

function ehRuidoG1(texto = '') {
  const t = norm(texto);
  if (!t) return true;

  if (/^(?:agora\s+no\s+g1|mais\s+do\s+g1|vídeos?\s+em\s+alta\s+no\s+g1|videos?\s+em\s+alta\s+no\s+g1)$/i.test(t)) return true;
  if (/^(?:✅\s*)?clique\s+aqui\s+para\s+seguir\s+o\s+canal\s+do\s+g1\b/i.test(t)) return true;
  if (/^(?:veja|confira|leia)\s+(?:tamb[eé]m|mais)\b/i.test(t) && t.length < 220) return true;
  if (/^(?:foto|cr[eé]dito)\s*:/i.test(t)) return true;
  if (/\s[—–-]\s*foto\s*:/i.test(t)) return true;
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(t)) return true;
  if (/^(?:compartilhe|publicidade)$/i.test(t)) return true;
  return false;
}

function coletarBlocosG1(document, materia = {}) {
  // O G1 mantém o texto jornalístico em content-text__container e os
  // intertítulos em content-intertitle. Coletamos diretamente esses blocos
  // para não depender do ponto em que o Readability encontra módulos como
  // "Agora no g1" no meio do DOM.
  const elementos = [...document.querySelectorAll(
    'p.content-text__container, .content-text__container, .content-intertitle h2, .content-intertitle h3'
  )];

  const titulo = norm(materia.titulo);
  const subtitulo = norm(materia.subtitulo);
  const meta = new Set([titulo, subtitulo, norm(materia.autor), norm(materia.data)].filter(Boolean).map(x => x.toLocaleLowerCase('pt-BR')));
  const saida = [];
  const vistos = new Set();

  for (const el of elementos) {
    // Quando o seletor amplo pega um contêiner e também um descendente com o
    // mesmo texto, preferimos o nó mais específico para não duplicar.
    if (el.children.length > 8 && !/^H[23]$/.test(el.tagName || '')) continue;

    const t = norm(el.textContent);
    if (!t || ehRuidoG1(t)) continue;
    if (meta.has(t.toLocaleLowerCase('pt-BR'))) continue;

    const intertitulo = /^H[23]$/.test(el.tagName || '') || el.closest?.('.content-intertitle');
    if (!intertitulo && t.length < 45) continue;
    if (intertitulo && t.length < 4) continue;

    const chave = t.toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(t);
  }

  return saida;
}

function corpoG1PareceMelhor(atual = '', blocos = []) {
  if (blocos.length < 3) return false;
  const textoNovo = blocos.join('\n\n');
  const atuais = String(atual || '').split(/\n\n+/).map(norm).filter(Boolean);
  if (!atuais.length) return textoNovo.length >= 180;

  let sobrepostos = 0;
  for (const cand of blocos) {
    if (atuais.some(a => semelhanca(cand, a) >= 0.52 || a.includes(cand) || cand.includes(a))) {
      sobrepostos++;
    }
  }

  // Exige evidência de que estamos olhando a mesma matéria. Isso evita trocar
  // o corpo por cards/recomendações do portal.
  const mesmaMateria = sobrepostos >= Math.min(2, Math.max(1, atuais.length));
  if (!mesmaMateria) return false;

  // Aceitamos o corpo oficial mesmo quando ele é um pouco menor, pois o texto
  // anterior pode conter resumo automático, card ou legenda. Para substituir,
  // ele precisa ter tamanho jornalístico plausível.
  return textoNovo.length >= Math.max(220, Math.floor(String(atual || '').length * 0.60));
}

async function recuperarCorpoCompletoG1(materia, base) {
  const h = host(materia?.url);
  if (h !== 'g1.globo.com' && h !== 'ge.globo.com') return materia;

  try {
    const cfg = base.carregarConfigProxy();
    const resposta = await base.fetchComRetry(materia.url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml',
        'Connection': 'close'
      }
    }, {
      timeoutMs: Math.max(5000, Number(cfg.TIMEOUT_MS) || 45000),
      tentativas: 2
    });

    if (!resposta.ok) return materia;
    const html = await resposta.text();
    const document = new JSDOM(html, { url: materia.url }).window.document;
    const blocos = coletarBlocosG1(document, materia);

    if (corpoG1PareceMelhor(materia.texto, blocos)) {
      materia.texto = blocos.join('\n\n').trim();
    }
  } catch (_) {
    // Se a segunda leitura falhar, preserva integralmente o resultado do motor
    // base em vez de transformar uma falha de rede em falha de extração.
  }

  return materia;
}

module.exports = {
  recuperarCorpoCompletoG1,
  coletarBlocosG1,
  corpoG1PareceMelhor,
  ehRuidoG1,
  semelhanca
};
