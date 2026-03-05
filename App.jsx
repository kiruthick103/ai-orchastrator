import { useState, useCallback, useRef, useMemo, memo, useEffect } from "react";

// ─── WISTERIA BLOOM PALETTE ──────────────────────────────────────────────────
const C = {
  iv0:"#ffffff",iv1:"#fafaff",iv2:"#f3efff",iv3:"#e9e3ff",iv4:"#ddd5ff",iv5:"#d3d3ff",
  ch0:"#1a0028",ch1:"#2d0047",ch2:"#480070",ch3:"#6600a8",ch4:"#8800c0",
  ch5:"#9a30c8",ch6:"#b460d8",ch7:"#d8bfd8",ch8:"#e8d4ee",ch9:"#f5eefa",
  bl0:"#1a0028",bl1:"#360055",bl2:"#5c0099",bl3:"#9400d3",bl4:"#b040e0",
  bl5:"#c870eb",bl6:"#d8a8f0",bl7:"#e8cef8",bl8:"#f5eafe",
  gr0:"#3a1848",gr1:"#5a2868",gr2:"#804090",gr3:"#a060a8",gr4:"#c080c0",
  gr5:"#d8bfd8",gr6:"#e4d0e8",gr7:"#eddbf0",gr8:"#f4eaf8",gr9:"#faf4fc",
  ok:"#3d6e50",ok2:"#5a8e6a",ok3:"#b8d8c4",ok4:"#e4f4ea",
  warn:"#7a5500",warn2:"#a07020",warn3:"#ddc060",warn4:"#f8eec8",
  err:"#9c1060",err2:"#c03080",err3:"#e890be",err4:"#fce8f4",
  pk:"#ed80e9",pk2:"#f0a0ec",pk3:"#f8d0f8",pk4:"#fdf0fd",
  sh1:"0 1px 4px rgba(90,0,140,0.07)",
  sh2:"0 3px 14px rgba(90,0,140,0.10),0 1px 3px rgba(90,0,140,0.06)",
  sh3:"0 8px 32px rgba(90,0,140,0.13),0 2px 8px rgba(90,0,140,0.07)",
};

