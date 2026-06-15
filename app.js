// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'promptbuilder_autosave';
const SAVES_KEY = 'promptbuilder_saves';

const TASK_TYPES = [
  { value: 'analyze', label: 'Analyze / Evaluate' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'generate', label: 'Generate / Create' },
  { value: 'rewrite', label: 'Rewrite / Edit' },
  { value: 'classify', label: 'Classify / Categorize' },
  { value: 'extract', label: 'Extract information' },
  { value: 'answer', label: 'Answer Q&A' },
  { value: 'brainstorm', label: 'Brainstorm ideas' },
  { value: 'translate', label: 'Translate' },
  { value: 'code', label: 'Write / Review code' },
  { value: 'plan', label: 'Plan / Outline' },
  { value: 'custom', label: 'Custom' },
];

const TASK_STARTERS = {
  analyze: 'Analyze the following and provide a structured evaluation with strengths, weaknesses, and recommendations.',
  summarize: 'Summarize the provided content into key points, preserving all critical information.',
  generate: 'Generate a high-quality, original piece of content based on the specifications provided.',
  rewrite: 'Rewrite the following content to improve clarity, tone, and engagement while preserving the original meaning.',
  classify: 'Classify the input into the appropriate category and explain your reasoning.',
  extract: 'Extract the following specific information from the provided text.',
  answer: "Answer the user's questions accurately and concisely, citing your reasoning.",
  brainstorm: 'Generate a diverse list of creative ideas. Include unconventional and innovative approaches.',
  translate: 'Translate the provided content accurately while preserving tone and nuance.',
  code: 'Write clean, well-documented, production-ready code that fulfills the given requirements.',
  plan: 'Create a detailed, actionable plan or outline with clear milestones and steps.',
};

const MODEL_HINTS = {
  claude: 'Claude best practices: use XML tags like &lt;context&gt;, &lt;instructions&gt;, &lt;examples&gt;. Be direct. Use system prompt for role, human turn for task. Avoid filler phrases.',
  gpt: 'GPT best practices: use clear delimiters like ### or """. System message for role & rules. Be explicit about format. Markdown renders in ChatGPT UI.',
  gemini: 'Gemini best practices: clear instruction at the top. Use structured format with headers. Gemini responds well to examples and step-by-step breakdowns.',
  llama: 'Llama best practices: use [INST] ... [/INST] format (Llama 2) or &lt;|system|&gt; tags (Llama 3). Keep system prompt focused and concise.',
  mistral: 'Mistral best practices: similar to Llama. Use clear delimiters. Mistral models are instruction-tuned; be direct with your task description.',
  generic: 'Generic prompt: structure your prompt with clearly labeled sections. Works across most instruction-tuned models.',
};

const MODEL_LABELS = {
  claude: 'Claude', gpt: 'GPT-4', gemini: 'Gemini',
  llama: 'Llama', mistral: 'Mistral', generic: 'Generic',
};

const ROLE_PRESETS = [
  { label: 'Software Engineer', value: 'You are an expert software engineer with deep knowledge of modern web development, system design, and best practices.' },
  { label: 'Data Scientist', value: 'You are a senior data scientist and machine learning expert with expertise in statistics, Python, and ML frameworks.' },
  { label: 'Copywriter', value: 'You are a professional copywriter and content strategist specializing in persuasive, SEO-optimized content.' },
  { label: 'Product Manager', value: 'You are an expert product manager with experience at top tech companies, skilled in roadmapping, user research, and stakeholder communication.' },
  { label: 'Financial Analyst', value: 'You are a seasoned financial analyst with expertise in valuation, financial modeling, and investment analysis.' },
  { label: 'Legal Assistant', value: 'You are an expert legal assistant with broad knowledge of contract law, compliance, and regulatory frameworks.' },
  { label: 'Creative Writer', value: 'You are a creative writing coach and storytelling expert who helps craft compelling narratives and characters.' },
  { label: 'UX Designer', value: 'You are a UX/UI design expert who provides actionable feedback on user experience, accessibility, and visual design.' },
];

const TONE_TAGS = ['Empathetic', 'Authoritative', 'Friendly', 'Witty', 'Analytical', 'Inspirational', 'Socratic', 'Direct', 'Diplomatic'];

const COT_STEPS_TAGS = ['Restate the problem', 'Identify assumptions', 'List unknowns', 'Consider edge cases', 'Evaluate alternatives', 'Check for contradictions', 'Estimate confidence', 'Cite sources / evidence'];

const COT_STYLES = [
  { value: 'think-step', label: 'Think step by step before answering' },
  { value: 'scratchpad', label: 'Use a scratchpad, then provide final answer' },
  { value: 'reasoning-tags', label: 'Show reasoning in <thinking> tags (Claude)' },
  { value: 'lets-think', label: "Let's think about this carefully..." },
  { value: 'first-principles', label: 'Break this down from first principles' },
  { value: 'custom', label: 'Custom (write your own)' },
];

const COT_MAP = {
  'think-step': 'Think step by step before providing your final answer.',
  'scratchpad': 'First use a scratchpad to work through your reasoning, then provide your final answer clearly labeled.',
  'reasoning-tags': 'Show all reasoning inside <thinking> tags before your final response.',
  'lets-think': "Let's think about this carefully and methodically before arriving at an answer.",
  'first-principles': 'Break this down from first principles. Identify core assumptions, reason step by step, and derive your answer logically.',
};

const FALLBACK_TYPES = [
  { value: '', label: 'No fallback instruction' },
  { value: 'ask', label: 'Ask for clarification' },
  { value: 'best-effort', label: 'Make a best-effort attempt and flag uncertainty' },
  { value: 'refuse', label: 'Politely decline and explain why' },
  { value: 'partial', label: 'Provide a partial answer and note limitations' },
  { value: 'rephrase', label: 'Rephrase the question back to the user' },
  { value: 'custom', label: 'Custom fallback' },
];

const FALLBACK_MAP = {
  ask: 'If the request is unclear or ambiguous, ask clarifying questions before proceeding.',
  'best-effort': 'If you are uncertain, make a best-effort attempt and clearly flag any assumptions or limitations.',
  refuse: 'If the request is outside your scope or capabilities, politely decline and briefly explain why.',
  partial: 'If you can only partially fulfill the request, do so and clearly note what is missing or uncertain.',
  rephrase: 'If unclear, rephrase the question back to the user in your own words and ask for confirmation.',
};

