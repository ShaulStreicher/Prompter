// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'promptbuilder_autosave';
const SAVES_KEY    = 'promptbuilder_saves';

const TASK_TYPES = [
  { value: 'analyze',   label: 'Analyze / Evaluate' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'generate',  label: 'Generate / Create' },
  { value: 'rewrite',   label: 'Rewrite / Edit' },
  { value: 'classify',  label: 'Classify / Categorize' },
  { value: 'extract',   label: 'Extract information' },
  { value: 'answer',    label: 'Answer Q&A' },
  { value: 'brainstorm',label: 'Brainstorm ideas' },
  { value: 'translate', label: 'Translate' },
  { value: 'code',      label: 'Write / Review code' },
  { value: 'plan',      label: 'Plan / Outline' },
  { value: 'custom',    label: 'Custom' },
];

const TASK_STARTERS = {
  analyze:   'Analyze the following and provide a structured evaluation with strengths, weaknesses, and recommendations.',
  summarize: 'Summarize the provided content into key points, preserving all critical information.',
  generate:  'Generate a high-quality, original piece of content based on the specifications provided.',
  rewrite:   'Rewrite the following content to improve clarity, tone, and engagement while preserving the original meaning.',
  classify:  'Classify the input into the appropriate category and explain your reasoning.',
  extract:   'Extract the following specific information from the provided text.',
  answer:    "Answer the user's questions accurately and concisely, citing your reasoning.",
  brainstorm:'Generate a diverse list of creative ideas. Include unconventional and innovative approaches.',
  translate: 'Translate the provided content accurately while preserving tone and nuance.',
  code:      'Write clean, well-documented, production-ready code that fulfills the given requirements.',
  plan:      'Create a detailed, actionable plan or outline with clear milestones and steps.',
};

const MODEL_HINTS = {
  claude:  'Claude best practices: use XML tags like &lt;context&gt;, &lt;instructions&gt;, &lt;examples&gt;. Be direct. Use system prompt for role, human turn for task.',
  gpt:     'GPT best practices: use clear delimiters like ### or """. System message for role &amp; rules. Be explicit about format.',
  gemini:  'Gemini best practices: clear instruction at the top. Use structured headers. Gemini responds well to step-by-step breakdowns.',
  llama:   'Llama best practices: use [INST] ... [/INST] (Llama 2) or &lt;|system|&gt; tags (Llama 3). Keep system prompt focused.',
  mistral: 'Mistral best practices: similar to Llama. Use clear delimiters. Be direct with your task description.',
  generic: 'Generic prompt: structure your prompt with clearly labeled sections. Works across most instruction-tuned models.',
};

const MODEL_LABELS = {
  claude: 'Claude', gpt: 'GPT-4', gemini: 'Gemini',
  llama: 'Llama', mistral: 'Mistral', generic: 'Generic',
};

const ROLE_PRESETS = [
  { label: 'Software Engineer', value: 'You are an expert software engineer with deep knowledge of modern web development, system design, and best practices.' },
  { label: 'Data Scientist',    value: 'You are a senior data scientist and machine learning expert with expertise in statistics, Python, and ML frameworks.' },
  { label: 'Copywriter',        value: 'You are a professional copywriter and content strategist specializing in persuasive, SEO-optimized content.' },
  { label: 'Product Manager',   value: 'You are an expert product manager with experience at top tech companies, skilled in roadmapping, user research, and stakeholder communication.' },
  { label: 'Financial Analyst', value: 'You are a seasoned financial analyst with expertise in valuation, financial modeling, and investment analysis.' },
  { label: 'Legal Assistant',   value: 'You are an expert legal assistant with broad knowledge of contract law, compliance, and regulatory frameworks.' },
  { label: 'Creative Writer',   value: 'You are a creative writing coach and storytelling expert who helps craft compelling narratives and characters.' },
  { label: 'UX Designer',       value: 'You are a UX/UI design expert who provides actionable feedback on user experience, accessibility, and visual design.' },
];

const TONE_TAGS = ['Empathetic','Authoritative','Friendly','Witty','Analytical','Inspirational','Socratic','Direct','Diplomatic'];

const COT_STEPS_TAGS = ['Restate the problem','Identify assumptions','List unknowns','Consider edge cases','Evaluate alternatives','Check for contradictions','Estimate confidence','Cite sources / evidence'];

const COT_STYLES = [
  { value: 'think-step',      label: 'Think step by step before answering' },
  { value: 'scratchpad',      label: 'Use a scratchpad, then provide final answer' },
  { value: 'reasoning-tags',  label: 'Show reasoning in <thinking> tags (Claude)' },
  { value: 'lets-think',      label: "Let's think about this carefully..." },
  { value: 'first-principles',label: 'Break this down from first principles' },
  { value: 'custom',          label: 'Custom (write your own)' },
];

const COT_MAP = {
  'think-step':       'Think step by step before providing your final answer.',
  'scratchpad':       'First use a scratchpad to work through your reasoning, then provide your final answer clearly labeled.',
  'reasoning-tags':   'Show all reasoning inside <thinking> tags before your final response.',
  'lets-think':       "Let's think about this carefully and methodically before arriving at an answer.",
  'first-principles': 'Break this down from first principles. Identify core assumptions, reason step by step, and derive your answer logically.',
};

const FALLBACK_TYPES = [
  { value: '',            label: 'No fallback instruction' },
  { value: 'ask',         label: 'Ask for clarification' },
  { value: 'best-effort', label: 'Make a best-effort attempt and flag uncertainty' },
  { value: 'refuse',      label: 'Politely decline and explain why' },
  { value: 'partial',     label: 'Provide a partial answer and note limitations' },
  { value: 'rephrase',    label: 'Rephrase the question back to the user' },
  { value: 'custom',      label: 'Custom fallback' },
];

const FALLBACK_MAP = {
  ask:          'If the request is unclear or ambiguous, ask clarifying questions before proceeding.',
  'best-effort':'If you are uncertain, make a best-effort attempt and clearly flag any assumptions or limitations.',
  refuse:       'If the request is outside your scope or capabilities, politely decline and briefly explain why.',
  partial:      'If you can only partially fulfill the request, do so and clearly note what is missing or uncertain.',
  rephrase:     'If unclear, rephrase the question back to the user in your own words and ask for confirmation.',
};

const FACTS_KEY = 'promptbuilder_facts';

// ─── Global in-memory state ───────────────────────────────────────────────────
let appState = {
  model: 'claude',
  role: '',
  persona: { description: '', techLevel: '50', goals: '', painPoints: '', tags: [] },
  ctx: { company: '', domain: '', audience: '', extra: '' },
  objective: { type: '', description: '' },
  positiveRules: [],
  negativeRules: [],
  glossary: [],
  tone: { formality: '50', detail: '50', energy: '50', tags: [] },
  format: { type: 'plain', length: '', template: '' },
  fewShots: [],
  cot: { enabled: false, style: 'think-step', custom: '', rules: [], constraints: [], steps: [], separate: false },
  fallback: { type: '', custom: '' },
  promptName: '',
};

let currentStep   = 0;
let autosaveTimer = null;
let shotCounter   = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function syncSlider(el) {
  el.style.setProperty('--pct', el.value + '%');
}

