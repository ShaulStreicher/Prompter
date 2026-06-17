// ─── Facts page — self-contained logic ───────────────────────────────────────
'use strict';

const FACTS_KEY = 'promptbuilder_facts';

const PERSONA_TAGS = ['Non-technical','Power user','Decision maker','End user','Developer','Executive','Student','Researcher'];

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function syncSlider(el) {
  el.style.setProperty('--pct', el.value + '%');
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── State ───────────────────────────────────────────────────────────────────
let factsState = {
  facts: [],
  docs: [],
  persona: { description: '', techLevel: '50', goals: '', painPoints: '', tags: [] },
  glossary: [],
};

function loadFactsState() {
  try {
    const raw = localStorage.getItem(FACTS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      factsState = {
        facts: [],
        docs: [],
        persona: { description:'', techLevel:'50', goals:'', painPoints:'', tags:[] },
        glossary: [],
        ...saved,
        persona: { description:'', techLevel:'50', goals:'', painPoints:'', tags:[], ...(saved.persona||{}) },
      };
    }
  } catch(e) {}
}

function saveFactsState() {
  try { localStorage.setItem(FACTS_KEY, JSON.stringify(factsState)); } catch(e) {}
}

// ─── Render functions ─────────────────────────────────────────────────────────
function renderFactsList() {
  const container = document.getElementById('facts-list');
  if (!container) return;
  container.innerHTML = factsState.facts.map((f,i) => `
    <div class="facts-kv-item" data-idx="${i}">
      <input class="facts-key"   type="text" placeholder="Key (e.g. CEO Name)"      value="${esc(f.key||'')}" data-idx="${i}">
      <input class="facts-value" type="text" placeholder="Value (e.g. John Smith)"  value="${esc(f.value||'')}" data-idx="${i}">
      <button class="remove-btn facts-remove" data-idx="${i}">×</button>
    </div>`).join('');

  container.querySelectorAll('.facts-key, .facts-value').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      if (!factsState.facts[idx]) factsState.facts[idx] = { key:'', value:'' };
      if (inp.classList.contains('facts-key')) factsState.facts[idx].key = inp.value;
      else factsState.facts[idx].value = inp.value;
      saveFactsState();
      renderFactsPreview();
    });
  });
  container.querySelectorAll('.facts-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      factsState.facts.splice(parseInt(btn.dataset.idx), 1);
      saveFactsState();
      renderFactsList();
      renderFactsPreview();
    });
  });
}

function renderDocsList() {
  const container = document.getElementById('docs-list');
  if (!container) return;
  container.innerHTML = factsState.docs.map((d,i) => `
    <div class="docs-item" data-idx="${i}">
      <div class="docs-item-header">
        <input class="docs-title" type="text" placeholder="Document title (e.g. Pricing FAQ)" value="${esc(d.title||'')}" data-idx="${i}">
        <button class="remove-btn docs-remove" data-idx="${i}">×</button>
      </div>
      <textarea class="docs-content" placeholder="Paste reference content here..." data-idx="${i}" rows="5">${esc(d.content||'')}</textarea>
    </div>`).join('');

  container.querySelectorAll('.docs-title').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.idx);
      if (!factsState.docs[idx]) factsState.docs[idx] = { title:'', content:'' };
      factsState.docs[idx].title = inp.value;
      saveFactsState(); renderFactsPreview();
    });
  });
  container.querySelectorAll('.docs-content').forEach(ta => {
    ta.addEventListener('input', () => {
      const idx = parseInt(ta.dataset.idx);
      if (!factsState.docs[idx]) factsState.docs[idx] = { title:'', content:'' };
      factsState.docs[idx].content = ta.value;
      saveFactsState(); renderFactsPreview();
    });
  });
  container.querySelectorAll('.docs-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      factsState.docs.splice(parseInt(btn.dataset.idx), 1);
      saveFactsState(); renderDocsList(); renderFactsPreview();
    });
  });
}

