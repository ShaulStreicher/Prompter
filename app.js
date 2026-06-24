// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'promptbuilder_autosave';
const SAVES_KEY    = 'promptbuilder_saves';
const FILE_SUPPORTED = ('showSaveFilePicker' in window || 'showOpenFilePicker' in window);

// ─── File persistence (File System Access API + IndexedDB handle store) ───────
let _savesFileHandle = null; // FileSystemFileHandle

function _openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('prompter_file_db', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}
async function _loadStoredHandle() {
  try {
    const db = await _openHandleDB();
    return await new Promise(resolve => {
      const tx  = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get('saves');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}
async function _storeHandle(handle) {
  try {
    const db = await _openHandleDB();
    await new Promise(resolve => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(handle, 'saves');
      tx.oncomplete = resolve;
    });
  } catch {}
}
async function _clearStoredHandle() {
  try {
    const db = await _openHandleDB();
    await new Promise(resolve => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').delete('saves');
      tx.oncomplete = resolve;
    });
  } catch {}
}

async function _readSavesFromFile(handle) {
  const file = await handle.getFile();
  const text = await file.text();
  return JSON.parse(text);
}
async function _writeSavesToFile(saves) {
  if (!_savesFileHandle) return;
  try {
    const writable = await _savesFileHandle.createWritable();
    await writable.write(JSON.stringify(saves, null, 2));
    await writable.close();
  } catch (e) {
    console.warn('File write failed:', e);
  }
}

async function pickSavesFile() {
  if (!FILE_SUPPORTED) { showToast('Your browser doesn\'t support file linking. Use Chrome or Edge.'); return; }
  try {
    // Try to pick an existing file or create new
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Prompter saves', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    }).catch(async () => {
      // User may want to create new file instead
      const h = await window.showSaveFilePicker({
        suggestedName: 'prompter-saves.json',
        types: [{ description: 'Prompter saves', accept: { 'application/json': ['.json'] } }],
      });
      return [h];
    });
    if (!handle) return;
    _savesFileHandle = handle;
    await _storeHandle(handle);
    // Load existing saves from file (if any) and merge with localStorage
    try {
      const fileSaves = await _readSavesFromFile(handle);
      if (Array.isArray(fileSaves) && fileSaves.length) {
        localStorage.setItem(SAVES_KEY, JSON.stringify(fileSaves));
        showToast(`Linked — ${fileSaves.length} saves loaded from file`);
      } else {
        // Write current localStorage saves to the new file
        await _writeSavesToFile(getSaves());
        showToast('Save file linked — saves will persist beyond cache clears');
      }
    } catch {
      await _writeSavesToFile(getSaves());
      showToast('Save file linked');
    }
    updateFileSyncIndicator();
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not link file: ' + e.message);
  }
}

async function unlinkSavesFile() {
  _savesFileHandle = null;
  await _clearStoredHandle();
  updateFileSyncIndicator();
  showToast('Save file unlinked — saves now use browser storage only');
}

function updateFileSyncIndicator() {
  const btn = document.getElementById('btn-file-sync');
  const label = document.getElementById('file-sync-label');
  if (!btn) return;
  if (_savesFileHandle) {
    btn.title = 'Saves linked to file on your computer — click to unlink';
    btn.classList.add('file-sync-active');
    if (label) label.textContent = 'Unlink save file';
  } else {
    btn.title = 'Link a file so saves persist beyond cache clears';
    btn.classList.remove('file-sync-active');
    if (label) label.textContent = 'Link save file…';
  }
}

async function initFileStorage() {
  if (!FILE_SUPPORTED) return;
  const handle = await _loadStoredHandle();
  if (!handle) return;
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      _savesFileHandle = handle;
      const fileSaves = await _readSavesFromFile(handle);
      if (Array.isArray(fileSaves)) localStorage.setItem(SAVES_KEY, JSON.stringify(fileSaves));
    } else if (perm === 'prompt') {
      // Show a restore banner instead of immediately prompting
      _showFileRestoreBanner(handle);
    }
  } catch {
    await _clearStoredHandle();
  }
  updateFileSyncIndicator();
}

function _showFileRestoreBanner(handle) {
  const banner = document.createElement('div');
  banner.id = 'file-restore-banner';
  banner.innerHTML = `
    <span>💾 A save file was linked previously. Restore access to load your saves?</span>
    <button id="file-restore-yes" class="btn btn-primary btn-sm">Restore</button>
    <button id="file-restore-no"  class="btn btn-ghost btn-sm">Dismiss</button>`;
  document.body.appendChild(banner);
  document.getElementById('file-restore-yes').onclick = async () => {
    banner.remove();
    try {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        _savesFileHandle = handle;
        const fileSaves = await _readSavesFromFile(handle);
        if (Array.isArray(fileSaves)) {
          localStorage.setItem(SAVES_KEY, JSON.stringify(fileSaves));
          showToast(`${fileSaves.length} saves restored from file`);
          renderAll();
        }
        updateFileSyncIndicator();
      }
    } catch {}
  };
  document.getElementById('file-restore-no').onclick = () => banner.remove();
}

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