// Save current DOM fields for a given step into appState
function flushStep(stepId) {
  const s = steps.find(x => x.id === stepId);
  if (s && s.flush) s.flush();
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// Each step: render() → HTML string pre-filled from appState
//            bind()   → attaches listeners that write back to appState
//            flush()  → explicit DOM→appState sync (called before navigation)
//            summary()→ compact read-only HTML from appState (no DOM queries)
const steps = [
  // ── 1. Target Model ──────────────────────────────────────────────────────
  {
    id: 'model', title: 'Target Model', icon: '🤖',
    render() {
      const options = ['claude','gpt','gemini','llama','mistral','generic'].map(v =>
        `<option value="${v}" ${appState.model === v ? 'selected' : ''}>${MODEL_LABELS[v]}</option>`
      ).join('');
      return `
        <div>
          <label>Select your target model</label>
          <select id="target-model">${options}</select>
        </div>
        <div class="model-hint" id="model-hint">${MODEL_HINTS[appState.model] || MODEL_HINTS.generic}</div>`;
    },
    bind() {
      const el = document.getElementById('target-model');
      el.addEventListener('change', () => {
        appState.model = el.value;
        document.getElementById('model-hint').innerHTML = MODEL_HINTS[el.value] || MODEL_HINTS.generic;
        updateHeaderSubtitle();
        autosaveAndPreview();
      });
    },
    flush() { const el = document.getElementById('target-model'); if (el) appState.model = el.value; },
    summary() {
      return `<div class="summary-content">${esc(MODEL_LABELS[appState.model] || appState.model)}</div>`;
    },
  },

  // ── 2. Role ──────────────────────────────────────────────────────────────
  {
    id: 'role', title: 'Role', icon: '🎭',
    render() {
      const presetsHtml = ROLE_PRESETS.map(p =>
        `<button class="preset-btn ${appState.role === p.value ? 'active' : ''}" data-value="${esc(p.value)}">${esc(p.label)}</button>`
      ).join('');
      return `
        <div>
          <label>Presets</label>
          <div class="preset-grid" id="role-presets">${presetsHtml}</div>
        </div>
        <div>
          <label>Custom role description</label>
          <textarea id="role-custom" placeholder="You are a..." rows="3">${esc(appState.role)}</textarea>
        </div>`;
    },
    bind() {
      document.querySelectorAll('#role-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#role-presets .preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ta = document.getElementById('role-custom');
          ta.value = btn.dataset.value;
          appState.role = btn.dataset.value;
          autosaveAndPreview();
        });
      });
      document.getElementById('role-custom').addEventListener('input', e => {
        appState.role = e.target.value;
        autosaveAndPreview();
      });
    },
    flush() { const el = document.getElementById('role-custom'); if (el) appState.role = el.value; },
    summary() {
      const v = (appState.role || '').trim();
      if (!v) return `<div class="summary-content muted">Not set</div>`;
      return `<div class="summary-content">${esc(v.slice(0, 90))}${v.length > 90 ? '…' : ''}</div>`;
    },
  },

  // ── 3. Persona ───────────────────────────────────────────────────────────
  {
    id: 'persona', title: 'Persona', icon: '👤',
    render() {
      const p = appState.persona;
      const PERSONA_TAGS = ['Non-technical','Power user','Decision maker','End user','Developer','Executive','Student','Researcher'];
      const tagsHtml = PERSONA_TAGS.map(t =>
        `<span class="tag ${p.tags.includes(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</span>`
      ).join('');
      return `
        <div>
          <label>Who is the AI talking to?</label>
          <textarea id="persona-description" rows="3" placeholder="e.g. A mid-level marketing manager at a B2B SaaS company who wants help writing campaign copy...">${esc(p.description)}</textarea>
        </div>
        <div class="tone-row">
          <div class="tone-slider-row">
            <span>Beginner</span>
            <input type="range" id="persona-tech" min="0" max="100" value="${p.techLevel}" style="--pct:${p.techLevel}%">
            <span>Expert</span>
          </div>
        </div>
        <div>
          <label>Goals <span style="color:var(--muted);font-weight:400">(what they're trying to achieve)</span></label>
          <textarea id="persona-goals" rows="2" placeholder="e.g. Increase qualified leads, reduce time spent on email...">${esc(p.goals)}</textarea>
        </div>
        <div>
          <label>Pain points <span style="color:var(--muted);font-weight:400">(frustrations or blockers)</span></label>
          <textarea id="persona-pain" rows="2" placeholder="e.g. Struggles with technical jargon, limited budget, tight deadlines...">${esc(p.painPoints)}</textarea>
        </div>
        <div>
          <label>User type tags</label>
          <div class="tag-picker" id="persona-tags">${tagsHtml}</div>
        </div>`;
    },
    bind() {
      document.getElementById('persona-description').addEventListener('input', e => { appState.persona.description = e.target.value; autosaveAndPreview(); });
      document.getElementById('persona-goals').addEventListener('input', e => { appState.persona.goals = e.target.value; autosaveAndPreview(); });
      document.getElementById('persona-pain').addEventListener('input', e => { appState.persona.painPoints = e.target.value; autosaveAndPreview(); });
      const techEl = document.getElementById('persona-tech');
      techEl.addEventListener('input', () => { appState.persona.techLevel = techEl.value; syncSlider(techEl); autosaveAndPreview(); });
      document.querySelectorAll('#persona-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
          tag.classList.toggle('active');
          appState.persona.tags = [...document.querySelectorAll('#persona-tags .tag.active')].map(t => t.dataset.tag);
          autosaveAndPreview();
        });
      });
    },
    flush() {
      const d = document.getElementById('persona-description'); if (d) appState.persona.description = d.value;
      const g = document.getElementById('persona-goals');       if (g) appState.persona.goals = g.value;
      const pp= document.getElementById('persona-pain');        if (pp) appState.persona.painPoints = pp.value;
      const t = document.getElementById('persona-tech');        if (t) appState.persona.techLevel = t.value;
      const ta= document.querySelectorAll('#persona-tags .tag.active');
      if (ta.length) appState.persona.tags = [...ta].map(x => x.dataset.tag);
    },
    summary() {
      const p = appState.persona;
      const desc = (p.description||'').trim();
      const tech = parseInt(p.techLevel||50);
      const techLabel = tech < 30 ? 'Beginner' : tech > 70 ? 'Expert' : 'Intermediate';
      const tagParts = [techLabel, ...p.tags];
      if (!desc && !p.tags.length) return `<div class="summary-content muted">Not set</div>`;
      return `<div class="summary-tags">${tagParts.map(t=>`<span class="summary-tag">${esc(t)}</span>`).join('')}</div>${desc?`<div class="summary-content" style="margin-top:6px">${esc(desc.slice(0,70))}${desc.length>70?'…':''}</div>`:''}`;
    },
  },

  // ── 4. Context ───────────────────────────────────────────────────────────
  {
    id: 'context', title: 'Context', icon: '🏢',
    render() {
      const c = appState.ctx;
      return `
        <div class="row-2">
          <div>
            <label>Company / Organization</label>
            <input type="text" id="ctx-company" placeholder="e.g. Acme Corp" value="${esc(c.company)}">
          </div>
          <div>
            <label>Industry / Domain</label>
            <input type="text" id="ctx-domain" placeholder="e.g. SaaS, Healthcare" value="${esc(c.domain)}">
          </div>
        </div>
        <div>
          <label>Target audience</label>
          <input type="text" id="ctx-audience" placeholder="e.g. non-technical executives, developers" value="${esc(c.audience)}">
        </div>
        <div>
          <label>Additional context</label>
          <textarea id="ctx-extra" placeholder="Any relevant background information, constraints, or situational details...">${esc(c.extra)}</textarea>
        </div>`;
    },
    bind() {
      ['company','domain','audience','extra'].forEach(k => {
        document.getElementById(`ctx-${k}`)?.addEventListener('input', e => {
          appState.ctx[k] = e.target.value;
          autosaveAndPreview();
        });
      });
    },
    flush() {
      ['company','domain','audience','extra'].forEach(k => {
        const el = document.getElementById(`ctx-${k}`);
        if (el) appState.ctx[k] = el.value;
      });
    },
    summary() {
      const c = appState.ctx;
      const parts = [c.company && `Company: ${c.company}`, c.domain && `Domain: ${c.domain}`, c.audience && `Audience: ${c.audience}`].filter(Boolean);
      if (!parts.length) return `<div class="summary-content muted">Not set</div>`;
      return `<div class="summary-content">${parts.map(esc).join('<br>')}</div>`;
    },
  },

  // ── 4. Objective ─────────────────────────────────────────────────────────
  {
    id: 'objective', title: 'Objective', icon: '🎯',
    render() {
      const buttonsHtml = TASK_TYPES.map(t =>
        `<button class="task-type-btn ${appState.objective.type === t.value ? 'active' : ''}" data-value="${t.value}">${esc(t.label)}</button>`
      ).join('');
      return `
        <div>
          <label>Task type</label>
          <div class="task-type-grid" id="task-type-grid">${buttonsHtml}</div>
        </div>
        <div>
          <label>Describe the specific objective</label>
          <textarea id="obj-description" placeholder="What exactly should the AI accomplish? Be specific...">${esc(appState.objective.description)}</textarea>
        </div>`;
    },
    bind() {
      document.querySelectorAll('#task-type-grid .task-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wasActive = btn.classList.contains('active');
          document.querySelectorAll('#task-type-grid .task-type-btn').forEach(b => b.classList.remove('active'));
          if (!wasActive) {
            btn.classList.add('active');
            appState.objective.type = btn.dataset.value;
            const desc = document.getElementById('obj-description');
            if (!desc.value && TASK_STARTERS[btn.dataset.value]) {
              desc.value = TASK_STARTERS[btn.dataset.value];
              appState.objective.description = desc.value;
            }
          } else {
            appState.objective.type = '';
          }
          autosaveAndPreview();
        });
      });
      document.getElementById('obj-description').addEventListener('input', e => {
        appState.objective.description = e.target.value;
        autosaveAndPreview();
      });
    },
    flush() {
      const btn = document.querySelector('#task-type-grid .task-type-btn.active');
      appState.objective.type = btn?.dataset.value || '';
      const el = document.getElementById('obj-description');
      if (el) appState.objective.description = el.value;
    },
    summary() {
      const type = appState.objective.type;
      const desc = (appState.objective.description || '').trim();
      const typeLabel = TASK_TYPES.find(t => t.value === type)?.label;
      const typePart = typeLabel ? `<span class="summary-tag">${esc(typeLabel)}</span>` : '';
      const descPart = desc ? `<div class="summary-content" style="margin-top:6px">${esc(desc.slice(0,70))}${desc.length>70?'…':''}</div>` : '';
      if (!typePart && !descPart) return `<div class="summary-content muted">Not set</div>`;
      return `<div class="summary-tags">${typePart}</div>${descPart}`;
    },
  },

  // ── 5. Positive Rules ────────────────────────────────────────────────────
  {
    id: 'rules', title: 'Positive Rules', icon: '✅',
    render() {
      const items = appState.positiveRules.map((r, i) => renderRuleItem('pos', i, r, 'Enter rule...')).join('');
      return `
        <label>Things the AI should always do</label>
        <div class="rule-list" id="positive-rules">${items}</div>
        <button class="add-btn" id="add-pos-rule">+ Add rule</button>`;
    },
    bind() {
      bindRuleList('positive-rules', 'pos', 'positiveRules', 'Enter rule...');
      document.getElementById('add-pos-rule').addEventListener('click', () => {
        appState.positiveRules.push('');
        appendRuleItem('positive-rules', 'pos', appState.positiveRules.length - 1, '', 'positiveRules', 'Enter rule...');
        autosaveAndPreview();
      });
    },
    flush() { appState.positiveRules = getDOMRuleValues('positive-rules'); },
    summary() {
      const r = appState.positiveRules.filter(Boolean);
      if (!r.length) return `<div class="summary-content muted">None added</div>`;
      return `<div class="summary-content">${r.slice(0,3).map(x=>`• ${esc(x)}`).join('<br>')}${r.length>3?`<br><em>+${r.length-3} more`:''}`;
    },
  },

  // ── 6. Negative Constraints ───────────────────────────────────────────────
  {
    id: 'constraints', title: 'Negative Constraints', icon: '🚫',
    render() {
      const items = appState.negativeRules.map((r, i) => renderRuleItem('neg', i, r, 'Enter constraint...')).join('');
      return `
        <label>Things the AI should never do</label>
        <div class="rule-list" id="negative-rules">${items}</div>
        <button class="add-btn" id="add-neg-rule">+ Add constraint</button>`;
    },
    bind() {
      bindRuleList('negative-rules', 'neg', 'negativeRules', 'Enter constraint...');
      document.getElementById('add-neg-rule').addEventListener('click', () => {
        appState.negativeRules.push('');
        appendRuleItem('negative-rules', 'neg', appState.negativeRules.length - 1, '', 'negativeRules', 'Enter constraint...');
        autosaveAndPreview();
      });
    },
    flush() { appState.negativeRules = getDOMRuleValues('negative-rules'); },
    summary() {
      const r = appState.negativeRules.filter(Boolean);
      if (!r.length) return `<div class="summary-content muted">None added</div>`;
      return `<div class="summary-content">${r.slice(0,3).map(x=>`• ${esc(x)}`).join('<br>')}${r.length>3?`<br><em>+${r.length-3} more`:''}`;
    },
  },

  // ── 7. Glossary ──────────────────────────────────────────────────────────
  {
    id: 'glossary', title: 'Glossary', icon: '📖',
    render() {
      const items = (appState.glossary||[]).map((g,i) => renderGlossaryItem(i, g)).join('');
      return `
        <label>Define terms the AI must know and use consistently</label>
        <div id="glossary-list" style="display:flex;flex-direction:column;gap:8px;">${items}</div>
        <button class="add-btn" id="add-glossary-item">+ Add term</button>`;
    },
    bind() {
      bindGlossaryList();
      document.getElementById('add-glossary-item').addEventListener('click', () => {
        appState.glossary.push({ term: '', definition: '' });
        const idx = appState.glossary.length - 1;
        const list = document.getElementById('glossary-list');
        const div = document.createElement('div');
        div.innerHTML = renderGlossaryItem(idx, { term: '', definition: '' });
        list.appendChild(div.firstElementChild);
        bindGlossaryItem(list.lastElementChild, idx);
        list.lastElementChild.querySelector('.glossary-term').focus();
        autosaveAndPreview();
      });
    },
    flush() {
      appState.glossary = [...(document.querySelectorAll('#glossary-list .glossary-item')||[])].map(item => ({
        term: item.querySelector('.glossary-term')?.value || '',
        definition: item.querySelector('.glossary-def')?.value || '',
      }));
    },
    summary() {
      const g = (appState.glossary||[]).filter(x => x.term);
      if (!g.length) return `<div class="summary-content muted">No terms defined</div>`;
      return `<div class="summary-content">${g.slice(0,3).map(x=>`<strong>${esc(x.term)}</strong>: ${esc((x.definition||'').slice(0,40))}${(x.definition||'').length>40?'…':''}`).join('<br>')}${g.length>3?`<br><em>+${g.length-3} more</em>`:''}</div>`;
    },
  },

  // ── 8. Tone ──────────────────────────────────────────────────────────────
  {
    id: 'tone', title: 'Tone', icon: '🎨',
    render() {
      const t = appState.tone;
      const tagsHtml = TONE_TAGS.map(tag =>
        `<span class="tag ${t.tags.includes(tag) ? 'active' : ''}" data-tag="${esc(tag)}">${esc(tag)}</span>`
      ).join('');
      return `
        <div class="tone-row">
          <div class="tone-slider-row">
            <span>Formal</span>
            <input type="range" id="tone-formality" min="0" max="100" value="${t.formality}" style="--pct:${t.formality}%">
            <span>Casual</span>
          </div>
          <div class="tone-slider-row">
            <span>Concise</span>
            <input type="range" id="tone-detail" min="0" max="100" value="${t.detail}" style="--pct:${t.detail}%">
            <span>Detailed</span>
          </div>
          <div class="tone-slider-row">
            <span>Neutral</span>
            <input type="range" id="tone-energy" min="0" max="100" value="${t.energy}" style="--pct:${t.energy}%">
            <span>Enthusiastic</span>
          </div>
        </div>
        <div>
          <label>Additional tone tags</label>
          <div class="tag-picker" id="tone-tags">${tagsHtml}</div>
        </div>`;
    },
    bind() {
      ['formality','detail','energy'].forEach(k => {
        const el = document.getElementById(`tone-${k}`);
        if (!el) return;
        el.addEventListener('input', () => {
          appState.tone[k] = el.value;
          syncSlider(el);
          autosaveAndPreview();
        });
      });
      document.querySelectorAll('#tone-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
          tag.classList.toggle('active');
          appState.tone.tags = [...document.querySelectorAll('#tone-tags .tag.active')].map(t => t.dataset.tag);
          autosaveAndPreview();
        });
      });
    },
    flush() {
      ['formality','detail','energy'].forEach(k => {
        const el = document.getElementById(`tone-${k}`);
        if (el) appState.tone[k] = el.value;
      });
      const tagEls = document.querySelectorAll('#tone-tags .tag.active');
      if (tagEls) appState.tone.tags = [...tagEls].map(t => t.dataset.tag);
    },
    summary() {
      const f = parseInt(appState.tone.formality || 50);
      const fLabel = f < 30 ? 'Formal' : f > 70 ? 'Casual' : 'Balanced';
      const parts = [fLabel, ...appState.tone.tags];
      return `<div class="summary-tags">${parts.map(p=>`<span class="summary-tag">${esc(p)}</span>`).join('')}</div>`;
    },
  },

  // ── 8. Output Format ─────────────────────────────────────────────────────
  {
    id: 'format', title: 'Output Format', icon: '📄',
    render() {
      const fmt = appState.format;
      const fmtOptions = [
        ['plain','Plain text'],['markdown','Markdown'],['json','JSON'],
        ['bullet','Bullet list'],['numbered','Numbered list'],['table','Table'],
        ['html','HTML'],['template','Custom template']
      ].map(([v,l]) => `<option value="${v}" ${fmt.type===v?'selected':''}>${l}</option>`).join('');
      const lenOptions = [
        ['','No specific length'],['1-2 sentences','1–2 sentences'],
        ['1 paragraph','1 paragraph'],['3-5 bullet points','3–5 bullet points'],
        ['under 200 words','Under 200 words'],['under 500 words','Under 500 words'],
        ['500-1000 words','500–1000 words'],['comprehensive, no limit','Comprehensive, no limit']
      ].map(([v,l]) => `<option value="${v}" ${fmt.length===v?'selected':''}>${l}</option>`).join('');
      return `
        <div>
          <label>Format type</label>
          <select id="fmt-type">${fmtOptions}</select>
        </div>
        <div id="fmt-template-row" ${fmt.type!=='template'?'style="display:none"':''}>
          <label>Custom template (use {placeholders})</label>
          <textarea id="fmt-template" placeholder="**Title:** {title}&#10;**Summary:** {summary}">${esc(fmt.template)}</textarea>
        </div>
        <div>
          <label>Length guidance</label>
          <select id="fmt-length">${lenOptions}</select>
        </div>`;
    },
    bind() {
      const fmtType = document.getElementById('fmt-type');
      const tmplRow = document.getElementById('fmt-template-row');
      fmtType.addEventListener('change', () => {
        appState.format.type = fmtType.value;
        tmplRow.style.display = fmtType.value === 'template' ? '' : 'none';
        autosaveAndPreview();
      });
      document.getElementById('fmt-length').addEventListener('change', e => {
        appState.format.length = e.target.value;
        autosaveAndPreview();
      });
      document.getElementById('fmt-template').addEventListener('input', e => {
        appState.format.template = e.target.value;
        autosaveAndPreview();
      });
    },
    flush() {
      const t = document.getElementById('fmt-type');
      const l = document.getElementById('fmt-length');
      const tp = document.getElementById('fmt-template');
      if (t) appState.format.type = t.value;
      if (l) appState.format.length = l.value;
      if (tp) appState.format.template = tp.value;
    },
    summary() {
      const fmt = appState.format;
      const labels = { plain:'Plain text', markdown:'Markdown', json:'JSON', bullet:'Bullet list', numbered:'Numbered list', table:'Table', html:'HTML', template:'Custom template' };
      const parts = [labels[fmt.type]||fmt.type, fmt.length||''].filter(Boolean);
      return `<div class="summary-tags">${parts.map(p=>`<span class="summary-tag">${esc(p)}</span>`).join('')}</div>`;
    },
  },

  // ── 9. Few-Shot Examples ──────────────────────────────────────────────────
  {
    id: 'examples', title: 'Few-Shot Examples', icon: '💡',
    render() {
      const pairsHtml = appState.fewShots.map((shot, i) => renderFewShotPair(i, shot)).join('');
      return `
        <label>Provide input → output pairs to guide the model</label>
        <div id="few-shot-list" style="display:flex;flex-direction:column;gap:10px;">${pairsHtml}</div>
        <button class="add-btn" id="add-few-shot">+ Add example pair</button>`;
    },
    bind() {
      bindFewShotList();
      document.getElementById('add-few-shot').addEventListener('click', () => {
        appState.fewShots.push({ input: '', output: '' });
        const idx = appState.fewShots.length - 1;
        const list = document.getElementById('few-shot-list');
        const div = document.createElement('div');
        div.innerHTML = renderFewShotPair(idx, { input: '', output: '' });
        list.appendChild(div.firstElementChild);
        bindFewShotPair(list.lastElementChild, idx);
        autosaveAndPreview();
      });
    },
    flush() {
      appState.fewShots = [...(document.querySelectorAll('#few-shot-list .few-shot-pair')||[])].map(pair => {
        const [a, b] = pair.querySelectorAll('textarea');
        return { input: a?.value||'', output: b?.value||'' };
      });
    },
    summary() {
      const count = appState.fewShots.filter(s => s.input || s.output).length;
      if (!count) return `<div class="summary-content muted">No examples added</div>`;
      return `<div class="summary-content">${count} example pair${count!==1?'s':''}</div>`;
    },
  },

  // ── 10. Chain of Thought ─────────────────────────────────────────────────
  {
    id: 'cot', title: 'Chain of Thought', icon: '🔗',
    render() {
      const cot = appState.cot;
      const styleOptions = COT_STYLES.map(s =>
        `<option value="${s.value}" ${cot.style===s.value?'selected':''}>${esc(s.label)}</option>`
      ).join('');
      const stepsHtml = COT_STEPS_TAGS.map(t =>
        `<span class="tag ${cot.steps.includes(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</span>`
      ).join('');
      const ruleItems = cot.rules.map((r,i) => renderRuleItem('cotr',i,r,'e.g. Always verify numerical claims')).join('');
      const cstItems  = cot.constraints.map((r,i) => renderRuleItem('cotc',i,r,'e.g. Do not jump to conclusions')).join('');
      return `
        <div class="toggle-row">
          <span class="toggle-label">Enable chain-of-thought reasoning</span>
          <label class="toggle">
            <input type="checkbox" id="cot-enabled" ${cot.enabled?'checked':''}>
            <span class="toggle-track"></span>
          </label>
        </div>
        <div id="cot-options" style="display:${cot.enabled?'flex':'none'};flex-direction:column;gap:14px;">
          <div>
            <label>Built-in CoT style</label>
            <select id="cot-style">${styleOptions}</select>
          </div>
          <div id="cot-custom-row" style="display:${cot.style==='custom'?'':'none'}">
            <label>Custom CoT instruction</label>
            <textarea id="cot-custom" rows="3" placeholder="e.g. Before answering, list your assumptions...">${esc(cot.custom)}</textarea>
          </div>
          <div>
            <label>Reasoning rules <span style="color:var(--muted);font-weight:400">(applied inside the thinking phase)</span></label>
            <div class="rule-list" id="cot-rules">${ruleItems}</div>
            <button class="add-btn" id="add-cot-rule">+ Add reasoning rule</button>
          </div>
          <div>
            <label>Reasoning constraints <span style="color:var(--muted);font-weight:400">(things to avoid while reasoning)</span></label>
            <div class="rule-list" id="cot-constraints">${cstItems}</div>
            <button class="add-btn" id="add-cot-constraint">+ Add reasoning constraint</button>
          </div>
          <div>
            <label>Required reasoning steps</label>
            <div class="tag-picker" id="cot-steps">${stepsHtml}</div>
          </div>
          <div class="toggle-row">
            <span class="toggle-label" style="font-size:0.82rem">Separate reasoning from final answer</span>
            <label class="toggle">
              <input type="checkbox" id="cot-separate" ${cot.separate?'checked':''}>
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>`;
    },
    bind() {
      const enabledEl = document.getElementById('cot-enabled');
      const optionsEl = document.getElementById('cot-options');
      enabledEl.addEventListener('change', () => {
        appState.cot.enabled = enabledEl.checked;
        optionsEl.style.display = enabledEl.checked ? 'flex' : 'none';
        autosaveAndPreview();
      });
      const styleEl = document.getElementById('cot-style');
      styleEl.addEventListener('change', () => {
        appState.cot.style = styleEl.value;
        document.getElementById('cot-custom-row').style.display = styleEl.value === 'custom' ? '' : 'none';
        autosaveAndPreview();
      });
      document.getElementById('cot-custom').addEventListener('input', e => {
        appState.cot.custom = e.target.value;
        autosaveAndPreview();
      });
      document.getElementById('cot-separate').addEventListener('change', e => {
        appState.cot.separate = e.target.checked;
        autosaveAndPreview();
      });
      bindRuleList('cot-rules', 'cotr', 'cot.rules', 'e.g. Always verify numerical claims');
      document.getElementById('add-cot-rule').addEventListener('click', () => {
        appState.cot.rules.push('');
        appendRuleItem('cot-rules','cotr', appState.cot.rules.length-1, '', 'cot.rules', 'e.g. Always verify numerical claims');
        autosaveAndPreview();
      });
      bindRuleList('cot-constraints','cotc','cot.constraints','e.g. Do not jump to conclusions');
      document.getElementById('add-cot-constraint').addEventListener('click', () => {
        appState.cot.constraints.push('');
        appendRuleItem('cot-constraints','cotc', appState.cot.constraints.length-1, '', 'cot.constraints', 'e.g. Do not jump to conclusions');
        autosaveAndPreview();
      });
      document.querySelectorAll('#cot-steps .tag').forEach(tag => {
        tag.addEventListener('click', () => {
          tag.classList.toggle('active');
          appState.cot.steps = [...document.querySelectorAll('#cot-steps .tag.active')].map(t => t.dataset.tag);
          autosaveAndPreview();
        });
      });
    },
    flush() {
      const en = document.getElementById('cot-enabled'); if (en) appState.cot.enabled = en.checked;
      const st = document.getElementById('cot-style');   if (st) appState.cot.style = st.value;
      const cu = document.getElementById('cot-custom');  if (cu) appState.cot.custom = cu.value;
      const sep= document.getElementById('cot-separate');if (sep) appState.cot.separate = sep.checked;
      const rEl = document.querySelectorAll('#cot-rules input');
      if (rEl.length) appState.cot.rules = [...rEl].map(i=>i.value);
      const cEl = document.querySelectorAll('#cot-constraints input');
      if (cEl.length) appState.cot.constraints = [...cEl].map(i=>i.value);
      const sEl = document.querySelectorAll('#cot-steps .tag.active');
      if (sEl.length) appState.cot.steps = [...sEl].map(t=>t.dataset.tag);
    },
    summary() {
      if (!appState.cot.enabled) return `<div class="summary-content muted">Disabled</div>`;
      const styleLabel = COT_STYLES.find(s=>s.value===appState.cot.style)?.label || appState.cot.style;
      return `<div class="summary-tags"><span class="summary-tag">Enabled</span></div><div class="summary-content" style="margin-top:6px">${esc(styleLabel)}</div>`;
    },
  },

  // ── 11. Fallback Behavior ─────────────────────────────────────────────────
  {
    id: 'fallback', title: 'Fallback Behavior', icon: '⚠️',
    render() {
      const fb = appState.fallback;
      const options = FALLBACK_TYPES.map(f =>
        `<option value="${f.value}" ${fb.type===f.value?'selected':''}>${esc(f.label)}</option>`
      ).join('');
      return `
        <div>
          <label>When the request is unclear or out of scope</label>
          <select id="fallback-type">${options}</select>
        </div>
        <div id="fallback-custom-row" ${fb.type!=='custom'?'style="display:none"':''}>
          <label>Custom fallback instruction</label>
          <textarea id="fallback-custom" placeholder="Describe how the AI should handle uncertain or out-of-scope requests...">${esc(fb.custom)}</textarea>
        </div>`;
    },
    bind() {
      const typeEl = document.getElementById('fallback-type');
      typeEl.addEventListener('change', () => {
        appState.fallback.type = typeEl.value;
        document.getElementById('fallback-custom-row').style.display = typeEl.value === 'custom' ? '' : 'none';
        autosaveAndPreview();
      });
      document.getElementById('fallback-custom').addEventListener('input', e => {
        appState.fallback.custom = e.target.value;
        autosaveAndPreview();
      });
    },
    flush() {
      const t = document.getElementById('fallback-type');   if (t) appState.fallback.type = t.value;
      const c = document.getElementById('fallback-custom'); if (c) appState.fallback.custom = c.value;
    },
    summary() {
      const { type } = appState.fallback;
      if (!type) return `<div class="summary-content muted">Not set</div>`;
      const label = FALLBACK_TYPES.find(f=>f.value===type)?.label || type;
      return `<div class="summary-content">${esc(label)}</div>`;
    },
  },
];