// ─── API base ─────────────────────────────────────────────────────────────────
const API = import.meta?.env?.VITE_API_URL || "";

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    headers: { "Content-Type":"application/json", ...(opts.headers||{}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

async function callAI(messages, system = "", maxTokens = 1000, provider = "anthropic") {
  const d = await apiFetch("/api/chat", { method:"POST", body:{ messages, system, maxTokens, provider } });
  return d.text ?? "";
}

// ─── ACTIVE MODELS (AI + Code) — these directly call the API ─────────────────
const MODEL_GROUPS = [
  { group:"AI Models", models:[
    { id:"text",   cat:"Text",       e:"🧠", label:"Language Model",  sub:"LLM · Chat · Q&A",         col:C.bl3,bg:C.bl8,bdr:C.bl7, ph:"Ask anything — chat, Q&A, writing, reasoning…",       sys:"You are an expert AI assistant. Answer with clarity, depth, and excellent structure.", mode:"text" },
    { id:"image",  cat:"Image Gen",  e:"🖼️", label:"Image Generator", sub:"Text → SVG Art",            col:C.ch3,bg:C.iv2,bdr:C.ch8, ph:"Describe the image or artwork to generate…",           sys:`You are a master SVG artist. Output ONLY raw SVG from <svg to </svg>. viewBox="0 0 440 440" width="440" height="440". 28+ layered elements, rich gradients, depth.`, mode:"svg" },
    { id:"audio",  cat:"Audio",      e:"🎙️", label:"Speech Engine",   sub:"TTS · STT · Voice",         col:C.gr2,bg:C.gr9,bdr:C.gr7, ph:"Text to synthesize or describe audio to transcribe…",   sys:"You are an advanced speech AI. For TTS: voice profile, prosody, phoneme breakdown. For STT: transcript with timestamps, speaker labels.", mode:"text" },
    { id:"video",  cat:"Video",      e:"🎥", label:"Video Analyst",   sub:"Caption · Detect · Track",  col:C.bl2,bg:C.bl8,bdr:C.bl7, ph:"Describe the video scene to analyze…",                  sys:"You are a video intelligence AI. Scene breakdown, object detection, temporal narrative, motion analysis.", mode:"text" },
    { id:"data",   cat:"Data",       e:"📊", label:"Data Analyst",    sub:"CSV · Insights · Forecast", col:C.ch4,bg:C.iv3,bdr:C.ch8, ph:"Paste CSV data or describe your dataset…",              sys:"You are a senior data scientist. Key Findings, Statistical Patterns, Outlier Analysis, Trend Forecast, Recommendations.", mode:"text" },
    { id:"multi",  cat:"Multimodal", e:"🧬", label:"Multimodal AI",   sub:"Text + Vision",             col:C.bl3,bg:C.bl8,bdr:C.bl6, ph:"Describe an image and ask a question about it…",        sys:"You are an omni-modal AI. Process text+vision queries with integrated reasoning.", mode:"text" },
    { id:"embed",  cat:"Embeddings", e:"🏗",  label:"Embed Engine",   sub:"Text → Vector · Search",    col:C.gr3,bg:C.gr9,bdr:C.gr7, ph:"Text to embed, or a semantic search query…",            sys:"You are a semantic embedding engine. Identify concepts, vector clusters, top-10 similar concepts, RAG strategy.", mode:"text" },
    { id:"agent",  cat:"Agentic",    e:"🤖", label:"Workflow Plan",   sub:"Task → Agent DAG",          col:C.ch3,bg:C.iv2,bdr:C.ch8, ph:"Describe a complex task to decompose and plan…",        sys:"You are an autonomous workflow architect. Task decomposition, agent roles, dependency DAG, execution plan.", mode:"text" },
    { id:"adv",    cat:"Advanced",   e:"🧪", label:"Neural Arch",     sub:"Transformer · Diffusion · RL",col:C.bl3,bg:C.bl8,bdr:C.bl7,ph:"Ask about architectures, training, model internals…", sys:"You are a deep learning researcher. Explain architectures with math, ASCII diagrams, implementation details.", mode:"text" },
  ]},
  { group:"Code Models", models:[
    { id:"python",   cat:"Python",     e:"🐍", label:"Python",         sub:"Scripts · Data · ML",       col:C.bl3,bg:C.bl8,bdr:C.bl7, ph:"Describe the Python script, function, or class…",     sys:"You are a senior Python engineer. Write clean, type-annotated code with docstrings and error handling.", mode:"code",lang:"python" },
    { id:"tsx",      cat:"TSX",        e:"⚛️", label:"TypeScript/TSX", sub:"React · Components",        col:C.ch3,bg:C.iv2,bdr:C.ch8, ph:"Describe the React/TSX component to build…",          sys:"You are a senior React/TypeScript engineer. Write production-ready TSX with hooks, proper types, accessibility.", mode:"code",lang:"tsx" },
    { id:"docker",   cat:"Docker",     e:"🐳", label:"Docker",         sub:"Container · Compose",       col:C.ch4,bg:C.iv3,bdr:C.ch8, ph:"Describe the service or environment to containerize…", sys:"You are a Docker/DevOps expert. Generate Dockerfiles and docker-compose.yml with multi-stage builds, health checks.", mode:"code",lang:"dockerfile" },
    { id:"json",     cat:"JSON",       e:"📦", label:"JSON Schema",    sub:"Structure · Validate",      col:C.gr3,bg:C.gr9,bdr:C.gr7, ph:"Describe the data structure or schema…",               sys:"You are a JSON schema specialist. Generate well-structured JSON with validation, clear nesting.", mode:"code",lang:"json" },
    { id:"sql",      cat:"SQL",        e:"🗄️", label:"SQL Query",      sub:"Query · Optimize",          col:C.bl2,bg:C.bl8,bdr:C.bl7, ph:"Describe the database query or schema needed…",        sys:"You are a SQL expert. Generate optimized queries with CTEs, indexes, execution plan notes.", mode:"code",lang:"sql" },
    { id:"bash",     cat:"Bash",       e:"🖥️", label:"Bash/Shell",     sub:"Scripts · Automation",      col:C.ch3,bg:C.iv2,bdr:C.ch8, ph:"Describe the shell script or automation task…",        sys:"You are a bash expert. Write robust scripts with error handling, argument parsing, POSIX compatibility.", mode:"code",lang:"bash" },
    { id:"yaml",     cat:"YAML",       e:"⚙️", label:"YAML/Config",    sub:"Config · K8s · CI",         col:C.gr2,bg:C.gr9,bdr:C.gr7, ph:"Describe the config file, pipeline, or k8s manifest…", sys:"You are a DevOps config expert. Generate YAML for Kubernetes, GitHub Actions, GitLab CI.", mode:"code",lang:"yaml" },
    { id:"rust",     cat:"Rust",       e:"🦀", label:"Rust",           sub:"Systems · Performance",     col:C.bl3,bg:C.bl8,bdr:C.bl7, ph:"Describe the Rust program or system to build…",        sys:"You are a senior Rust engineer. Write idiomatic Rust with ownership, lifetimes, Result/Option.", mode:"code",lang:"rust" },
    { id:"go",       cat:"Go",         e:"🐹", label:"Golang",         sub:"Concurrent · APIs",          col:C.ch4,bg:C.iv3,bdr:C.ch8, ph:"Describe the Go program or API to build…",             sys:"You are a senior Go engineer. Write idiomatic Go with goroutines, interfaces, proper error handling.", mode:"code",lang:"go" },
    { id:"regex",    cat:"Regex",      e:"🔍", label:"Regex",          sub:"Patterns · Validation",     col:C.gr3,bg:C.gr9,bdr:C.gr7, ph:"Describe the pattern to match or validate…",           sys:"You are a regex expert. Pattern + explanation + named groups + edge cases + examples.", mode:"code",lang:"regex" },
    { id:"graphql",  cat:"GraphQL",    e:"◈",  label:"GraphQL",        sub:"Schema · Queries",          col:C.ch4,bg:C.iv3,bdr:C.ch8, ph:"Describe the GraphQL schema, query, or mutation…",     sys:"You are a GraphQL expert. Design schemas with types, queries, mutations, N+1 prevention.", mode:"code",lang:"graphql" },
    { id:"css",      cat:"CSS",        e:"🎨", label:"CSS/Tailwind",   sub:"Styles · Animations",       col:C.bl3,bg:C.bl8,bdr:C.bl7, ph:"Describe the UI component or animation to style…",     sys:"You are a CSS/Tailwind expert. Custom properties, responsive design, animations, dark mode.", mode:"code",lang:"css" },
    { id:"api",      cat:"REST API",   e:"🔌", label:"REST API",       sub:"OpenAPI · Endpoints",       col:C.gr3,bg:C.gr9,bdr:C.gr7, ph:"Describe the REST API endpoints or OpenAPI spec…",     sys:"You are an API architect. OpenAPI 3.0 YAML, proper HTTP methods, auth strategy, rate limiting.", mode:"code",lang:"yaml" },
    { id:"markdown", cat:"Markdown",   e:"📝", label:"Markdown/Docs",  sub:"Docs · README",             col:C.ch3,bg:C.iv2,bdr:C.ch8, ph:"Describe the docs page, README, or guide…",            sys:"You are a technical writer. Clear Markdown with headings, code blocks, tables, badges.", mode:"code",lang:"markdown" },
    { id:"terraform",cat:"Terraform",  e:"🏗", label:"Terraform/IaC",  sub:"AWS · GCP · Azure",         col:C.bl2,bg:C.bl8,bdr:C.bl7, ph:"Describe the cloud infrastructure to provision…",      sys:"You are a Terraform expert. Modular HCL with resources, variables, outputs, best practices.", mode:"code",lang:"hcl" },
  ]},
];
const ALL_MODELS = MODEL_GROUPS.flatMap(g => g.models);

// ─── OTHER MODELS — ML task browser, powered by main LLM ─────────────────────
// These don't need dedicated API endpoints — one AI handles all via task-specific prompts.
const OTHER_TASK_GROUPS = [
  { group:"Natural Language Processing", col:"#c03080", icon:"🔴", tasks:[
    { id:"nlp-textcls",   name:"Text Classification",        icon:"🔴", ph:"Classify this text: …",         sys:"You are a text classification AI. Given input text, assign it one or more categories. Show label, confidence score, and brief reasoning." },
    { id:"nlp-tokencls",  name:"Token Classification",       icon:"🔴", ph:"Label tokens in: …",             sys:"You are a named entity recognition AI. Tag each token with its entity type (PERSON, ORG, LOC, DATE, etc.). Output in BIO format with explanations." },
    { id:"nlp-tableqa",   name:"Table Question Answering",   icon:"🔴", ph:"Table: … Question: …",           sys:"You are a table QA AI. Parse the provided table data and answer questions about it with precision, citing specific cells." },
    { id:"nlp-qa",        name:"Question Answering",         icon:"🔴", ph:"Context: … Question: …",         sys:"You are an extractive QA AI. Find the exact answer span within the provided context and return it with a confidence score." },
    { id:"nlp-zeroshot",  name:"Zero-Shot Classification",   icon:"🔴", ph:"Text: … Labels: …",              sys:"You are a zero-shot classifier. Classify the text into the provided labels without prior training examples. Return scores for each label." },
    { id:"nlp-translate", name:"Translation",                icon:"🔴", ph:"Translate to [language]: …",     sys:"You are a professional translator. Provide accurate translation preserving tone, idioms, and context. Include notes on ambiguous terms." },
    { id:"nlp-summarize", name:"Summarization",              icon:"🔴", ph:"Summarize this text: …",         sys:"You are a summarization AI. Produce an abstractive summary that captures key points. Provide both a one-sentence and a paragraph summary." },
    { id:"nlp-features",  name:"Feature Extraction",         icon:"🔴", ph:"Extract features from: …",       sys:"You are a feature extraction AI. Identify and list key semantic features, entities, sentiments, topics, and linguistic patterns in the text." },
    { id:"nlp-textgen",   name:"Text Generation",            icon:"🔴", ph:"Continue or generate from: …",   sys:"You are a creative text generation AI. Produce coherent, contextually appropriate continuations or completions based on the prompt." },
    { id:"nlp-fillmask",  name:"Fill-Mask",                  icon:"🔴", ph:"Sentence with [MASK]: …",        sys:"You are a masked language model. Predict the top-5 most likely words for each [MASK] token with probability scores." },
    { id:"nlp-similarity",name:"Sentence Similarity",        icon:"🔴", ph:"Sentence A: … Sentence B: …",   sys:"You are a semantic similarity AI. Score sentence similarity from 0–1, explain what they share and differ on, and list key semantic overlaps." },
    { id:"nlp-ranking",   name:"Text Ranking",               icon:"🔴", ph:"Query: … Documents: …",          sys:"You are a document ranking AI. Rank the provided documents by relevance to the query. Output ranked list with relevance scores and rationale." },
  ]},
  { group:"Audio", col:"#3d8a5a", icon:"🟢", tasks:[
    { id:"aud-tts",   name:"Text-to-Speech",             icon:"🟢", ph:"Text to speak: …",               sys:"You are a TTS AI. Simulate a spoken output: provide phonetic transcription, prosody notes, SSML markup, and voice style recommendations." },
    { id:"aud-tta",   name:"Text-to-Audio",              icon:"🟢", ph:"Describe audio to generate: …",  sys:"You are an audio synthesis AI. Describe the audio waveform characteristics, frequency content, and provide a Foley/synthesis recipe." },
    { id:"aud-asr",   name:"Automatic Speech Recognition",icon:"🟢",ph:"Describe the audio/speech: …",  sys:"You are an ASR AI. Produce a formatted transcript with timestamps, speaker labels, confidence scores, and punctuation restoration." },
    { id:"aud-ata",   name:"Audio-to-Audio",             icon:"🟢", ph:"Describe source audio + goal: …",sys:"You are an audio transformation AI. Describe signal processing steps for style transfer, enhancement, or conversion of the audio." },
    { id:"aud-cls",   name:"Audio Classification",       icon:"🟢", ph:"Describe or paste audio info: …",sys:"You are an audio classifier. Identify the audio category (music genre, speech, environmental sound) with confidence and feature analysis." },
    { id:"aud-vad",   name:"Voice Activity Detection",   icon:"🟢", ph:"Describe audio content: …",      sys:"You are a VAD AI. Identify speech vs non-speech segments with timestamps, confidence scores, and noise level analysis." },
  ]},
  { group:"Tabular", col:"#4a7ab5", icon:"🔷", tasks:[
    { id:"tab-cls",  name:"Tabular Classification",  icon:"🔷", ph:"Describe dataset + predict class for: …",sys:"You are a tabular classification AI. Predict the class label for the given input features. Show feature importance, decision path, and confidence." },
    { id:"tab-reg",  name:"Tabular Regression",      icon:"🔷", ph:"Describe dataset + predict value for: …",sys:"You are a regression AI. Predict the numeric target value with a confidence interval. Show feature contributions and model assumptions." },
    { id:"tab-ts",   name:"Time Series Forecasting", icon:"🔷", ph:"Time series data + forecast horizon: …",sys:"You are a time series AI. Forecast future values with confidence intervals. Identify trend, seasonality, and anomalies in the data." },
  ]},
  { group:"Reinforcement Learning", col:"#b87820", icon:"🟡", tasks:[
    { id:"rl-rl",    name:"Reinforcement Learning",   icon:"🟡", ph:"Describe environment + agent goal: …",  sys:"You are an RL AI. Design a reward function, policy outline, and training strategy. Suggest suitable algorithms (PPO, DQN, SAC) for the task." },
    { id:"rl-robot", name:"Robotics",                 icon:"🟡", ph:"Describe robot + task: …",              sys:"You are a robotics AI. Design a control policy, sensor fusion approach, and motion planning strategy. Include kinematic constraints." },
  ]},
  { group:"Other", col:"#7a3a9a", icon:"🟣", tasks:[
    { id:"oth-gml",  name:"Graph Machine Learning",   icon:"🟣", ph:"Describe graph + task (node/link/graph classification): …", sys:"You are a graph ML AI. Apply GNN concepts to the problem. Suggest graph construction, node features, message passing scheme, and evaluation metrics." },
    { id:"oth-multimodal",name:"Multimodal Learning", icon:"🟣", ph:"Describe modalities + task: …",         sys:"You are a multimodal learning AI. Design a fusion strategy for the given modalities. Explain alignment, cross-attention, and late/early fusion tradeoffs." },
    { id:"oth-ssl",  name:"Self-Supervised Learning", icon:"🟣", ph:"Describe data + pretraining goal: …",   sys:"You are a self-supervised learning AI. Design a pretraining objective (contrastive, masked, generative). Explain augmentation strategy and downstream task transfer." },
  ]},
];

const AGENTS = [
  { id:"planner",    name:"Planner",    g:"◐", col:C.bl3 },
  { id:"researcher", name:"Researcher", g:"◎", col:C.ch4 },
  { id:"executor",   name:"Executor",   g:"◑", col:C.ok },
  { id:"critic",     name:"Critic",     g:"◒", col:C.err2 },
  { id:"synth",      name:"Synthesizer",g:"◈", col:C.gr3 },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2,9);
const fmtD = ms => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

function scoreConf(t) {
  const l = t.trim().length;
  let s = 0.52 + (l>900?.24:l>450?.15:l>180?.08:l<40?-.22:0);
  if (["i cannot","i'm unable","as an ai"].some(p=>t.toLowerCase().includes(p))) s-=.22;
  if (["```","recommend","therefore","result","here is"].some(w=>t.toLowerCase().includes(w))) s+=.07;
  return Math.round(Math.min(Math.max(s,0),.99)*1000)/1000;
}

function sanitizeSvg(raw) {
  const m=(raw||"").match(/<svg[\s\S]*?<\/svg>/i); if(!m) return null;
  return m[0].replace(/<script[\s\S]*?<\/script>/gi,"").replace(/\bon\w+\s*=\s*["'][^"']*["']/gi,"");
}

function fallbackSvg(p) {
  return `<svg viewBox="0 0 440 440" width="440" height="440" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g1" cx="35%" cy="35%"><stop offset="0%" stop-color="${C.bl3}" stop-opacity=".38"/><stop offset="100%" stop-color="${C.bl3}" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="68%" cy="68%"><stop offset="0%" stop-color="${C.pk}" stop-opacity=".28"/><stop offset="100%" stop-color="${C.pk}" stop-opacity="0"/></radialGradient></defs><rect width="440" height="440" fill="${C.iv2}"/><ellipse cx="160" cy="155" rx="145" ry="120" fill="url(#g1)"/><ellipse cx="300" cy="300" rx="165" ry="135" fill="url(#g2)"/><circle cx="220" cy="220" r="90" fill="none" stroke="${C.ch4}" stroke-width=".6" opacity=".22"/><text x="220" y="398" text-anchor="middle" fill="${C.ch4}" fill-opacity=".4" font-size="11" font-family="Georgia,serif">${String(p).slice(0,38)}</text></svg>`;
}

async function processFile(file) {
  const sz = file.size>1e6?`${(file.size/1e6).toFixed(1)}MB`:`${Math.round(file.size/1024)}KB`;
  if (file.type.startsWith("image/")) {
    const data = await new Promise((r,j)=>{const rd=new FileReader();rd.onload=()=>r(rd.result.split(",")[1]);rd.onerror=j;rd.readAsDataURL(file);});
    return { id:uid(),type:"image",name:file.name,sz,data,mime:file.type,preview:URL.createObjectURL(file) };
  }
  return { id:uid(),type:file.name.endsWith(".csv")?"csv":file.name.endsWith(".pdf")?"pdf":"text",name:file.name,sz,content:await file.text() };
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const S = {
  input:{ background:C.iv2,border:`1.5px solid ${C.ch8}`,borderRadius:10,padding:"12px 14px",color:C.ch2,fontFamily:"var(--serif)",fontSize:14.5,resize:"vertical",outline:"none",lineHeight:1.65,boxSizing:"border-box",width:"100%",transition:"border-color .15s" },
  label:{ fontSize:10,fontWeight:700,color:C.ch5,fontFamily:"var(--mono)",letterSpacing:1.5,textTransform:"uppercase",display:"block",marginBottom:6 },
  mono: { fontFamily:"var(--mono)",fontSize:12.5,color:C.ch2,lineHeight:1.85 },
};

const AmbientBg = memo(({ tint=C.bl6 }) => (
  <div style={{ position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0 }}>
    <div style={{ position:"absolute",top:"-10%",right:"0%",width:540,height:540,borderRadius:"50%",background:`radial-gradient(circle,${tint}14 0%,transparent 65%)`,filter:"blur(64px)" }}/>
    <div style={{ position:"absolute",bottom:"-18%",left:"5%",width:660,height:660,borderRadius:"50%",background:`radial-gradient(circle,${C.gr5}18 0%,transparent 60%)`,filter:"blur(72px)" }}/>
    <div style={{ position:"absolute",top:"40%",left:"28%",width:380,height:380,borderRadius:"50%",background:`radial-gradient(circle,${C.pk3}28 0%,transparent 65%)`,filter:"blur(52px)" }}/>
    <svg style={{ position:"absolute",bottom:0,right:0,width:320,height:240,opacity:.025 }} viewBox="0 0 320 240">
      {[0,1,2,3,4,5,6,7].map(i=><line key={i} x1={320-i*38} y1={0} x2={320} y2={i*28} stroke={C.ch0} strokeWidth=".8"/>)}
      <circle cx="275" cy="72" r="52" fill="none" stroke={C.ch0} strokeWidth=".6"/>
    </svg>
  </div>
));

const ConfBar = memo(({v,col})=>{
  const c=col||(v>.8?C.ok:v>.55?C.warn2:C.err2);
  return(<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:3,background:C.ch9,borderRadius:99,overflow:"hidden"}}><div style={{width:`${v*100}%`,height:"100%",background:c,borderRadius:99,transition:"width 1s ease"}}/></div><span style={{fontSize:10,fontWeight:700,color:c,minWidth:28,fontFamily:"var(--mono)"}}>{(v*100).toFixed(0)}%</span></div>);
});

const Pill = memo(({label,col=C.bl3,bg})=>(<span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:99,fontSize:9.5,fontWeight:700,fontFamily:"var(--mono)",letterSpacing:.9,textTransform:"uppercase",background:bg||`${col}15`,color:col,border:`1px solid ${col}28`}}>{label}</span>));
const Dot  = memo(({col=C.ok2,size=7,pulse})=>(<span style={{display:"inline-block",width:size,height:size,borderRadius:"50%",background:col,flexShrink:0,animation:pulse?"pp 1.6s ease infinite":"none",boxShadow:pulse?`0 0 0 3px ${col}25`:"none"}}/>));
const Spin = memo(({col=C.ch3,size=20})=>(<div style={{width:size,height:size,border:`2.5px solid ${col}22`,borderTopColor:col,borderRadius:"50%",animation:"spin .85s linear infinite",flexShrink:0}}/>));
const Dots3= memo(({col=C.ch5})=>(<div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:col,animation:`db 1.3s ease-in-out ${i*.2}s infinite`}}/>)}</div>));

