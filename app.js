// ============================================================
// PREZIOHUNT — app.js
// Substitua AIzaSyCGWbtv2jTkP3pqu5wXhtC8bWuX-0y4Ph4 pela sua chave da API do Google Gemini
// ============================================================
const GEMINI_API_KEY = 'AIzaSyCGWbtv2jTkP3pqu5wXhtC8bWuX-0y4Ph4';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

// ============================================================
// STORAGE
// ============================================================
function loadData() {
  return {
    vagas: JSON.parse(localStorage.getItem('ph_vagas') || '[]'),
    candidatos: JSON.parse(localStorage.getItem('ph_candidatos') || '[]'),
  };
}
function saveVagas(vagas) { localStorage.setItem('ph_vagas', JSON.stringify(vagas)); }
function saveCandidatos(candidatos) { localStorage.setItem('ph_candidatos', JSON.stringify(candidatos)); }

// ============================================================
// QUALIFICATION SYSTEM
// ============================================================
const qualLevels = [
  { max:25,  key:'d1', label:'Desqualificado', stroke:'#EF4444' },
  { max:39,  key:'d2', label:'Baixo',          stroke:'#F97316' },
  { max:59,  key:'d3', label:'Médio',          stroke:'#EAB308' },
  { max:79,  key:'d4', label:'Potencial',      stroke:'#14B8A6' },
  { max:89,  key:'d5', label:'Bom',            stroke:'#22C55E' },
  { max:100, key:'d6', label:'Premium',        stroke:'#2563EB' },
];
function getQual(pct) {
  return qualLevels.find(q => pct <= q.max) || qualLevels[qualLevels.length-1];
}

const stabLevels = [
  { max:1.4, key:'stab-1', label:'Muito instável', stroke:'#EF4444' },
  { max:2.4, key:'stab-2', label:'Instável',       stroke:'#F97316' },
  { max:3.4, key:'stab-3', label:'Estável',        stroke:'#22C55E' },
  { max:4.0, key:'stab-4', label:'Muito estável',  stroke:'#2563EB' },
];
function getStab(score) {
  return stabLevels.find(s => score <= s.max) || stabLevels[stabLevels.length-1];
}

// ============================================================
// PAGE NAVIGATION
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(name)) n.classList.add('active');
  });
  if (name === 'shortlist') renderShortlist();
  if (name === 'vagas') renderVagas();
  if (name === 'comparar') renderComparar();
}

// ============================================================
// VAGAS
// ============================================================
function onVagaChange() {
  const sel = document.getElementById('vagaAtiva');
  localStorage.setItem('ph_vagaAtiva', sel.value);
}

function getVagaAtiva() {
  const id = localStorage.getItem('ph_vagaAtiva');
  const { vagas } = loadData();
  return vagas.find(v => v.id === id && v.ativa) || null;
}

function populateVagaSelect() {
  const { vagas } = loadData();
  const sel = document.getElementById('vagaAtiva');
  const prev = localStorage.getItem('ph_vagaAtiva');
  sel.innerHTML = '<option value="">— selecione —</option>';
  vagas.filter(v => v.ativa).forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.nome;
    if (v.id === prev) opt.selected = true;
    sel.appendChild(opt);
  });
}

function adicionarVaga() {
  const nome = document.getElementById('novaVagaNome').value.trim();
  const jd   = document.getElementById('novaVagaJD').value.trim();
  const local = document.getElementById('novaVagaLocal').value.trim();
  const raio  = document.getElementById('novaVagaRaio').value.trim();
  if (!nome || !jd) { alert('Preencha o nome e o texto da JD.'); return; }
  const { vagas, candidatos } = loadData();
  vagas.push({ id: Date.now().toString(), nome, jd, local, raio, ativa: true, criadoEm: new Date().toLocaleDateString('pt-BR') });
  saveVagas(vagas);
  document.getElementById('novaVagaNome').value = '';
  document.getElementById('novaVagaJD').value = '';
  document.getElementById('novaVagaLocal').value = '';
  document.getElementById('novaVagaRaio').value = '';
  renderVagas();
  populateVagaSelect();
}

