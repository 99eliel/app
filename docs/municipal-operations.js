// Funções puras para operações municipais. Sem dados predefinidos.
export function nextQueueValue(current, delta) {
  if(!Number.isInteger(current) || !Number.isInteger(delta)) return null;
  if(current < 0 || current > 9999 || ![-1,1].includes(delta)) return null;
  const next=current+delta;
  return next>=0&&next<=9999 ? next : null;
}

export function statusLabel(value) {
  return ({pending:"Pendente",confirmed:"Confirmada",completed:"Concluída",canceled:"Cancelada"})[value]||"Não informado";
}

export function normalizeOperationalInfo(info) {
  const result = info && typeof info==="object" ? info : {};
  const hasQueue=Number.isInteger(result.queue)&&result.queue>=0&&result.queue<=9999;
  return {
    queue:hasQueue?result.queue:null,
    roomStatus:["available","occupied","unknown"].includes(result.roomStatus)?result.roomStatus:"unknown",
    clinician:typeof result.clinician==="string"?result.clinician:"",
    pediatrician:typeof result.pediatrician==="string"?result.pediatrician:"",
    week:typeof result.week==="object"&&result.week!==null?result.week:{},
    published:result.published===true
  };
}

export function countRequestStatuses(records) {
  const counts={pending:0,confirmed:0,completed:0,canceled:0};
  for(const r of records||[]){
    if(Object.prototype.hasOwnProperty.call(counts,r?.status)) counts[r.status]++;
  }
  return counts;
}

export function summarizeEsf(records) {
  const units=(records||[]).filter(r=>r && typeof r.title==="string"&&r.title.trim());
  return {
    total:units.length,
    published:units.filter(r=>r.published===true).length,
    missingHours:units.filter(r=>!String(r.hours||"").trim()).length
  };
}
