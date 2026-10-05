/** Ordered, deterministic routing. Manual job selection remains available. */
export function resolveAIIntent(message, { hasImage = false, manualJob = 'auto' } = {}) {
  if (manualJob && manualJob !== 'auto') return {jobId:manualJob,reason:'Manual task selection'};
  const text=String(message||'').toLowerCase();
  if (/generate|create|make/.test(text) && /concept image|rendering|conceptual image/.test(text)) return {jobId:'conceptImage',reason:'Concept image requested'};
  if(hasImage || /analy[sz]e.*(?:image|photo|sketch)/.test(text))return {jobId:'imageAnalysis',reason:'Image interpretation'};
  if(/\bbrutal\b|extremely critical|very harsh|ruthless/.test(text))return {jobId:'brutalCritic',reason:'Intensive critique requested'};
  if(/\bjury\b|design defense|design defence/.test(text))return {jobId:'jury',reason:'Jury preparation'};
  if(/whole project|entire project|project analysis|analy[sz]e my project/.test(text))return {jobId:'projectAnalysis',reason:'Whole-project review'};
  if(/criti(?:que|cize|cise)|review my design|design critic/.test(text))return {jobId:'studioCritic',reason:'Design critique'};
  if(/concept ideas|ideation|brainstorm|give me.*ideas|design alternatives/.test(text))return {jobId:'ideation',reason:'Design alternatives'};
  if(/teach me|explain.*step by step|tutor/.test(text))return {jobId:'tutor',reason:'Learning workflow'};
  return {jobId:'generalAssistant',reason:'General project assistance'};
}
