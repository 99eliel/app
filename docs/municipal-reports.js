// Painel de acompanhamento administrativo. Não lê prontuários nem exibe dados pessoais.
import {auth,db} from "./firebase.js";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {collection,doc,getDoc,getDocs,query,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {escapeText as E} from "./module-catalog.js";
import {metricCounts,sanitizedMetricsCsv} from "./operational-metrics.js";

const cityKey="cs_portal_city";
const provider=new GoogleAuthProvider();
const heading=`<div class="page-heading"><div><span class="section-kicker">INDICADORES OPERACIONAIS</span><h1>Relatórios por município</h1><p>Dados agregados do Firestore, sem informações de pacientes. Cada município possui seu próprio painel.</p></div><span class="pill">Acesso autorizado</span></div>`;
const fmt=n=>n===null?"—":new Intl.NumberFormat("pt-BR").format(n);
const metric=(icon,name,value,desc)=>`<div class="report-stat"><span class="report-stat-icon">${icon}</span><span class="report-stat-name">${E(name)}</span><strong>${fmt(value)}</strong><small>${E(desc)}</small></div>`;

export function mountReports(root,notify=()=>{},signal) {
 let user=auth.currentUser,cities=[],cityId="",isSuper=false,metrics=null,loaded=false,error="",loading=true,version=0,unsub=null;
 const alive=()=>root.isConnected&&!signal?.aborted;
 const render=()=>{
  if(!alive())return;
  if(loading){root.innerHTML=heading+'<div class="panel"><p>Carregando indicadores do município...</p></div>';return;}
  if(error){root.innerHTML=heading+`<div class="disclaimer"><strong>Não foi possível consultar os indicadores.</strong> ${E(error)}</div><button class="btn btn-outline" type="button" data-report="retry">Tentar novamente</button>`;return;}
  if(!user){root.innerHTML=heading+'<div class="panel admin-intro"><h2>Entre com sua conta autorizada</h2><p>Os relatórios operacionais são restritos à administração municipal.</p><button class="btn btn-solid" type="button" data-report="login">Entrar com Google</button></div>';return;}
  if(!cities.length){root.innerHTML=heading+`<div class="empty-state"><strong>Sem municípios autorizados</strong><p>Seu UID ainda não está habilitado para consultar relatórios de nenhum município.</p><a href="#administracao" class="btn btn-outline">Ver administração</a></div>`;return;}
  const city=cities.find(c=>c.id===cityId);
  if(!city){root.innerHTML=heading;return;}
  root.innerHTML=`${heading}
   <section class="report-toolbar">
    <div class="input-field"><label for="reportCity">Município</label><select id="reportCity">${cities.map(c=>`<option value="${E(c.id)}" ${c.id===cityId?"selected":""}>${E(c.name)} · ${E(c.state)}</option>`).join("")}</select></div>
    <div class="report-actions"><button class="btn btn-outline" type="button" data-report="retry">Atualizar</button><button class="btn btn-solid" type="button" data-report="export">Exportar resumo CSV</button></div>
   </section>
   <div class="disclaimer"><strong>Informações agregadas.</strong> O painel mostra contagens de cadastros e solicitações, não diagnósticos ou dados individuais. Os valores são consultados quando você abre ou atualiza a página.</div>
   <section class="report-grid">
    ${metric("▧","Módulos habilitados",metrics.activeModules,"Áreas ativadas pela organização")}
    ${metric("🏥","ESF cadastradas",metrics.esfRegistered,"Unidades informadas pela equipe")}
    ${metric("✓","ESF publicadas",metrics.esfPublished,"Informações disponíveis ao público")}
    ${metric("📣","Avisos publicados",metrics.activeNotices,"Campanhas e comunicados divulgados")}
    ${metric("📅","Solicitações pendentes",metrics.pendingAppointments,"Pedidos aguardando conferência")}
    ${metric("🎓","Inscrições pendentes",metrics.pendingEnrollments,"Pedidos de participação em cursos")}
   </section>
   <section class="report-summary-grid">
    <div class="panel"><span class="section-kicker">SITUAÇÃO DA UPA</span><h2>${fmt(metrics.operationalQueue)}</h2><p>${metrics.operationalQueue===null?"Não há contagem informada para a UPA.":"Quantidade atual de pessoas na fila, segundo a atualização manual da equipe."}</p><a class="text-link" href="#gestao-modulos">Atualizar informações da UPA ↗</a></div>
    <div class="panel"><span class="section-kicker">PRÓXIMAS ETAPAS</span><h3>Relatórios em evolução</h3><p>Conforme definirmos os fluxos, poderemos acrescentar filtros por unidade, períodos, status e relatórios completos, respeitando as permissões de cada setor.</p></div>
   </section>
   <p class="module-caption">Os indicadores não representam estatísticas clínicas oficiais nem substituem os sistemas de informação do SUS.</p>`;
 };
 const refresh=async()=>{
  const current=++version;loading=true;error="";render();
  try{
   if(!user){cities=[];metrics=null;loading=false;render();return;}
   const role=await getDoc(doc(db,"platformAdmins",user.uid));
   if(!alive()||version!==current)return;
   isSuper=role.exists()&&role.data().enabled===true;
   const citiesSnap=await getDocs(isSuper?collection(db,"municipalities"):query(collection(db,"municipalities"),where("active","==",true)));
   if(!alive()||version!==current)return;
   const all=citiesSnap.docs.map(x=>({id:x.id,...x.data()}));
   if(isSuper)cities=all;
   else {
    const results=await Promise.all(all.map(async city=>{
     try{
      const member=await getDoc(doc(db,"municipalities",city.id,"members",user.uid));
      return member.exists()&&member.data().enabled===true&&["admin","editor"].includes(member.data().role)?city:null;
     }catch{return null;}
    }));
    cities=results.filter(Boolean);
   }
   cities.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
   const preferred=(()=>{try{return localStorage.getItem(cityKey)}catch{return ""}})();
   if(!cities.some(c=>c.id===cityId))cityId=cities.some(c=>c.id===preferred)?preferred:cities[0]?.id||"";
   if(cityId)await loadCounts(current);
   else metrics=null;
  }catch(e){error=e?.code==="permission-denied"?"Acesso negado. Confira o UID, os membros e as regras do Firestore.":String(e?.message||e);}
  finally{if(alive()&&version===current){loading=false;render();}}
 };
 const loadCounts=async(expectedVersion)=>{
  if(!cityId)return;
  const path=(...parts)=>collection(db,"municipalities",cityId,...parts);
  const [settings,esf,notices,appointments,enrollments,upa]=await Promise.all([
   getDocs(path("moduleSettings")),
   getDocs(path("moduleEntries","esf","items")),
   getDocs(path("moduleEntries","campanhas","items")),
   getDocs(path("appointmentRequests")),
   getDocs(path("courseRegistrations")),
   getDoc(doc(db,"municipalities",cityId,"moduleStatus","upa"))
  ]);
  if(!alive()||version!==expectedVersion)return;
  metrics=metricCounts({
   settings:settings.docs.map(x=>x.data()),
   esf:esf.docs.map(x=>x.data()),
   notices:notices.docs.map(x=>x.data()),
   appointments:appointments.docs.map(x=>x.data()),
   enrollments:enrollments.docs.map(x=>x.data()),
   upaStatus:upa.exists()?upa.data():null
  });
 };
 const click=event=>{
  const action=event.target.closest("[data-report]")?.dataset.report;
  if(action==="login"){void signInWithPopup(auth,provider).catch(e=>notify(e?.message||"Falha ao autenticar."));}
  if(action==="retry")void refresh();
  if(action==="export"&&metrics){
   const city=cities.find(c=>c.id===cityId);
   const csv=sanitizedMetricsCsv(`${city.name} - ${city.state}`,metrics);
   const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download=`conectasaude-resumo-${cityId.replace(/[^a-z0-9-]/g,"")}.csv`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
 };
 const change=event=>{
  if(event.target.id!=="reportCity")return;
  cityId=event.target.value;try{localStorage.setItem(cityKey,cityId)}catch{}
  const current=++version;loading=true;render();
  void loadCounts(current).then(()=>{if(alive()&&version===current){loading=false;render();}}).catch(e=>{if(alive()&&version===current){error=e?.message||String(e);loading=false;render();}});
 };
 root.addEventListener("click",click,{signal});
 root.addEventListener("change",change,{signal});
 unsub=onAuthStateChanged(auth,current=>{
  if(user?.uid===current?.uid&&loaded)return;
  user=current;loaded=true;void refresh();
 },e=>{error=e?.message||"Falha ao verificar autenticação.";loading=false;render();});
 signal?.addEventListener("abort",()=>{version++;unsub?.();},{once:true});
 render();
}