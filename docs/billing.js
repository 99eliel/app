// Painel comercial reservado aos superadministradores.
// Cobranças acontecem fora do app. Este módulo não processa pagamentos.
import {auth,db} from "./firebase.js";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {collection,doc,getDoc,getDocs,query,orderBy,serverTimestamp,Timestamp,writeBatch} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {LICENSE_STATUS,PLAN_OPTIONS,STATUS_LABELS,effectiveLicenseStatus,isLicenseWritable,parseBrlToCents,centsToBrlInput,dateInputFromTimestamp,endOfLocalDate,formatBrl} from "./license-core.js";

const safe = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const headings = `<div class="page-heading"><div><span class="section-kicker">CONECTASAÚDE · GESTÃO COMERCIAL</span><h1>Licenças e assinaturas</h1><p>Gerencie organizações clientes, prazos, planos e suspensões. A cobrança é realizada diretamente por contrato ou faturamento externo.</p></div><span class="pill">Superadmin</span></div>`;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});
const statusClass = s => ["active","trial"].includes(s)?"good":s==="grace"?"warn":s==="unconfigured"?"neutral":"bad";
const dateDisplay = stamp => {
 const val=stamp?.toDate?.();
 return val ? val.toLocaleDateString("pt-BR") : "Não definido";
};
const displayError = error => {
 const c=error?.code||"unknown";
 if(c==="permission-denied")return "Você não tem permissão para executar esta operação. Confira o perfil Superadmin e as regras implantadas no Firestore.";
 return `Falha: ${error?.message||"não foi possível concluir a operação."}`;
};