const MODEL_LIMITS = {
  claude: 200000, gpt: 128000, gemini: 1000000,
  llama: 8192, mistral: 32000, generic: 32000,
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

const TEMPLATES = [
  { name:'Customer Support Agent', category:'Support', emoji:'🎧', description:'Handles inquiries with empathy and accuracy', state:{ model:'claude', role:'You are a helpful, empathetic customer support agent. Your goal is to resolve issues quickly while making the customer feel heard and valued.', ctx:{ company:'', domain:'Customer Support', audience:'Customers seeking help', extra:'' }, objective:{ type:'answer', description:'Resolve the customer issue below accurately and empathetically.' }, positiveRules:['Acknowledge the customer\'s frustration before offering a solution','Always confirm the resolution at the end','Offer a follow-up if the issue might recur'], negativeRules:['Never blame the customer','Don\'t promise outcomes you can\'t guarantee','Avoid corporate jargon'], tone:{ formality:'60', detail:'50', energy:'40', tags:['Empathetic','Friendly'] }, format:{ type:'plain', length:'concise', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Code Reviewer', category:'Code', emoji:'🔍', description:'Reviews PRs for bugs, style, and best practices', state:{ model:'claude', role:'You are a senior software engineer with 10+ years of experience across multiple languages and frameworks. You review code with a sharp eye for correctness, security, and maintainability.', ctx:{ company:'', domain:'Software Engineering', audience:'Development team', extra:'' }, objective:{ type:'analyze', description:'Review the code below. Identify bugs, security issues, style violations, and suggest improvements.' }, positiveRules:['Organize findings by severity: Critical / Warning / Suggestion','Include corrected code snippets for every issue','Explain the WHY behind each piece of feedback'], negativeRules:['Don\'t nitpick purely stylistic choices unless they hurt readability','Don\'t rewrite working code unnecessarily'], tone:{ formality:'60', detail:'80', energy:'40', tags:['Analytical','Direct'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:true, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'SEO Blog Writer', category:'Writing', emoji:'✍️', description:'Writes engaging, SEO-optimized long-form articles', state:{ model:'claude', role:'You are a professional content strategist and SEO copywriter who creates high-ranking, reader-first content. You understand both search intent and compelling narrative.', ctx:{ company:'', domain:'Content Marketing', audience:'Online readers and search engines', extra:'' }, objective:{ type:'generate', description:'Write a comprehensive, SEO-optimized blog post on the topic below.' }, positiveRules:['Start with a hook that addresses the reader\'s pain point','Use the primary keyword naturally in H1, first paragraph, and subheadings','Include a clear CTA at the end'], negativeRules:['No keyword stuffing','Avoid generic filler phrases like "In today\'s world..."','Don\'t write passive voice more than 10% of the time'], tone:{ formality:'40', detail:'70', energy:'60', tags:['Friendly','Inspirational'] }, format:{ type:'markdown', length:'long', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Data Analyst', category:'Analysis', emoji:'📊', description:'Analyzes data and surfaces actionable insights', state:{ model:'claude', role:'You are a senior data analyst with expertise in statistics, data visualization, and translating numbers into business decisions.', ctx:{ company:'', domain:'Data & Analytics', audience:'Business stakeholders', extra:'' }, objective:{ type:'analyze', description:'Analyze the data below and provide actionable insights with supporting evidence.' }, positiveRules:['Lead with the top 3 insights in plain English','Back every claim with specific numbers from the data','Suggest next steps or further analysis where relevant'], negativeRules:['Don\'t overstate statistical significance','Avoid technical jargon without explanation','Never fabricate data points'], tone:{ formality:'60', detail:'80', energy:'40', tags:['Analytical','Authoritative'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:true, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'best-effort', custom:'' }, promptName:'' } },
  { name:'Legal Summarizer', category:'Analysis', emoji:'⚖️', description:'Summarizes contracts and legal docs in plain English', state:{ model:'claude', role:'You are an experienced legal analyst with expertise in contract law, regulatory compliance, and corporate agreements. You translate complex legal language into clear, actionable summaries.', ctx:{ company:'', domain:'Legal', audience:'Non-legal business stakeholders', extra:'' }, objective:{ type:'summarize', description:'Summarize the legal document below in plain English, highlighting key obligations, risks, and deadlines.' }, positiveRules:['Structure output as: Overview → Key Terms → Obligations → Risks → Deadlines','Flag any unusual or potentially unfavorable clauses','Use plain English — no unexplained legalese'], negativeRules:['Never provide definitive legal advice','Don\'t omit clauses that seem minor but carry risk'], tone:{ formality:'70', detail:'80', energy:'30', tags:['Authoritative','Direct'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'partial', custom:'' }, promptName:'' } },
  { name:'Product Manager', category:'Business', emoji:'🗺️', description:'Writes PRDs, specs, and product strategy docs', state:{ model:'claude', role:'You are an expert product manager with experience at high-growth tech companies, skilled in roadmapping, user research synthesis, and cross-functional communication.', ctx:{ company:'', domain:'Product Management', audience:'Engineering, design, and executive stakeholders', extra:'' }, objective:{ type:'generate', description:'Write a product requirements document (PRD) or spec for the feature below.' }, positiveRules:['Always include: Problem Statement, User Stories, Success Metrics, and Out-of-Scope','Lead every section with user impact, not technical implementation','Include open questions at the end'], negativeRules:['Don\'t include implementation details in the requirements section','Avoid vague success criteria like "improve user experience"'], tone:{ formality:'60', detail:'70', energy:'50', tags:['Direct','Analytical'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Email Copywriter', category:'Writing', emoji:'📧', description:'Writes persuasive, high-converting emails', state:{ model:'claude', role:'You are a direct response copywriter specializing in email marketing with a track record of above-average open and click rates.', ctx:{ company:'', domain:'Email Marketing', audience:'Email subscribers or prospects', extra:'' }, objective:{ type:'generate', description:'Write a compelling marketing email for the campaign below.' }, positiveRules:['Write a subject line + preview text first','Open with the reader\'s pain point or desire','One clear CTA per email'], negativeRules:['No ALL CAPS except sparingly in subject lines','Avoid spam trigger words (free, guarantee, act now)','Don\'t bury the CTA below the fold'], tone:{ formality:'40', detail:'50', energy:'70', tags:['Friendly','Witty'] }, format:{ type:'plain', length:'concise', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Technical Writer', category:'Writing', emoji:'📘', description:'Writes clear API docs and developer guides', state:{ model:'claude', role:'You are a senior technical writer with expertise in developer documentation, API references, and SDK guides. You write for accuracy and clarity.', ctx:{ company:'', domain:'Developer Documentation', audience:'Software developers and engineers', extra:'' }, objective:{ type:'generate', description:'Write clear, complete technical documentation for the API endpoint or feature below.' }, positiveRules:['Include: Overview, Parameters, Request/Response examples, Error codes','Use consistent terminology throughout','Include at least one real-world use case example'], negativeRules:['Don\'t assume the reader knows the internal architecture','No marketing language in technical docs'], tone:{ formality:'70', detail:'90', energy:'30', tags:['Direct','Analytical'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'SQL Assistant', category:'Code', emoji:'🗄️', description:'Writes and optimizes complex SQL queries', state:{ model:'claude', role:'You are an expert database engineer with deep knowledge of SQL, query optimization, indexing strategies, and database design across PostgreSQL, MySQL, and BigQuery.', ctx:{ company:'', domain:'Data Engineering', audience:'Data analysts and engineers', extra:'' }, objective:{ type:'generate', description:'Write or optimize the SQL query described below.' }, positiveRules:['Always explain the query logic before the code block','Note any indexes that would improve performance','Flag if the query may be slow on large datasets'], negativeRules:['Don\'t use SELECT * in production queries','Don\'t assume table schemas — ask if unclear'], tone:{ formality:'50', detail:'80', energy:'40', tags:['Analytical','Direct'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:true, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Executive Briefing', category:'Business', emoji:'📋', description:'Writes crisp C-suite briefings and summaries', state:{ model:'claude', role:'You are a senior strategy analyst who distills complex information into clear, decision-ready briefings for C-suite executives with no time to waste.', ctx:{ company:'', domain:'Executive Communications', audience:'C-suite executives and board members', extra:'' }, objective:{ type:'summarize', description:'Create an executive briefing on the topic or document below.' }, positiveRules:['Lead with the 3 things the executive needs to know','Use the BLUF format (Bottom Line Up Front)','Every recommendation must include a risk and an expected outcome'], negativeRules:['No long preambles or background sections','Never exceed one page (approx 400 words)','Avoid hedging language — be direct about recommendations'], tone:{ formality:'80', detail:'60', energy:'50', tags:['Authoritative','Direct'] }, format:{ type:'plain', length:'concise', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'partial', custom:'' }, promptName:'' } },
  { name:'UX Feedback Reviewer', category:'Analysis', emoji:'🎨', description:'Gives structured UX critique grounded in user goals', state:{ model:'claude', role:'You are a senior UX designer and researcher with expertise in interaction design, accessibility, and user psychology. You give feedback that is specific, constructive, and actionable.', ctx:{ company:'', domain:'Product Design', audience:'Product designers and PMs', extra:'' }, objective:{ type:'analyze', description:'Review the UX design or user flow described below and provide structured feedback.' }, positiveRules:['Structure feedback as: Strengths → Issues → Recommendations','Anchor every critique to a user goal or pain point','Include a severity rating (Critical / Major / Minor) for each issue'], negativeRules:['Don\'t give purely aesthetic opinions without user rationale','Avoid vague feedback like "this feels off"'], tone:{ formality:'50', detail:'80', energy:'50', tags:['Friendly','Analytical'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:true, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'ask', custom:'' }, promptName:'' } },
  { name:'Brainstorm Facilitator', category:'Business', emoji:'💡', description:'Generates diverse, creative ideas on any topic', state:{ model:'claude', role:'You are a creative strategist and innovation facilitator who generates diverse, non-obvious ideas and pushes thinking beyond the obvious.', ctx:{ company:'', domain:'Innovation & Strategy', audience:'Teams looking for fresh ideas', extra:'' }, objective:{ type:'brainstorm', description:'Generate a diverse set of ideas for the challenge below.' }, positiveRules:['Generate at least 10 ideas across different categories','Include at least 2 unconventional or contrarian ideas','For each idea, state the core insight in one sentence'], negativeRules:['Don\'t filter ideas for feasibility in the initial list','Avoid generic suggestions that apply to every topic'], tone:{ formality:'30', detail:'60', energy:'80', tags:['Witty','Inspirational'] }, format:{ type:'markdown', length:'', template:'' }, fewShots:[], cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false }, fallback:{ type:'best-effort', custom:'' }, promptName:'' } },
];

const ROLE_SUGGESTIONS = {
  'Software Engineer': { toneTag:['Analytical','Direct'], rules:['Always include working code examples','Explain trade-offs between approaches','Mention time/space complexity when relevant'], fallback:'ask' },
  'Data Scientist':    { toneTag:['Analytical'],          rules:['Cite statistical methods used','Note data assumptions and limitations','Include confidence levels where applicable'], fallback:'best-effort' },
  'Copywriter':        { toneTag:['Witty','Friendly'],    rules:['Write in active voice','Use power words that drive action','Keep sentences under 20 words'], fallback:'ask' },
  'Product Manager':   { toneTag:['Direct','Analytical'], rules:['Lead with user impact','Include success metrics for every proposal','Distinguish must-haves from nice-to-haves'], fallback:'ask' },
  'Financial Analyst': { toneTag:['Analytical','Authoritative'], rules:['Cite all data sources','Flag assumptions explicitly','Use consistent number formatting (commas, currency)'], fallback:'best-effort' },
  'Legal Assistant':   { toneTag:['Authoritative','Direct'], rules:['Never provide definitive legal advice','Cite relevant statutes when known','Flag jurisdiction-specific considerations'], fallback:'partial' },
  'Creative Writer':   { toneTag:['Witty','Inspirational'], rules:["Show, don't tell",'Vary sentence length for rhythm','Use specific sensory details'], fallback:'best-effort' },
  'UX Designer':       { toneTag:['Friendly','Analytical'], rules:['Anchor feedback to user goals not aesthetics','Suggest concrete alternatives for every critique','Reference WCAG standards when relevant'], fallback:'ask' },
};

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

// ─── Global in-memory state ───────────────────────────────────────────────────
let appState = {
  model: 'claude',
  role: '',
  ctx: { company: '', domain: '', audience: '', extra: '' },
  objective: { type: '', description: '' },
  positiveRules: [],
  negativeRules: [],
  tone: { formality: '50', detail: '50', energy: '50', tags: [] },
  format: { type: 'plain', length: '', template: '' },
  fewShots: [],
  cot: { enabled: false, style: 'think-step', custom: '', rules: [], constraints: [], steps: [], separate: false },
  fallback: { type: '', custom: '' },
  promptName: '',
};

let currentStep        = 0;
let autosaveTimer      = null;
let shotCounter        = 0;
let currentVersionLabel = ''; // e.g. 'v3' or '' for unsaved/new

// ─── Collaboration ────────────────────────────────────────────────────────────
const COLLAB_SERVER_KEY = 'promptbuilder_collab_server';
function getCollabServer() {
  if (window.location.hostname === 'localhost') return 'ws://localhost:3001';
  return localStorage.getItem(COLLAB_SERVER_KEY) || '';
}
function setCollabServer(url) { localStorage.setItem(COLLAB_SERVER_KEY, url); }
function clearCollabServer() { localStorage.removeItem(COLLAB_SERVER_KEY); }

let ws = null, roomId = null, peerCount = 0, isSyncing = false;
let broadcastTimer = null;

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
        </div>
        <div id="role-suggestions"></div>`;
    },
    bind() {
      document.querySelectorAll('#role-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#role-presets .preset-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const ta = document.getElementById('role-custom');
          ta.value = btn.dataset.value;
          appState.role = btn.dataset.value;
          renderRoleSuggestions(btn.textContent.trim());
          autosaveAndPreview();
        });
      });
      let _suggDebounce = null;
      document.getElementById('role-custom').addEventListener('input', e => {
        appState.role = e.target.value;
        clearTimeout(_suggDebounce);
        _suggDebounce = setTimeout(() => renderRoleSuggestions(e.target.value), 400);
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

  // ── 3. Context ───────────────────────────────────────────────────────────
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

  // ── 7. Tone ──────────────────────────────────────────────────────────────
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
        ['','No specific length'],['1-2 sentences','1-2 sentences'],
        ['1 paragraph','1 paragraph'],['3-5 bullet points','3-5 bullet points'],
        ['under 200 words','Under 200 words'],['under 500 words','Under 500 words'],
        ['500-1000 words','500-1000 words'],['comprehensive, no limit','Comprehensive, no limit']
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

// ─── Rule list helpers ────────────────────────────────────────────────────────
function renderRuleItem(prefix, idx, value, placeholder) {
  return `<div class="rule-item" id="${prefix}-${idx}">
    <input type="text" placeholder="${esc(placeholder)}" value="${esc(value)}">
    <button class="remove-btn" data-prefix="${prefix}" data-idx="${idx}">x</button>
  </div>`;
}

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
      <button class="remove-btn" data-idx="${idx}">x</button>
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
      <div class="step-circle">${isDone ? 'v' : (i + 1)}</div>
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
          <div class="step-card-sub">Step ${currentStep + 1} of ${steps.length} -- define what you want the model to do.</div>
        </div>
        <span class="editing-badge">Editing</span>
      </div>
      <div class="step-card-body" id="active-step-body">
        ${step.render()}
      </div>
      <div class="step-card-nav">
        <button class="btn btn-ghost btn-sm" id="btn-back" ${currentStep===0?'disabled':''}>Back</button>
        <button class="btn btn-primary btn-sm" id="btn-next">${currentStep===steps.length-1?'Finish':'Next'}</button>
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
          <span class="summary-done-badge">done</span>
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

// ─── buildPrompt ─────────────────────────────────────────────────────────────
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
    lines.push(useXml ? wrap('instructions', posRules.map(r=>`- ${r}`).join('\n')) : `INSTRUCTIONS (Do):\n${posRules.map(r=>`- ${r}`).join('\n')}`);
    lines.push('');
  }

  const negRules = (appState.negativeRules || []).filter(Boolean);
  if (negRules.length) {
    lines.push(useXml ? wrap('constraints', negRules.map(r=>`- ${r}`).join('\n')) : `CONSTRAINTS (Don't):\n${negRules.map(r=>`- ${r}`).join('\n')}`);
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
    if ((cot.steps||[]).length) cotParts.push(`\nYour reasoning must include these steps:\n${cot.steps.map(s=>`- ${s}`).join('\n')}`);
    if ((cot.rules||[]).filter(Boolean).length) cotParts.push(`\nReasoning rules:\n${cot.rules.filter(Boolean).map(r=>`- ${r}`).join('\n')}`);
    if ((cot.constraints||[]).filter(Boolean).length) cotParts.push(`\nReasoning constraints:\n${cot.constraints.filter(Boolean).map(c=>`- Do not: ${c}`).join('\n')}`);
    if (cot.separate) cotParts.push(`\nClearly separate your reasoning from your final answer using a divider or label.`);
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

// ─── Smart suggestions ────────────────────────────────────────────────────────
function renderRoleSuggestions(roleText) {
  const el = document.getElementById('role-suggestions');
  if (!el) return;
  const key = Object.keys(ROLE_SUGGESTIONS).find(k => roleText.toLowerCase().includes(k.toLowerCase()));
  if (!key) { el.innerHTML = ''; return; }
  const s = ROLE_SUGGESTIONS[key];
  const tagChips = s.toneTag.map(t =>
    `<button class="suggestion-chip" data-type="tag" data-val="${esc(t)}"><span class="chip-add">+</span> ${esc(t)}</button>`
  ).join('');
  const ruleChips = s.rules.map(r =>
    `<button class="suggestion-chip" data-type="rule" data-val="${esc(r)}"><span class="chip-add">+</span> ${esc(r)}</button>`
  ).join('');
  const fallbackLabel = {ask:'Ask for clarification','best-effort':'Best-effort + flag uncertainty',partial:'Partial answer + note gaps'}[s.fallback] || s.fallback;
  el.innerHTML = `
    <div class="suggestions-panel">
      <div class="suggestions-panel-title">✨ Suggestions for ${esc(key)}</div>
      <div class="suggestion-row"><span class="suggestion-row-label">Tone:</span><div class="suggestion-chips">${tagChips}</div></div>
      <div class="suggestion-row"><span class="suggestion-row-label">Rules:</span><div class="suggestion-chips">${ruleChips}</div></div>
      <div class="suggestion-row"><span class="suggestion-row-label">Fallback:</span><div class="suggestion-chips">
        <button class="suggestion-chip" data-type="fallback" data-val="${esc(s.fallback)}"><span class="chip-add">+</span> ${esc(fallbackLabel)}</button>
      </div></div>
    </div>`;
  el.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type, val = chip.dataset.val;
      if (type === 'tag') {
        if (!appState.tone.tags.includes(val)) { appState.tone.tags.push(val); showToast(`Added tone: ${val}`); }
        else { showToast(`"${val}" already applied`); return; }
      } else if (type === 'rule') {
        if (!appState.positiveRules.includes(val)) { appState.positiveRules.push(val); showToast('Rule added'); }
        else { showToast('Rule already added'); return; }
      } else if (type === 'fallback') {
        appState.fallback = { type: val, custom: '' };
        showToast('Fallback behavior set');
      }
      chip.disabled = true;
      chip.style.opacity = '0.45';
      autosaveAndPreview();
    });
  });
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function updatePreview() {
  const prompt  = buildPrompt();
  document.getElementById('prompt-output').innerHTML = syntaxHighlight(prompt);
  document.getElementById('char-count').textContent  = prompt.length.toLocaleString();
  const tokens = Math.round(prompt.length / 4);
  document.getElementById('token-count').textContent = tokens.toLocaleString();
  const limit  = MODEL_LIMITS[appState.model] || 32000;
  const pct    = Math.min(100, Math.round(tokens / limit * 100));
  const barEl  = document.getElementById('token-budget-bar');
  const pctEl  = document.getElementById('token-budget-pct');
  if (barEl) { barEl.style.width = pct + '%'; barEl.className = 'budget-fill ' + (pct > 80 ? 'danger' : pct > 50 ? 'warn' : 'ok'); }
  if (pctEl) pctEl.textContent = pct + '% of context';
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
  if (name) {
    parts.unshift(currentVersionLabel ? `${name} · ${currentVersionLabel}` : name);
  } else {
    const role = (appState.role||'').trim();
    if (role) parts.push(role.split(' ').slice(0,4).join(' ') + (role.split(' ').length>4?'...':''));
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
let isDirty = false;

// ─── Undo / Redo ──────────────────────────────────────────────────────────────
const undoStack = [];
const redoStack = [];
let _lastUndoPush = 0;

function undo() {
  if (undoStack.length < 2) { showToast('Nothing to undo'); return; }
  redoStack.push(undoStack.pop());
  restoreState(undoStack[undoStack.length - 1]);
  isDirty = true;
  showToast('Undo');
}
function redo() {
  if (!redoStack.length) { showToast('Nothing to redo'); return; }
  const next = redoStack.pop();
  undoStack.push(next);
  restoreState(next);
  isDirty = true;
  showToast('Redo');
}

function autosaveAndPreview() {
  const now = Date.now();
  if (now - _lastUndoPush > 1200) {
    undoStack.push(JSON.parse(JSON.stringify(appState)));
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    _lastUndoPush = now;
  }
  isDirty = true;
  updatePreview();
  scheduleAutosave();
  broadcastState();
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
  flushStep(steps[currentStep].id);
  return { version: 1, ...JSON.parse(JSON.stringify(appState)) };
}

function restoreState(state) {
  if (!state) return;
  appState = {
    model:         state.model         || 'claude',
    role:          state.role          || '',
    ctx:           { company:'', domain:'', audience:'', extra:'', ...(state.ctx||{}) },
    objective:     { type:'', description:'', ...(state.objective||{}) },
    positiveRules: Array.isArray(state.positiveRules) ? state.positiveRules : [],
    negativeRules: Array.isArray(state.negativeRules) ? state.negativeRules : [],
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
function setSaves(saves) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  _writeSavesToFile(saves); // async, no-op if no file linked
}

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
  const idx = saves.findIndex(s => s.name === name);
  const now = new Date().toISOString();
  const versionEntry = { savedAt: now, note: '', state: captureState() };
  if (idx >= 0) {
    const existing = saves[idx];
    if (!Array.isArray(existing.versions)) existing.versions = [];
    existing.versions.unshift(versionEntry);
    if (existing.versions.length > 50) existing.versions.length = 50;
    existing.savedAt = now;
    existing.state = versionEntry.state;
  } else {
    saves.unshift({ name, savedAt: now, state: versionEntry.state, versions: [versionEntry] });
  }
  setSaves(saves);
  closeSaveNameModal();
  isDirty = false;
  const savedIdx = saves.findIndex(s => s.name === name);
  currentVersionLabel = `v${saves[savedIdx]?.versions?.length || 1}`;
  updateHeaderSubtitle();
  showSaveToast(name, savedIdx, 0);
}

function saveAsCopy() {
  const base = appState.promptName || 'Untitled';
  const copyName = `${base} (copy)`;
  document.getElementById('save-name-input').value = copyName;
  document.getElementById('savename-modal').classList.add('open');
  setTimeout(() => {
    const el = document.getElementById('save-name-input');
    el.focus();
    el.select();
  }, 80);
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
  saves.unshift({ name: newName, savedAt: new Date().toISOString(), state: { ...save.state, promptName: newName }, versions: [] });
  setSaves(saves);
  renderSavedList();
  showToast(`Duplicated as "${newName}"`);
}

function loadSave(name) {
  const save = getSaves().find(s => s.name === name);
  if (!save) return;
  const total = (save.versions || []).length;
  currentVersionLabel = total ? `v${total}` : '';
  isDirty = false;
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
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">save</span>No saved prompts yet.<br>Click <strong>Save</strong> in the header to save the current prompt.</div>`;
    return;
  }
  container.innerHTML = `<div class="saved-list">${saves.map((s, si) => {
    const date = new Date(s.savedAt).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
    const model = s.state?.model || 'generic';
    const safeName = esc(s.name);
    const vCount = (s.versions||[]).length;
    return `<div class="saved-item-wrapper" data-save-idx="${si}">
      <div class="saved-item" data-name="${safeName}">
        <div class="saved-item-info">
          <div class="saved-item-name">${safeName}</div>
          <div class="saved-item-meta">${date} - ${model} - ${vCount} version${vCount!==1?'s':''}</div>
        </div>
        <div class="saved-item-actions">
          <button class="icon-btn" title="Load" data-action="load">Load</button>
          <button class="icon-btn" title="Version history" data-action="history">History</button>
          <button class="icon-btn" title="Duplicate" data-action="dupe">Dupe</button>
          <button class="icon-btn" title="Export .json" data-action="export">JSON</button>
          <button class="icon-btn danger" title="Delete" data-action="delete">Delete</button>
        </div>
      </div>
      <div class="version-list" id="version-list-${si}" style="display:none"></div>
    </div>`;
  }).join('')}</div>`;

  container.querySelectorAll('.saved-item-wrapper').forEach((wrapper, si) => {
    const save = saves[si];
    const name = save.name;
    const item = wrapper.querySelector('.saved-item');
    item.querySelector('[data-action="load"]').addEventListener('click', () => loadSave(name));
    item.querySelector('[data-action="dupe"]').addEventListener('click', () => duplicateSave(name));
    item.querySelector('[data-action="export"]').addEventListener('click', () => exportSaveAsJSON(name));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSave(name));
    item.querySelector('[data-action="history"]').addEventListener('click', () => toggleVersionHistory(si, save));
  });
}

function toggleVersionHistory(si, save) {
  const el = document.getElementById(`version-list-${si}`);
  if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  const versions = save.versions || [];
  if (!versions.length) {
    el.innerHTML = `<div class="version-empty">No version history yet.</div>`;
  } else {
    el.innerHTML = versions.map((v, vi) => {
      const date = new Date(v.savedAt).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
      return `<div class="version-item">
        <div class="version-meta">
          <span class="version-num">v${versions.length - vi}</span>
          <span class="version-date">${date}</span>
          ${v.note ? `<span class="version-note-text">${esc(v.note)}</span>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="version-restore-btn" data-vi="${vi}">Restore</button>
          <button class="version-test-btn" data-vi="${vi}" title="Add test result">📝</button>
        </div>
        ${v.testNote ? `<div class="version-test-note" title="${esc(v.testNote)}">📝 ${esc(v.testNote.slice(0,60))}${v.testNote.length>60?'…':''}</div>` : ''}
      </div>`;
    }).join('');
    el.querySelectorAll('.version-restore-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const freshSave = getSaves().find(s => s.name === save.name);
        const v = freshSave && freshSave.versions && freshSave.versions[parseInt(btn.dataset.vi)];
        if (v && v.state) {
          const vi = parseInt(btn.dataset.vi);
          const total = freshSave.versions.length;
          currentVersionLabel = `v${total - vi}`;
          restoreState(v.state);
          closeSavedModal();
          showToast(`Restored ${currentVersionLabel}`);
        } else {
          showToast('Could not restore — version data missing');
        }
      });
    });
    el.querySelectorAll('.version-test-btn').forEach(btn => {
      btn.addEventListener('click', () => openTestNoteModal(save.name, parseInt(btn.dataset.vi)));
    });
  }
  el.style.display = '';
}

let _testNoteSaveName = '', _testNoteVersionIdx = 0;
function openTestNoteModal(saveName, versionIdx) {
  _testNoteSaveName = saveName; _testNoteVersionIdx = versionIdx;
  const saves = getSaves();
  const save  = saves.find(s => s.name === saveName);
  const existing = save && save.versions && save.versions[versionIdx] ? (save.versions[versionIdx].testNote || '') : '';
  document.getElementById('test-note-input').value = existing;
  document.getElementById('test-note-modal').classList.add('open');
  setTimeout(() => document.getElementById('test-note-input').focus(), 80);
}
function closeTestNoteModal() { document.getElementById('test-note-modal').classList.remove('open'); }
function saveTestNote() {
  const note  = document.getElementById('test-note-input').value.trim();
  const saves = getSaves();
  const save  = saves.find(s => s.name === _testNoteSaveName);
  if (save && save.versions && save.versions[_testNoteVersionIdx] !== undefined) {
    save.versions[_testNoteVersionIdx].testNote = note;
    setSaves(saves);
  }
  closeTestNoteModal();
  showToast('Test result saved');
  renderSavedList();
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
  if (isDirty && !confirm('You have unsaved changes. Start a new prompt anyway?')) return;
  localStorage.removeItem(AUTOSAVE_KEY);
  appState = {
    model:'claude', role:'',
    ctx:{ company:'', domain:'', audience:'', extra:'' },
    objective:{ type:'', description:'' },
    positiveRules:[], negativeRules:[],
    tone:{ formality:'50', detail:'50', energy:'50', tags:[] },
    format:{ type:'plain', length:'', template:'' },
    fewShots:[],
    cot:{ enabled:false, style:'think-step', custom:'', rules:[], constraints:[], steps:[], separate:false },
    fallback:{ type:'', custom:'' },
    promptName:'',
  };
  currentStep = 0;
  currentVersionLabel = '';
  isDirty = false;
  renderAll();
  showToast('Cleared — starting fresh');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.classList.add('show');
  toast.style.pointerEvents = 'none';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Version note and save toast ─────────────────────────────────────────────
let _pendingSaveIdx = -1, _pendingVersionIdx = 0;

function showSaveToast(name, saveIdx, versionIdx) {
  _pendingSaveIdx = saveIdx;
  _pendingVersionIdx = versionIdx;
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `"${esc(name)}" saved &nbsp;<a href="#" id="toast-add-note" style="color:#fff;font-weight:700;text-decoration:underline">Add note</a>`;
  toast.classList.add('show');
  toast.style.pointerEvents = 'auto';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.classList.remove('show'); toast.style.pointerEvents = 'none'; }, 5000);
  document.getElementById('toast-add-note')?.addEventListener('click', (e) => {
    e.preventDefault();
    toast.classList.remove('show');
    openVersionNoteModal(saveIdx, versionIdx);
  });
}

function openVersionNoteModal(saveIdx, versionIdx) {
  _pendingSaveIdx = saveIdx;
  _pendingVersionIdx = versionIdx;
  document.getElementById('version-note-input').value = '';
  document.getElementById('version-note-modal').classList.add('open');
  setTimeout(() => document.getElementById('version-note-input').focus(), 80);
}

function closeVersionNoteModal() {
  document.getElementById('version-note-modal').classList.remove('open');
}

function saveVersionNote() {
  const note = document.getElementById('version-note-input').value.trim();
  if (_pendingSaveIdx < 0) return;
  const saves = getSaves();
  const save = saves[_pendingSaveIdx];
  if (save && save.versions && save.versions[_pendingVersionIdx] !== undefined) {
    save.versions[_pendingVersionIdx].note = note;
    setSaves(saves);
  }
  closeVersionNoteModal();
  showToast('Version note saved');
}

// ─── Collaboration ────────────────────────────────────────────────────────────
function broadcastState() {
  if (!ws || ws.readyState !== WebSocket.OPEN || isSyncing) return;
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state-sync', promptName: appState.promptName, state: captureState() }));
    }
  }, 500);
}

let _reconnectTimer = null;
let _reconnectAttempts = 0;
let _intentionalClose = false;

function connectCollab(code) {
  _intentionalClose = false;
  _reconnectAttempts = 0;
  _doConnect(code);
}

function _doConnect(code) {
  ws = new WebSocket(getCollabServer());
  ws.onopen = () => {
    _reconnectAttempts = 0;
    const rejoin = code || roomId;
    if (rejoin) {
      ws.send(JSON.stringify({ type: 'join', roomId: rejoin }));
    } else {
      ws.send(JSON.stringify({ type: 'create' }));
    }
  };
  ws.onmessage = (e) => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    handleWsMessage(msg);
  };
  ws.onclose = () => {
    ws = null;
    updatePeerBadge();
    if (_intentionalClose) {
      roomId = null; peerCount = 0;
      document.getElementById('collab-room-section').style.display = 'none';
      document.getElementById('collab-create-section').style.display = '';
      document.getElementById('collab-join-section').style.display = '';
      showToast('Left collaboration room');
      return;
    }
    // Auto-reconnect with exponential backoff (max 30s)
    _reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, _reconnectAttempts - 1), 30000);
    document.getElementById('collab-status').textContent = `Reconnecting in ${Math.round(delay/1000)}s…`;
    clearTimeout(_reconnectTimer);
    _reconnectTimer = setTimeout(() => {
      document.getElementById('collab-status').textContent = 'Reconnecting…';
      _doConnect(null); // rejoin using saved roomId
    }, delay);
  };
  ws.onerror = () => {}; // onclose fires after onerror, handles everything
}

function handleWsMessage(msg) {
  if (msg.type === 'created') {
    roomId = msg.roomId;
    showCollabRoom();
  } else if (msg.type === 'joined') {
    roomId = msg.roomId;
    peerCount = msg.peerCount;
    showCollabRoom();
    updatePeerBadge();
  } else if (msg.type === 'error') {
    showToast('Collab error: ' + msg.message);
  } else if (msg.type === 'state-update') {
    const myName   = appState.promptName || '';
    const peerName = msg.promptName      || '';
    if (myName !== peerName) {
      showToast(`Peer is editing "${peerName || 'untitled'}" — your prompt is unchanged`);
      return;
    }
    isSyncing = true;
    restoreState(msg.state);
    isSyncing = false;
  } else if (msg.type === 'peer-joined') {
    peerCount = msg.peerCount;
    updatePeerBadge();
    updateCollabPeersDisplay();
    showToast('A peer joined the room');
  } else if (msg.type === 'peer-left') {
    peerCount = msg.peerCount;
    updatePeerBadge();
    updateCollabPeersDisplay();
    showToast('A peer left the room');
  }
}

function showCollabRoom() {
  document.getElementById('collab-room-code').textContent = roomId;
  document.getElementById('collab-create-section').style.display = 'none';
  document.getElementById('collab-join-section').style.display = 'none';
  document.getElementById('collab-room-section').style.display = '';
  document.getElementById('collab-status').textContent = 'Connected';
  updateCollabPeersDisplay();
  updatePeerBadge();
}

function updatePeerBadge() {
  const badge = document.getElementById('peer-badge');
  if (!badge) return;
  if (roomId && ws && ws.readyState === WebSocket.OPEN) {
    badge.style.display = '';
    document.getElementById('peer-count').textContent = peerCount;
  } else {
    badge.style.display = 'none';
  }
}

function updateCollabPeersDisplay() {
  const el = document.getElementById('collab-peers');
  if (el) el.textContent = `Peers: ${peerCount} online`;
}

// ─── Template modal ───────────────────────────────────────────────────────────
let _activeTplCat = 'All';
function openTemplateModal() {
  _activeTplCat = 'All';
  renderTemplateModal();
  document.getElementById('template-modal').classList.add('open');
}
function closeTemplateModal() { document.getElementById('template-modal').classList.remove('open'); }
function renderTemplateModal() {
  const cats = ['All', ...new Set(TEMPLATES.map(t => t.category))];
  document.getElementById('template-filter').innerHTML = cats.map(c =>
    `<button class="tpl-cat-btn ${c === _activeTplCat ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`
  ).join('');
  document.querySelectorAll('.tpl-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => { _activeTplCat = btn.dataset.cat; renderTemplateModal(); });
  });
  const visible = _activeTplCat === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === _activeTplCat);
  document.getElementById('template-grid').innerHTML = visible.map((t, i) => {
    const idx = TEMPLATES.indexOf(t);
    return `<div class="tpl-card" data-idx="${idx}">
      <div class="tpl-card-cat">${esc(t.category)}</div>
      <div class="tpl-card-icon">${t.emoji}</div>
      <div class="tpl-card-name">${esc(t.name)}</div>
      <div class="tpl-card-desc">${esc(t.description)}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('.tpl-card').forEach(card => {
    card.addEventListener('click', () => applyTemplate(parseInt(card.dataset.idx)));
  });
}
function applyTemplate(idx) {
  if (isDirty && !confirm('You have unsaved changes. Apply template anyway?')) return;
  const t = TEMPLATES[idx];
  appState = JSON.parse(JSON.stringify(t.state));
  currentVersionLabel = '';
  isDirty = false;
  currentStep = 0;
  closeTemplateModal();
  renderAll();
  showToast(`Template "${t.name}" applied`);
}

function openCollabModal() {
  const modal = document.getElementById('collab-modal');
  modal.classList.add('open');
  const hasServer = !!getCollabServer();
  document.getElementById('collab-setup-section').style.display  = hasServer ? 'none' : '';
  document.getElementById('collab-main-section').style.display   = hasServer ? ''     : 'none';
  if (hasServer) {
    document.getElementById('collab-server-display').textContent = getCollabServer();
  }
}
function closeCollabModal() { document.getElementById('collab-modal').classList.remove('open'); }

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // File dropdown toggle
  const fileDropdownMenu = document.getElementById('file-dropdown-menu');
  document.getElementById('btn-file-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    fileDropdownMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => fileDropdownMenu.classList.remove('open'));
  fileDropdownMenu.addEventListener('click', () => fileDropdownMenu.classList.remove('open'));

  document.getElementById('btn-saved').addEventListener('click', openSavedModal);
  document.getElementById('btn-save').addEventListener('click', savePromptAs);
  document.getElementById('btn-save-copy').addEventListener('click', saveAsCopy);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-upload').addEventListener('click', openUploadModal);
  document.getElementById('btn-file-sync').addEventListener('click', () => {
    if (_savesFileHandle) unlinkSavesFile(); else pickSavesFile();
  });
  document.getElementById('btn-copy').addEventListener('click', copyPrompt);
  document.getElementById('btn-download').addEventListener('click', downloadPrompt);
  document.getElementById('btn-reset').addEventListener('click', resetAll);

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

  // collab — server setup
  document.getElementById('btn-save-server').addEventListener('click', () => {
    const url = document.getElementById('collab-server-input').value.trim().replace(/^https?:\/\//, m => m === 'https://' ? 'wss://' : 'ws://');
    if (!url) return;
    setCollabServer(url);
    openCollabModal(); // re-render modal with main section
  });
  document.getElementById('btn-change-server').addEventListener('click', () => {
    clearCollabServer();
    if (ws) { _intentionalClose = true; clearTimeout(_reconnectTimer); ws.close(); }
    openCollabModal();
  });

  // collab — room management
  document.getElementById('btn-collab').addEventListener('click', openCollabModal);
  document.getElementById('collab-modal-close').addEventListener('click', closeCollabModal);
  document.getElementById('collab-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCollabModal(); });
  document.getElementById('btn-create-room').addEventListener('click', () => connectCollab(null));
  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('collab-join-input').value.trim().toUpperCase();
    if (code) connectCollab(code);
  });
  document.getElementById('btn-copy-room-link').addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
  });
  document.getElementById('btn-leave-room').addEventListener('click', () => {
    _intentionalClose = true;
    clearTimeout(_reconnectTimer);
    if (ws) { ws.close(); }
    closeCollabModal();
  });

  // version note modal
  document.getElementById('version-note-close').addEventListener('click', closeVersionNoteModal);
  document.getElementById('version-note-cancel').addEventListener('click', closeVersionNoteModal);
  document.getElementById('version-note-save').addEventListener('click', saveVersionNote);
  document.getElementById('version-note-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeVersionNoteModal(); });

  // test note modal
  document.getElementById('test-note-close').addEventListener('click', closeTestNoteModal);
  document.getElementById('test-note-cancel').addEventListener('click', closeTestNoteModal);
  document.getElementById('test-note-save').addEventListener('click', saveTestNote);
  document.getElementById('test-note-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeTestNoteModal(); });

  // template modal
  document.getElementById('btn-templates').addEventListener('click', openTemplateModal);
  document.getElementById('template-modal-close').addEventListener('click', closeTemplateModal);
  document.getElementById('template-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeTemplateModal(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); savePromptAs(); }
    if ((e.ctrlKey||e.metaKey) && e.key === 'c' && e.shiftKey) { e.preventDefault(); copyPrompt(); }
    if ((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); }
    if (e.key === 'ArrowRight' && e.altKey) { e.preventDefault(); goTo(currentStep + 1); }
    if (e.key === 'ArrowLeft'  && e.altKey) { e.preventDefault(); goTo(currentStep - 1); }
  });

  // check URL for ?room= param
  const urlRoom = new URLSearchParams(window.location.search).get('room');
  if (urlRoom) connectCollab(urlRoom.toUpperCase());

  // Init file persistence (async — may show restore banner)
  initFileStorage().then(() => updateFileSyncIndicator());

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