// ─── Glossary helpers ─────────────────────────────────────────────────────────
function renderGlossaryItem(idx, g) {
  return `<div class="glossary-item rule-item" data-idx="${idx}">
    <div style="display:flex;flex-direction:column;gap:5px;flex:1">
      <input class="glossary-term" type="text" placeholder="Term (e.g. MRR)" value="${esc(g.term)}" style="font-weight:600">
      <input class="glossary-def"  type="text" placeholder="Definition (e.g. Monthly Recurring Revenue)" value="${esc(g.definition)}">
    </div>
    <button class="remove-btn" data-idx="${idx}">×</button>
  </div>`;
}

function bindGlossaryList() {
  document.querySelectorAll('#glossary-list .glossary-item').forEach((item, idx) => bindGlossaryItem(item, idx));
}

function bindGlossaryItem(item, idx) {
  item.querySelector('.remove-btn').addEventListener('click', () => {
    item.remove();
    appState.glossary = [...document.querySelectorAll('#glossary-list .glossary-item')].map(el => ({
      term: el.querySelector('.glossary-term')?.value||'',
      definition: el.querySelector('.glossary-def')?.value||'',
    }));
    autosaveAndPreview();
  });
  item.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      if (!appState.glossary[idx]) appState.glossary[idx] = { term:'', definition:'' };
      if (inp.classList.contains('glossary-term')) appState.glossary[idx].term = inp.value;
      else appState.glossary[idx].definition = inp.value;
      autosaveAndPreview();
    });
  });
}