function renderFactsPersonaView() {
  const el = document.getElementById('facts-persona-view');
  if (!el) return;
  const p = factsState.persona;
  const tagsHtml = PERSONA_TAGS.map(t =>
    `<span class="tag ${(p.tags||[]).includes(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</span>`
  ).join('');
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <label>Who is the AI talking to?</label>
        <textarea id="fp-description" rows="3" placeholder="e.g. A mid-level marketing manager at a B2B SaaS company...">${esc(p.description)}</textarea>
      </div>
      <div class="tone-row">
        <div class="tone-slider-row">
          <span>Beginner</span>
          <input type="range" id="fp-tech" min="0" max="100" value="${p.techLevel||50}" style="--pct:${p.techLevel||50}%">
          <span>Expert</span>
        </div>
      </div>
      <div>
        <label>Goals</label>
        <textarea id="fp-goals" rows="2" placeholder="e.g. Increase qualified leads, reduce time spent on email...">${esc(p.goals)}</textarea>
      </div>
      <div>
        <label>Pain points</label>
        <textarea id="fp-pain" rows="2" placeholder="e.g. Struggles with technical jargon, tight deadlines...">${esc(p.painPoints)}</textarea>
      </div>
      <div>
        <label>User type tags</label>
        <div class="tag-picker" id="fp-tags">${tagsHtml}</div>
      </div>
    </div>`;

  document.getElementById('fp-description').addEventListener('input', e => { factsState.persona.description = e.target.value; saveFactsState(); renderFactsPreview(); });
  document.getElementById('fp-goals').addEventListener('input', e => { factsState.persona.goals = e.target.value; saveFactsState(); renderFactsPreview(); });
  document.getElementById('fp-pain').addEventListener('input', e => { factsState.persona.painPoints = e.target.value; saveFactsState(); renderFactsPreview(); });
  const techEl = document.getElementById('fp-tech');
  techEl.addEventListener('input', () => { factsState.persona.techLevel = techEl.value; syncSlider(techEl); saveFactsState(); renderFactsPreview(); });
  document.querySelectorAll('#fp-tags .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('active');
      factsState.persona.tags = [...document.querySelectorAll('#fp-tags .tag.active')].map(t => t.dataset.tag);
      saveFactsState(); renderFactsPreview();
    });
  });
}

function renderGlossaryItem(idx, g) {
  return `<div class="glossary-item rule-item" data-idx="${idx}">
    <div style="display:flex;flex-direction:column;gap:5px;flex:1">
      <input class="glossary-term" type="text" placeholder="Term (e.g. MRR)" value="${esc(g.term)}" style="font-weight:600">
      <input class="glossary-def"  type="text" placeholder="Definition (e.g. Monthly Recurring Revenue)" value="${esc(g.definition)}">
    </div>
    <button class="remove-btn" data-idx="${idx}">×</button>
  </div>`;
}

function renderFactsGlossaryView() {
  const el = document.getElementById('facts-glossary-view');
  if (!el) return;
  const items = (factsState.glossary||[]).map((g,i) => renderGlossaryItem(i, g)).join('');
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div id="facts-glossary-list" style="display:flex;flex-direction:column;gap:8px;">${items}</div>
      <button class="add-btn" id="add-facts-glossary-item">+ Add term</button>
    </div>`;

  bindFactsGlossaryList();
  document.getElementById('add-facts-glossary-item').addEventListener('click', () => {
    factsState.glossary.push({ term: '', definition: '' });
    const idx = factsState.glossary.length - 1;
    const list = document.getElementById('facts-glossary-list');
    const div = document.createElement('div');
    div.innerHTML = renderGlossaryItem(idx, { term: '', definition: '' });
    list.appendChild(div.firstElementChild);
    bindFactsGlossaryItem(list.lastElementChild, idx);
    list.lastElementChild.querySelector('.glossary-term').focus();
    saveFactsState(); renderFactsPreview();
  });
}

function bindFactsGlossaryList() {
  document.querySelectorAll('#facts-glossary-list .glossary-item').forEach((item, idx) => bindFactsGlossaryItem(item, idx));
}

