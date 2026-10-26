// Funcionalidades locais do protótipo. Não salvar aqui dados pessoais ou clínicos.
const TYPES = ["UBS", "UPA", "Farmácia", "Laboratório", "Outro"];
const NOTICE_TYPES = ["Comunicado", "Campanha", "Serviço", "Evento"];
const demoUnits = [
  { id:"ex-1", name:"Unidade Modelo — Centro", type:"UBS", district:"Bairro de exemplo", address:"Endereço fictício • configure a sua unidade", phone:"", hours:"Segunda a sexta • horário ilustrativo", example:true },
  { id:"ex-2", name:"Unidade Modelo — Bairro", type:"UBS", district:"Outra região de exemplo", address:"Endereço fictício • configure a sua unidade", phone:"", hours:"Segunda a sexta • horário ilustrativo", example:true },
  { id:"ex-3", name:"Farmácia Modelo", type:"Farmácia", district:"Local de exemplo", address:"Endereço fictício • configure o endereço", phone:"", hours:"Consulte os horários oficiais", example:true }
];
const demoNotices = [
  { id:"an-1", title:"Campanha de prevenção", kind:"Campanha", description:"Modelo de comunicado para divulgar ações de saúde e orientações à população. Substitua por informações oficiais após validação.", example:true },
  { id:"an-2", title:"Informações sobre serviços", kind:"Serviço", description:"Modelo de aviso para apresentar mudanças em horários ou fluxos. Este texto não representa a realidade de nenhuma unidade.", example:true },
  { id:"an-3", title:"Ação comunitária", kind:"Evento", description:"Exemplo de divulgação de ações para a comunidade. É possível cadastrar avisos próprios nesta demonstração.", example:true }
];
const KEYS = {units:"cs_demo_units", notices:"cs_demo_notices", events:"cs_demo_events"};
const load = (key, fallback) => {
  try {const raw=localStorage.getItem(key);const data=raw===null?fallback:JSON.parse(raw);return Array.isArray(data)?data:fallback;}
  catch {return fallback;}
};
const save = (key,data) => {try {localStorage.setItem(key,JSON.stringify(data));return true;} catch {return false;}};
const clean = text => String(text??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const attr = clean;
const read = type => load(KEYS[type],type==="units"?demoUnits:type==="notices"?demoNotices:[]);
let editing = {type:null,id:null};
let unitSearch = "";
let noticeSearch = "";
let hooks = {refresh:()=>{},toast:()=>{}};
const demoNote = `<div class="disclaimer"><strong>Ambiente de testes.</strong> Todos os registros iniciais são exemplos fictícios. As alterações que você fizer são salvas apenas neste navegador, não são publicadas para outros visitantes e não alteram nenhum cadastro oficial. Não informe dados de pacientes.</div>`;
const head = (kicker,title,desc) => `<div class="page-heading"><div><span class="section-kicker">${kicker}</span><h1>${title}</h1><p>${desc}</p></div><span class="pill">✦ Módulo demonstrativo</span></div>`;
const empty = (title,description) => `<div class="empty-state"><span style="font-size:32px" aria-hidden="true">⌕</span><strong>${title}</strong><p>${description}</p></div>`;
const button = (action,type,id,label,css="btn btn-outline") => `<button class="${css}" type="button" data-module-action="${action}" data-module-type="${type}" data-id="${attr(id)}">${label}</button>`;
function overviewCard(icon,title,text,path,status){
 return `<a href="#${path}" class="module-card"><span class="module-bubble" aria-hidden="true">${icon}</span><span class="module-card-title">${title}</span><span class="module-card-description">${text}</span><span class="module-card-foot"><span>${status}</span><span aria-hidden="true">↗</span></span></a>`;
}
function overview(){
 return `${head("BLOCOS DE FUNCIONALIDADES","Uma plataforma que cresce com você.","Cada área funciona de forma independente. Começaremos pelos serviços públicos e, em seguida, poderemos conectar os módulos que dependem de autenticação e autorização.")}
 ${demoNote}
 <div class="module-grid">
 ${overviewCard("🏥","Unidades e locais de atendimento","Cadastre e pesquise unidades, contatos, endereços e horários ilustrativos.","unidades","Cadastro local")}
 ${overviewCard("📣","Avisos e campanhas","Crie comunicados e divulgue conteúdos em um mural de demonstração.","avisos","Mural local")}
 ${overviewCard("🗓️","Calendário de ações","Organize datas de eventos e ações comunitárias com registros locais.","calendario","Calendário local")}
 ${overviewCard("🩺","Guia de serviços","Navegue por temas de saúde, salve favoritos e encontre orientações.","servicos","Disponível")}
 ${overviewCard("♡","Meu espaço","Checklist geral e serviços favoritos no próprio dispositivo.","meu-espaco","Disponível")}
 ${overviewCard("📊","Painel profissional","Explore a proposta visual de indicadores para gestores.","gestao","Simulação")}
 </div>
 <div class="section-head"><div><span class="section-kicker">EVOLUÇÃO CONTÍNUA</span><h2>Próximos blocos em estudo</h2></div></div>
 <div class="panel"><div class="step-row"><span class="step-number">01</span><div><strong>Autenticação e municípios</strong><small>Configuração multiempresa, permissões e isolamento entre cidades.</small></div></div><div class="step-row"><span class="step-number">02</span><div><strong>Solicitações e agendamentos</strong><small>Dependem de fluxos reais, autorização institucional e integração segura.</small></div></div><div class="step-row"><span class="step-number">03</span><div><strong>Comunicação e notificações</strong><small>Informações relevantes por município, respeitando consentimentos.</small></div></div></div>`;
}
function unitCard(u){
 const mapTitle=u.example?`<span class="pill">Fictícia</span>`:`<span class="pill">Cadastro local</span>`;
 return `<article class="data-card">
  <div class="data-card-top"><span class="module-bubble" aria-hidden="true">🏥</span>${mapTitle}</div>
  <span class="category">${clean(u.type)}</span><h3>${clean(u.name)}</h3>
  <p class="data-caption">⌁ ${clean(u.district||"Bairro não informado")}</p>
  <div class="data-detail"><strong>Local</strong><span>${clean(u.address||"Não informado")}</span></div>
  <div class="data-detail"><strong>Horário</strong><span>${clean(u.hours||"Consulte os canais oficiais")}</span></div>
  <div class="data-detail"><strong>Contato</strong><span>${clean(u.phone||"Não informado")}</span></div>
  <div class="data-card-actions">${button("edit","units",u.id,"Editar")}${button("delete","units",u.id,"Excluir","btn btn-outline btn-danger")}</div>
 </article>`;
}
function unitForm(){
 const u=read("units").find(u=>u.id===editing.id)||{};
 return `<section class="form-panel" id="moduleFormPanel"><div class="form-header"><div><span class="section-kicker">CADASTRO LOCAL</span><h2>${u.id?"Editar unidade":"Adicionar unidade"}</h2><p>Preencha apenas informações públicas. Não insira dados de cidadãos ou profissionais.</p></div></div>
 <form data-module-form="units" class="module-form">
  <div class="input-field"><label for="unitName">Nome da unidade *</label><input id="unitName" name="name" maxlength="90" required placeholder="Ex.: Unidade Central" value="${attr(u.name||"")}"></div>
  <div class="input-field"><label for="unitType">Tipo de serviço *</label><select id="unitType" name="type" required>${TYPES.map(t=>`<option value="${attr(t)}" ${u.type===t?"selected":""}>${clean(t)}</option>`).join("")}</select></div>
  <div class="input-field"><label for="unitDistrict">Bairro ou região</label><input id="unitDistrict" name="district" maxlength="80" placeholder="Ex.: Centro" value="${attr(u.district||"")}"></div>
  <div class="input-field"><label for="unitAddress">Endereço público</label><input id="unitAddress" name="address" maxlength="180" placeholder="Rua, número, referência" value="${attr(u.address||"")}"></div>
  <div class="input-field"><label for="unitHours">Horários de atendimento</label><input id="unitHours" name="hours" maxlength="120" placeholder="Ex.: Seg. a sex., 8h às 17h" value="${attr(u.hours||"")}"></div>
  <div class="input-field"><label for="unitPhone">Telefone institucional</label><input id="unitPhone" name="phone" maxlength="50" placeholder="(00) 0000-0000" value="${attr(u.phone||"")}"></div>
  <div class="form-actions"><button class="btn btn-solid" type="submit">${u.id?"Salvar alterações":"Adicionar unidade"}</button>${button("cancel","units","","Cancelar")}</div>
 </form></section>`;
}
function units(){
 const all=read("units");
 const term=unitSearch.toLocaleLowerCase("pt-BR").trim();
 const visible=all.filter(u=>`${u.name} ${u.type} ${u.district||""}`.toLocaleLowerCase("pt-BR").includes(term));
 return `${head("MAPA DE SERVIÇOS","Unidades e locais de atendimento.","Organize informações públicas sobre postos, farmácias e demais locais de cuidado. Os exemplos abaixo são inteiramente fictícios.")}
 ${demoNote}
 <div class="module-toolbar"><label class="search-inline module-search"><span aria-hidden="true">⌕</span><input type="search" data-module-search="units" placeholder="Buscar unidade, tipo ou região..." aria-label="Pesquisar unidades" value="${attr(unitSearch)}"></label>
 ${button("add","units","","+ Adicionar unidade","btn btn-solid")}</div>
 <section id="unitResults" class="data-grid">${visible.length?visible.map(unitCard).join(""):empty("Nenhuma unidade encontrada","Adicione uma unidade ou altere a pesquisa.")}</section>
 ${editing.type==="units"?unitForm():""}
 <p class="module-caption">Exibindo ${visible.length} de ${all.length} locais cadastrados apenas neste navegador.</p>`;
}
function noticeCard(n){
 return `<article class="data-card"><div class="data-card-top"><span class="module-bubble" aria-hidden="true">📣</span><span class="pill">${n.example?"Fictício":"Cadastro local"}</span></div><span class="category">${clean(n.kind)}</span><h3>${clean(n.title)}</h3><p class="data-caption">${clean(n.description)}</p><div class="data-card-actions">${button("edit","notices",n.id,"Editar")}${button("delete","notices",n.id,"Excluir","btn btn-outline btn-danger")}</div></article>`;
}
function noticeForm(){
 const n=read("notices").find(n=>n.id===editing.id)||{};
 return `<section class="form-panel" id="moduleFormPanel"><div class="form-header"><div><span class="section-kicker">MURAL LOCAL</span><h2>${n.id?"Editar aviso":"Novo aviso"}</h2><p>Use informações gerais e verificadas. O conteúdo será salvo somente no seu navegador.</p></div></div>
 <form data-module-form="notices" class="module-form">
 <div class="input-field"><label for="noticeTitle">Título *</label><input id="noticeTitle" name="title" maxlength="100" required placeholder="Ex.: Dia de mobilização" value="${attr(n.title||"")}"></div>
 <div class="input-field"><label for="noticeKind">Categoria</label><select id="noticeKind" name="kind">${NOTICE_TYPES.map(t=>`<option value="${attr(t)}" ${n.kind===t?"selected":""}>${clean(t)}</option>`).join("")}</select></div>
 <div class="input-field field-wide"><label for="noticeDescription">Descrição do aviso *</label><textarea id="noticeDescription" name="description" maxlength="800" required rows="4" placeholder="Escreva uma orientação clara e objetiva.">${clean(n.description||"")}</textarea></div>
 <div class="form-actions"><button class="btn btn-solid" type="submit">${n.id?"Salvar alterações":"Adicionar aviso"}</button>${button("cancel","notices","","Cancelar")}</div>
 </form></section>`;
}
function notices(){
 const all=read("notices");
 const term=noticeSearch.toLocaleLowerCase("pt-BR").trim();
 const visible=all.filter(n=>`${n.title} ${n.kind} ${n.description}`.toLocaleLowerCase("pt-BR").includes(term));
 return `${head("INFORMAÇÃO E COMUNICAÇÃO","Mural de avisos e campanhas.","Um espaço para compartilhar informações úteis. Os comunicados abaixo são modelos, não anúncios oficiais.")}
 ${demoNote}
 <div class="module-toolbar"><label class="search-inline module-search"><span aria-hidden="true">⌕</span><input type="search" data-module-search="notices" placeholder="Buscar comunicado ou campanha..." aria-label="Pesquisar avisos" value="${attr(noticeSearch)}"></label>${button("add","notices","","+ Criar aviso","btn btn-solid")}</div>
 <section id="noticeResults" class="data-grid">${visible.length?visible.map(noticeCard).join(""):empty("Nenhum aviso encontrado","Crie um aviso ou altere sua pesquisa.")}</section>
 ${editing.type==="notices"?noticeForm():""}
 <p class="module-caption">As alterações não são visíveis para outras pessoas nem publicadas em nenhum município.</p>`;
}
function dateLabel(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return "Data não informada";
 const d=new Date(`${date}T12:00:00`);
 if(Number.isNaN(d.valueOf()))return "Data inválida";
 return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})+(time?` · ${clean(time)}`:"");
}
function eventCard(e){
 return `<article class="data-card"><div class="data-card-top"><span class="module-bubble" aria-hidden="true">🗓️</span><span class="pill">Cadastro local</span></div><span class="category">AÇÃO COMUNITÁRIA</span><h3>${clean(e.title)}</h3><p class="data-caption">${dateLabel(e.date,e.time)}</p><div class="data-detail"><strong>Local</strong><span>${clean(e.place||"Não informado")}</span></div>${e.description?`<p class="data-caption">${clean(e.description)}</p>`:""}<div class="data-card-actions">${button("edit","events",e.id,"Editar")}${button("delete","events",e.id,"Excluir","btn btn-outline btn-danger")}</div></article>`;
}
function eventForm(){
 const e=read("events").find(e=>e.id===editing.id)||{};
 return `<section class="form-panel" id="moduleFormPanel"><div class="form-header"><div><span class="section-kicker">AGENDA LOCAL</span><h2>${e.id?"Editar ação":"Adicionar ação"}</h2><p>Cadastre apenas datas públicas de campanhas e eventos comunitários, sem dados de pacientes.</p></div></div>
 <form class="module-form" data-module-form="events">
 <div class="input-field"><label for="eventTitle">Nome da ação *</label><input id="eventTitle" name="title" maxlength="90" required placeholder="Ex.: Orientação na comunidade" value="${attr(e.title||"")}"></div>
 <div class="input-field"><label for="eventDate">Data *</label><input id="eventDate" name="date" type="date" required value="${attr(e.date||"")}"></div>
 <div class="input-field"><label for="eventTime">Horário</label><input id="eventTime" name="time" type="time" value="${attr(e.time||"")}"></div>
 <div class="input-field"><label for="eventPlace">Local público</label><input id="eventPlace" name="place" maxlength="120" placeholder="Local da ação" value="${attr(e.place||"")}"></div>
 <div class="input-field field-wide"><label for="eventDescription">Descrição</label><textarea id="eventDescription" name="description" maxlength="400" rows="3" placeholder="Informações resumidas para os participantes">${clean(e.description||"")}</textarea></div>
 <div class="form-actions"><button class="btn btn-solid" type="submit">${e.id?"Salvar alterações":"Adicionar ação"}</button>${button("cancel","events","","Cancelar")}</div>
 </form></section>`;
}
function calendar(){
 const events=read("events").slice().sort((a,b)=>`${a.date}T${a.time||"00:00"}`.localeCompare(`${b.date}T${b.time||"00:00"}`));
 return `${head("CALENDÁRIO DE AÇÕES","Planeje atividades de saúde.","Organize ações educativas, campanhas e eventos comunitários. O calendário ainda é somente uma simulação local.")}
 ${demoNote}
 <div class="module-toolbar"><div class="module-caption">Eventos cadastrados: <strong>${events.length}</strong> · dados locais</div>${button("add","events","","+ Adicionar ação","btn btn-solid")}</div>
 <section class="data-grid">${events.length?events.map(eventCard).join(""):empty("Ainda não há ações cadastradas","Cadastre uma atividade pública fictícia para experimentar o calendário.")}</section>
 ${editing.type==="events"?eventForm():""}`;
}
function focusForm(){
 requestAnimationFrame(()=>{
  const target=document.querySelector("#moduleFormPanel");
  if(target) {
   target.scrollIntoView({behavior:"smooth",block:"start"});
   target.querySelector("input:not([type=hidden])")?.focus({preventScroll:true});
  }
 });
}
function setup({refresh,toast}){
 hooks={refresh,toast};
 document.addEventListener("click",event=>{
  const el=event.target.closest("[data-module-action]");if(!el)return;
  const type=el.dataset.moduleType,id=el.dataset.id,action=el.dataset.moduleAction;
  if(!Object.hasOwn(KEYS,type))return;
  if(action==="add"){editing={type,id:null};hooks.refresh();focusForm()}
  if(action==="cancel"){editing={type:null,id:null};hooks.refresh()}
  if(action==="edit"){
   if(!read(type).some(item=>item.id===id))return;
   editing={type,id};hooks.refresh();focusForm();
  }
  if(action==="delete"){
   const original=read(type);
   const item=original.find(i=>i.id===id);if(!item)return;
   if(!window.confirm(`Excluir "${item.title||item.name}" desta demonstração local?`))return;
   const newer=original.filter(i=>i.id!==id);
   if(!save(KEYS[type],newer)){hooks.toast("Não foi possível salvar no navegador.");return}
   if(editing.type===type&&editing.id===id)editing={type:null,id:null};
   hooks.refresh();hooks.toast("Registro excluído deste dispositivo.");
  }
 });
 document.addEventListener("submit",event=>{
  const form=event.target.closest("[data-module-form]");if(!form)return;
  event.preventDefault();
  if(!form.reportValidity())return;
  const type=form.dataset.moduleForm;
  if(!Object.hasOwn(KEYS,type))return;
  const values=Object.fromEntries(new FormData(form).entries());
  const safeValues=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v).trim()]));
  let data;
  if(type==="units"){
   const {name,type:unitType,district,address,hours,phone}=safeValues;
   if(!name||!TYPES.includes(unitType))return;
   data={name:name.slice(0,90),type:unitType,district:district.slice(0,80),address:address.slice(0,180),hours:hours.slice(0,120),phone:phone.slice(0,50)};
  }else if(type==="notices"){
   const {title,kind,description}=safeValues;
   if(!title||!description||!NOTICE_TYPES.includes(kind))return;
   data={title:title.slice(0,100),kind,description:description.slice(0,800)};
  }else{
   const {title,date,time,place,description}=safeValues;
   if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(`${date}T12:00:00`).getTime()))return;
   data={title:title.slice(0,90),date,time,place:place.slice(0,120),description:description.slice(0,400)};
  }
  const all=read(type);
  const old=all.find(item=>item.id===editing.id);
  const current={...data,id:old?old.id:typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`,example:false};
  const updated=old?all.map(item=>item.id===old.id?current:item):[...all,current];
  if(!save(KEYS[type],updated)){hooks.toast("Não foi possível salvar. Verifique o armazenamento.");return}
  editing={type:null,id:null};hooks.refresh();hooks.toast(old?"Cadastro atualizado neste navegador.":"Cadastro salvo neste navegador.");
 });
 document.addEventListener("input",event=>{
  const el=event.target.closest("[data-module-search]");
  if(!el)return;
  if(el.dataset.moduleSearch==="units"){
   unitSearch=el.value;
   const result=document.querySelector("#unitResults");
   if(result){
    const hits=read("units").filter(u=>`${u.name} ${u.type} ${u.district||""}`.toLocaleLowerCase("pt-BR").includes(unitSearch.toLocaleLowerCase("pt-BR").trim()));
    result.innerHTML=hits.length?hits.map(unitCard).join(""):empty("Nenhuma unidade encontrada","Tente outra palavra.");
   }
  }
  if(el.dataset.moduleSearch==="notices"){
   noticeSearch=el.value;
   const result=document.querySelector("#noticeResults");
   if(result){
    const hits=read("notices").filter(n=>`${n.title} ${n.kind} ${n.description}`.toLocaleLowerCase("pt-BR").includes(noticeSearch.toLocaleLowerCase("pt-BR").trim()));
    result.innerHTML=hits.length?hits.map(noticeCard).join(""):empty("Nenhum aviso encontrado","Tente outra palavra.");
   }
  }
 });
}
export const modules={overview,units,notices,calendar,setup};