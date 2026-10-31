// Permissões de equipe municipal. O Firestore valida novamente todas as ações.
import {MODULE_IDS} from "./module-catalog.js";

export const ACCESS_GROUPS = Object.freeze([
 {id:"upa",label:"UPA 24h",description:"Plantões, fila e escala"},
 {id:"esf",label:"ESF / Postos",description:"Postos, equipes e horários"},
 {id:"agendamentos",label:"Recepção / Agendamentos",description:"Solicitações e acompanhamento"},
 {id:"laboratorio",label:"Laboratório",description:"Horários e serviços"},
 {id:"farmacia",label:"Farmácia",description:"Informações e serviços"},
 {id:"escalas",label:"Escalas e equipes",description:"Horários e escalas"},
 {id:"campanhas",label:"Avisos e campanhas",description:"Comunicados, cartazes e calendário"},
 {id:"triagem",label:"Orientações",description:"Conteúdo informativo"},
 {id:"cetec",label:"Cursos / CETEC",description:"Cursos e inscrições"},
 {id:"servicos",label:"Serviços gerais",description:"Serviços institucionais"},
 {id:"engenharia",label:"Engenharia",description:"Cadastro de serviços"},
 {id:"meioambiente",label:"Meio ambiente",description:"Cadastro de serviços"},
 {id:"educacao",label:"Educação",description:"Cadastro de serviços"},
 {id:"esportes",label:"Esportes",description:"Cadastro de serviços"},
 {id:"infraestrutura",label:"Infraestrutura",description:"Cadastro de serviços"}
]);

export function normalizedGrants(list){
 if(!Array.isArray(list))return [];
 return [...new Set(list.filter(item=>typeof item==="string"&&MODULE_IDS.includes(item)))];
}
export function canAccessModule({isPlatformAdmin=false,member=null,moduleId}={}){
 if(!MODULE_IDS.includes(moduleId))return false;
 if(isPlatformAdmin)return true;
 if(!member||member.enabled!==true)return false;
 if(member.role==="admin")return true;
 return member.role==="editor"&&normalizedGrants(member.moduleIds).includes(moduleId);
}
export function canManageModules({isPlatformAdmin=false,member=null}={}){
 return isPlatformAdmin||member?.enabled===true&&member.role==="admin";
}
export function adminTabGranted({isPlatformAdmin=false,member=null,tab}={}){
 if(tab==="members")return isPlatformAdmin;
 const id=tab==="units"?"esf":tab==="notices"||tab==="events"?"campanhas":null;
 return !!id&&canAccessModule({isPlatformAdmin,member,moduleId:id});
}