// ─── Rule list helpers ────────────────────────────────────────────────────────
function renderRuleItem(prefix, idx, value, placeholder) {
  return `<div class="rule-item" id="${prefix}-${idx}">
    <input type="text" placeholder="${esc(placeholder)}" value="${esc(value)}">
    <button class="remove-btn" data-prefix="${prefix}" data-idx="${idx}">×</button>
  </div>`;
}

// Bind existing DOM rule items to appState key (dot-notation: 'cot.rules')
function bindRuleList(listId, prefix, stateKey, placeholder) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.querySelectorAll('.rule-item').forEach((item, idx) => {
    const input = item.querySelector('input');
    const btn   = item.querySelector('.remove-btn');
    input?.addEventListener('input', () => {
      setNestedKey(stateKey, getDOMRuleValues(listId));
      autosaveAndPreview();
    });
    btn?.addEventListener('click', () => {
      item.remove();
      setNestedKey(stateKey, getDOMRuleValues(listId));
      autosaveAndPreview();
    });
  });
}

// Append a new rule item to a live DOM list
function appendRuleItem(listId, prefix, idx, value, stateKey, placeholder) {
  const container = document.getElementById(listId);
  if (!container) return;
  const div = document.createElement('div');
  div.innerHTML = renderRuleItem(prefix, idx, value, placeholder);
  const item = div.firstElementChild;
  container.appendChild(item);
  const input = item.querySelector('input');
  item.querySelector('.remove-btn').addEventListener('click', () => {
    item.remove();
    setNestedKey(stateKey, getDOMRuleValues(listId));
    autosaveAndPreview();
  });
  input.addEventListener('input', () => {
    setNestedKey(stateKey, getDOMRuleValues(listId));
    autosaveAndPreview();
  });
  input.focus();
}