// ─── App state (non-DOM) ─────────────────────────────────────────────────────
let currentStep = 0;
let autosaveTimer = null;
let ruleCounters = { pos: 0, neg: 0, cotr: 0, cotc: 0 };
let shotCounter = 0;

// ─── Step definitions ─────────────────────────────────────────────────────────
// Each step has: id, title, icon, render(), summary(), bind()
const steps = [
  {
    id: 'model',
    title: 'Target Model',
    icon: '🤖',
    render() {
      return `
        <div>
          <label>Select your target model</label>
          <select id="target-model">
            <option value="claude">Claude (Anthropic)</option>
            <option value="gpt">GPT-4 / ChatGPT (OpenAI)</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="llama">Llama (Meta)</option>
            <option value="mistral">Mistral</option>
            <option value="generic">Generic / Universal</option>
          </select>
        </div>
        <div class="model-hint" id="model-hint">${MODEL_HINTS.claude}</div>`;
    },
    bind() {
      document.getElementById('target-model').addEventListener('change', () => {
        const val = document.getElementById('target-model').value;
        document.getElementById('model-hint').innerHTML = MODEL_HINTS[val] || MODEL_HINTS.generic;
        updateHeaderSubtitle();
        scheduleAutosave();
        updatePreview();
      });
    },
    summary() {
      const model = document.getElementById('target-model')?.value || 'claude';
      return `<div class="summary-content">${MODEL_LABELS[model] || model}</div>`;
    },
    read() {
      return { model: document.getElementById('target-model')?.value || 'claude' };
    },
  },

  {
    id: 'role',
    title: 'Role',
    icon: '🎭',
    render() {
      const presetsHtml = ROLE_PRESETS.map(p =>
        `<button class="preset-btn" data-value="${esc(p.value)}">${esc(p.label)}</button>`
      ).join('');
      return `
        <div>
          <label>Presets</label>
          <div class="preset-grid" id="role-presets">${presetsHtml}</div>
        </div>
        <div>
          <label>Custom role description</label>
          <textarea id="role-custom" placeholder="You are a..." rows="3"></textarea>
        </div>`;
    },
    bind() {
      document.querySelectorAll('#role-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#role-presets .preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById('role-custom').value = btn.dataset.value;
          scheduleAutosave(); updatePreview();
        });
      });
      document.getElementById('role-custom').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
    },
    summary() {
      const val = document.getElementById('role-custom')?.value?.trim();
      if (!val) return `<div class="summary-content"><em>Not set</em></div>`;
      return `<div class="summary-content">${esc(val.slice(0, 80))}${val.length > 80 ? '…' : ''}</div>`;
    },
    read() {
      return { role: document.getElementById('role-custom')?.value || '' };
    },
  },

  {
    id: 'context',
    title: 'Context',
    icon: '🏢',
    render() {
      return `
        <div class="row-2">
          <div>
            <label>Company / Organization</label>
            <input type="text" id="ctx-company" placeholder="e.g. Acme Corp">
          </div>
          <div>
            <label>Industry / Domain</label>
            <input type="text" id="ctx-domain" placeholder="e.g. SaaS, Healthcare">
          </div>
        </div>
        <div>
          <label>Target audience</label>
          <input type="text" id="ctx-audience" placeholder="e.g. non-technical executives, developers">
        </div>
        <div>
          <label>Additional context</label>
          <textarea id="ctx-extra" placeholder="Any relevant background information, constraints, or situational details..."></textarea>
        </div>`;
    },
    bind() {
      ['ctx-company', 'ctx-domain', 'ctx-audience', 'ctx-extra'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
      });
    },
    summary() {
      const company = document.getElementById('ctx-company')?.value?.trim();
      const domain = document.getElementById('ctx-domain')?.value?.trim();
      const audience = document.getElementById('ctx-audience')?.value?.trim();
      const parts = [company && `Company: ${company}`, domain && `Domain: ${domain}`, audience && `Audience: ${audience}`].filter(Boolean);
      if (!parts.length) return `<div class="summary-content"><em>Not set</em></div>`;
      return `<div class="summary-content">${parts.map(esc).join('<br>')}</div>`;
    },
    read() {
      return {
        ctx: {
          company: document.getElementById('ctx-company')?.value || '',
          domain: document.getElementById('ctx-domain')?.value || '',
          audience: document.getElementById('ctx-audience')?.value || '',
          extra: document.getElementById('ctx-extra')?.value || '',
        }
      };
    },
  },

  {
    id: 'objective',
    title: 'Objective',
    icon: '🎯',
    render() {
      const buttonsHtml = TASK_TYPES.map(t =>
        `<button class="task-type-btn" data-value="${t.value}">${esc(t.label)}</button>`
      ).join('');
      return `
        <div>
          <label>Task type</label>
          <div class="task-type-grid" id="task-type-grid">${buttonsHtml}</div>
        </div>
        <div>
          <label>Describe the specific objective</label>
          <textarea id="obj-description" placeholder="What exactly should the AI accomplish? Be specific..."></textarea>
        </div>`;
    },
    bind() {
      document.querySelectorAll('#task-type-grid .task-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const wasActive = btn.classList.contains('active');
          document.querySelectorAll('#task-type-grid .task-type-btn').forEach(b => b.classList.remove('active'));
          if (!wasActive) {
            btn.classList.add('active');
            const desc = document.getElementById('obj-description');
            if (!desc.value && TASK_STARTERS[btn.dataset.value]) {
              desc.value = TASK_STARTERS[btn.dataset.value];
            }
          }
          scheduleAutosave(); updatePreview();
        });
      });
      document.getElementById('obj-description').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
    },
    summary() {
      const activeBtn = document.querySelector('#task-type-grid .task-type-btn.active');
      const desc = document.getElementById('obj-description')?.value?.trim();
      const typePart = activeBtn ? `<span class="summary-tag">${esc(activeBtn.textContent)}</span>` : '';
      const descPart = desc ? `<div class="summary-content" style="margin-top:6px">${esc(desc.slice(0, 70))}${desc.length > 70 ? '…' : ''}</div>` : '';
      if (!typePart && !descPart) return `<div class="summary-content"><em>Not set</em></div>`;
      return `<div class="summary-tags">${typePart}</div>${descPart}`;
    },
    read() {
      const activeBtn = document.querySelector('#task-type-grid .task-type-btn.active');
      return {
        objective: {
          type: activeBtn?.dataset.value || '',
          description: document.getElementById('obj-description')?.value || '',
        }
      };
    },
  },

  {
    id: 'rules',
    title: 'Positive Rules',
    icon: '✅',
    render() {
      return `
        <label>Things the AI should always do</label>
        <div class="rule-list" id="positive-rules"></div>
        <button class="add-btn" id="add-pos-rule">+ Add rule</button>`;
    },
    bind() {
      document.getElementById('add-pos-rule').addEventListener('click', () => addRule('positive-rules', 'pos'));
    },
    summary() {
      const rules = getRuleValues('positive-rules');
      if (!rules.length) return `<div class="summary-content"><em>None added</em></div>`;
      return `<div class="summary-content">${rules.slice(0, 3).map(r => `• ${esc(r)}`).join('<br>')}${rules.length > 3 ? `<br><em>+${rules.length - 3} more</em>` : ''}</div>`;
    },
    read() { return { positiveRules: getRuleValues('positive-rules') }; },
  },

  {
    id: 'constraints',
    title: 'Negative Constraints',
    icon: '🚫',
    render() {
      return `
        <label>Things the AI should never do</label>
        <div class="rule-list" id="negative-rules"></div>
        <button class="add-btn" id="add-neg-rule">+ Add constraint</button>`;
    },
    bind() {
      document.getElementById('add-neg-rule').addEventListener('click', () => addRule('negative-rules', 'neg'));
    },
    summary() {
      const rules = getRuleValues('negative-rules');
      if (!rules.length) return `<div class="summary-content"><em>None added</em></div>`;
      return `<div class="summary-content">${rules.slice(0, 3).map(r => `• ${esc(r)}`).join('<br>')}${rules.length > 3 ? `<br><em>+${rules.length - 3} more</em>` : ''}</div>`;
    },
    read() { return { negativeRules: getRuleValues('negative-rules') }; },
  },

  {
    id: 'tone',
    title: 'Tone',
    icon: '🎨',
    render() {
      const tagsHtml = TONE_TAGS.map(t => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`).join('');
      return `
        <div class="tone-row">
          <div class="tone-slider-row">
            <span>Formal</span>
            <input type="range" id="tone-formality" min="0" max="100" value="50">
            <span>Casual</span>
          </div>
          <div class="tone-slider-row">
            <span>Concise</span>
            <input type="range" id="tone-detail" min="0" max="100" value="50">
            <span>Detailed</span>
          </div>
          <div class="tone-slider-row">
            <span>Neutral</span>
            <input type="range" id="tone-energy" min="0" max="100" value="50">
            <span>Enthusiastic</span>
          </div>
        </div>
        <div>
          <label>Additional tone tags</label>
          <div class="tag-picker" id="tone-tags">${tagsHtml}</div>
        </div>`;
    },
    bind() {
      ['tone-formality', 'tone-detail', 'tone-energy'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { syncSlider(el); el.addEventListener('input', () => { syncSlider(el); scheduleAutosave(); updatePreview(); }); }
      });
      document.querySelectorAll('#tone-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => { tag.classList.toggle('active'); scheduleAutosave(); updatePreview(); });
      });
    },
    summary() {
      const activeTags = [...(document.querySelectorAll('#tone-tags .tag.active') || [])].map(t => t.dataset.tag);
      const fVal = parseInt(document.getElementById('tone-formality')?.value || 50);
      let fLabel = fVal < 30 ? 'Formal' : fVal > 70 ? 'Casual' : 'Balanced';
      const parts = [fLabel, ...activeTags];
      return `<div class="summary-tags">${parts.map(p => `<span class="summary-tag">${esc(p)}</span>`).join('')}</div>`;
    },
    read() {
      return {
        tone: {
          formality: document.getElementById('tone-formality')?.value || '50',
          detail: document.getElementById('tone-detail')?.value || '50',
          energy: document.getElementById('tone-energy')?.value || '50',
          tags: [...(document.querySelectorAll('#tone-tags .tag.active') || [])].map(t => t.dataset.tag),
        }
      };
    },
  },

  {
    id: 'format',
    title: 'Output Format',
    icon: '📄',
    render() {
      return `
        <div>
          <label>Format type</label>
          <select id="fmt-type">
            <option value="plain">Plain text</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="bullet">Bullet list</option>
            <option value="numbered">Numbered list</option>
            <option value="table">Table</option>
            <option value="html">HTML</option>
            <option value="template">Custom template</option>
          </select>
        </div>
        <div id="fmt-template-row" style="display:none">
          <label>Custom template (use {placeholders})</label>
          <textarea id="fmt-template" placeholder="**Title:** {title}&#10;**Summary:** {summary}&#10;**Action items:** {actions}"></textarea>
        </div>
        <div>
          <label>Length guidance</label>
          <select id="fmt-length">
            <option value="">No specific length</option>
            <option value="1-2 sentences">1–2 sentences</option>
            <option value="1 paragraph">1 paragraph</option>
            <option value="3-5 bullet points">3–5 bullet points</option>
            <option value="under 200 words">Under 200 words</option>
            <option value="under 500 words">Under 500 words</option>
            <option value="500-1000 words">500–1000 words</option>
            <option value="comprehensive, no limit">Comprehensive, no limit</option>
          </select>
        </div>`;
    },
    bind() {
      const fmtType = document.getElementById('fmt-type');
      const fmtTemplateRow = document.getElementById('fmt-template-row');
      fmtType.addEventListener('change', () => {
        fmtTemplateRow.style.display = fmtType.value === 'template' ? '' : 'none';
        scheduleAutosave(); updatePreview();
      });
      document.getElementById('fmt-length').addEventListener('change', () => { scheduleAutosave(); updatePreview(); });
      document.getElementById('fmt-template').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
    },
    summary() {
      const fmt = document.getElementById('fmt-type')?.value || 'plain';
      const len = document.getElementById('fmt-length')?.value;
      const fmtLabels = { plain: 'Plain text', markdown: 'Markdown', json: 'JSON', bullet: 'Bullet list', numbered: 'Numbered list', table: 'Table', html: 'HTML', template: 'Custom template' };
      const parts = [fmtLabels[fmt] || fmt, len || ''].filter(Boolean);
      return `<div class="summary-tags">${parts.map(p => `<span class="summary-tag">${esc(p)}</span>`).join('')}</div>`;
    },
    read() {
      return {
        format: {
          type: document.getElementById('fmt-type')?.value || 'plain',
          length: document.getElementById('fmt-length')?.value || '',
          template: document.getElementById('fmt-template')?.value || '',
        }
      };
    },
  },

  {
    id: 'examples',
    title: 'Few-Shot Examples',
    icon: '💡',
    render() {
      return `
        <label>Provide input → output pairs to guide the model</label>
        <div id="few-shot-list" style="display:flex;flex-direction:column;gap:10px;"></div>
        <button class="add-btn" id="add-few-shot">+ Add example pair</button>`;
    },
    bind() {
      document.getElementById('add-few-shot').addEventListener('click', addFewShot);
    },
    summary() {
      const count = document.querySelectorAll('#few-shot-list .few-shot-pair')?.length || 0;
      if (!count) return `<div class="summary-content"><em>No examples added</em></div>`;
      return `<div class="summary-content">${count} example pair${count !== 1 ? 's' : ''}</div>`;
    },
    read() {
      return {
        fewShots: [...(document.querySelectorAll('#few-shot-list .few-shot-pair') || [])].map(pair => {
          const [a, b] = pair.querySelectorAll('textarea');
          return { input: a?.value || '', output: b?.value || '' };
        })
      };
    },
  },

  {
    id: 'cot',
    title: 'Chain of Thought',
    icon: '🔗',
    render() {
      const styleOptions = COT_STYLES.map(s => `<option value="${s.value}">${esc(s.label)}</option>`).join('');
      const stepsHtml = COT_STEPS_TAGS.map(t => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`).join('');
      return `
        <div class="toggle-row">
          <span class="toggle-label">Enable chain-of-thought reasoning</span>
          <label class="toggle">
            <input type="checkbox" id="cot-enabled">
            <span class="toggle-track"></span>
          </label>
        </div>
        <div id="cot-options" style="display:none;flex-direction:column;gap:14px;">
          <div>
            <label>Built-in CoT style</label>
            <select id="cot-style">${styleOptions}</select>
          </div>
          <div id="cot-custom-row" style="display:none">
            <label>Custom CoT instruction</label>
            <textarea id="cot-custom" placeholder="e.g. Before answering, list your assumptions, then reason through each one..." rows="3"></textarea>
          </div>
          <div>
            <label>Reasoning rules <span style="color:var(--muted);font-weight:400;">(applied inside the thinking phase)</span></label>
            <div class="rule-list" id="cot-rules"></div>
            <button class="add-btn" id="add-cot-rule">+ Add reasoning rule</button>
          </div>
          <div>
            <label>Reasoning constraints <span style="color:var(--muted);font-weight:400;">(things to avoid while reasoning)</span></label>
            <div class="rule-list" id="cot-constraints"></div>
            <button class="add-btn" id="add-cot-constraint">+ Add reasoning constraint</button>
          </div>
          <div>
            <label>Required reasoning steps</label>
            <div class="tag-picker" id="cot-steps">${stepsHtml}</div>
          </div>
          <div class="toggle-row">
            <span class="toggle-label" style="font-size:0.82rem;">Separate reasoning from final answer</span>
            <label class="toggle">
              <input type="checkbox" id="cot-separate">
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>`;
    },
    bind() {
      const enabled = document.getElementById('cot-enabled');
      const optionsEl = document.getElementById('cot-options');
      enabled.addEventListener('change', () => {
        optionsEl.style.display = enabled.checked ? 'flex' : 'none';
        scheduleAutosave(); updatePreview();
      });
      const styleEl = document.getElementById('cot-style');
      styleEl.addEventListener('change', () => {
        document.getElementById('cot-custom-row').style.display = styleEl.value === 'custom' ? '' : 'none';
        scheduleAutosave(); updatePreview();
      });
      document.getElementById('cot-custom').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
      document.getElementById('add-cot-rule').addEventListener('click', () => addRule('cot-rules', 'cotr', 'e.g. Always verify numerical claims before concluding'));
      document.getElementById('add-cot-constraint').addEventListener('click', () => addRule('cot-constraints', 'cotc', 'e.g. Do not jump to conclusions without evidence'));
      document.querySelectorAll('#cot-steps .tag').forEach(tag => {
        tag.addEventListener('click', () => { tag.classList.toggle('active'); scheduleAutosave(); updatePreview(); });
      });
      document.getElementById('cot-separate').addEventListener('change', () => { scheduleAutosave(); updatePreview(); });
    },
    summary() {
      const enabled = document.getElementById('cot-enabled')?.checked;
      if (!enabled) return `<div class="summary-content"><em>Disabled</em></div>`;
      const style = document.getElementById('cot-style')?.value;
      const styleLabel = COT_STYLES.find(s => s.value === style)?.label || style;
      return `<div class="summary-tags"><span class="summary-tag">Enabled</span></div><div class="summary-content" style="margin-top:6px">${esc(styleLabel)}</div>`;
    },
    read() {
      return {
        cot: {
          enabled: document.getElementById('cot-enabled')?.checked || false,
          style: document.getElementById('cot-style')?.value || 'think-step',
          custom: document.getElementById('cot-custom')?.value || '',
          rules: getRuleValues('cot-rules'),
          constraints: getRuleValues('cot-constraints'),
          steps: [...(document.querySelectorAll('#cot-steps .tag.active') || [])].map(t => t.dataset.tag),
          separate: document.getElementById('cot-separate')?.checked || false,
        }
      };
    },
  },

  {
    id: 'fallback',
    title: 'Fallback Behavior',
    icon: '⚠️',
    render() {
      const options = FALLBACK_TYPES.map(f => `<option value="${f.value}">${esc(f.label)}</option>`).join('');
      return `
        <div>
          <label>When the request is unclear or out of scope</label>
          <select id="fallback-type">${options}</select>
        </div>
        <div id="fallback-custom-row" style="display:none">
          <label>Custom fallback instruction</label>
          <textarea id="fallback-custom" placeholder="Describe how the AI should handle uncertain or out-of-scope requests..."></textarea>
        </div>`;
    },
    bind() {
      const typeEl = document.getElementById('fallback-type');
      typeEl.addEventListener('change', () => {
        document.getElementById('fallback-custom-row').style.display = typeEl.value === 'custom' ? '' : 'none';
        scheduleAutosave(); updatePreview();
      });
      document.getElementById('fallback-custom').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
    },
    summary() {
      const val = document.getElementById('fallback-type')?.value;
      if (!val) return `<div class="summary-content"><em>Not set</em></div>`;
      const label = FALLBACK_TYPES.find(f => f.value === val)?.label || val;
      return `<div class="summary-content">${esc(label)}</div>`;
    },
    read() {
      return {
        fallback: {
          type: document.getElementById('fallback-type')?.value || '',
          custom: document.getElementById('fallback-custom')?.value || '',
        }
      };
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncSlider(el) {
  el.style.setProperty('--pct', el.value + '%');
}

function getRuleValues(listId) {
  return [...(document.querySelectorAll(`#${listId} input`) || [])].map(i => i.value.trim()).filter(Boolean);
}

// ─── Rule management ──────────────────────────────────────────────────────────
function addRule(listId, prefix, placeholder = 'Enter...') {
  const id = `${prefix}-${ruleCounters[prefix]++}`;
  const item = document.createElement('div');
  item.className = 'rule-item';
  item.id = id;
  item.innerHTML = `<input type="text" placeholder="${esc(placeholder)}"><button class="remove-btn" data-target="${id}">×</button>`;
  document.getElementById(listId).appendChild(item);
  item.querySelector('.remove-btn').addEventListener('click', () => { item.remove(); scheduleAutosave(); updatePreview(); });
  item.querySelector('input').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
  item.querySelector('input').focus();
  scheduleAutosave(); updatePreview();
}

// ─── Few-shot management ─────────────────────────────────────────────────────
function addFewShot() {
  const n = ++shotCounter;
  const id = `shot-${n}`;
  const div = document.createElement('div');
  div.className = 'few-shot-pair';
  div.id = id;
  div.innerHTML = `
    <div class="few-shot-pair-header">
      <span class="few-shot-label">Example ${n}</span>
      <button class="remove-btn" data-target="${id}">×</button>
    </div>
    <div><label>Input</label><textarea placeholder="User input or question..."></textarea></div>
    <div><label>Expected Output</label><textarea placeholder="Ideal response..."></textarea></div>`;
  div.querySelector('.remove-btn').addEventListener('click', () => { div.remove(); scheduleAutosave(); updatePreview(); });
  div.querySelectorAll('textarea').forEach(ta => ta.addEventListener('input', () => { scheduleAutosave(); updatePreview(); }));
  document.getElementById('few-shot-list').appendChild(div);
  scheduleAutosave(); updatePreview();
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderMain();
  updatePreview();
  updateHeaderSubtitle();
}

function renderSidebar() {
  const container = document.getElementById('sidebar-steps');
  container.innerHTML = steps.map((step, i) => {
    const isDone = i < currentStep;
    const isActive = i === currentStep;
    const cls = isActive ? 'active' : isDone ? 'done' : '';
    const circleContent = isDone ? '✓' : (i + 1);
    return `<div class="sidebar-step ${cls}" data-step="${i}">
      <div class="step-circle">${circleContent}</div>
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

  // Active card
  const activeHtml = `
    <div class="step-card active-card">
      <div class="step-card-header">
        <span class="step-card-icon">${step.icon}</span>
        <span class="step-card-title">${esc(step.title)}</span>
        <span class="editing-badge">Editing</span>
      </div>
      <div class="step-card-body" id="active-step-body">
        ${step.render()}
      </div>
      <div class="step-card-nav">
        <button class="btn btn-ghost btn-sm" id="btn-back" ${currentStep === 0 ? 'disabled style="opacity:0.4"' : ''}>← Back</button>
        <span style="font-size:0.75rem;color:var(--muted)">Step ${currentStep + 1} of ${steps.length}</span>
        <button class="btn btn-primary btn-sm" id="btn-next">${currentStep === steps.length - 1 ? 'Finish ✓' : 'Next →'}</button>
      </div>
    </div>`;

  // Summary cards for completed steps (steps before current)
  let summaryHtml = '';
  if (currentStep > 0) {
    const completedSteps = steps.slice(0, currentStep);
    // Group into pairs for 2-col grid
    summaryHtml = `<div class="summary-grid">`;
    completedSteps.forEach((s, i) => {
      const stepIdx = i;
      // Full-width for steps with long content (rules, examples, cot)
      const fullWidth = ['rules', 'constraints', 'examples', 'cot'].includes(s.id) ? ' full-width' : '';
      summaryHtml += `
        <div class="summary-card${fullWidth}" data-step="${stepIdx}">
          <div class="summary-card-header">
            <span class="summary-card-icon">${s.icon}</span>
            <span class="summary-card-title">${esc(s.title)}</span>
          </div>
          ${s.summary()}
        </div>`;
    });
    summaryHtml += `</div>`;
  }

  main.innerHTML = summaryHtml + activeHtml;

  // Bind active step events
  step.bind();

  // Nav buttons
  document.getElementById('btn-back').addEventListener('click', () => goTo(currentStep - 1));
  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentStep < steps.length - 1) goTo(currentStep + 1);
  });

  // Summary card navigation
  main.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => goTo(parseInt(card.dataset.step)));
  });
}

function goTo(n) {
  if (n < 0 || n >= steps.length) return;
  // Persist DOM state of current active step before switching
  // (state is already in the DOM since we read live; no extra capture needed)
  currentStep = n;
  renderAll();
  document.getElementById('main-area').scrollTop = 0;
}

// ─── buildPrompt ──────────────────────────────────────────────────────────────
function buildPrompt() {
  const model = document.getElementById('target-model')?.value || 'claude';
  const useXml = model === 'claude';
  const lines = [];

  const wrap = (tag, content) => useXml ? `<${tag}>\n${content}\n</${tag}>` : content;

  // ROLE
  const role = document.getElementById('role-custom')?.value?.trim();
  if (role) {
    lines.push(useXml ? wrap('role', role) : `ROLE:\n${role}`);
    lines.push('');
  }

  // CONTEXT
  const company = document.getElementById('ctx-company')?.value?.trim();
  const domain = document.getElementById('ctx-domain')?.value?.trim();
  const audience = document.getElementById('ctx-audience')?.value?.trim();
  const extra = document.getElementById('ctx-extra')?.value?.trim();
  const ctxParts = [];
  if (company) ctxParts.push(`Company: ${company}`);
  if (domain) ctxParts.push(`Domain: ${domain}`);
  if (audience) ctxParts.push(`Audience: ${audience}`);
  if (extra) ctxParts.push(extra);
  if (ctxParts.length) {
    lines.push(useXml ? wrap('context', ctxParts.join('\n')) : `CONTEXT:\n${ctxParts.join('\n')}`);
    lines.push('');
  }

  // OBJECTIVE
  const activeTypeBtn = document.querySelector('#task-type-grid .task-type-btn.active');
  const objDesc = document.getElementById('obj-description')?.value?.trim();
  if (activeTypeBtn || objDesc) {
    const parts = [];
    if (activeTypeBtn) parts.push(`Task type: ${activeTypeBtn.textContent}`);
    if (objDesc) parts.push(objDesc);
    lines.push(useXml ? wrap('objective', parts.join('\n')) : `OBJECTIVE:\n${parts.join('\n')}`);
    lines.push('');
  }

  // POSITIVE RULES
  const posRules = getRuleValues('positive-rules');
  if (posRules.length) {
    const content = posRules.map(r => `• ${r}`).join('\n');
    lines.push(useXml ? wrap('instructions', content) : `INSTRUCTIONS (Do):\n${content}`);
    lines.push('');
  }

  // NEGATIVE CONSTRAINTS
  const negRules = getRuleValues('negative-rules');
  if (negRules.length) {
    const content = negRules.map(r => `• ${r}`).join('\n');
    lines.push(useXml ? wrap('constraints', content) : `CONSTRAINTS (Don\'t):\n${content}`);
    lines.push('');
  }

  // TONE
  const formalityVal = parseInt(document.getElementById('tone-formality')?.value || 50);
  const detailVal = parseInt(document.getElementById('tone-detail')?.value || 50);
  const energyVal = parseInt(document.getElementById('tone-energy')?.value || 50);
  const activeToneTags = [...(document.querySelectorAll('#tone-tags .tag.active') || [])].map(t => t.dataset.tag);

  const toneDesc = [];
  if (formalityVal < 30) toneDesc.push('formal and professional');
  else if (formalityVal > 70) toneDesc.push('casual and conversational');
  else toneDesc.push('moderately professional');
  if (detailVal < 30) toneDesc.push('concise');
  else if (detailVal > 70) toneDesc.push('detailed and thorough');
  if (energyVal > 70) toneDesc.push('enthusiastic');
  if (activeToneTags.length) toneDesc.push(...activeToneTags.map(t => t.toLowerCase()));

  const toneContent = `Write in a ${toneDesc.join(', ')} tone.`;
  lines.push(useXml ? wrap('tone', toneContent) : `TONE:\n${toneContent}`);
  lines.push('');

  // OUTPUT FORMAT
  const fmt = document.getElementById('fmt-type')?.value || 'plain';
  const fmtLength = document.getElementById('fmt-length')?.value;
  const fmtTemplate = document.getElementById('fmt-template')?.value?.trim();
  const fmtLabels = { plain: 'plain text', markdown: 'Markdown', json: 'JSON', bullet: 'bullet list', numbered: 'numbered list', table: 'table', html: 'HTML', template: 'the following template' };
  const fmtParts = [`Format your response as ${fmtLabels[fmt] || fmt}.`];
  if (fmtLength) fmtParts.push(`Length: ${fmtLength}.`);
  if (fmtTemplate) fmtParts.push(`\nTemplate:\n${fmtTemplate}`);
  const fmtContent = fmtParts.join(' ');
  lines.push(useXml ? wrap('output_format', fmtContent) : `OUTPUT FORMAT:\n${fmtContent}`);
  lines.push('');

  // FEW-SHOT EXAMPLES
  const shots = [...(document.querySelectorAll('#few-shot-list .few-shot-pair') || [])];
  const validShots = shots.map(s => {
    const [inp, out] = s.querySelectorAll('textarea');
    return { input: inp?.value?.trim() || '', output: out?.value?.trim() || '' };
  }).filter(s => s.input || s.output);

  if (validShots.length) {
    const exContent = validShots.map((s, i) => `Example ${i + 1}:\nInput: ${s.input}\nOutput: ${s.output}`).join('\n\n');
    lines.push(useXml ? wrap('examples', exContent) : `EXAMPLES:\n${exContent}`);
    lines.push('');
  }

  // CHAIN OF THOUGHT
  const cotEnabled = document.getElementById('cot-enabled')?.checked;
  if (cotEnabled) {
    const cotStyle = document.getElementById('cot-style')?.value || 'think-step';
    const cotCustom = document.getElementById('cot-custom')?.value?.trim();
    const baseInstruction = cotStyle === 'custom' ? cotCustom : (COT_MAP[cotStyle] || COT_MAP['think-step']);

    const cotRules = getRuleValues('cot-rules');
    const cotConstraints = getRuleValues('cot-constraints');
    const requiredSteps = [...(document.querySelectorAll('#cot-steps .tag.active') || [])].map(t => t.dataset.tag);
    const separate = document.getElementById('cot-separate')?.checked;

    const cotParts = [baseInstruction];
    if (requiredSteps.length) cotParts.push(`\nYour reasoning must include these steps:\n${requiredSteps.map(s => `• ${s}`).join('\n')}`);
    if (cotRules.length) cotParts.push(`\nReasoning rules:\n${cotRules.map(r => `• ${r}`).join('\n')}`);
    if (cotConstraints.length) cotParts.push(`\nReasoning constraints:\n${cotConstraints.map(c => `• Do not: ${c}`).join('\n')}`);
    if (separate) cotParts.push(`\nClearly separate your reasoning from your final answer using a divider or label (e.g. "Final Answer:").`);

    const cotContent = cotParts.join('');
    lines.push(useXml ? wrap('thinking_instruction', cotContent) : `REASONING PROCESS:\n${cotContent}`);
    lines.push('');
  }

  // FALLBACK
  const fallback = document.getElementById('fallback-type')?.value;
  const fallbackCustom = document.getElementById('fallback-custom')?.value?.trim();
  const fallbackText = fallback === 'custom' ? fallbackCustom : FALLBACK_MAP[fallback];
  if (fallback && fallbackText) {
    lines.push(useXml ? wrap('fallback', fallbackText) : `FALLBACK BEHAVIOR:\n${fallbackText}`);
    lines.push('');
  }

  // TASK PLACEHOLDER
  lines.push(useXml ? '<task>\n{{USER_INPUT_HERE}}\n</task>' : 'TASK:\n{{USER_INPUT_HERE}}');

  return lines.join('\n').trim();
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function updatePreview() {
  const prompt = buildPrompt();
  const highlighted = syntaxHighlight(prompt);
  document.getElementById('prompt-output').innerHTML = highlighted;
  document.getElementById('char-count').textContent = prompt.length.toLocaleString();
  document.getElementById('token-count').textContent = Math.round(prompt.length / 4).toLocaleString();
}

function syntaxHighlight(text) {
  // Escape HTML first, then colorize XML tags
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/(&lt;\/?[\w_]+&gt;)/g, '<span class="xml-tag">$1</span>');
}

// ─── Header subtitle ─────────────────────────────────────────────────────────
function updateHeaderSubtitle() {
  const model = document.getElementById('target-model')?.value || 'claude';
  const role = document.getElementById('role-custom')?.value?.trim();
  const parts = [MODEL_LABELS[model] || model];
  if (role) parts.push(role.split(' ').slice(0, 5).join(' ') + (role.split(' ').length > 5 ? '…' : ''));
  document.getElementById('header-subtitle').textContent = parts.join(' · ');
}

// ─── Copy / Download ─────────────────────────────────────────────────────────
function copyPrompt() {
  const text = buildPrompt();
  navigator.clipboard.writeText(text).then(() => {
    const fb = document.getElementById('copy-feedback');
    fb.classList.add('show');
    setTimeout(() => fb.classList.remove('show'), 2000);
  });
}

function downloadPrompt() {
  triggerDownload(new Blob([buildPrompt()], { type: 'text/plain' }), 'prompt.txt');
}

function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Auto-save ────────────────────────────────────────────────────────────────
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
  const state = { version: 1 };
  steps.forEach(step => Object.assign(state, step.read()));
  return state;
}

function restoreState(state) {
  if (!state || state.version !== 1) return;

  // model
  const modelEl = document.getElementById('target-model');
  if (modelEl && state.model) {
    modelEl.value = state.model;
    const hint = document.getElementById('model-hint');
    if (hint) hint.innerHTML = MODEL_HINTS[state.model] || MODEL_HINTS.generic;
  }

  // role
  const roleEl = document.getElementById('role-custom');
  if (roleEl && state.role != null) {
    roleEl.value = state.role;
    document.querySelectorAll('#role-presets .preset-btn').forEach(b => b.classList.remove('active'));
  }

  // context
  const ctx = state.ctx || {};
  ['company', 'domain', 'audience', 'extra'].forEach(k => {
    const el = document.getElementById(`ctx-${k}`);
    if (el) el.value = ctx[k] || '';
  });

  // objective
  const obj = state.objective || {};
  document.querySelectorAll('#task-type-grid .task-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.value === obj.type);
  });
  const objDesc = document.getElementById('obj-description');
  if (objDesc) objDesc.value = obj.description || '';

  // rules
  rebuildRuleList('positive-rules', 'pos', state.positiveRules || [], 'Enter rule...');
  rebuildRuleList('negative-rules', 'neg', state.negativeRules || [], 'Enter constraint...');

  // tone
  const tone = state.tone || {};
  ['formality', 'detail', 'energy'].forEach(k => {
    const el = document.getElementById(`tone-${k}`);
    if (el && tone[k] != null) { el.value = tone[k]; syncSlider(el); }
  });
  document.querySelectorAll('#tone-tags .tag').forEach(tag => {
    tag.classList.toggle('active', (tone.tags || []).includes(tag.dataset.tag));
  });

  // format
  const fmt = state.format || {};
  const fmtTypeEl = document.getElementById('fmt-type');
  if (fmtTypeEl) {
    fmtTypeEl.value = fmt.type || 'plain';
    const fmtTemplateRow = document.getElementById('fmt-template-row');
    if (fmtTemplateRow) fmtTemplateRow.style.display = fmt.type === 'template' ? '' : 'none';
  }
  const fmtLenEl = document.getElementById('fmt-length');
  if (fmtLenEl) fmtLenEl.value = fmt.length || '';
  const fmtTplEl = document.getElementById('fmt-template');
  if (fmtTplEl) fmtTplEl.value = fmt.template || '';

  // few-shot
  const fsList = document.getElementById('few-shot-list');
  if (fsList) {
    fsList.innerHTML = '';
    shotCounter = 0;
    (state.fewShots || []).forEach(shot => {
      addFewShot();
      const pairs = fsList.querySelectorAll('.few-shot-pair');
      const last = pairs[pairs.length - 1];
      const [a, b] = last.querySelectorAll('textarea');
      if (a) a.value = shot.input || '';
      if (b) b.value = shot.output || '';
    });
  }

  // cot
  const cot = state.cot || {};
  const cotEnabled = document.getElementById('cot-enabled');
  if (cotEnabled) {
    cotEnabled.checked = !!cot.enabled;
    const cotOptions = document.getElementById('cot-options');
    if (cotOptions) cotOptions.style.display = cot.enabled ? 'flex' : 'none';
  }
  const cotStyleEl = document.getElementById('cot-style');
  if (cotStyleEl) {
    cotStyleEl.value = cot.style || 'think-step';
    const customRow = document.getElementById('cot-custom-row');
    if (customRow) customRow.style.display = cotStyleEl.value === 'custom' ? '' : 'none';
  }
  const cotCustomEl = document.getElementById('cot-custom');
  if (cotCustomEl) cotCustomEl.value = cot.custom || '';
  rebuildRuleList('cot-rules', 'cotr', cot.rules || [], 'e.g. Always verify numerical claims before concluding');
  rebuildRuleList('cot-constraints', 'cotc', cot.constraints || [], 'e.g. Do not jump to conclusions without evidence');
  document.querySelectorAll('#cot-steps .tag').forEach(tag => {
    tag.classList.toggle('active', (cot.steps || []).includes(tag.dataset.tag));
  });
  const cotSepEl = document.getElementById('cot-separate');
  if (cotSepEl) cotSepEl.checked = !!cot.separate;

  // fallback
  const fb = state.fallback || {};
  const fbTypeEl = document.getElementById('fallback-type');
  if (fbTypeEl) {
    fbTypeEl.value = fb.type || '';
    const fbCustomRow = document.getElementById('fallback-custom-row');
    if (fbCustomRow) fbCustomRow.style.display = fb.type === 'custom' ? '' : 'none';
  }
  const fbCustomEl = document.getElementById('fallback-custom');
  if (fbCustomEl) fbCustomEl.value = fb.custom || '';

  updateHeaderSubtitle();
  updatePreview();
}

function rebuildRuleList(listId, prefix, values, placeholder) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = '';
  ruleCounters[prefix] = 0;
  values.forEach(val => {
    const id = `${prefix}-${ruleCounters[prefix]++}`;
    const item = document.createElement('div');
    item.className = 'rule-item';
    item.id = id;
    item.innerHTML = `<input type="text" placeholder="${esc(placeholder)}"><button class="remove-btn">×</button>`;
    item.querySelector('.remove-btn').addEventListener('click', () => { item.remove(); scheduleAutosave(); updatePreview(); });
    item.querySelector('input').addEventListener('input', () => { scheduleAutosave(); updatePreview(); });
    item.querySelector('input').value = val;
    container.appendChild(item);
  });
}

// ─── Named saves ─────────────────────────────────────────────────────────────
function getSaves() {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { return []; }
}
function setSaves(saves) { localStorage.setItem(SAVES_KEY, JSON.stringify(saves)); }

function savePromptAs() {
  document.getElementById('save-name-input').value = '';
  document.getElementById('savename-modal').classList.add('open');
  setTimeout(() => document.getElementById('save-name-input').focus(), 80);
}
function closeSaveNameModal() { document.getElementById('savename-modal').classList.remove('open'); }

function confirmSave() {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) { document.getElementById('save-name-input').focus(); return; }
  const saves = getSaves();
  const idx = saves.findIndex(s => s.name === name);
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

function loadSave(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  // Re-render current step to ensure DOM elements exist for the active step
  renderAll();
  restoreState(save.state);
  closeSavedModal();
  showToast(`Loaded "${name}"`);
}

function exportSaveAsJSON(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  triggerDownload(new Blob([JSON.stringify(save.state, null, 2)], { type: 'application/json' }), `${name.replace(/\s+/g, '_')}.json`);
}

function openSavedModal() { renderSavedList(); document.getElementById('saved-modal').classList.add('open'); }
function closeSavedModal() { document.getElementById('saved-modal').classList.remove('open'); }

function renderSavedList() {
  const saves = getSaves();
  const container = document.getElementById('saved-list-container');
  if (!saves.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">💾</span>No saved prompts yet.<br>Click <strong>Save</strong> in the header to save the current prompt.</div>`;
    return;
  }
  container.innerHTML = `<div class="saved-list">${saves.map(s => {
    const date = new Date(s.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const model = s.state?.model || 'generic';
    const safeName = esc(s.name);
    return `<div class="saved-item">
      <div class="saved-item-info" data-load="${safeName}">
        <div class="saved-item-name">${safeName}</div>
        <div class="saved-item-meta">${date} · ${model}</div>
      </div>
      <div class="saved-item-actions">
        <button class="icon-btn" title="Load" data-load="${safeName}">↩</button>
        <button class="icon-btn" title="Export .json" data-export="${safeName}">⬇</button>
        <button class="icon-btn danger" title="Delete" data-delete="${safeName}">🗑</button>
      </div>
    </div>`;
  }).join('')}</div>`;

  // Attach events after render to avoid inline handlers with escaped names
  container.querySelectorAll('[data-load]').forEach(el => {
    el.addEventListener('click', () => loadSave(saves.find(s => esc(s.name) === el.dataset.load)?.name || el.dataset.load));
  });
  container.querySelectorAll('[data-export]').forEach(el => {
    el.addEventListener('click', () => exportSaveAsJSON(saves.find(s => esc(s.name) === el.dataset.export)?.name || el.dataset.export));
  });
  container.querySelectorAll('[data-delete]').forEach(el => {
    el.addEventListener('click', () => deleteSave(saves.find(s => esc(s.name) === el.dataset.delete)?.name || el.dataset.delete));
  });
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function openUploadModal() { document.getElementById('upload-modal').classList.add('open'); }
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
      renderAll();
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

function onDragOver(e) { e.preventDefault(); document.getElementById('upload-zone').classList.add('drag-over'); }
function onDragLeave() { document.getElementById('upload-zone').classList.remove('drag-over'); }
function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) readUploadedFile(file);
}