const ICard = memo(({children,style,accent,onClick,elevated})=>{
  const [hov,setHov]=useState(false);
  return(<div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={onClick} style={{background:C.iv1,borderRadius:16,border:`1px solid ${hov&&accent?accent+"45":C.ch8}`,boxShadow:elevated?C.sh3:hov?C.sh2:C.sh1,transition:"all .22s",position:"relative",overflow:"hidden",cursor:onClick?"pointer":"default",...style}}>{accent&&<div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:`linear-gradient(90deg,transparent,${accent},transparent)`,opacity:hov?.8:.35,transition:"opacity .2s"}}/>}{children}</div>);
});

const Btn = memo(({children,onClick,disabled,v="ink",size="md",full,style:sx})=>{
  const [hov,setHov]=useState(false);
  const on=!disabled&&hov;
  const V={ink:{bg:on?C.ch2:disabled?C.ch9:C.ch3,fg:disabled?C.ch6:C.iv2,sh:disabled?"none":`0 4px 18px ${C.ch3}30`},steel:{bg:on?C.bl2:disabled?C.ch9:C.bl3,fg:disabled?C.ch6:"#fff",sh:disabled?"none":`0 4px 18px ${C.bl3}35`},ghost:{bg:on?C.ch9:"transparent",fg:C.ch3,sh:"none",bd:`1px solid ${on?C.ch7:C.ch8}`},flat:{bg:on?C.iv3:"transparent",fg:C.ch4,sh:"none"}};
  const st=V[v]||V.ink;
  const pad={sm:"5px 14px",md:"9px 22px",lg:"13px 32px"};
  return(<button onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={!disabled?onClick:undefined} disabled={disabled} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"var(--serif)",fontWeight:700,fontSize:size==="sm"?11:size==="lg"?15:13,padding:pad[size]||pad.md,borderRadius:10,border:st.bd||"none",background:st.bg,color:st.fg,boxShadow:st.sh,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.48:1,transform:on?"translateY(-1px)":"none",transition:"all .16s",width:full?"100%":"auto",...sx}}>{children}</button>);
});

const AttChip = memo(({att,onRemove})=>{
  const icons={image:"🖼️",pdf:"📄",csv:"📊",text:"📝"};
  return(<div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",background:C.iv2,borderRadius:8,border:`1px solid ${C.ch8}`,maxWidth:200}}>{att.type==="image"&&att.preview?<img src={att.preview} alt="" style={{width:26,height:26,borderRadius:5,objectFit:"cover",border:`1px solid ${C.ch8}`}}/>:<span style={{fontSize:16}}>{icons[att.type]||"📎"}</span>}<div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:C.ch2,fontFamily:"var(--serif)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</div><div style={{fontSize:9,color:C.ch5,fontFamily:"var(--mono)"}}>{att.sz}</div></div><button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:C.ch6,fontSize:15,lineHeight:1,padding:"0 2px",transition:"color .13s"}} onMouseEnter={e=>e.currentTarget.style.color=C.err2} onMouseLeave={e=>e.currentTarget.style.color=C.ch6}>×</button></div>);
});