function getDOMRuleValues(listId) {
  return [...(document.querySelectorAll(`#${listId} input`)||[])].map(i => i.value);
}

// Set a (possibly nested) key on appState: 'cot.rules' → appState.cot.rules
function setNestedKey(key, value) {
  const parts = key.split('.');
  let obj = appState;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
  obj[parts[parts.length - 1]] = value;
}

// ─── Few-shot helpers ─────────────────────────────────────────────────────────
function renderFewShotPair(idx, shot) {
  return `<div class="few-shot-pair" data-idx="${idx}">
    <div class="few-shot-pair-header">
      <span class="few-shot-label">Example ${idx + 1}</span>
      <button class="remove-btn" data-idx="${idx}">×</button>
    </div>
    <div><label>Input</label><textarea placeholder="User input or question...">${esc(shot.input)}</textarea></div>
    <div><label>Expected Output</label><textarea placeholder="Ideal response...">${esc(shot.output)}</textarea></div>
  </div>`;
}

function bindFewShotList() {
  document.querySelectorAll('#few-shot-list .few-shot-pair').forEach((pair, idx) => {
    bindFewShotPair(pair, idx);
  });
}

function bindFewShotPair(pair, idx) {
  pair.querySelector('.remove-btn').addEventListener('click', () => {
    pair.remove();
    appState.fewShots = [...document.querySelectorAll('#few-shot-list .few-shot-pair')].map(p => {
      const [a,b] = p.querySelectorAll('textarea');
      return { input: a?.value||'', output: b?.value||'' };
    });
    autosaveAndPreview();
  });
  pair.querySelectorAll('textarea').forEach((ta, i) => {
    ta.addEventListener('input', () => {
      if (!appState.fewShots[idx]) appState.fewShots[idx] = { input:'', output:'' };
      if (i === 0) appState.fewShots[idx].input  = ta.value;
      else         appState.fewShots[idx].output = ta.value;
      autosaveAndPreview();
    });
  });
}

// ─── Wizard render ────────────────────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderMain();
  updatePreview();
  updateHeaderSubtitle();
}