// ─── Export current state as JSON ─────────────────────────────────────────────
function exportJSON() {
  triggerDownload(new Blob([JSON.stringify(captureState(), null, 2)], { type: 'application/json' }), 'prompt.json');
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
  toast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wire up static header buttons
  document.getElementById('btn-saved').addEventListener('click', openSavedModal);
  document.getElementById('btn-save').addEventListener('click', savePromptAs);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-upload').addEventListener('click', openUploadModal);
  document.getElementById('btn-copy').addEventListener('click', copyPrompt);
  document.getElementById('btn-download').addEventListener('click', downloadPrompt);

  document.getElementById('save-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSave();
  });

  // Close modals on overlay click
  document.getElementById('saved-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeSavedModal(); });
  document.getElementById('upload-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeUploadModal(); });
  document.getElementById('savename-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeSaveNameModal(); });

  // Upload zone
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('dragover', onDragOver);
  uploadZone.addEventListener('dragleave', onDragLeave);
  uploadZone.addEventListener('drop', onDrop);
  uploadZone.addEventListener('click', () => document.getElementById('file-upload-input').click());
  document.getElementById('file-upload-input').addEventListener('change', handleFileUpload);

  // Initial render
  renderAll();

  // Restore autosave if present
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Re-render so step 0 DOM is available before restoring
      restoreState(saved);
    }
  } catch (e) {}
});