function bindFactsGlossaryItem(item, idx) {
  item.querySelector('.remove-btn').addEventListener('click', () => {
    item.remove();
    factsState.glossary = [...document.querySelectorAll('#facts-glossary-list .glossary-item')].map(el => ({
      term: el.querySelector('.glossary-term')?.value||'',
      definition: el.querySelector('.glossary-def')?.value||'',
    }));
    saveFactsState(); renderFactsPreview();
  });
  item.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      if (!factsState.glossary[idx]) factsState.glossary[idx] = { term:'', definition:'' };
      if (inp.classList.contains('glossary-term')) factsState.glossary[idx].term = inp.value;
      else factsState.glossary[idx].definition = inp.value;
      saveFactsState(); renderFactsPreview();
    });
  });
}

function buildFactsOutput() {
  const lines = [];

  const validFacts = factsState.facts.filter(f => f.key || f.value);
  if (validFacts.length) {
    lines.push('── FACTS ──────────────────────────────────────');
    validFacts.forEach(f => lines.push(`${f.key}: ${f.value}`));
    lines.push('');
  }

  const p = factsState.persona || {};
  if ((p.description||'').trim() || (p.tags||[]).length) {
    const tech = parseInt(p.techLevel||50);
    lines.push('── PERSONA ─────────────────────────────────────');
    if (p.description) lines.push(p.description.trim());
    lines.push(`Technical level: ${tech<30?'Beginner':tech>70?'Expert':'Intermediate'}`);
    if (p.goals) lines.push(`Goals: ${p.goals.trim()}`);
    if (p.painPoints) lines.push(`Pain points: ${p.painPoints.trim()}`);
    if ((p.tags||[]).length) lines.push(`User type: ${p.tags.join(', ')}`);
    lines.push('');
  }

  const glossary = (factsState.glossary||[]).filter(g => g.term);
  if (glossary.length) {
    lines.push('── GLOSSARY ────────────────────────────────────');
    glossary.forEach(g => lines.push(`${g.term}: ${g.definition}`));
    lines.push('');
  }

  const validDocs = factsState.docs.filter(d => d.title || d.content);
  validDocs.forEach(d => {
    lines.push(`── ${(d.title||'REFERENCE DOCUMENT').toUpperCase()} ${'─'.repeat(Math.max(0,44-(d.title||'').length))}`);
    lines.push(d.content || '');
    lines.push('');
  });

  return lines.join('\n').trim() || '(Add facts and reference documents on the left)';
}

function renderFactsPreview() {
  const out = buildFactsOutput();
  const el = document.getElementById('facts-output');
  if (el) el.textContent = out;
  const charEl = document.getElementById('facts-char-count');
  if (charEl) charEl.textContent = out.length.toLocaleString();
  const tokEl = document.getElementById('facts-token-count');
  if (tokEl) tokEl.textContent = Math.round(out.length / 4).toLocaleString();
}

function copyFactsOutput() {
  navigator.clipboard.writeText(buildFactsOutput()).then(() => {
    const fb = document.getElementById('facts-copy-feedback');
    if (fb) {
      fb.classList.add('show');
      setTimeout(() => fb.classList.remove('show'), 2000);
    }
  });
}

function downloadFactsOutput() {
  triggerDownload(new Blob([buildFactsOutput()], { type:'text/plain' }), 'facts-and-context.txt');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFactsState();
  renderFactsList();
  renderDocsList();
  renderFactsPersonaView();
  renderFactsGlossaryView();
  renderFactsPreview();

  document.getElementById('btn-facts-copy')?.addEventListener('click', copyFactsOutput);
  document.getElementById('btn-facts-download')?.addEventListener('click', downloadFactsOutput);

  document.getElementById('btn-add-fact')?.addEventListener('click', () => {
    factsState.facts.push({ key:'', value:'' });
    saveFactsState(); renderFactsList(); renderFactsPreview();
    const inputs = document.querySelectorAll('#facts-list .facts-key');
    inputs[inputs.length-1]?.focus();
  });

  document.getElementById('btn-add-doc')?.addEventListener('click', () => {
    factsState.docs.push({ title:'', content:'' });
    saveFactsState(); renderDocsList(); renderFactsPreview();
    const inputs = document.querySelectorAll('#docs-list .docs-title');
    inputs[inputs.length-1]?.focus();
  });

  document.getElementById('facts-canvas-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    document.querySelectorAll('#facts-canvas-tabs [data-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.facts-tab-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`facts-panel-${tab.dataset.tab}`);
    if (panel) panel.style.display = '';
  });
});