function renderSidebar() {
  const container = document.getElementById('sidebar-steps');
  container.innerHTML = steps.map((step, i) => {
    const isDone   = i < currentStep;
    const isActive = i === currentStep;
    const cls = isActive ? 'active' : isDone ? 'done' : '';
    return `<div class="sidebar-step ${cls}" data-step="${i}">
      <div class="step-circle">${isDone ? '✓' : (i + 1)}</div>
      <span class="step-name">${esc(step.title)}</span>
    </div>`;
  }).join('');
  container.querySelectorAll('.sidebar-step').forEach(el => {
    el.addEventListener('click', () => goTo(parseInt(el.dataset.step)));
  });
}

function renderMain() {
  const main = document.getElementById('main-area');
  const step = steps[currentStep];

  const activeHtml = `
    <div class="step-card active-card">
      <div class="step-card-header">
        <span class="step-card-icon">${step.icon}</span>
        <div>
          <div class="step-card-title">${esc(step.title)}</div>
          <div class="step-card-sub">Step ${currentStep + 1} of ${steps.length} — define what you want the model to do.</div>
        </div>
        <span class="editing-badge">Editing</span>
      </div>
      <div class="step-card-body" id="active-step-body">
        ${step.render()}
      </div>
      <div class="step-card-nav">
        <button class="btn btn-ghost btn-sm" id="btn-back" ${currentStep===0?'disabled':''}>${currentStep===0?'← Back':'← Back'}</button>
        <button class="btn btn-primary btn-sm" id="btn-next">${currentStep===steps.length-1?'Finish ✓':'Next →'}</button>
      </div>
    </div>`;

  let summaryHtml = '';
  if (currentStep > 0) {
    summaryHtml = `<div class="summary-grid">` + steps.slice(0, currentStep).map((s, i) => {
      const fullWidth = ['rules','constraints','examples','cot'].includes(s.id) ? ' full-width' : '';
      return `<div class="summary-card${fullWidth}" data-step="${i}">
        <div class="summary-card-header">
          <span class="summary-card-icon">${s.icon}</span>
          <span class="summary-card-title">${esc(s.title)}</span>
          <span class="summary-done-badge">✓ done</span>
        </div>
        ${s.summary()}
      </div>`;
    }).join('') + `</div>`;
  }

  main.innerHTML = activeHtml + summaryHtml;

  step.bind();

  document.getElementById('btn-back').addEventListener('click', () => goTo(currentStep - 1));
  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentStep < steps.length - 1) goTo(currentStep + 1);
    else showToast('Prompt complete! Copy or download it from the preview panel.');
  });
  main.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => goTo(parseInt(card.dataset.step)));
  });
}

function goTo(n) {
  if (n < 0 || n >= steps.length) return;
  flushStep(steps[currentStep].id);
  currentStep = n;
  renderAll();
  document.getElementById('main-area').scrollTop = 0;
}

// ─── buildPrompt — reads from appState, never from DOM ───────────────────────
function buildPrompt() {
  const model  = appState.model || 'claude';
  const useXml = model === 'claude';
  const lines  = [];
  const wrap   = (tag, content) => useXml ? `<${tag}>\n${content}\n</${tag}>` : content;

  const role = (appState.role || '').trim();
  if (role) {
    lines.push(useXml ? wrap('role', role) : `ROLE:\n${role}`);
    lines.push('');
  }

  // PERSONA
  const p = appState.persona || {};
  const personaParts = [];
  if ((p.description||'').trim()) personaParts.push(p.description.trim());
  const tech = parseInt(p.techLevel||50);
  personaParts.push(`Technical level: ${tech<30?'Beginner':tech>70?'Expert':'Intermediate'}`);
  if ((p.goals||'').trim())      personaParts.push(`Goals: ${p.goals.trim()}`);
  if ((p.painPoints||'').trim()) personaParts.push(`Pain points: ${p.painPoints.trim()}`);
  if ((p.tags||[]).length)       personaParts.push(`User type: ${p.tags.join(', ')}`);
  if (p.description || (p.tags||[]).length) {
    lines.push(useXml ? wrap('persona', personaParts.join('\n')) : `PERSONA (Target User):\n${personaParts.join('\n')}`);
    lines.push('');
  }

  const c = appState.ctx || {};
  const ctxParts = [];
  if (c.company)  ctxParts.push(`Company: ${c.company}`);
  if (c.domain)   ctxParts.push(`Domain: ${c.domain}`);
  if (c.audience) ctxParts.push(`Audience: ${c.audience}`);
  if (c.extra)    ctxParts.push(c.extra);
  if (ctxParts.length) {
    lines.push(useXml ? wrap('context', ctxParts.join('\n')) : `CONTEXT:\n${ctxParts.join('\n')}`);
    lines.push('');
  }

  const obj = appState.objective || {};
  const typeLabel = TASK_TYPES.find(t => t.value === obj.type)?.label;
  const objParts  = [];
  if (typeLabel) objParts.push(`Task type: ${typeLabel}`);
  if ((obj.description||'').trim()) objParts.push(obj.description.trim());
  if (objParts.length) {
    lines.push(useXml ? wrap('objective', objParts.join('\n')) : `OBJECTIVE:\n${objParts.join('\n')}`);
    lines.push('');
  }

  const posRules = (appState.positiveRules || []).filter(Boolean);
  if (posRules.length) {
    lines.push(useXml ? wrap('instructions', posRules.map(r=>`• ${r}`).join('\n')) : `INSTRUCTIONS (Do):\n${posRules.map(r=>`• ${r}`).join('\n')}`);
    lines.push('');
  }

  const negRules = (appState.negativeRules || []).filter(Boolean);
  if (negRules.length) {
    lines.push(useXml ? wrap('constraints', negRules.map(r=>`• ${r}`).join('\n')) : `CONSTRAINTS (Don't):\n${negRules.map(r=>`• ${r}`).join('\n')}`);
    lines.push('');
  }

  // GLOSSARY
  const glossary = (appState.glossary||[]).filter(g => g.term);
  if (glossary.length) {
    const glossaryContent = glossary.map(g => `${g.term}: ${g.definition}`).join('\n');
    lines.push(useXml ? wrap('glossary', glossaryContent) : `GLOSSARY:\n${glossaryContent}`);
    lines.push('');
  }

  const tone = appState.tone || {};
  const f = parseInt(tone.formality || 50), d = parseInt(tone.detail || 50), e = parseInt(tone.energy || 50);
  const toneDesc = [];
  if (f < 30) toneDesc.push('formal and professional');
  else if (f > 70) toneDesc.push('casual and conversational');
  else toneDesc.push('moderately professional');
  if (d < 30) toneDesc.push('concise');
  else if (d > 70) toneDesc.push('detailed and thorough');
  if (e > 70) toneDesc.push('enthusiastic');
  if ((tone.tags||[]).length) toneDesc.push(...tone.tags.map(t=>t.toLowerCase()));
  lines.push(useXml ? wrap('tone', `Write in a ${toneDesc.join(', ')} tone.`) : `TONE:\nWrite in a ${toneDesc.join(', ')} tone.`);
  lines.push('');

  const fmt = appState.format || {};
  const fmtLabels = { plain:'plain text', markdown:'Markdown', json:'JSON', bullet:'bullet list', numbered:'numbered list', table:'table', html:'HTML', template:'the following template' };
  const fmtParts = [`Format your response as ${fmtLabels[fmt.type||'plain'] || fmt.type}.`];
  if (fmt.length) fmtParts.push(`Length: ${fmt.length}.`);
  if ((fmt.template||'').trim()) fmtParts.push(`\nTemplate:\n${fmt.template.trim()}`);
  lines.push(useXml ? wrap('output_format', fmtParts.join(' ')) : `OUTPUT FORMAT:\n${fmtParts.join(' ')}`);
  lines.push('');

  const shots = (appState.fewShots || []).filter(s => s.input || s.output);
  if (shots.length) {
    const exContent = shots.map((s,i) => `Example ${i+1}:\nInput: ${s.input}\nOutput: ${s.output}`).join('\n\n');
    lines.push(useXml ? wrap('examples', exContent) : `EXAMPLES:\n${exContent}`);
    lines.push('');
  }

  const cot = appState.cot || {};
  if (cot.enabled) {
    const base = cot.style === 'custom' ? (cot.custom||'').trim() : (COT_MAP[cot.style] || COT_MAP['think-step']);
    const cotParts = [base];
    if ((cot.steps||[]).length) cotParts.push(`\nYour reasoning must include these steps:\n${cot.steps.map(s=>`• ${s}`).join('\n')}`);
    if ((cot.rules||[]).filter(Boolean).length) cotParts.push(`\nReasoning rules:\n${cot.rules.filter(Boolean).map(r=>`• ${r}`).join('\n')}`);
    if ((cot.constraints||[]).filter(Boolean).length) cotParts.push(`\nReasoning constraints:\n${cot.constraints.filter(Boolean).map(c=>`• Do not: ${c}`).join('\n')}`);
    if (cot.separate) cotParts.push(`\nClearly separate your reasoning from your final answer using a divider or label (e.g. "Final Answer:").`);
    lines.push(useXml ? wrap('thinking_instruction', cotParts.join('')) : `REASONING PROCESS:\n${cotParts.join('')}`);
    lines.push('');
  }

  const fb = appState.fallback || {};
  const fbText = fb.type === 'custom' ? (fb.custom||'').trim() : FALLBACK_MAP[fb.type];
  if (fb.type && fbText) {
    lines.push(useXml ? wrap('fallback', fbText) : `FALLBACK BEHAVIOR:\n${fbText}`);
    lines.push('');
  }

  lines.push(useXml ? '<task>\n{{USER_INPUT_HERE}}\n</task>' : 'TASK:\n{{USER_INPUT_HERE}}');
  return lines.join('\n').trim();
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function updatePreview() {
  const prompt = buildPrompt();
  document.getElementById('prompt-output').innerHTML = syntaxHighlight(prompt);
  document.getElementById('char-count').textContent  = prompt.length.toLocaleString();
  document.getElementById('token-count').textContent = Math.round(prompt.length / 4).toLocaleString();
}

function syntaxHighlight(text) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped.split('\n').map(line => {
    if (/^&lt;\/?[\w_]+&gt;$/.test(line.trim())) return `<span class="xml-tag">${line}</span>`;
    if (line.trim()) return `<span class="xml-content">${line}</span>`;
    return line;
  }).join('\n');
}

