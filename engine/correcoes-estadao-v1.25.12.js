const { JSDOM } = require('jsdom');

function norm(v = '') {
  return String(v || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim();
}

function ehEstadao(url = '') {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === 'estadao.com.br' || h.endsWith('.estadao.com.br');
  } catch (_) { return false; }
}

function dataBR(v = '') {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function autorNome(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.map(autorNome).filter(Boolean).join(', ');
  if (typeof v === 'string') return norm(v);
  if (typeof v === 'object') return norm(v.name || v.alternateName || '');
  return '';
}

function coletarObjetos(v, out = []) {
  if (!v) return out;
  if (Array.isArray(v)) { v.forEach(x => coletarObjetos(x, out)); return out; }
  if (typeof v !== 'object') return out;
  out.push(v);
  if (v['@graph']) coletarObjetos(v['@graph'], out);
  return out;
}

function artigoJsonLd(doc) {
  const candidatos = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(s.textContent || '{}');
      coletarObjetos(parsed, candidatos);
    } catch (_) {}
  }
  return candidatos.find(o => {
    const t = Array.isArray(o['@type']) ? o['@type'].join(' ') : String(o['@type'] || '');
    return /NewsArticle|Article|ReportageNewsArticle/i.test(t) && norm(o.articleBody || '').length >= 120;
  }) || null;
}

function corpoDom(doc) {
  const seletores = [
    '[data-testid="article-body"]', '[data-testid*="article-body"]',
    'article', '.article-content', '.content-article', '.news-body', '.content-body'
  ];
  let melhor = '';
  for (const sel of seletores) {
    for (const raiz of doc.querySelectorAll(sel)) {
      const blocos = [...raiz.querySelectorAll('p, h2, h3')]
        .map(el => norm(el.textContent || ''))
        .filter(t => t.length >= 35)
        .filter(t => !/^(publicidade|leia também|veja também|saiba mais|assine)/i.test(t));
      const texto = blocos.join('\n\n').trim();
      if (texto.length > melhor.length) melhor = texto;
    }
  }
  return melhor;
}

async function buscarPagina(url, camada) {
  const cfg = camada.carregarConfigProxy();
  const r = await camada.fetchComRetry(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  }, { timeoutMs: Math.max(5000, Number(cfg.TIMEOUT_MS) || 45000), tentativas: 3 });
  if (!r.ok) throw new Error(`Estadão respondeu HTTP ${r.status}.`);
  return await r.text();
}

async function recuperarEstadao(materia, url, camada) {
  if (!ehEstadao(url)) return materia;
  const html = await buscarPagina(url, camada);
  const doc = new JSDOM(html, { url }).window.document;
  const ld = artigoJsonLd(doc);
  const corpoLD = norm(ld?.articleBody || '');
  const corpoHTML = corpoDom(doc);
  const candidato = corpoHTML.length > corpoLD.length ? corpoHTML : corpoLD;

  if (!materia) materia = { url };
  materia.url = materia.url || url;
  materia.veiculo = norm(materia.veiculo) || 'Estadão';
  materia.titulo = norm(materia.titulo) || norm(ld?.headline || doc.querySelector('h1')?.textContent || '');
  materia.subtitulo = norm(materia.subtitulo) || norm(ld?.description || '');
  materia.autor = norm(materia.autor) || autorNome(ld?.author);
  materia.data = norm(materia.data) || dataBR(ld?.datePublished || '');

  const atual = norm(materia.texto || '');
  if (candidato.length >= 120 && (atual.length < 500 || candidato.length > atual.length * 1.25)) {
    materia.texto = candidato;
  }
  if (!norm(materia.texto || '')) throw new Error('O Estadão não disponibilizou corpo legível no HTML/JSON-LD desta página.');
  return materia;
}

module.exports = { ehEstadao, recuperarEstadao };