export function mountBilling(root, inform, signal) {
 let loggedIn=null, admin=false, cities=[],licenses=new Map(),selectedId="",loading=true,error="",audit=[],active=false;
 let readGeneration=0;
 const toast=inform||(()=>{});
 const isCurrent=()=>!signal?.aborted&&root.isConnected&&location.hash.split("?")[0]==="#assinaturas";
 const licenseFor=id=>licenses.get(id);
 const currentCity=()=>cities.find(c=>c.id===selectedId);
 const render=()=> {
  if(!isCurrent())return;
  if(loading){root.innerHTML=headings+'<div class="panel"><p>Carregando o painel comercial...</p></div>';return;}
  if(error)root.innerHTML=headings+`<div class="disclaimer"><strong>Não foi possível carregar os dados.</strong> ${safe(error)}</div><button type="button" class="btn btn-outline" data-billing="reload">Tentar novamente</button>`;
  else if(!loggedIn)root.innerHTML=headings+`<div class="panel admin-intro"><span class="module-bubble" aria-hidden="true">🔐</span><h2>Área reservada ao proprietário</h2><p>Entre com sua conta Google autorizada. Somente usuários incluídos na coleção protegida platformAdmins podem acessar informações comerciais.</p><button type="button" class="btn btn-solid" data-billing="login">Entrar com Google</button></div>`;
  else if(!admin)root.innerHTML=headings+`<div class="disclaimer"><strong>Acesso restrito.</strong> A conta ${safe(loggedIn.email)} não possui permissão de Superadmin. UID: <code>${safe(loggedIn.uid)}</code></div><button type="button" class="btn btn-outline" data-billing="logout">Sair da conta</button>`;
  else root.innerHTML=dashboard();
 };

 const summary=()=>{
  const counts={trial:0,active:0,grace:0,suspended:0,canceled:0,expired:0,unconfigured:0};
  for(const city of cities){const effective=effectiveLicenseStatus(licenseFor(city.id));counts[effective]=(counts[effective]||0)+1;}
  return `<section class="license-metrics">
    <div class="license-metric"><span>Municípios cadastrados</span><strong>${cities.length}</strong></div>
    <div class="license-metric"><span>Ativos / em teste</span><strong>${counts.active+counts.trial}</strong></div>
    <div class="license-metric"><span>Carência</span><strong>${counts.grace}</strong></div>
    <div class="license-metric"><span>Vencidos ou suspensos</span><strong>${counts.expired+counts.suspended+counts.canceled+counts.unconfigured}</strong></div>
   </section>`;
 };
 const list=()=>`<div class="license-list">${cities.map(city=>{
   const current=licenseFor(city.id),status=effectiveLicenseStatus(current);
   return `<button class="license-entry ${selectedId===city.id?"selected":""}" type="button" data-billing-city="${safe(city.id)}" aria-pressed="${selectedId===city.id}">
    <span class="license-entry-main"><strong>${safe(city.name)}</strong><small>${safe(city.state)} · ${city.active?"Visível ao público":"Não publicado"}</small></span>
    <span class="license-badge ${statusClass(status)}">${safe(STATUS_LABELS[status]||"Indefinido")}</span>
   </button>`;
  }).join("")}</div>`;
 const editor=()=>{
  const city=currentCity();if(!city)return "";
  const current=licenseFor(city.id);
  const effective=effectiveLicenseStatus(current);
  const status=current?.status||"trial";
  return `<div class="panel billing-editor">
   <div class="billing-editor-head"><div><span class="section-kicker">ORGANIZAÇÃO CONTRATANTE</span><h2>${safe(city.name)} · ${safe(city.state)}</h2><p>Visibilidade pública: <strong>${city.active?"ativada":"desativada"}</strong>. A suspensão da licença não apaga dados e não desativa automaticamente informações públicas.</p></div><span class="license-badge ${statusClass(effective)}">${safe(STATUS_LABELS[effective])}</span></div>
   ${!isLicenseWritable(current)?'<div class="disclaimer">No estado atual, edições feitas por profissionais municipais ficam bloqueadas pelas regras de licenciamento. O Superadmin mantém o acesso para manutenção e reativação.</div>':""}
   <form id="billingForm" class="module-form">
    <div class="input-field"><label for="licPlan">Plano contratado</label><select id="licPlan" name="planCode">${PLAN_OPTIONS.map(p=>`<option value="${safe(p)}" ${p===(current?.planCode||"Municipal")?"selected":""}>${safe(p)}</option>`).join("")}</select></div>
    <div class="input-field"><label for="licStatus">Estado contratual</label><select id="licStatus" name="status">${LICENSE_STATUS.map(value=>`<option value="${value}" ${status===value?"selected":""}>${STATUS_LABELS[value]}</option>`).join("")}</select></div>
    <div class="input-field"><label for="licEnd">Válido até (inclusive) *</label><input id="licEnd" type="date" name="validUntil" required value="${safe(dateInputFromTimestamp(current?.validUntil))}"></div>
    <div class="input-field"><label for="licAmount">Mensalidade contratual (R$) *</label><input id="licAmount" name="price" inputmode="decimal" required placeholder="Ex.: 399,90" value="${safe(centsToBrlInput(current?.monthlyPriceCents??0))}"></div>
    <div class="input-field field-wide"><label for="licNotes">Observações comerciais (sem dados clínicos)</label><textarea id="licNotes" name="notes" maxlength="500" rows="3" placeholder="Condições comerciais gerais...">${safe(current?.notes||"")}</textarea></div>
    <div class="form-actions"><button class="btn btn-solid" type="submit">${current?"Salvar licença":"Criar licença"}</button>${current&&current.status!=="suspended"?'<button class="btn btn-outline btn-danger" type="button" data-billing="suspend">Suspender acesso de edição</button>':""}<button class="btn btn-outline" type="button" data-billing="reload">Atualizar</button></div>
   </form>
   <p class="module-caption">As cobranças são externas. A validade e o estado são ajustados manualmente por você. Não existe débito automático, emissão de boletos ou fiscalização de pagamento neste módulo.</p>
  </div>`;
 };
 const activity=()=> {
  if(!selectedId)return "";
  return `<section class="panel billing-history"><h3>Histórico de alterações</h3>${audit.length?`<div class="history-list">${audit.map(evt=>{
   const when=evt.changedAt?.toDate?.().toLocaleString("pt-BR")||"Registro recente";
   return `<div class="history-item"><span>${safe(when)}</span><strong>${safe(STATUS_LABELS[evt.nextStatus]||evt.nextStatus||"Alteração")}</strong><small>UID: ${safe(evt.actorUid||"não identificado")}</small></div>`;
  }).join("")}</div>`:'<p>Não há alterações registradas pela nova central comercial.</p>'}</section>`;
 };
 const dashboard=()=>`${headings}<div class="billing-top"><div><strong>Conta proprietária</strong><p>${safe(loggedIn?.email||"")} · Controle comercial independente</p></div><button type="button" class="btn btn-outline" data-billing="logout">Sair</button></div>
 ${summary()}
 ${cities.length?`<div class="billing-layout"><aside class="panel billing-directory"><div class="section-head"><div><h2>Organizações</h2><p>Selecione para gerenciar</p></div></div>${list()}</aside><div class="billing-details">${editor()}${activity()}</div></div>`:`<div class="empty-state"><strong>Nenhum município encontrado</strong><p>Cadastre o primeiro município na área Administração. Depois volte aqui para configurar a licença mensal.</p><a href="#administracao" class="btn btn-solid">Ir para Administração ↗</a></div>`}
 <div class="notice"><span class="notice-icon">ⓘ</span><div><strong>Regra de segurança:</strong> suspensão e vencimento bloqueiam edições municipais quando as novas regras estiverem implantadas no Firebase. A consulta pública de informações previamente publicadas permanece disponível. Planeje contratos e continuidade dos serviços antes de usar a suspensão em produção.</div></div>`;
 const load=async()=>{
  const gen=++readGeneration;
  loading=true;error="";render();
  try{
   if(!loggedIn){loading=false;render();return;}
   const role=await getDoc(doc(db,"platformAdmins",loggedIn.uid));
   if(!isCurrent()||gen!==readGeneration)return;
   admin=role.exists()&&role.data().enabled===true;
   if(!admin){loading=false;render();return;}
   const [cityDocs,licenseDocs]=await Promise.all([getDocs(collection(db,"municipalities")),getDocs(collection(db,"licenses"))]);
   if(!isCurrent()||gen!==readGeneration)return;
   cities=cityDocs.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
   licenses=new Map(licenseDocs.docs.map(d=>[d.id,d.data()]));
   if(!cities.some(c=>c.id===selectedId))selectedId=cities[0]?.id||"";
   await loadHistory();
  }catch(e){error=displayError(e);}
  finally{if(gen===readGeneration){loading=false;render();}}
 };
 const loadHistory=async()=>{
  audit=[];
  if(!selectedId)return;
  try{
   const snap=await getDocs(query(collection(db,"licenses",selectedId,"history"),orderBy("changedAt","desc")));
   if(!isCurrent())return;
   audit=snap.docs.slice(0,15).map(doc=>doc.data());
  }catch(e){console.warn("Histórico comercial indisponível:",e?.code||e);}
 };
 const writeLicense=async(data,action)=>{
  if(!admin||!selectedId)throw Error("Acesso não autorizado.");
  const reference=doc(db,"licenses",selectedId);
  const previous=licenseFor(selectedId);
  const auditRef=doc(collection(db,"licenses",selectedId,"history"));
  const batch=writeBatch(db);
  if(previous)batch.update(reference,{...data,updatedAt:serverTimestamp()});
  else batch.set(reference,{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  batch.set(auditRef,{
   action,actorUid:loggedIn.uid,previousStatus:previous?.status||"unconfigured",
   nextStatus:data.status,changedAt:serverTimestamp()
  });
  await batch.commit();
 };
 const saveForm=async(form)=>{
  const fields=new FormData(form);
  const status=String(fields.get("status")||"");
  const planCode=String(fields.get("planCode")||"");
  const validUntil=endOfLocalDate(String(fields.get("validUntil")||""));
  const monthlyPriceCents=parseBrlToCents(fields.get("price"));
  const notes=String(fields.get("notes")||"").trim();
  if(!LICENSE_STATUS.includes(status)||!PLAN_OPTIONS.includes(planCode)||!validUntil||monthlyPriceCents===null||notes.length>500){
   toast("Confira os campos da licença.");return;
  }
  if(["trial","active","grace"].includes(status)&&validUntil.getTime()<=Date.now()){
   toast("Para uma licença ativa, de teste ou carência, informe uma data futura.");return;
  }
  const commitButton=form.querySelector('button[type="submit"]');
  if(commitButton)commitButton.disabled=true;
  try{
   await writeLicense({status,planCode,validUntil:Timestamp.fromDate(validUntil),monthlyPriceCents,notes},"save");
   toast("Licença registrada. As permissões são aplicadas pelo servidor.");
   await load();
  }catch(error){toast(displayError(error));if(commitButton)commitButton.disabled=false;}
 };
 const click=async event=>{
  const option=event.target.closest("[data-billing-city]");
  if(option){
   selectedId=option.dataset.billingCity;
   loading=true;render();
   await loadHistory();loading=false;render();return;
  }
  const button=event.target.closest("[data-billing]");
  if(!button)return;
  const action=button.dataset.billing;
  if(action==="login"){
   try{await signInWithPopup(auth,provider);}catch(e){toast(displayError(e));}return;
  }
  if(action==="logout"){await signOut(auth);return;}
  if(action==="reload"){void load();return;}
  if(action==="suspend"){
   const original=licenseFor(selectedId);
   if(!original)return;
   if(!window.confirm("Suspender edições desta organização? A consulta pública continuará acessível e os registros não serão apagados."))return;
   try{
    await writeLicense({status:"suspended",planCode:original.planCode,validUntil:original.validUntil,monthlyPriceCents:original.monthlyPriceCents,notes:original.notes||""},"suspend");
    toast("Licença suspensa. Edição municipal bloqueada pelas regras.");await load();
   }catch(e){toast(displayError(e));}
  }
 };
 const submit=event=>{
  if(event.target.id!=="billingForm")return;
  event.preventDefault();
  if(!event.target.reportValidity())return;
  void saveForm(event.target);
 };
 root.addEventListener("click",click,{signal});
 root.addEventListener("submit",submit,{signal});
 const unsub=onAuthStateChanged(auth,next=>{
  loggedIn=next;admin=false;
  void load();
 },e=>{error=displayError(e);loading=false;render();});
 if(signal)signal.addEventListener("abort",()=>{readGeneration++;unsub();},{once:true});
 render();
}