function updateHeaderSubtitle() {
  const name  = appState.promptName;
  const model = MODEL_LABELS[appState.model] || appState.model;
  const parts = [model];
  if (name) parts.unshift(name);
  else {
    const role = (appState.role||'').trim();
    if (role) parts.push(role.split(' ').slice(0,4).join(' ') + (role.split(' ').length>4?'…':''));
  }
  document.getElementById('header-subtitle').textContent = parts.join(' · ');
}

// ─── Copy / Download ──────────────────────────────────────────────────────────
function copyPrompt() {
  const text = buildPrompt();
  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById('copy-feedback');
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2000);
  });
}

function downloadPrompt() {
  triggerDownload(new Blob([buildPrompt()], { type:'text/plain' }), `${appState.promptName||'prompt'}.txt`);
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Auto-save ────────────────────────────────────────────────────────────────
function autosaveAndPreview() {
  updatePreview();
  scheduleAutosave();
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(captureState()));
      const dot = document.getElementById('autosave-dot');
      dot.classList.add('visible');
      setTimeout(() => dot.classList.remove('visible'), 1400);
    } catch (e) {}
  }, 800);
}

// ─── State capture / restore ─────────────────────────────────────────────────
function captureState() {
  // Flush the active step's DOM into appState before capturing
  flushStep(steps[currentStep].id);
  return { version: 1, ...JSON.parse(JSON.stringify(appState)) };
}

function restoreState(state) {
  if (!state || state.version !== 1) return;
  appState = {
    model:         state.model         || 'claude',
    role:          state.role          || '',
    persona:       { description:'', techLevel:'50', goals:'', painPoints:'', tags:[], ...(state.persona||{}) },
    ctx:           { company:'', domain:'', audience:'', extra:'', ...(state.ctx||{}) },
    objective:     { type:'', description:'', ...(state.objective||{}) },
    positiveRules: Array.isArray(state.positiveRules) ? state.positiveRules : [],
    negativeRules: Array.isArray(state.negativeRules) ? state.negativeRules : [],
    glossary:      Array.isArray(state.glossary) ? state.glossary : [],
    tone:          { formality:'50', detail:'50', energy:'50', tags:[], ...(state.tone||{}) },
    format:        { type:'plain', length:'', template:'', ...(state.format||{}) },
    fewShots:      Array.isArray(state.fewShots) ? state.fewShots : [],
    cot:           { enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false, ...(state.cot||{}) },
    fallback:      { type:'', custom:'', ...(state.fallback||{}) },
    promptName:    state.promptName || '',
  };
  renderAll();
}

// ─── Named saves ─────────────────────────────────────────────────────────────
function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { return []; }
}
function setSaves(saves) { localStorage.setItem(SAVES_KEY, JSON.stringify(saves)); }

function savePromptAs() {
  document.getElementById('save-name-input').value = appState.promptName || '';
  document.getElementById('savename-modal').classList.add('open');
  setTimeout(() => document.getElementById('save-name-input').focus(), 80);
}
function closeSaveNameModal() { document.getElementById('savename-modal').classList.remove('open'); }

function confirmSave() {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) { document.getElementById('save-name-input').focus(); return; }
  appState.promptName = name;
  updateHeaderSubtitle();
  const saves = getSaves();
  const idx   = saves.findIndex(s => s.name === name);
  const entry = { name, savedAt: new Date().toISOString(), state: captureState() };
  if (idx >= 0) saves[idx] = entry; else saves.unshift(entry);
  setSaves(saves);
  closeSaveNameModal();
  showToast(`"${name}" saved`);
}

function deleteSave(name) {
  if (!confirm(`Delete "${name}"?`)) return;
  setSaves(getSaves().filter(s => s.name !== name));
  renderSavedList();
}

function duplicateSave(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  const newName = `${save.name} (copy)`;
  const saves   = getSaves();
  saves.unshift({ name: newName, savedAt: new Date().toISOString(), state: { ...save.state, promptName: newName } });
  setSaves(saves);
  renderSavedList();
  showToast(`Duplicated as "${newName}"`);
}

function loadSave(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  restoreState(save.state);
  closeSavedModal();
  showToast(`Loaded "${name}"`);
}

function exportSaveAsJSON(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  triggerDownload(new Blob([JSON.stringify(save.state, null, 2)], { type:'application/json' }), `${name.replace(/\s+/g,'_')}.json`);
}

function openSavedModal()  { renderSavedList(); document.getElementById('saved-modal').classList.add('open'); }
function closeSavedModal() { document.getElementById('saved-modal').classList.remove('open'); }

