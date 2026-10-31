// Relatórios operacionais agregados. Não transporta dados pessoais.
export function metricCounts({settings=[],esf=[],upaStatus=null,notices=[],appointments=[],enrollments=[]}={}){
 const activeModules=settings.filter(x=>x.enabled===true).length;
 const esfRegistered=esf.filter(x=>typeof x.title==="string"&&x.title.trim()).length;
 const esfPublished=esf.filter(x=>x.published===true).length;
 const activeNotices=notices.filter(x=>x.published===true).length;
 const pendingAppointments=appointments.filter(x=>x.status==="pending").length;
 const pendingEnrollments=enrollments.filter(x=>x.status==="pending").length;
 const operationalQueue=upaStatus&&Number.isInteger(upaStatus.queue)&&upaStatus.queue>=0&&upaStatus.queue<=9999?upaStatus.queue:null;
 return {activeModules,esfRegistered,esfPublished,activeNotices,pendingAppointments,pendingEnrollments,operationalQueue};
}
export function sanitizedMetricsCsv(city,counts){
 const rows=[["Indicador","Quantidade"],["Município",String(city||"").replace(/[\r\n,;"]/g," ")],
  ["Módulos ativos",counts.activeModules],
  ["ESF cadastradas",counts.esfRegistered],
  ["ESF publicadas",counts.esfPublished],
  ["Avisos publicados",counts.activeNotices],
  ["Solicitações pendentes",counts.pendingAppointments],
  ["Inscrições pendentes",counts.pendingEnrollments],
  ["Fila UPA (informada)",counts.operationalQueue===null?"Não informada":counts.operationalQueue]
 ];
 return "\ufeff"+rows.map(row=>row.map(v=>String(v).replaceAll('"','""')).map(v=>'"'+v+'"').join(";")).join("\r\n");
}
