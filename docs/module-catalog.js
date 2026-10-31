// Catálogo de módulos (definições estruturais, não dados municipais).
// Não há registros de unidades, cursos ou profissionais preenchidos automaticamente.
export const MODULES = [
 {id:"upa",group:"Saúde",icon:"🚑",name:"UPA 24h",description:"Fila, plantões, escala semanal e situação da sala vermelha",special:"upa"},
 {id:"esf",group:"Saúde",icon:"🏥",name:"Postos de Saúde (ESF)",description:"Unidades, horários, equipes e referências de atendimento"},
 {id:"agendamentos",group:"Saúde",icon:"📅",name:"Solicitações de consultas",description:"Solicitações pela população e análise administrativa",special:"appointments"},
 {id:"triagem",group:"Saúde",icon:"🩺",name:"Orientação de atendimento",description:"Orientação informativa para localizar o atendimento adequado",special:"guidance"},
 {id:"laboratorio",group:"Saúde",icon:"🧪",name:"Laboratório",description:"Coletas, horários, orientações e serviços"},
 {id:"farmacia",group:"Saúde",icon:"💊",name:"Farmácia",description:"Informações, locais de dispensação e comunicados"},
 {id:"escalas",group:"Saúde",icon:"🗓️",name:"Escalas e equipes",description:"Escalas administrativas e responsáveis por unidade"},
 {id:"campanhas",group:"Saúde",icon:"📣",name:"Campanhas e avisos",description:"Comunicados e campanhas publicados pela gestão"},
 {id:"cetec",group:"Serviços opcionais",icon:"🎓",name:"Cursos e inscrições",description:"Cursos, vagas e inscrições do público",special:"enrollments"},
 {id:"servicos",group:"Serviços opcionais",icon:"🏛️",name:"Serviços municipais",description:"Orientações e canais institucionais"},
 {id:"engenharia",group:"Serviços opcionais",icon:"📐",name:"Engenharia",description:"Informações e serviços de engenharia"},
 {id:"meioambiente",group:"Serviços opcionais",icon:"🌳",name:"Meio ambiente",description:"Ações e orientações ambientais"},
 {id:"educacao",group:"Serviços opcionais",icon:"📚",name:"Educação",description:"Serviços educacionais"},
 {id:"esportes",group:"Serviços opcionais",icon:"⚽",name:"Esportes",description:"Ações e projetos esportivos"},
 {id:"infraestrutura",group:"Serviços opcionais",icon:"🏗️",name:"Infraestrutura",description:"Obras, manutenção e serviços públicos"}
];
export const MODULE_IDS = MODULES.map(m=>m.id);
export const MODULE_BY_ID = Object.fromEntries(MODULES.map(m=>[m.id,m]));
export const WEEK_DAYS = [
 ["segunda","Segunda-feira"],["terca","Terça-feira"],["quarta","Quarta-feira"],
 ["quinta","Quinta-feira"],["sexta","Sexta-feira"],["sabado","Sábado"],["domingo","Domingo"]
];
export function escapeText(value) {
 return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
export function validPublicUrl(value) {
 if(!value)return "";
 try{
  const url=new URL(value);
  return url.protocol==="https:" ? url.href : "";
 }catch{return "";}
}