// ─── ORCHESTRATOR ─────────────────────────────────────────────────────────────
function OrchestratorPage({ activeProvider }) {
  const [input,setInput]   = useState("");
  const [atts,setAtts]     = useState([]);
  const [tasks,setTasks]   = useState([]);
  const [running,setRunning]=useState(false);
  const [drag,setDrag]     = useState(false);

  const addFiles = useCallback(async files => {
    const p = await Promise.all(Array.from(files).slice(0,4).map(processFile));
    setAtts(prev => [...prev,...p].slice(0,4));
  },[]);

  const openPicker = useCallback((accept)=>{
    const el=document.createElement("input");el.type="file";el.accept=accept;el.multiple=true;
    el.onchange=e=>addFiles(e.target.files);el.click();
  },[addFiles]);

  const run = useCallback(async()=>{
    if((!input.trim()&&!atts.length)||running) return;
    const id=uid(),t0=Date.now();
    const task={id,input:input||"(attached files)",atts:[...atts],status:"running",steps:[],conf:0,dur:0,active:null};
    setTasks(p=>[task,...p]);
    setRunning(true);setInput("");setAtts([]);

    const steps=[];
    const AGENT_SYSS = {
      planner:   "You are a strategic planner. Create a structured execution plan with specific steps and success criteria.",
      researcher:"You are a research specialist. Gather all relevant knowledge and context comprehensively.",
      executor:  "You are an expert executor. Carry out the task with precision producing high-quality output.",
      critic:    "You are a rigorous critic. SCORE(1-10) | CRITICAL ISSUES | SPECIFIC IMPROVEMENTS | REVISED SECTIONS.",
      synth:     "You are a master synthesizer. Integrate all agent outputs into a polished final response.",
    };

    for (const ag of AGENTS) {
      setTasks(p=>p.map(t=>t.id!==id?t:{...t,active:ag.id}));
      const t1=Date.now();
      try {
        const prev = steps.length?`\nPrevious (${steps.at(-1).name}):\n${steps.at(-1).text.slice(0,600)}\n---\nTask: ${task.input}`:task.input;
        // Build message with possible attachment context
        let msgContent = prev;
        if (!steps.length && atts.length) {
          const attContext = atts.map(a => a.type==="image"?`[Image: ${a.name}]`:`[File: ${a.name}]\n${a.content||""}`).join("\n");
          msgContent = `${attContext}\n\n${prev}`;
        }
        const text = await callAI([{role:"user",content:msgContent}], AGENT_SYSS[ag.id]||"", 1000, activeProvider);
        const d=Date.now()-t1,cf=scoreConf(text);
        steps.push({agId:ag.id,name:ag.name,g:ag.g,col:ag.col,text,conf:cf,dur:d});
        setTasks(p=>p.map(t=>t.id!==id?t:{...t,steps:[...steps],conf:steps.reduce((s,r)=>s+r.conf,0)/steps.length}));
      } catch(e) {
        steps.push({agId:ag.id,name:ag.name,g:ag.g,col:ag.col,text:`Error: ${e.message}`,conf:0,dur:0});
        setTasks(p=>p.map(t=>t.id!==id?t:{...t,steps:[...steps]}));
      }
    }
    const dur=Date.now()-t0,cf=steps.reduce((s,r)=>s+r.conf,0)/steps.length;
    setTasks(p=>p.map(t=>t.id!==id?t:{...t,status:"done",dur,conf:cf,active:null}));
    setRunning(false);
  },[input,atts,running,activeProvider]);

  const done=tasks.filter(t=>t.status==="done");
  const avgConf=done.length?done.reduce((s,t)=>s+t.conf,0)/done.length:0;

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",position:"relative"}}>
      <AmbientBg tint={C.bl6}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:1,overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 26px 16px",borderBottom:`1px solid ${C.ch9}`,background:`${C.iv1}ee`,backdropFilter:"blur(10px)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:16}}>
            <div style={{flex:1}}>
              <h2 style={{fontSize:24,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)",letterSpacing:-.5,lineHeight:1,margin:0}}>AI Orchestrator</h2>
              <p style={{fontSize:11.5,color:C.ch5,fontFamily:"var(--mono)",marginTop:4,letterSpacing:.5}}>5-agent autonomous pipeline · provider: <span style={{color:C.bl3,fontWeight:700}}>{activeProvider}</span></p>
            </div>
            {done.length>0&&(
              <div style={{display:"flex",gap:10}}>
                {[{l:"Runs",v:tasks.length,c:C.ch3},{l:"Done",v:done.length,c:C.ok},{l:"Avg Conf",v:`${(avgConf*100).toFixed(0)}%`,c:C.bl3}].map(s=>(
                  <div key={s.l} style={{textAlign:"center",padding:"8px 16px",background:C.iv2,borderRadius:10,border:`1px solid ${C.ch9}`,boxShadow:C.sh1}}>
                    <div style={{fontSize:20,fontWeight:800,color:s.c,fontFamily:"var(--serif)",lineHeight:1}}>{s.v}</div>
                    <div style={{fontSize:9,color:C.ch5,fontFamily:"var(--mono)",letterSpacing:1,marginTop:3}}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Agent viz */}
          <div style={{display:"flex",alignItems:"center",padding:"12px 16px",background:C.iv2,borderRadius:12,border:`1px solid ${C.ch9}`}}>
            {AGENTS.map((ag,i)=>{
              const isAct=running&&tasks[0]?.active===ag.id;
              const isDone=tasks[0]?.steps?.some(s=>s.agId===ag.id);
              return(<div key={ag.id} style={{display:"flex",alignItems:"center",flex:i<AGENTS.length-1?1:"auto"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:isAct?ag.col:isDone?`${ag.col}20`:C.ch9,border:`2px solid ${isAct||isDone?ag.col+"70":C.ch8}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .3s",boxShadow:isAct?`0 0 0 5px ${ag.col}18`:"none",animation:isAct?"agP 1.4s ease infinite":"none"}}>
                    {isAct?<Spin col={isAct?"white":ag.col} size={18}/>:<span style={{fontSize:17,color:isAct?"white":isDone?ag.col:C.ch6}}>{ag.g}</span>}
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color:isAct?ag.col:isDone?ag.col:C.ch5,fontFamily:"var(--mono)",letterSpacing:.4,transition:"color .3s"}}>{ag.name}</span>
                </div>
                {i<AGENTS.length-1&&<div style={{flex:1,height:1.5,margin:"0 6px",marginBottom:16,background:isDone?`linear-gradient(90deg,${ag.col}60,${AGENTS[i+1].col}60)`:C.ch9,transition:"background .5s"}}/>}
              </div>);
            })}
          </div>
        </div>
        {/* Input */}
        <div style={{padding:"16px 26px",borderBottom:`1px solid ${C.ch9}`,background:`${C.iv1}f2`,backdropFilter:"blur(8px)",flexShrink:0}}>
          <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);addFiles(e.dataTransfer.files);}}
            style={{border:`2px solid ${drag?C.bl3:C.ch8}`,borderRadius:14,overflow:"hidden",background:drag?`${C.bl8}80`:C.iv1,transition:"border-color .2s,background .2s"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&run()}
              placeholder="Describe any complex task — the 5-agent pipeline will plan, research, execute, critique, and synthesize. Attach files for context."
              style={{...S.input,minHeight:100,background:"transparent",border:"none",padding:"16px 18px",fontSize:15}}/>
            {atts.length>0&&<div style={{padding:"8px 14px 10px",display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${C.ch9}`}}>{atts.map(a=><AttChip key={a.id} att={a} onRemove={()=>setAtts(p=>p.filter(x=>x.id!==a.id))}/>)}</div>}
            <div style={{padding:"10px 14px",borderTop:`1px solid ${C.ch9}`,display:"flex",alignItems:"center",gap:8,background:`${C.iv2}88`}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[{i:"🖼️",l:"Image",a:"image/*"},{i:"📄",l:"PDF",a:".pdf"},{i:"📊",l:"CSV",a:".csv,.xlsx"},{i:"📝",l:"Code",a:".txt,.md,.js,.ts,.tsx,.py,.json,.yaml,.sh,.sql"},{i:"➕",l:"Any",a:"*"}].map(b=>(
                  <button key={b.l} title={`Attach ${b.l}`} onClick={()=>openPicker(b.a)}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:`1px solid ${C.ch8}`,background:"transparent",cursor:"pointer",fontFamily:"var(--serif)",fontSize:11.5,color:C.ch5,transition:"all .14s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=C.iv3;e.currentTarget.style.color=C.ch2;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=C.ch5;}}>
                    <span>{b.i}</span><span>{b.l}</span>
                  </button>
                ))}
              </div>
              <div style={{flex:1}}/>
              <span style={{fontSize:10,color:C.ch7,fontFamily:"var(--mono)"}}>⌘↵ run</span>
              <Btn onClick={run} disabled={running||(!input.trim()&&!atts.length)} v="ink" size="md">
                {running?<><Spin col={C.iv2} size={14}/> Orchestrating…</>:<>Orchestrate →</>}
              </Btn>
            </div>
          </div>
        </div>
        {/* Tasks */}
        <div style={{flex:1,overflowY:"auto",padding:"18px 26px",display:"flex",flexDirection:"column",gap:14}}>
          {tasks.length===0&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,padding:"60px 20px"}}>
              <div style={{width:72,height:72,borderRadius:18,background:C.iv2,border:`1.5px solid ${C.ch8}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:C.ch6}}>◈</div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:17,fontWeight:700,color:C.ch4,fontFamily:"var(--serif)"}}>No orchestrations yet</div>
                <div style={{fontSize:12,color:C.ch6,fontFamily:"var(--mono)",marginTop:4}}>Type a task or drag files to begin</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:580}}>
                {["Write a technical blog post about LLMs","Analyze this dataset for insights","Build a React dashboard component","Research the latest AI safety developments"].map(ex=>(
                  <button key={ex} onClick={()=>setInput(ex)} style={{padding:"7px 14px",background:C.iv2,border:`1px solid ${C.ch8}`,borderRadius:99,fontSize:11,color:C.ch4,fontFamily:"var(--serif)",cursor:"pointer",transition:"all .14s"}} onMouseEnter={e=>{e.currentTarget.style.background=C.iv3;e.currentTarget.style.color=C.ch2;}} onMouseLeave={e=>{e.currentTarget.style.background=C.iv2;e.currentTarget.style.color=C.ch4;}}>{ex}</button>
                ))}
              </div>
            </div>
          )}
          {tasks.map(t=><TaskCard key={t.id} task={t}/>)}
        </div>
      </div>
    </div>
  );
}

const TaskCard = memo(({task})=>{
  const [open,setOpen]=useState(true);
  const [activeStep,setStep]=useState(null);
  const done=task.status==="done";
  const synth=task.steps.find(s=>s.agId==="synth");
  const display=activeStep?task.steps.find(s=>s.agId===activeStep):(synth||task.steps.at(-1));
  return(
    <ICard accent={done?C.ok:task.status==="running"?C.warn2:C.err2} elevated style={{overflow:"hidden",animation:"slideUp .22s ease"}}>
      <div onClick={()=>setOpen(v=>!v)} style={{padding:"13px 18px",cursor:"pointer",display:"flex",alignItems:"flex-start",gap:12,background:done?`${C.ok4}88`:task.status==="running"?`${C.warn4}60`:C.iv1,borderBottom:open?`1px solid ${C.ch9}`:"none",transition:"background .3s"}}>
        <div style={{paddingTop:4}}>{task.status==="running"?<Dot col={C.warn2} pulse size={8}/>:done?<Dot col={C.ok2} size={8}/>:<Dot col={C.err2} size={8}/>}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14.5,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:6}}>{task.input}</div>
          {task.atts?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{task.atts.map(a=><span key={a.id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:C.iv2,border:`1px solid ${C.ch8}`,fontSize:10,color:C.ch4,fontFamily:"var(--mono)"}}>{a.type==="image"?"🖼️":a.type==="csv"?"📊":a.type==="pdf"?"📄":"📝"} {a.name.slice(0,22)}</span>)}</div>}
          <div style={{display:"flex",alignItems:"center",gap:3}}>
            {AGENTS.map((ag,i)=>{const d=task.steps.some(s=>s.agId===ag.id),ia=task.active===ag.id;return(<div key={ag.id} style={{display:"flex",alignItems:"center",gap:3}}>{i>0&&<div style={{width:16,height:1.5,background:d?`linear-gradient(90deg,${AGENTS[i-1].col}60,${ag.col}60)`:C.ch9,transition:"background .6s"}}/>}<div title={ag.name} style={{width:24,height:24,borderRadius:"50%",background:d?`${ag.col}18`:C.iv2,border:`1.5px solid ${d?`${ag.col}70`:ia?`${ag.col}90`:C.ch8}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:d?ag.col:C.ch6,transition:"all .3s",animation:ia?"agP 1.2s ease infinite":"none"}}>{ia?<Spin col={ag.col} size={11}/>:ag.g}</div></div>);})}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0}}>
          <Pill label={done?"done":task.status==="running"?"running":"error"} col={done?C.ok:task.status==="running"?C.warn2:C.err2}/>
          {done&&<span style={{fontSize:10,color:C.ch6,fontFamily:"var(--mono)"}}>{fmtD(task.dur)}</span>}
          <span style={{fontSize:10,color:C.ch6}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open&&<div style={{padding:"15px 18px",display:"flex",flexDirection:"column",gap:12}}>
        {done&&<div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.iv2,borderRadius:10,border:`1px solid ${C.ch9}`}}><span style={{fontSize:10,fontWeight:700,color:C.ch5,fontFamily:"var(--mono)",letterSpacing:1,minWidth:78}}>CONFIDENCE</span><div style={{flex:1}}><ConfBar v={task.conf}/></div><span style={{fontSize:10,color:C.ch6,fontFamily:"var(--mono)"}}>{fmtD(task.dur)} total</span></div>}
        {task.status==="running"&&task.steps.length===0&&<div style={{padding:"24px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}><Dots3 col={C.bl4}/><span style={{fontSize:12,color:C.ch5,fontFamily:"var(--serif)"}}>Initializing agents…</span></div>}
        {task.steps.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <button onClick={()=>setStep(null)} style={{padding:"5px 13px",borderRadius:99,border:`1.5px solid ${!activeStep?C.ch3:C.ch8}`,background:!activeStep?C.iv3:"transparent",color:!activeStep?C.ch1:C.ch5,fontSize:11,fontFamily:"var(--serif)",fontWeight:!activeStep?700:400,cursor:"pointer"}}>◈ Final</button>
          {task.steps.map(s=><button key={s.agId} onClick={()=>setStep(s.agId)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:99,border:`1.5px solid ${activeStep===s.agId?s.col:C.ch8}`,background:activeStep===s.agId?`${s.col}14`:"transparent",color:activeStep===s.agId?s.col:C.ch5,fontSize:11,fontFamily:"var(--serif)",fontWeight:activeStep===s.agId?700:400,cursor:"pointer"}}><span style={{fontSize:10}}>{s.g}</span>{s.name}<span style={{fontSize:9,fontFamily:"var(--mono)",opacity:.65}}>{fmtD(s.dur)}</span></button>)}
        </div>}
        {display&&<div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${display.col}28`}}><div style={{padding:"9px 14px",background:`${display.col}12`,borderBottom:`1px solid ${display.col}22`,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:12,fontWeight:700,color:display.col,fontFamily:"var(--mono)"}}>{display.g} {display.name}</span><div style={{flex:1}}><ConfBar v={display.conf} col={display.col}/></div><span style={{fontSize:10,color:C.ch6,fontFamily:"var(--mono)"}}>{fmtD(display.dur)}</span></div><pre style={{margin:0,padding:"14px 16px",...S.mono,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:380,overflowY:"auto",background:C.iv1}}>{display.text}</pre></div>}
      </div>}
    </ICard>
  );
});

// ─── MODELS PAGE ──────────────────────────────────────────────────────────────
function ModelRunner({model,activeProvider}){
  const [input,setInput]=useState("");
  const [output,setOutput]=useState(null);
  const [svg,setSvg]=useState(null);
  const [loading,setLoading]=useState(false);
  const [conf,setConf]=useState(0);
  const [dur,setDur]=useState(0);
  const [err,setErr]=useState(null);
  const run=useCallback(async()=>{
    if(!input.trim()||loading) return;
    setLoading(true);setErr(null);setOutput(null);setSvg(null);
    const t0=Date.now();
    try{
      const text=await callAI([{role:"user",content:input}],model.sys,model.mode==="svg"?2200:950,activeProvider);
      const d=Date.now()-t0;setDur(d);
      if(model.mode==="svg"){setSvg(sanitizeSvg(text)||fallbackSvg(input));setConf(.93);}
      else{setOutput(text);setConf(scoreConf(text));}
    }catch(e){setErr(e.message);}
    setLoading(false);
  },[input,loading,model,activeProvider]);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",gap:16}}>
      <ICard accent={model.col} style={{padding:"16px 20px",background:`linear-gradient(135deg,${model.bg},${C.iv1})`,border:`1px solid ${model.bdr}`}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:50,height:50,borderRadius:14,background:model.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:`0 6px 20px ${model.col}38`}}>{model.e}</div>
          <div style={{flex:1}}><div style={{fontSize:20,fontWeight:700,color:model.col,fontFamily:"var(--serif)",letterSpacing:-.3,lineHeight:1}}>{model.label}</div><div style={{fontSize:11,color:C.ch5,fontFamily:"var(--mono)",marginTop:4}}>{model.sub} · via <span style={{color:C.bl3,fontWeight:700}}>{activeProvider}</span></div></div>
          {model.mode==="code"&&<Pill label={model.lang||"code"} col={model.col}/>}
          <Pill label="Active" col={model.col}/>
        </div>
      </ICard>
      <div><label style={S.label}>Input</label>
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&run()} placeholder={model.ph} style={{...S.input,minHeight:108}} onFocus={e=>e.target.style.borderColor=`${model.col}80`} onBlur={e=>e.target.style.borderColor=C.ch8}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:9}}>
          <span style={{fontSize:10.5,color:C.ch7,fontFamily:"var(--mono)"}}>⌘↵ to run</span>
          <Btn onClick={run} disabled={loading||!input.trim()} v="ink" size="md">{loading?<><Spin col={C.iv2} size={13}/> Running…</>:`Run ${model.cat} →`}</Btn>
        </div>
      </div>
      {err&&<div style={{padding:"10px 14px",background:C.err4,borderRadius:10,border:`1px solid ${C.err3}`,fontSize:12,color:C.err,fontFamily:"var(--mono)"}}>{err}</div>}
      {(loading||output!==null||svg!==null)&&<div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minHeight:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <label style={{...S.label,marginBottom:0}}>Output</label>
          {conf>0&&!loading&&<div style={{flex:1}}><ConfBar v={conf} col={model.col}/></div>}
          {dur>0&&!loading&&<span style={{fontSize:10,color:C.ch6,fontFamily:"var(--mono)"}}>{fmtD(dur)}</span>}
        </div>
        <div style={{flex:1,background:C.iv2,borderRadius:12,border:`1.5px solid ${C.ch9}`,overflow:"hidden",minHeight:130,display:"flex",flexDirection:"column"}}>
          {loading&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}><Dots3 col={model.col}/><span style={{fontSize:12,color:C.ch5,fontFamily:"var(--serif)"}}>Processing…</span></div>}
          {!loading&&svg&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:18}}><div style={{borderRadius:12,overflow:"hidden",boxShadow:C.sh3,animation:"slideUp .4s ease",maxWidth:"100%",maxHeight:"100%"}} dangerouslySetInnerHTML={{__html:svg}}/></div>}
          {!loading&&output!==null&&<pre style={{margin:0,padding:"15px 17px",...S.mono,whiteSpace:"pre-wrap",wordBreak:"break-word",overflowY:"auto",maxHeight:400}}>{output}</pre>}
        </div>
      </div>}
    </div>
  );
}

// ─── TASK RUNNER (for Other Models / Task Explorer) ──────────────────────────
function TaskRunner({ task, activeProvider, onBack }) {
  const [input, setInput]   = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [conf, setConf]     = useState(0);
  const [dur, setDur]       = useState(0);
  const [err, setErr]       = useState(null);

  const run = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true); setErr(null); setOutput(null);
    const t0 = Date.now();
    try {
      const text = await callAI([{ role:"user", content:input }], task.sys, 1000, activeProvider);
      setDur(Date.now()-t0); setOutput(text); setConf(scoreConf(text));
    } catch(e) { setErr(e.message); }
    setLoading(false);
  }, [input, loading, task, activeProvider]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, height:"100%" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:`1px solid ${C.ch8}`, borderRadius:8, padding:"5px 12px", cursor:"pointer", color:C.ch5, fontFamily:"var(--serif)", fontSize:12, transition:"all .14s" }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ch6;e.currentTarget.style.color=C.ch2;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.ch8;e.currentTarget.style.color=C.ch5;}}>← Back</button>
        <div style={{ fontSize:18, fontWeight:700, color:C.ch1, fontFamily:"var(--serif)", flex:1 }}>{task.icon} {task.name}</div>
        <div style={{ padding:"3px 10px", borderRadius:99, background:C.bl8, border:`1px solid ${C.bl7}`, fontSize:10, color:C.bl3, fontFamily:"var(--mono)", fontWeight:700 }}>via {activeProvider}</div>
      </div>

      <div>
        <label style={S.label}>Input</label>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&run()}
          placeholder={task.ph}
          style={{ ...S.input, minHeight:120 }}
          onFocus={e=>e.target.style.borderColor=`${C.bl3}80`}
          onBlur={e=>e.target.style.borderColor=C.ch8}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:9 }}>
          <span style={{ fontSize:10.5, color:C.ch7, fontFamily:"var(--mono)" }}>⌘↵ to run</span>
          <Btn onClick={run} disabled={loading||!input.trim()} v="ink" size="md">
            {loading ? <><Spin col={C.iv2} size={13}/> Running…</> : `Run ${task.name} →`}
          </Btn>
        </div>
      </div>

      {err && <div style={{ padding:"10px 14px", background:C.err4, borderRadius:10, border:`1px solid ${C.err3}`, fontSize:12, color:C.err, fontFamily:"var(--mono)" }}>{err}</div>}

      {(loading || output !== null) && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minHeight:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <label style={{ ...S.label, marginBottom:0 }}>Output</label>
            {conf>0 && !loading && <div style={{ flex:1 }}><ConfBar v={conf}/></div>}
            {dur>0 && !loading && <span style={{ fontSize:10, color:C.ch6, fontFamily:"var(--mono)" }}>{fmtD(dur)}</span>}
          </div>
          <div style={{ flex:1, background:C.iv2, borderRadius:12, border:`1.5px solid ${C.ch9}`, overflow:"hidden", minHeight:120, display:"flex", flexDirection:"column" }}>
            {loading && <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}><Dots3 col={C.bl4}/><span style={{ fontSize:12, color:C.ch5, fontFamily:"var(--serif)" }}>Processing…</span></div>}
            {!loading && output !== null && <pre style={{ margin:0, padding:"15px 17px", ...S.mono, whiteSpace:"pre-wrap", wordBreak:"break-word", overflowY:"auto", maxHeight:400 }}>{output}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TASK EXPLORER — ML task browse panel ────────────────────────────────────
function TaskExplorer({ activeProvider }) {
  const [activeTask, setActiveTask] = useState(null);

  if (activeTask) {
    return (
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
        <TaskRunner task={activeTask} activeProvider={activeProvider} onBack={() => setActiveTask(null)}/>
      </div>
    );
  }

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"20px 28px", display:"flex", flexDirection:"column", gap:28 }}>
      {/* Info banner */}
      <div style={{ padding:"12px 16px", background:C.iv2, borderRadius:12, border:`1px solid ${C.ch9}`, display:"flex", alignItems:"flex-start", gap:12 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.ch2, fontFamily:"var(--serif)", marginBottom:3 }}>Powered by your active LLM — one AI, all tasks</div>
          <div style={{ fontSize:11.5, color:C.ch5, fontFamily:"var(--mono)", lineHeight:1.7 }}>
            These task types don't each need a dedicated API. Your current provider (<span style={{ color:C.bl3, fontWeight:700 }}>{activeProvider}</span>) simulates all of them with task-specific prompts. No extra keys required.
          </div>
        </div>
      </div>

      {/* Groups */}
      {OTHER_TASK_GROUPS.map(grp => (
        <div key={grp.group}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{ fontSize:15 }}>{grp.icon}</span>
            <span style={{ fontSize:14, fontWeight:700, color:C.ch3, fontFamily:"var(--serif)", letterSpacing:-.2 }}>{grp.group}</span>
            <div style={{ flex:1, height:1, background:C.ch9, marginLeft:6 }}/>
            <span style={{ fontSize:10, color:C.ch6, fontFamily:"var(--mono)" }}>{grp.tasks.length} tasks</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {grp.tasks.map(task => (
              <button key={task.id} onClick={() => setActiveTask(task)}
                style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px",
                  background:C.iv1, borderRadius:10, border:`1.5px solid ${C.ch9}`,
                  cursor:"pointer", fontFamily:"var(--serif)", fontSize:13, color:C.ch2,
                  fontWeight:500, transition:"all .16s", boxShadow:C.sh1 }}
                onMouseEnter={e=>{
                  e.currentTarget.style.background=C.iv3;
                  e.currentTarget.style.borderColor=grp.col;
                  e.currentTarget.style.color=grp.col;
                  e.currentTarget.style.boxShadow=`0 3px 12px ${grp.col}20`;
                  e.currentTarget.style.transform="translateY(-1px)";
                }}
                onMouseLeave={e=>{
                  e.currentTarget.style.background=C.iv1;
                  e.currentTarget.style.borderColor=C.ch9;
                  e.currentTarget.style.color=C.ch2;
                  e.currentTarget.style.boxShadow=C.sh1;
                  e.currentTarget.style.transform="none";
                }}>
                <span style={{ fontSize:13, flexShrink:0 }}>{task.icon}</span>
                <span>{task.name}</span>
                <span style={{ fontSize:11, color:C.ch6, marginLeft:2 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelsPage({activeProvider}){
  const [active,setActive]   = useState("text");
  const [tab, setTab]        = useState("models"); // "models" | "tasks"
  const model = useMemo(()=>ALL_MODELS.find(m=>m.id===active)||ALL_MODELS[0],[active]);

  const totalTasks = OTHER_TASK_GROUPS.reduce((s,g)=>s+g.tasks.length, 0);

  return(
    <div style={{display:"flex",height:"100%",position:"relative"}}>
      <AmbientBg tint={C.ch7}/>

      {/* ── Sidebar ── */}
      <div style={{width:228,flexShrink:0,borderRight:`1px solid ${C.ch9}`,display:"flex",flexDirection:"column",position:"relative",zIndex:1,background:`${C.iv1}d8`,backdropFilter:"blur(8px)"}}>

        {/* Tab switcher */}
        <div style={{ padding:"10px 10px 8px", borderBottom:`1px solid ${C.ch9}`, display:"flex", gap:4 }}>
          {[
            { id:"models", label:"Active", count:ALL_MODELS.length },
            { id:"tasks",  label:"Other",  count:totalTasks },
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"7px 4px", borderRadius:9, border:`1.5px solid ${tab===t.id?C.bl3:C.ch9}`, background:tab===t.id?C.bl8:C.iv1, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"all .16s" }}>
              <span style={{ fontSize:11.5, fontWeight:700, color:tab===t.id?C.bl3:C.ch4, fontFamily:"var(--serif)" }}>{t.label}</span>
              <span style={{ fontSize:9, color:tab===t.id?C.bl4:C.ch6, fontFamily:"var(--mono)" }}>{t.count} {t.id==="models"?"models":"tasks"}</span>
            </button>
          ))}
        </div>

        {/* Active models list (only shown on "models" tab) */}
        {tab === "models" && (
          <div style={{ flex:1, overflowY:"auto" }}>
            {MODEL_GROUPS.map(grp=>(
              <div key={grp.group}>
                <div style={{padding:"10px 14px 5px",display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:1,background:C.ch9}}/><span style={{fontSize:9,fontWeight:700,color:C.ch6,fontFamily:"var(--mono)",letterSpacing:1.6,textTransform:"uppercase",flexShrink:0}}>{grp.group}</span><div style={{flex:1,height:1,background:C.ch9}}/></div>
                <div style={{padding:"2px 8px 8px"}}>
                  {grp.models.map(m=>{const isA=active===m.id&&tab==="models";return(
                    <button key={m.id} onClick={()=>{setActive(m.id);setTab("models");}} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:10,border:`1.5px solid ${isA?`${m.col}55`:C.ch9}`,cursor:"pointer",width:"100%",background:isA?m.bg:C.iv1,transition:"all .16s",marginBottom:2,boxShadow:isA?`0 2px 10px ${m.col}18`:C.sh1}} onMouseEnter={e=>{if(!isA){e.currentTarget.style.background=C.iv3;e.currentTarget.style.borderColor=C.ch8;}}} onMouseLeave={e=>{if(!isA){e.currentTarget.style.background=C.iv1;e.currentTarget.style.borderColor=C.ch9;}}}>
                      <div style={{width:30,height:30,flexShrink:0,borderRadius:8,background:isA?m.col:C.ch9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,transition:"background .16s",boxShadow:isA?`0 3px 10px ${m.col}35`:"none"}}>{m.e}</div>
                      <div style={{flex:1,minWidth:0,textAlign:"left"}}><div style={{fontSize:12.5,fontWeight:isA?700:500,color:isA?m.col:C.ch3,fontFamily:"var(--serif)",lineHeight:1.2}}>{m.cat}</div><div style={{fontSize:9.5,color:C.ch6,fontFamily:"var(--mono)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.sub}</div></div>
                      {isA&&<Dot col={m.col} size={6} pulse/>}
                    </button>
                  );})}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other tasks — compact group list (only shown on "tasks" tab) */}
        {tab === "tasks" && (
          <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
            {OTHER_TASK_GROUPS.map(grp => (
              <div key={grp.group} style={{ marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 8px 5px" }}>
                  <span style={{ fontSize:13 }}>{grp.icon}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:grp.col, fontFamily:"var(--serif)" }}>{grp.group}</span>
                  <span style={{ fontSize:9, color:C.ch6, fontFamily:"var(--mono)", marginLeft:"auto" }}>{grp.tasks.length}</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, paddingLeft:8 }}>
                  {grp.tasks.map(t => (
                    <span key={t.id} style={{ fontSize:10, padding:"3px 8px", borderRadius:99, background:C.iv2, border:`1px solid ${C.ch9}`, color:C.ch4, fontFamily:"var(--mono)" }}>{t.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Main panel ── */}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",position:"relative",zIndex:1}}>
        {tab === "models" && <>
          {/* Model banner */}
          <div style={{padding:"14px 22px",borderBottom:`1px solid ${C.ch9}`,background:`linear-gradient(90deg,${model.bg}80,${C.iv1})`,backdropFilter:"blur(6px)",flexShrink:0,position:"relative",overflow:"hidden"}}>
            <svg style={{position:"absolute",right:0,top:0,bottom:0,height:"100%",opacity:.08}} viewBox="0 0 200 76" preserveAspectRatio="xMaxYMid meet"><circle cx="155" cy="38" r="48" fill="none" stroke={model.col} strokeWidth="1"/><circle cx="155" cy="38" r="28" fill="none" stroke={model.col} strokeWidth=".6"/><circle cx="155" cy="38" r="10" fill={model.col} opacity=".4"/>{[0,60,120,180,240,300].map((a,i)=><line key={i} x1="155" y1="38" x2={155+54*Math.cos(a*Math.PI/180)} y2={38+54*Math.sin(a*Math.PI/180)} stroke={model.col} strokeWidth=".5"/>)}</svg>
            <div style={{display:"flex",alignItems:"center",gap:12,position:"relative",zIndex:1}}>
              <div style={{width:38,height:38,borderRadius:10,background:model.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 4px 14px ${model.col}40`}}>{model.e}</div>
              <div><div style={{fontSize:17,fontWeight:700,color:model.col,fontFamily:"var(--serif)",letterSpacing:-.3}}>{model.label}</div><div style={{fontSize:11,color:C.ch5,fontFamily:"var(--mono)",marginTop:1}}>{model.sub}</div></div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}><ModelRunner key={model.id} model={model} activeProvider={activeProvider}/></div>
        </>}

        {tab === "tasks" && <>
          {/* Task explorer banner */}
          <div style={{ padding:"14px 22px", borderBottom:`1px solid ${C.ch9}`, background:`linear-gradient(90deg,${C.iv3}80,${C.iv1})`, backdropFilter:"blur(6px)", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:C.bl3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 14px ${C.bl3}40` }}>🗂</div>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:C.bl3, fontFamily:"var(--serif)", letterSpacing:-.3 }}>Task Explorer</div>
                <div style={{ fontSize:11, color:C.ch5, fontFamily:"var(--mono)", marginTop:1 }}>{totalTasks} ML task types · all via {activeProvider}</div>
              </div>
              <div style={{ marginLeft:"auto", padding:"4px 12px", background:C.iv2, borderRadius:99, border:`1px solid ${C.ch9}` }}>
                <span style={{ fontSize:10, color:C.ch5, fontFamily:"var(--mono)" }}>No extra APIs needed</span>
              </div>
            </div>
          </div>
          <TaskExplorer activeProvider={activeProvider}/>
        </>}
      </div>
    </div>
  );
}

// ─── SETTINGS / API KEYS PAGE ─────────────────────────────────────────────────
const PROVIDER_DEFS = [
  {id:"anthropic",  name:"Anthropic",   logo:"🟣",category:"LLM",      hint:"claude-sonnet-4-20250514",docs:"https://console.anthropic.com/"},
  {id:"openai",     name:"OpenAI",      logo:"🟢",category:"LLM",      hint:"gpt-4o",                  docs:"https://platform.openai.com/api-keys"},
  {id:"gemini",     name:"Google Gemini",logo:"🔵",category:"LLM",     hint:"gemini-1.5-pro",          docs:"https://makersuite.google.com/app/apikey"},
  {id:"mistral",    name:"Mistral AI",  logo:"🟡",category:"LLM",      hint:"mistral-large-latest",    docs:"https://console.mistral.ai/"},
  {id:"groq",       name:"Groq",        logo:"⚡",category:"LLM",      hint:"llama-3.3-70b-versatile", docs:"https://console.groq.com/keys"},
  {id:"cohere",     name:"Cohere",      logo:"🔶",category:"LLM",      hint:"command-r-plus",          docs:"https://dashboard.cohere.com/api-keys"},
  {id:"together",   name:"Together AI", logo:"🤝",category:"LLM",      hint:"meta-llama/Llama-3.3-70B-Instruct-Turbo",docs:"https://api.together.xyz/settings/api-keys"},
  {id:"perplexity", name:"Perplexity",  logo:"🌐",category:"LLM",      hint:"llama-3.1-sonar-large-128k-online",docs:"https://www.perplexity.ai/settings/api"},
  {id:"huggingface",name:"HF Inference",  logo:"🤗",category:"LLM",      hint:"Qwen/Qwen3-4B-Instruct-2507",docs:"https://huggingface.co/settings/tokens"},
  {id:"openrouter", name:"OpenRouter",  logo:"🔀",category:"LLM",      hint:"anthropic/claude-3.5-sonnet",docs:"https://openrouter.ai/keys"},
  {id:"stability",  name:"Stability AI",logo:"🎨",category:"Image",    hint:"stable-diffusion-xl-1024-v1-0",docs:"https://platform.stability.ai/account/keys"},
  {id:"replicate",  name:"Replicate",   logo:"♻️",category:"Multi",    hint:"black-forest-labs/flux-schnell",docs:"https://replicate.com/account/api-tokens"},
  {id:"elevenlabs", name:"ElevenLabs",  logo:"🎙️",category:"Audio",   hint:"eleven_multilingual_v2",  docs:"https://elevenlabs.io/app/settings/api-keys"},
  {id:"deepgram",   name:"Deepgram",    logo:"🎧",category:"Audio",    hint:"nova-2",                  docs:"https://console.deepgram.com/"},
];

const CAT_COLORS = { LLM:C.bl3, Image:C.ch3, Multi:C.gr3, Audio:C.pk };

function SettingsPage({ onProviderChange }) {
  const [keys, setKeys]       = useState([]);
  const [saving, setSaving]   = useState({});
  const [inputs, setInputs]   = useState({});
  const [models, setModels]   = useState({});
  const [testRes, setTestRes] = useState({});
  const [testing, setTesting] = useState({});
  const [stats, setStats]     = useState(null);
  const [activeP, setActiveP] = useState("huggingface");
  const [loading, setLoading] = useState(true);

  const loadKeys = useCallback(async()=>{
    setLoading(true);
    try { const d = await apiFetch("/api/keys"); setKeys([...d.keys,...(d.unconfigured||[])]); }
    catch(e) { console.error(e); }
    setLoading(false);
  },[]);

  const loadStats = useCallback(async()=>{
    try { const d = await apiFetch("/api/stats"); setStats(d); } catch {}
  },[]);

  useEffect(()=>{ loadKeys(); loadStats(); },[]);

  const saveKey = useCallback(async(providerId)=>{
    const key=inputs[providerId]?.trim(); if(!key) return;
    setSaving(p=>({...p,[providerId]:true}));
    try {
      await apiFetch("/api/keys",{method:"POST",body:{ provider:providerId, key, model_hint:models[providerId]||PROVIDER_DEFS.find(p=>p.id===providerId)?.hint }});
      setInputs(p=>({...p,[providerId]:""}));
      await loadKeys();
    } catch(e) { alert(`Error: ${e.message}`); }
    setSaving(p=>({...p,[providerId]:false}));
  },[inputs,models,loadKeys]);

  const removeKey = useCallback(async(providerId)=>{
    if(!confirm(`Remove API key for ${providerId}?`)) return;
    try { await apiFetch(`/api/keys/${providerId}`,{method:"DELETE"}); await loadKeys(); }
    catch(e) { alert(`Error: ${e.message}`); }
  },[loadKeys]);

  const testKey = useCallback(async(providerId)=>{
    setTesting(p=>({...p,[providerId]:true})); setTestRes(p=>({...p,[providerId]:null}));
    try {
      const d = await apiFetch("/api/chat",{method:"POST",body:{messages:[{role:"user",content:"Reply with exactly: OK"}],system:"You are a test. Reply with exactly: OK",maxTokens:10,provider:providerId}});
      setTestRes(p=>({...p,[providerId]:{ok:true,text:d.text?.trim()}}));
    } catch(e) { setTestRes(p=>({...p,[providerId]:{ok:false,text:e.message}})); }
    setTesting(p=>({...p,[providerId]:false}));
  },[]);

  const configuredIds = new Set(keys.filter(k=>k.hasKey).map(k=>k.provider));
  const grouped = PROVIDER_DEFS.reduce((acc,p)=>{ (acc[p.category]=acc[p.category]||[]).push(p); return acc; },{});

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",position:"relative"}}>
      <AmbientBg tint={C.pk3}/>
      <div style={{flex:1,display:"flex",position:"relative",zIndex:1,overflow:"hidden"}}>
        {/* Left — provider list */}
        <div style={{width:220,flexShrink:0,borderRight:`1px solid ${C.ch9}`,overflowY:"auto",background:`${C.iv1}d8`,backdropFilter:"blur(8px)"}}>
          <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${C.ch9}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.ch6,fontFamily:"var(--mono)",letterSpacing:1.8,marginBottom:2}}>API KEYS</div>
            <div style={{fontSize:11.5,color:C.ch5,fontFamily:"var(--serif)"}}>{configuredIds.size}/{PROVIDER_DEFS.length} configured</div>
          </div>
          {Object.entries(grouped).map(([cat,provs])=>(
            <div key={cat}>
              <div style={{padding:"8px 14px 4px",fontSize:9,fontWeight:700,color:C.ch6,fontFamily:"var(--mono)",letterSpacing:1.5,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[cat]||C.ch5,flexShrink:0}}/>
                {cat}
              </div>
              {provs.map(p=>{
                const isConf=configuredIds.has(p.id),isAct=activeP===p.id;
                return(
                  <button key={p.id} onClick={()=>setActiveP(p.id)}
                    style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",width:"100%",border:"none",borderLeft:`3px solid ${isAct?C.bl3:"transparent"}`,background:isAct?C.iv3:"transparent",cursor:"pointer",transition:"all .15s"}}
                    onMouseEnter={e=>{if(!isAct)e.currentTarget.style.background=C.iv2;}} onMouseLeave={e=>{if(!isAct)e.currentTarget.style.background="transparent";}}>
                    <span style={{fontSize:16,flexShrink:0}}>{p.logo}</span>
                    <div style={{flex:1,minWidth:0,textAlign:"left"}}><div style={{fontSize:12.5,fontWeight:isAct?700:500,color:isAct?C.ch1:C.ch3,fontFamily:"var(--serif)"}}>{p.name}</div></div>
                    {isConf&&<div style={{width:7,height:7,borderRadius:"50%",background:C.ok2,flexShrink:0}}/>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right — active provider config */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",display:"flex",flexDirection:"column",gap:20}}>
          {(() => {
            const pDef = PROVIDER_DEFS.find(p=>p.id===activeP);
            if(!pDef) return null;
            const keyRow = keys.find(k=>k.provider===activeP);
            const isConf = keyRow?.hasKey;
            const tr = testRes[activeP];
            const catCol = CAT_COLORS[pDef.category]||C.ch3;
            return(
              <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:680}}>
                {/* Header */}
                <ICard accent={catCol} style={{padding:"18px 22px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:16}}>
                    <div style={{fontSize:36,lineHeight:1}}>{pDef.logo}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:22,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)",letterSpacing:-.3}}>{pDef.name}</div>
                      <div style={{display:"flex",gap:8,marginTop:5,alignItems:"center"}}>
                        <Pill label={pDef.category} col={catCol}/>
                        {isConf&&<Pill label="Configured" col={C.ok}/>}
                        {!isConf&&<Pill label="Not configured" col={C.ch5} bg={C.ch9}/>}
                      </div>
                    </div>
                    {isConf&&(
                      <div style={{display:"flex",gap:8}}>
                        <Btn onClick={()=>testKey(activeP)} disabled={testing[activeP]} v="ghost" size="sm">
                          {testing[activeP]?<><Spin col={C.ch3} size={12}/>Testing…</>:"▶ Test"}
                        </Btn>
                        <Btn onClick={()=>onProviderChange(activeP)} v="steel" size="sm">Use This</Btn>
                      </div>
                    )}
                  </div>
                  {tr&&<div style={{marginTop:12,padding:"8px 12px",borderRadius:8,background:tr.ok?C.ok4:C.err4,border:`1px solid ${tr.ok?C.ok3:C.err3}`,fontSize:12,color:tr.ok?C.ok:C.err2,fontFamily:"var(--mono)"}}>{tr.ok?"✓ Working — response: "+tr.text:"✗ "+tr.text}</div>}
                </ICard>

                {/* Current key status */}
                {isConf&&keyRow&&(
                  <ICard style={{padding:"14px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <Dot col={C.ok2} size={8}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.ch2,fontFamily:"var(--serif)"}}>Key stored and encrypted</div>
                        <div style={{fontSize:11,color:C.ch5,fontFamily:"var(--mono)",marginTop:2}}>
                          {keyRow.model_hint&&`Default model: ${keyRow.model_hint}`}
                          {keyRow.last_used_at&&` · Last used: ${new Date(keyRow.last_used_at).toLocaleDateString()}`}
                        </div>
                      </div>
                      <Btn onClick={()=>removeKey(activeP)} v="ghost" size="sm" sx={{color:C.err2,borderColor:C.err3}}>Remove</Btn>
                    </div>
                  </ICard>
                )}

                {/* Key input */}
                <ICard style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)"}}>{isConf?"Update API Key":"Add API Key"}</div>
                  <div>
                    <label style={S.label}>API Key</label>
                    <input type="password" value={inputs[activeP]||""} onChange={e=>setInputs(p=>({...p,[activeP]:e.target.value}))}
                      placeholder={`Paste your ${pDef.name} API key…`}
                      style={{...S.input,fontSize:13.5,resize:"none",minHeight:"auto"}}
                      onFocus={e=>e.target.style.borderColor=`${catCol}80`} onBlur={e=>e.target.style.borderColor=C.ch8}
                      onKeyDown={e=>e.key==="Enter"&&saveKey(activeP)}/>
                  </div>
                  <div>
                    <label style={S.label}>Default Model (optional)</label>
                    <input value={models[activeP]||""} onChange={e=>setModels(p=>({...p,[activeP]:e.target.value}))}
                      placeholder={pDef.hint}
                      style={{...S.input,resize:"none",minHeight:"auto",fontSize:13.5}}
                      onFocus={e=>e.target.style.borderColor=`${catCol}80`} onBlur={e=>e.target.style.borderColor=C.ch8}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <a href={pDef.docs} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.bl3,fontFamily:"var(--mono)",textDecoration:"none"}}>↗ Get API key</a>
                    <Btn onClick={()=>saveKey(activeP)} disabled={!inputs[activeP]?.trim()||saving[activeP]} v="ink" size="md">
                      {saving[activeP]?<><Spin col={C.iv2} size={13}/>Saving…</>:"Save Key"}
                    </Btn>
                  </div>
                </ICard>

                {/* Security note */}
                <div style={{padding:"12px 16px",background:C.iv2,borderRadius:10,border:`1px solid ${C.ch9}`,fontSize:11.5,color:C.ch5,fontFamily:"var(--serif)",lineHeight:1.6}}>
                  🔒 Keys are encrypted with AES-256 before storage. They are never logged or exposed in responses. The masked key is never transmitted to the client.
                </div>
              </div>
            );
          })()}

          {/* Usage stats */}
          {stats?.byProvider?.length>0&&(
            <div style={{maxWidth:680}}>
              <div style={{fontSize:13,fontWeight:700,color:C.ch3,fontFamily:"var(--serif)",marginBottom:10}}>Usage Statistics</div>
              <ICard style={{overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["Provider","Calls","Success","Avg Latency"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.ch5,fontFamily:"var(--mono)",letterSpacing:1,borderBottom:`1px solid ${C.ch9}`,background:C.iv2}}>{h}</th>)}</tr></thead>
                  <tbody>{stats.byProvider.map((r,i)=><tr key={r.provider} style={{background:i%2===0?C.iv1:C.iv2}}>{[r.provider,r.calls,`${r.successes}/${r.calls}`,`${r.avg_latency}ms`].map((v,j)=><td key={j} style={{padding:"10px 14px",fontSize:12,color:j===0?C.ch2:C.ch4,fontFamily:"var(--mono)",borderBottom:`1px solid ${C.ch9}`}}>{v}</td>)}</tr>)}</tbody>
                </table>
              </ICard>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
const NAV=[
  {id:"orch",    e:"◈",label:"Orchestrator",sub:"5-agent pipeline"},
  {id:"models",  e:"⊞",label:"AI Models",   sub:"24 active · 26 tasks"},
  {id:"settings",e:"⚙",label:"API Keys",    sub:"Providers & secrets"},
];

export default function App() {
  const [page,setPage]           = useState("orch");
  const [collapsed,setCollapsed] = useState(false);
  const [activeProvider,setActiveProvider] = useState("huggingface");
  const [backendOk,setBackendOk] = useState(null);

  useEffect(()=>{
    fetch(`${API}/health`).then(r=>r.json()).then(()=>setBackendOk(true)).catch(()=>setBackendOk(false));
  },[]);

  return(
    <div style={{display:"flex",height:"100vh",background:C.iv2,color:C.ch2,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@300;400;500&display=swap');
        :root{--serif:'Cormorant Garamond',Georgia,serif;--mono:'DM Mono','Fira Code',monospace;}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${C.ch7};border-radius:99px;}::-webkit-scrollbar-thumb:hover{background:${C.ch6};}
        @keyframes pp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.38;transform:scale(1.3)}}
        @keyframes db{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes agP{0%,100%{box-shadow:0 0 0 0 rgba(148,0,211,.18)}50%{box-shadow:0 0 0 7px rgba(148,0,211,.07)}}
        textarea:focus,input:focus{outline:none;}button:active:not(:disabled){transform:scale(0.95)!important;}
        a{color:inherit;}
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{width:collapsed?58:216,flexShrink:0,background:C.iv1,borderRight:`1px solid ${C.ch9}`,display:"flex",flexDirection:"column",transition:"width .28s cubic-bezier(.4,0,.2,1)",overflow:"hidden",boxShadow:`2px 0 22px rgba(90,0,140,0.08)`}}>
        <div style={{padding:collapsed?"17px 11px 15px":"19px 19px 15px",borderBottom:`1px solid ${C.ch9}`,display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,flexShrink:0,borderRadius:10,background:C.bl3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:C.iv1,fontFamily:"var(--serif)",boxShadow:`0 4px 16px ${C.bl3}40,inset 0 1px 0 rgba(255,255,255,.12)`}}>◈</div>
          {!collapsed&&<div style={{animation:"slideUp .15s ease"}}><div style={{fontSize:18,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)",letterSpacing:-.5,lineHeight:1}}>Nexus</div><div style={{fontSize:9.5,fontWeight:500,color:C.ch6,fontFamily:"var(--mono)",letterSpacing:2,marginTop:2}}>AI PLATFORM</div></div>}
        </div>
        <nav style={{flex:1,padding:"13px 8px",display:"flex",flexDirection:"column",gap:4}}>
          {NAV.map(n=>{const act=page===n.id;return(
            <button key={n.id} onClick={()=>setPage(n.id)} title={collapsed?n.label:undefined}
              style={{display:"flex",alignItems:"center",gap:10,padding:collapsed?"11px":"12px 13px",borderRadius:12,border:`1.5px solid ${act?C.ch6:C.ch9}`,cursor:"pointer",width:"100%",background:act?C.iv3:C.iv1,transition:"all .17s",position:"relative"}}
              onMouseEnter={e=>{if(!act){e.currentTarget.style.background=C.iv3;e.currentTarget.style.borderColor=C.ch8;}}} onMouseLeave={e=>{if(!act){e.currentTarget.style.background=C.iv1;e.currentTarget.style.borderColor=C.ch9;}}}>
              {act&&<div style={{position:"absolute",left:0,top:"16%",bottom:"16%",width:3,background:C.bl3,borderRadius:"0 3px 3px 0"}}/>}
              <span style={{fontSize:17,color:act?C.ch1:C.ch5,flexShrink:0,fontFamily:"var(--serif)"}}>{n.e}</span>
              {!collapsed&&<div style={{textAlign:"left"}}><div style={{fontSize:13.5,fontWeight:act?700:500,color:act?C.ch1:C.ch3,fontFamily:"var(--serif)"}}>{n.label}</div><div style={{fontSize:9.5,color:C.ch6,fontFamily:"var(--mono)",marginTop:1}}>{n.sub}</div></div>}
            </button>
          );})}
        </nav>
        {!collapsed&&(
          <div style={{padding:"10px 14px 12px",opacity:.5}}>
            <svg width="100%" height="40" viewBox="0 0 168 40"><ellipse cx="50" cy="24" rx="44" ry="15" fill={C.bl5} fillOpacity=".4"/><ellipse cx="114" cy="18" rx="54" ry="17" fill={C.gr5} fillOpacity=".45"/><ellipse cx="82" cy="30" rx="34" ry="10" fill={C.pk2} fillOpacity=".35"/><text x="12" y="14" fontSize="7.5" fill={C.ch5} fontFamily="serif" letterSpacing="1.4">wisteria · bloom</text><line x1="12" y1="18" x2="156" y2="18" stroke={C.ch8} strokeWidth=".5" strokeDasharray="4 3"/></svg>
          </div>
        )}
        <div style={{padding:"10px 8px",borderTop:`1px solid ${C.ch9}`}}>
          <button onClick={()=>setCollapsed(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:collapsed?"center":"flex-start",gap:8,padding:"9px 11px",borderRadius:10,border:"none",cursor:"pointer",width:"100%",background:"transparent",color:C.ch5,transition:"background .14s"}} onMouseEnter={e=>e.currentTarget.style.background=C.iv3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{fontSize:11,transform:collapsed?"rotate(180deg)":"none",transition:"transform .28s",display:"block"}}>◀</span>
            {!collapsed&&<span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:500,color:C.ch5}}>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <header style={{height:52,flexShrink:0,background:C.iv1,borderBottom:`1px solid ${C.ch9}`,padding:"0 24px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 1px 0 ${C.ch9},0 2px 8px rgba(90,0,140,0.04)`}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:28,height:28,borderRadius:7,background:C.iv2,border:`1px solid ${C.ch8}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:C.ch4,fontFamily:"var(--serif)"}}>{NAV.find(n=>n.id===page)?.e}</div>
            <div>
              <div style={{fontSize:15.5,fontWeight:700,color:C.ch1,fontFamily:"var(--serif)",letterSpacing:-.3,lineHeight:1}}>{NAV.find(n=>n.id===page)?.label}</div>
              <div style={{fontSize:9.5,color:C.ch6,fontFamily:"var(--mono)",letterSpacing:.4,marginTop:1}}>{NAV.find(n=>n.id===page)?.sub}</div>
            </div>
          </div>
          {/* Active provider badge */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:C.bl8,borderRadius:99,border:`1px solid ${C.bl7}`}}>
            <span style={{fontSize:10,fontWeight:700,color:C.bl3,fontFamily:"var(--mono)",letterSpacing:.8}}>PROVIDER:</span>
            <span style={{fontSize:10,fontWeight:700,color:C.ch2,fontFamily:"var(--mono)"}}>{activeProvider}</span>
          </div>
          {/* Palette swatches */}
          <div style={{display:"flex",gap:2.5,alignItems:"center",opacity:.55}}>
            {[[C.bl3,28],[C.ch7,18],[C.iv5,20],[C.pk,22],[C.gr5,16],[C.bl7,14]].map(([col,w],i)=><div key={i} style={{width:w,height:16,borderRadius:4,background:col,border:`1px solid ${C.ch8}44`}}/>)}
          </div>
          <div style={{width:1,height:26,background:C.ch9}}/>
          {/* Backend status */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:backendOk?C.ok4:backendOk===false?C.err4:C.iv2,borderRadius:99,border:`1px solid ${backendOk?C.ok3:backendOk===false?C.err3:C.ch9}`}}>
            <Dot col={backendOk?C.ok2:backendOk===false?C.err2:C.ch6} pulse={backendOk===null} size={6}/>
            <span style={{fontSize:10,fontWeight:700,color:backendOk?C.ok:backendOk===false?C.err2:C.ch5,fontFamily:"var(--mono)",letterSpacing:.8}}>{backendOk?"API LIVE":backendOk===false?"API DOWN":"CONNECTING"}</span>
          </div>
        </header>
        <main style={{flex:1,overflow:"hidden"}}>
          {page==="orch"    && <OrchestratorPage activeProvider={activeProvider}/>}
          {page==="models"  && <ModelsPage activeProvider={activeProvider}/>}
          {page==="settings"&& <SettingsPage onProviderChange={p=>{setActiveProvider(p);setPage("orch");}}/>}
        </main>
      </div>
    </div>
  );
}
