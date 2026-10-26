// Rede pública: dados publicáveis por município, sem prontuários ou dados clínicos.
// Documentos disponíveis apenas após configuração explícita do Firestore.
import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const E = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPES={units:"Unidades",notices:"Avisos e campanhas",events:"Calendário"};
const cityKey="cs_public_city";

function pageHead(){
 return `<div class="page-heading"><div><span class="section-kicker">REDE DE INFORMAÇÕES</span><h1>Serviços do seu município</h1><p>Encontre unidades, comunicados e ações publicados por gestores cadastrados na plataforma.</p></div><span class="pill">Conteúdo público</span></div>`;
}
function formatDate(date,time){
 const ok=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date||"");
 if(!ok)return "Data a confirmar";
 const d=new Date(`${date}T12:00:00`);
 return Number.isNaN(d.getTime())?"Data a confirmar":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"long",year:"numeric"})+(time?` · ${E(time)}`:"");
}
function card(kind,object){
 const a=object;
 if(kind==="units")return `<article class="data-card"><div class="data-card-top"><span class="module-bubble">🏥</span><span class="pill">${E(a.type||"Unidade")}</span></div><h3>${E(a.name)}</h3><p class="data-caption">${E(a.district||"")}</p><div class="data-detail"><strong>Endereço</strong><span>${E(a.address||"Não informado")}</span></div><div class="data-detail"><strong>Horário informado</strong><span>${E(a.hours||"A confirmar com a unidade")}</span></div><div class="data-detail"><strong>Telefone institucional</strong><span>${E(a.phone||"Não informado")}</span></div></article>`;
 if(kind==="notices")return `<article class="data-card"><div class="data-card-top"><span class="module-bubble">📣</span><span class="pill">${E(a.kind||"Comunicado")}</span></div><h3>${E(a.title)}</h3><p class="data-caption">${E(a.description)}</p></article>`;
 return `<article class="data-card"><div class="data-card-top"><span class="module-bubble">🗓️</span><span class="pill">Agenda</span></div><h3>${E(a.title)}</h3><p class="data-caption">${formatDate(a.date,a.time)}</p><div class="data-detail"><strong>Local</strong><span>${E(a.place||"A confirmar")}</span></div><p class="data-caption">${E(a.description||"")}</p></article>`;
}
export async function mountNetwork(target,signal){
 target.innerHTML=`${pageHead()}<div class="panel"><p>Carregando municípios disponíveis...</p></div>`;
 let cities=[];
 try{
  const snapshot=await getDocs(query(collection(db,"municipalities"),where("active","==",true)));
  cities=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 }catch(error){
  if(target.isConnected)target.innerHTML=`${pageHead()}<div class="disclaimer"><strong>Rede ainda não configurada.</strong> Não conseguimos consultar os municípios publicados. Verifique se o Firestore foi criado e se as regras foram implantadas. <small>Código: ${E(error.code||"indisponível")}</small></div><a class="btn btn-outline" href="#modulos">Explorar a demonstração</a>`;
  return;
 }
 if(signal?.aborted||!target.isConnected)return;
 if(!cities.length){
  target.innerHTML=`${pageHead()}<div class="empty-state"><span style="font-size:38px" aria-hidden="true">🏥</span><strong>Nenhum município publicado ainda</strong><p>Quando a administração cadastrar e ativar um município, seus serviços aparecerão aqui. Enquanto isso, explore os blocos demonstrativos.</p><a href="#modulos" class="btn btn-solid">Explorar módulos ↗</a></div>`;
  return;
 }
 let cityId=localStorage.getItem(cityKey);
 if(!cities.some(x=>x.id===cityId))cityId=cities[0].id;
 let tab="units",search="";
 const selection=()=>`<section class="panel network-controls"><div class="input-field"><label for="citySelect">Município</label><select id="citySelect">${cities.map(c=>`<option value="${E(c.id)}" ${c.id===cityId?"selected":""}>${E(c.name)} · ${E(c.state)}</option>`).join("")}</select></div><div class="input-field"><label for="networkSearch">Pesquisar conteúdo</label><input type="search" id="networkSearch" placeholder="Buscar nesta seção..." value="${E(search)}"></div></section>`;
 const tabs=()=>`<div class="filter-bar" role="group" aria-label="Tipos de informação">${Object.entries(TYPES).map(([key,label])=>`<button type="button" class="filter-btn ${key===tab?"active":""}" data-network-tab="${key}" aria-pressed="${key===tab}">${label}</button>`).join("")}</div>`;
 async function show(){
  const city=cities.find(c=>c.id===cityId);
  target.innerHTML=`${pageHead()}<div class="notice"><span class="notice-icon">ⓘ</span><div><strong>Informação pública.</strong> Confira dados importantes com os canais oficiais. O ConectaSaúde é uma plataforma independente.</div></div><div class="section-head"><div><span class="section-kicker">${E(city.name)} · ${E(city.state)}</span><h2>Informações disponíveis</h2></div></div>${selection()}${tabs()}<section id="networkCards" class="data-grid"><div class="panel"><p>Carregando publicações...</p></div></section>`;
  await loadDocs();
 }
 let docs=[];
 let seq=0;
 async function loadDocs(){
  const current=++seq;
  try{
   const snap=await getDocs(query(collection(db,"municipalities",cityId,tab),where("published","==",true)));
   if(signal?.aborted||current!==seq||!target.isConnected)return;
   docs=snap.docs.map(d=>({id:d.id,...d.data()}));
   docs.sort((a,b)=>tab==="events"?(a.date||"").localeCompare(b.date||""):(a.name||a.title||"").localeCompare(b.name||b.title||"","pt-BR"));
   drawDocs();
  }catch(error){
   if(signal?.aborted||current!==seq||!target.isConnected)return;
   target.querySelector("#networkCards").innerHTML=`<div class="disclaimer">Não foi possível consultar estas publicações. Verifique as regras do Firestore. <small>${E(error.code||"indisponível")}</small></div>`;
  }
 }
 function drawDocs(){
  const term=search.toLocaleLowerCase("pt-BR").trim();
  const visible=docs.filter(d=>Object.values(d).some(v=>typeof v==="string"&&v.toLocaleLowerCase("pt-BR").includes(term)));
  const area=target.querySelector("#networkCards");if(!area)return;
  area.innerHTML=visible.length?visible.map(d=>card(tab,d)).join(""):`<div class="empty-state"><strong>Nenhum resultado nesta seção</strong><p>Não existem publicações com estes filtros para este município.</p></div>`;
 }
 target.addEventListener("change",async event=>{
  if(signal?.aborted)return;
  if(event.target.id==="citySelect"){
   cityId=event.target.value;try{localStorage.setItem(cityKey,cityId)}catch{}
   search="";await show();
  }
 },{signal});
 target.addEventListener("click",async event=>{
  const button=event.target.closest("[data-network-tab]");
  if(!button||signal?.aborted)return;
  tab=button.dataset.networkTab;search="";await show();
 },{signal});
 target.addEventListener("input",event=>{
  if(signal?.aborted)return;
  if(event.target.id!=="networkSearch")return;
  search=event.target.value;drawDocs();
 },{signal});
 await show();
}