function toggleVaga(id, ativa) {
  const { vagas } = loadData();
  const v = vagas.find(v => v.id === id);
  if (v) v.ativa = ativa;
  saveVagas(vagas);
  populateVagaSelect();
  renderVagas();
}

function excluirVaga(id) {
  if (!confirm('Excluir esta vaga? Os candidatos da shortlist desta vaga também serão removidos.')) return;
  let { vagas, candidatos } = loadData();
  vagas = vagas.filter(v => v.id !== id);
  candidatos = candidatos.filter(c => c.vagaId !== id);
  saveVagas(vagas);
  saveCandidatos(candidatos);
  populateVagaSelect();
  renderVagas();
}

function renderVagas() {
  const { vagas, candidatos } = loadData();
  const el = document.getElementById('vagasList');
  if (!vagas.length) { el.innerHTML = '<div style="color:#999;font-size:13px;padding:12px 0">Nenhuma JD cadastrada ainda.</div>'; return; }
  el.innerHTML = vagas.map(v => {
    const count = candidatos.filter(c => c.vagaId === v.id).length;
    return `<div class="vaga-item">
      <div>
        <div class="vaga-nome">${v.nome}</div>
        <div class="vaga-sub">${count} candidato${count!==1?'s':''} · ${v.criadoEm}${v.local?' · '+v.local+(v.raio?' +'+v.raio+'km':''):''}</div>
      </div>
      <div class="vaga-actions">
        <div class="switch-wrap">
          <span class="switch-lbl">${v.ativa?'on':'off'}</span>
          <label class="switch"><input type="checkbox" ${v.ativa?'checked':''} onchange="toggleVaga('${v.id}', this.checked)"><span class="slider"></span></label>
        </div>
        <button class="btn-small" onclick="excluirVaga('${v.id}')">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// INPUT TAB + FILE HANDLING
// ============================================================
let currentInputMode = 'upload';
let cvFileData = null; // { base64, mimeType, name }

function switchInputTab(mode) {
  currentInputMode = mode;
  document.querySelectorAll('.input-tab').forEach((t,i) => {
    t.classList.toggle('active', ['upload','texto'][i] === mode);
  });
  document.getElementById('inputUpload').style.display = mode === 'upload' ? 'block' : 'none';
  document.getElementById('inputTexto').style.display  = mode === 'texto'  ? 'block' : 'none';
}

function handleFileSelect(input) {
  if (input.files[0]) processFile(input.files[0]);
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadArea').classList.remove('drag');
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
}

function processFile(file) {
  const allowed = ['application/pdf','image/jpeg','image/jpg','image/png'];
  if (!allowed.includes(file.type)) {
    alert('Formato não suportado. Use PDF, JPG ou PNG.'); return;
  }
  if (file.size > 10 * 1024 * 1024) {
    alert('Arquivo muito grande. Máximo 10MB.'); return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result.split(',')[1];
    cvFileData = { base64, mimeType: file.type, name: file.name };
    const area = document.getElementById('uploadArea');
    area.classList.add('has-file');
    document.getElementById('uploadFilename').textContent = '✓ ' + file.name;
  };
  reader.readAsDataURL(file);
}

// ============================================================
// ANÁLISE COM GEMINI
// ============================================================
let ultimaAnalise = null;

async function analisarPerfil() {
  const vagaAtiva = getVagaAtiva();
  const status = document.getElementById('analyzeStatus');
  const btn = document.getElementById('btnAnalisar');

  if (!vagaAtiva) { setStatus(status, 'error', 'Selecione uma vaga ativa no menu lateral.'); return; }

  // Validate input
  if (currentInputMode === 'upload' && !cvFileData) {
    setStatus(status, 'error', 'Faça upload do CV antes de analisar.'); return;
  }
  if (currentInputMode === 'texto' && !document.getElementById('perfilTexto').value.trim()) {
    setStatus(status, 'error', 'Cole o texto do perfil antes de analisar.'); return;
  }

  btn.disabled = true;
  setStatus(status, 'loading', '⏳ Analisando com IA — pode levar alguns segundos...');
  document.getElementById('resultCard').style.display = 'none';

  const promptText = buildPrompt(vagaAtiva);

  try {
    let parts;
    if (currentInputMode === 'upload' && cvFileData) {
      parts = [
        { text: promptText },
        { inlineData: { mimeType: cvFileData.mimeType, data: cvFileData.base64 } }
      ];
    } else {
      const texto = document.getElementById('perfilTexto').value.trim();
      parts = [{ text: promptText + '\n\n=== PERFIL DO CANDIDATO ===\n' + texto }];
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erro na API');
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = extrairJSON(raw);
    if (!json) throw new Error('Resposta da IA não reconhecida. Tente novamente.');
    ultimaAnalise = { ...json, vagaId: vagaAtiva.id, vagaNome: vagaAtiva.nome, url: document.getElementById('perfilUrl').value.trim() };
    renderResultado(ultimaAnalise);
    setStatus(status, 'success', '✓ Análise concluída');
  } catch(e) {
    setStatus(status, 'error', '✗ Erro: ' + e.message);
  }
  btn.disabled = false;
}

function buildPrompt(vaga) {
  return `Você é um sistema especialista em recrutamento e seleção. Analise o CV/perfil do candidato em relação à vaga fornecida e responda SOMENTE com um JSON válido, sem texto antes ou depois, sem markdown.

=== JOB DESCRIPTION ===
${vaga.jd}
${vaga.local ? `\nLocalização da vaga: ${vaga.local}${vaga.raio ? ` (raio de ${vaga.raio}km)` : ''}` : ''}

Retorne EXATAMENTE este JSON (sem comentários, sem markdown):
{
  "nome": "nome completo do candidato",
  "cargoAtual": "cargo atual e empresa",
  "localizacao": "cidade e estado do candidato",
  "dentroDoRaio": true,
  "senioridade": "Júnior|Pleno|Sênior|Especialista|Não identificado",
  "area": "área de atuação principal",
  "idiomas": [{"idioma": "Inglês", "nivel": "Intermediário"}],
  "formacao": [{"curso": "Administração", "instituicao": "FUMEC", "periodo": "2014–2018"}],
  "aderencia": 78,
  "aderenciaSub": "6 de 8 critérios",
  "criteriosAtendidos": ["critério 1"],
  "criteriosFaltando": ["critério que falta"],
  "estabilidadeMedia": 3.2,
  "resumo": "Resumo em 2-3 frases cobrindo experiência, senioridade, localização, formação e fit com a vaga.",
  "vinculos": {"Tempo integral": 3, "Autônoma": 1, "Estágio": 1},
  "experiencias": [
    {
      "titulo": "Executiva Comercial",
      "empresa": "Empresa X",
      "vinculo": "Tempo integral",
      "duracao": "3a 2m",
      "meses": 38,
      "similar": true,
      "peso": 1.0,
      "nota": 3,
      "notaLabel": "Estável",
      "dataIncompleta": false,
      "ignorada": false
    }
  ],
  "cargosSimilares": ["Executivo de Vendas", "Consultor Comercial"]
}

REGRAS:
- aderencia: 0–100 com base em quão bem o candidato atende a JD. Se não tiver NENHUMA experiência relevante, use 0–15.
- estabilidadeMedia: média ponderada das notas das experiências SIMILARES (nota 1=até 4m, 2=5–11m, 3=1–3a11m, 4=4a+). Estágio/Freelance peso 0.5, demais peso 1.0.
- similar: true somente se a experiência for relevante para a vaga
- ignorada: true se não tiver nenhuma relação com a área da vaga
- dataIncompleta: true se não foi possível identificar o período
- dentroDoRaio: true se localização compatível com a vaga`;
}

function extrairJSON(raw) {
  try {
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch {} }
    return null;
  }
}

function renderResultado(a) {
  document.getElementById('resultCard').style.display = 'block';
  document.getElementById('resultName').textContent = a.nome || '—';
  document.getElementById('resultCargo').textContent = a.cargoAtual || '—';

  // Tags
  const tagsEl = document.getElementById('resultTags');
  const tags = [];
  if (a.senioridade && a.senioridade !== 'Não identificado') tags.push(`<span class="tag tag-seniority">✦ ${a.senioridade}</span>`);
  if (a.localizacao) tags.push(`<span class="tag tag-location">📍 ${a.localizacao}${a.dentroDoRaio?' — dentro do raio':' — fora do raio'}</span>`);
  if (a.area) tags.push(`<span class="tag tag-area">${a.area}</span>`);
  if (a.idiomas?.length) a.idiomas.forEach(i => tags.push(`<span class="tag tag-lang">🌐 ${i.idioma} — ${i.nivel}</span>`));
  tagsEl.innerHTML = tags.join('');

  // Circles
  const C = 232.5;
  const q = getQual(a.aderencia);
  document.getElementById('circleAdh').setAttribute('stroke-dashoffset', C - (a.aderencia/100)*C);
  document.getElementById('circleAdh').setAttribute('stroke', q.stroke);
  document.getElementById('textAdh').textContent = a.aderencia + '%';
  document.getElementById('textAdhSub').textContent = a.aderenciaSub || '';
  const qualTag = document.getElementById('qualTag');
  qualTag.textContent = q.label; qualTag.className = 'qual-tag qual-' + q.key;

  const stab = a.estabilidadeMedia || 0;
  const s = getStab(stab);
  document.getElementById('circleStab').setAttribute('stroke-dashoffset', C - (stab/4)*C);
  document.getElementById('circleStab').setAttribute('stroke', s.stroke);
  document.getElementById('textStab').textContent = stab.toFixed(1).replace('.',',');
  const stabTag = document.getElementById('stabTag');
  stabTag.textContent = s.label; stabTag.className = 'stab-tag ' + s.key;

  // Summary (incluindo formação)
  let sumText = a.resumo || '—';
  if (a.formacao?.length) {
    sumText += ' Formação: ' + a.formacao.map(f => `${f.curso}${f.instituicao?', '+f.instituicao:''}${f.periodo?' ('+f.periodo+')':''}`).join('; ') + '.';
  }
  document.getElementById('resultSummary').textContent = sumText;

  // Vinculos
  const vEl = document.getElementById('resultVinculos');
  vEl.innerHTML = Object.entries(a.vinculos||{}).map(([k,v]) =>
    `<span class="vinculo-tag"><strong>${v}</strong> ${k}</span>`
  ).join('');

  // Experiências
  const eEl = document.getElementById('resultExps');
  eEl.innerHTML = (a.experiencias||[]).map(e => `
    <div class="exp-item ${e.ignorada?'ignored':''}">
      <div>
        <div class="exp-title">${e.titulo} — ${e.empresa}</div>
        <div class="exp-meta">${e.vinculo}${e.similar?' · cargo similar ✓':''}${e.peso<1?' · peso reduzido':''}${e.ignorada?' · fora do perfil':''}</div>
      </div>
      <div class="exp-right">
        ${e.dataIncompleta
          ? '<div class="exp-incomplete">⚠ data incompleta</div>'
          : `<div class="exp-duration">${e.duracao}</div>`}
        ${!e.ignorada ? `<span class="stab-badge ${getStab(e.nota).key}" style="font-size:9px">${e.nota} — ${e.notaLabel}</span>` : '<span style="font-size:9px;color:#999;font-style:italic">desconsiderada</span>'}
      </div>
    </div>`
  ).join('');

  document.getElementById('resultObs').value = '';
  document.getElementById('saveStatus').textContent = '';
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStatus(el, type, msg) {
  el.textContent = msg; el.className = 'analyze-status ' + type;
}

// ============================================================
// SHORTLIST
// ============================================================
function salvarNaShortlist() {
  if (!ultimaAnalise) return;
  const obs = document.getElementById('resultObs').value.trim();
  const { candidatos } = loadData();
  const existe = candidatos.find(c => c.vagaId === ultimaAnalise.vagaId && c.nome === ultimaAnalise.nome);
  if (existe) {
    existe.obs = obs;
    saveCandidatos(candidatos);
    setStatus(document.getElementById('saveStatus'), 'success', '✓ Observações atualizadas na shortlist');
    return;
  }
  candidatos.push({ ...ultimaAnalise, obs, salvoEm: new Date().toLocaleDateString('pt-BR') });
  saveCandidatos(candidatos);
  renderVagas();
  populateVagaSelect();
  setStatus(document.getElementById('saveStatus'), 'success', '✓ Candidato salvo na shortlist');
}

function renderShortlist() {
  const vagaAtiva = getVagaAtiva();
  const { candidatos } = loadData();
  const sub = document.getElementById('shortlistSubtitle');

  if (!vagaAtiva) {
    sub.textContent = 'Selecione uma vaga ativa para ver os candidatos';
    document.getElementById('shortlistGrid').innerHTML = '<div class="empty-state">Nenhuma vaga ativa selecionada.</div>';
    document.getElementById('shortlistCount').textContent = '';
    return;
  }

  const lista = candidatos
    .filter(c => c.vagaId === vagaAtiva.id)
    .sort((a,b) => b.aderencia - a.aderencia);

  sub.textContent = vagaAtiva.nome;
  document.getElementById('shortlistCount').textContent = `${lista.length} candidato${lista.length!==1?'s':''}`;

  if (!lista.length) {
    document.getElementById('shortlistGrid').innerHTML = '<div class="empty-state">Nenhum candidato salvo para esta vaga ainda.<br>Analise perfis na aba "Analisar Perfil" e salve na shortlist.</div>';
    return;
  }

  document.getElementById('shortlistGrid').innerHTML = `
    <table class="shortlist-table" id="shortlistTableEl">
      <thead>
        <tr>
          <th>#</th>
          <th>Candidato</th>
          <th>Aderência</th>
          <th>Qualificação</th>
          <th>Estabilidade</th>
          <th>Observações</th>
          <th>LinkedIn</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lista.map((c,i) => {
          const q = getQual(c.aderencia);
          const s = getStab(c.estabilidadeMedia||0);
          return `<tr>
            <td class="rank-num">${i+1}</td>
            <td class="shortlist-name-cell">
              <div class="name">${c.nome}</div>
              <div class="sub">${c.cargoAtual||''}</div>
            </td>
            <td><strong style="color:${q.stroke}">${c.aderencia}%</strong></td>
            <td><span class="qual-badge qual-${q.key}">${q.label}</span></td>
            <td>
              <div>${(c.estabilidadeMedia||0).toFixed(1).replace('.',',')}</div>
              <span class="stab-badge ${s.key}" style="font-size:9px">${s.label}</span>
            </td>
            <td class="shortlist-note-cell">${c.obs||'<em style="color:#ccc">sem observações</em>'}</td>
            <td>${c.url?`<a class="li-link" href="${c.url}" target="_blank">↗ LinkedIn</a>`:'—'}</td>
            <td><button class="btn-small" onclick="removerCandidato('${c.vagaId}','${c.nome}')">✕</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function removerCandidato(vagaId, nome) {
  if (!confirm(`Remover ${nome} da shortlist?`)) return;
  let { candidatos } = loadData();
  candidatos = candidatos.filter(c => !(c.vagaId === vagaId && c.nome === nome));
  saveCandidatos(candidatos);
  renderShortlist();
}

// ============================================================
// COMPARAR
// ============================================================
function renderComparar() {
  const vagaAtiva = getVagaAtiva();
  const { candidatos } = loadData();
  const selDiv = document.getElementById('compararSelects');
  const gridDiv = document.getElementById('compararGrid');

  if (!vagaAtiva) {
    selDiv.innerHTML = '<div style="color:#999;font-size:13px">Selecione uma vaga ativa no menu lateral.</div>';
    gridDiv.innerHTML = '';
    return;
  }

  const lista = candidatos.filter(c => c.vagaId === vagaAtiva.id).sort((a,b) => b.aderencia-a.aderencia);
  const opts = '<option value="">— selecione —</option>' + lista.map((c,i) => `<option value="${i}">${c.nome}</option>`).join('');

  selDiv.innerHTML = [0,1,2].map(i => `<select id="cmpSel${i}" onchange="renderCompararCards()">${opts}</select>`).join('');
  gridDiv.innerHTML = '';
}

function renderCompararCards() {
  const vagaAtiva = getVagaAtiva();
  const { candidatos } = loadData();
  const lista = candidatos.filter(c => c.vagaId === vagaAtiva.id).sort((a,b) => b.aderencia-a.aderencia);
  const selecionados = [0,1,2].map(i => {
    const v = document.getElementById('cmpSel'+i)?.value;
    return v !== '' && v !== undefined ? lista[parseInt(v)] : null;
  }).filter(Boolean);

  if (!selecionados.length) { document.getElementById('compararGrid').innerHTML = ''; return; }

  const cols = selecionados.length;
  document.getElementById('compararGrid').innerHTML = `
    <div class="comparar-grid" style="grid-template-columns:repeat(${cols},1fr)">
      ${selecionados.map(c => {
        const q = getQual(c.aderencia);
        const s = getStab(c.estabilidadeMedia||0);
        return `<div class="comparar-card">
          <div class="comparar-name">${c.nome}</div>
          <div style="margin-bottom:12px">${c.url?`<a class="li-link" href="${c.url}" target="_blank">↗ LinkedIn</a>`:''}</div>
          <div class="comparar-row"><span class="comparar-row-label">Aderência</span><span class="comparar-row-val" style="color:${q.stroke}">${c.aderencia}% — ${q.label}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Estabilidade</span><span class="comparar-row-val">${(c.estabilidadeMedia||0).toFixed(1).replace('.',',')} — ${s.label}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Senioridade</span><span class="comparar-row-val">${c.senioridade||'—'}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Localização</span><span class="comparar-row-val">${c.localizacao||'—'}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Formação</span><span class="comparar-row-val">${c.formacao?.map(f=>f.curso).join(', ')||'—'}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Idiomas</span><span class="comparar-row-val">${c.idiomas?.map(i=>i.idioma).join(', ')||'—'}</span></div>
          <div class="comparar-row"><span class="comparar-row-label">Observações</span><span class="comparar-row-val" style="font-style:italic;font-size:11px">${c.obs||'—'}</span></div>
        </div>`;
      }).join('')}
    </div>`;
}

// ============================================================
// EXPORTAR
// ============================================================
function exportarExcel() {
  const vagaAtiva = getVagaAtiva();
  if (!vagaAtiva) { alert('Selecione uma vaga ativa.'); return; }
  const { candidatos } = loadData();
  const lista = candidatos.filter(c => c.vagaId === vagaAtiva.id).sort((a,b) => b.aderencia-a.aderencia);
  if (!lista.length) { alert('Nenhum candidato na shortlist desta vaga.'); return; }

  const headers = ['#','Nome','Cargo Atual','Localização','Aderência (%)','Qualificação','Estabilidade','Nível Estabilidade','Senioridade','Idiomas','Formação','Observações','LinkedIn','Salvo em'];
  const rows = lista.map((c,i) => {
    const q = getQual(c.aderencia);
    const s = getStab(c.estabilidadeMedia||0);
    return [
      i+1, c.nome, c.cargoAtual||'', c.localizacao||'',
      c.aderencia, q.label,
      (c.estabilidadeMedia||0).toFixed(1), s.label,
      c.senioridade||'',
      c.idiomas?.map(i=>i.idioma+' '+i.nivel).join('; ')||'',
      c.formacao?.map(f=>f.curso+(f.instituicao?' - '+f.instituicao:'')).join('; ')||'',
      c.obs||'', c.url||'', c.salvoEm||''
    ];
  });

  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shortlist_${vagaAtiva.nome.replace(/\s+/g,'_')}.csv`;
  a.click();
}

function exportarPDF() {
  const vagaAtiva = getVagaAtiva();
  if (!vagaAtiva) { alert('Selecione uma vaga ativa.'); return; }
  window.print();
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  populateVagaSelect();
  renderVagas();
});