function renderSavedList() {
  const saves = getSaves();
  const container = document.getElementById('saved-list-container');
  if (!saves.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">💾</span>No saved prompts yet.<br>Click <strong>Save</strong> in the header to save the current prompt.</div>`;
    return;
  }
  container.innerHTML = `<div class="saved-list">${saves.map(s => {
    const date     = new Date(s.savedAt).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
    const model    = s.state?.model || 'generic';
    const safeName = esc(s.name);
    return `<div class="saved-item" data-name="${safeName}">
      <div class="saved-item-info">
        <div class="saved-item-name">${safeName}</div>
        <div class="saved-item-meta">${date} · ${model}</div>
      </div>
      <div class="saved-item-actions">
        <button class="icon-btn" title="Load" data-action="load">↩ Load</button>
        <button class="icon-btn" title="Duplicate" data-action="dupe">⧉ Dupe</button>
        <button class="icon-btn" title="Export .json" data-action="export">⬇ JSON</button>
        <button class="icon-btn danger" title="Delete" data-action="delete">🗑</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  container.querySelectorAll('.saved-item').forEach(item => {
    const name = saves.find(s => esc(s.name) === item.dataset.name)?.name || item.dataset.name;
    item.querySelector('[data-action="load"]').addEventListener('click',   () => loadSave(name));
    item.querySelector('[data-action="dupe"]').addEventListener('click',   () => duplicateSave(name));
    item.querySelector('[data-action="export"]').addEventListener('click', () => exportSaveAsJSON(name));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSave(name));
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function openUploadModal()  { document.getElementById('upload-modal').classList.add('open'); }
function closeUploadModal() {
  document.getElementById('upload-modal').classList.remove('open');
  document.getElementById('upload-error').style.display = 'none';
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) readUploadedFile(file);
  event.target.value = '';
}

function readUploadedFile(file) {
  if (!file.name.endsWith('.json')) { showUploadError('Only .json files are supported.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const state = JSON.parse(e.target.result);
      if (state.version !== 1) throw new Error('Unrecognized file format.');
      restoreState(state);
      closeUploadModal();
      showToast('Prompt loaded from file');
    } catch (err) {
      showUploadError('Invalid file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function showUploadError(msg) {
  const el = document.getElementById('upload-error');
  el.textContent = msg;
  el.style.display = '';
}

function onDragOver(e)  { e.preventDefault(); document.getElementById('upload-zone').classList.add('drag-over'); }
function onDragLeave()  { document.getElementById('upload-zone').classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) readUploadedFile(file);
}

// ─── Export JSON ──────────────────────────────────────────────────────────────
function exportJSON() {
  triggerDownload(new Blob([JSON.stringify(captureState(), null, 2)], { type:'application/json' }), `${appState.promptName||'prompt'}.json`);
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetAll() {
  if (!confirm('Clear all fields and start over?')) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  appState = {
    model:'claude', role:'',
    persona:{ description:'', techLevel:'50', goals:'', painPoints:'', tags:[] },
    ctx:{ company:'', domain:'', audience:'', extra:'' },
    objective:{ type:'', description:'' },
    positiveRules:[], negativeRules:[],
    glossary:[],
    tone:{ formality:'50', detail:'50', energy:'50', tags:[] },
    format:{ type:'plain', length:'', template:'' },
    fewShots:[],
    cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false },
    fallback:{ type:'', custom:'' },
    promptName:'',
  };
  currentStep = 0;
  renderAll();
  showToast('Cleared — starting fresh');
}

// ─── Facts Canvas ─────────────────────────────────────────────────────────────
// Completely separate workspace — own state, own localStorage, own preview.
// Includes key-value facts, reference docs, plus reads persona + glossary
// from appState so they appear in the facts output for reference.

let factsState = {
  facts: [],
  docs: [],
};

function loadFactsState() {
  try {
    const raw = localStorage.getItem(FACTS_KEY);
    if (raw) factsState = { facts:[], docs:[], ...JSON.parse(raw) };
  } catch(e) {}
}

function saveFactsState() {
  try { localStorage.setItem(FACTS_KEY, JSON.stringify(factsState)); } catch(e) {}
}

function openFactsCanvas() {
  loadFactsState();
  renderFactsCanvas();
  document.getElementById('facts-canvas').classList.add('open');
}
function closeFactsCanvas() {
  document.getElementById('facts-canvas').classList.remove('open');
}

function renderFactsCanvas() {
  renderFactsList();
  renderDocsList();
  renderFactsPersonaView();
  renderFactsGlossaryView();
  renderFactsPreview();
}

function renderFactsPersonaView() {
  const el = document.getElementById('facts-persona-view');
  if (!el) return;
  const p = appState.persona || {};
  if (!p.description && !(p.tags||[]).length && !p.goals) {
    el.innerHTML = `<div class="muted" style="padding:12px 0">No persona set yet — go to the <strong>Persona</strong> step in the wizard.</div>`;
    return;
  }
  const tech = parseInt(p.techLevel||50);
  const rows = [
    p.description && `<div class="ro-row"><span class="ro-key">Description</span><span class="ro-val">${esc(p.description)}</span></div>`,
    `<div class="ro-row"><span class="ro-key">Tech level</span><span class="ro-val">${tech<30?'Beginner':tech>70?'Expert':'Intermediate'}</span></div>`,
    p.goals && `<div class="ro-row"><span class="ro-key">Goals</span><span class="ro-val">${esc(p.goals)}</span></div>`,
    p.painPoints && `<div class="ro-row"><span class="ro-key">Pain points</span><span class="ro-val">${esc(p.painPoints)}</span></div>`,
    (p.tags||[]).length && `<div class="ro-row"><span class="ro-key">User type</span><span class="ro-val">${p.tags.map(t=>`<span class="summary-tag">${esc(t)}</span>`).join('')}</span></div>`,
  ].filter(Boolean);
  el.innerHTML = rows.join('');
}

function renderFactsGlossaryView() {
  const el = document.getElementById('facts-glossary-view');
  if (!el) return;
  const glossary = (appState.glossary||[]).filter(g => g.term);
  if (!glossary.length) {
    el.innerHTML = `<div class="muted" style="padding:12px 0">No glossary terms yet — go to the <strong>Glossary</strong> step in the wizard.</div>`;
    return;
  }
  el.innerHTML = glossary.map(g => `
    <div class="ro-row">
      <span class="ro-key" style="font-weight:700">${esc(g.term)}</span>
      <span class="ro-val">${esc(g.definition)}</span>
    </div>`).join('');
}

function renderFactsList() {
  const container = document.getElementById('facts-list');
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

function buildFactsOutput() {
  const lines = [];

  // Key-value facts
  const validFacts = factsState.facts.filter(f => f.key || f.value);
  if (validFacts.length) {
    lines.push('── FACTS ──────────────────────────────────────');
    validFacts.forEach(f => lines.push(`${f.key}: ${f.value}`));
    lines.push('');
  }

  // Persona from main wizard (read-only reference)
  const p = appState.persona || {};
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

  // Glossary from main wizard (read-only reference)
  const glossary = (appState.glossary||[]).filter(g => g.term);
  if (glossary.length) {
    lines.push('── GLOSSARY ────────────────────────────────────');
    glossary.forEach(g => lines.push(`${g.term}: ${g.definition}`));
    lines.push('');
  }

  // Reference documents
  const validDocs = factsState.docs.filter(d => d.title || d.content);
  validDocs.forEach(d => {
    lines.push(`── ${(d.title||'REFERENCE DOCUMENT').toUpperCase()} ${'─'.repeat(Math.max(0,44-(d.title||'').length))}`);
    lines.push(d.content || '');
    lines.push('');
  });

  return lines.join('\n').trim() || '(Add facts and reference documents on the left to build your knowledge base)';
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
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2000);
  });
}

function downloadFactsOutput() {
  triggerDownload(new Blob([buildFactsOutput()], { type:'text/plain' }), 'facts-and-context.txt');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-saved').addEventListener('click', openSavedModal);
  document.getElementById('btn-save').addEventListener('click', savePromptAs);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-upload').addEventListener('click', openUploadModal);
  document.getElementById('btn-copy').addEventListener('click', copyPrompt);
  document.getElementById('btn-download').addEventListener('click', downloadPrompt);
  document.getElementById('btn-reset').addEventListener('click', resetAll);
  document.getElementById('btn-facts').addEventListener('click', openFactsCanvas);
  document.getElementById('facts-close').addEventListener('click', closeFactsCanvas);
  document.getElementById('facts-canvas').addEventListener('click', e => { if (e.target === e.currentTarget) closeFactsCanvas(); });
  document.getElementById('btn-facts-copy').addEventListener('click', copyFactsOutput);
  document.getElementById('btn-facts-download').addEventListener('click', downloadFactsOutput);
  document.getElementById('btn-add-fact').addEventListener('click', () => {
    factsState.facts.push({ key:'', value:'' });
    saveFactsState(); renderFactsList(); renderFactsPreview();
    const inputs = document.querySelectorAll('#facts-list .facts-key');
    inputs[inputs.length-1]?.focus();
  });
  document.getElementById('btn-add-doc').addEventListener('click', () => {
    factsState.docs.push({ title:'', content:'' });
    saveFactsState(); renderDocsList(); renderFactsPreview();
    const inputs = document.querySelectorAll('#docs-list .docs-title');
    inputs[inputs.length-1]?.focus();
  });
  document.getElementById('facts-canvas-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    document.querySelectorAll('#facts-canvas-tabs [data-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.facts-tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById(`facts-panel-${tab.dataset.tab}`).style.display = '';
  });
  loadFactsState();

  document.getElementById('save-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSave();
  });

  document.getElementById('saved-modal').addEventListener('click',    e => { if (e.target===e.currentTarget) closeSavedModal(); });
  document.getElementById('upload-modal').addEventListener('click',   e => { if (e.target===e.currentTarget) closeUploadModal(); });
  document.getElementById('savename-modal').addEventListener('click', e => { if (e.target===e.currentTarget) closeSaveNameModal(); });

  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('dragover',  onDragOver);
  uploadZone.addEventListener('dragleave', onDragLeave);
  uploadZone.addEventListener('drop',      onDrop);
  uploadZone.addEventListener('click',     () => document.getElementById('file-upload-input').click());
  document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); savePromptAs(); }
    if ((e.ctrlKey||e.metaKey) && e.key === 'c' && e.shiftKey) { e.preventDefault(); copyPrompt(); }
    if (e.key === 'ArrowRight' && e.altKey) { e.preventDefault(); goTo(currentStep + 1); }
    if (e.key === 'ArrowLeft'  && e.altKey) { e.preventDefault(); goTo(currentStep - 1); }
  });

  // Restore autosave or render fresh
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.version === 1) { restoreState(saved); return; }
    }
  } catch (e) {}
  renderAll();
});
