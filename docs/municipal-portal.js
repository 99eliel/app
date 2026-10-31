// Portal municipal multi-tenant. Nenhum conteúdo pré-cadastrado.
// Gestão de módulos públicos, conteúdo, UPA, agendamentos e cursos.
import {auth,db} from "./firebase.js";
import {MODULES,MODULE_BY_ID,WEEK_DAYS,escapeText as E,validPublicUrl} from "./module-catalog.js";
import {nextQueueValue,statusLabel,normalizeOperationalInfo,summarizeEsf,countRequestStatuses} from "./municipal-operations.js";
import {posterUrl,noticeSeenKey,visibleNotices} from "./notice-utils.js";
import {canAccessModule,canManageModules} from "./sector-access.js";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {collection,doc,getDoc,getDocs,addDoc,updateDoc,setDoc,query,where,serverTimestamp,onSnapshot,runTransaction,writeBatch} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const provider=new GoogleAuthProvider();
const cityKey="cs_portal_city";
const card=m=>`<span class="module-bubble" aria-hidden="true">${m.icon}</span>`;
const empty=(title,desc)=>`<div class="empty-state"><strong>${E(title)}</strong><p>${E(desc)}</p></div>`;
const header=(title,desc,kicker="PORTAL MUNICIPAL")=>`<div class="page-heading"><div><span class="section-kicker">${E(kicker)}</span><h1>${E(title)}</h1><p>${E(desc)}</p></div><span class="pill">Sem dados fictícios</span></div>`;
const errorText=err=>err?.code==="permission-denied"?"Sem permissão no Firestore. Confira a licença e as regras publicadas.":(err?.message||"Falha ao carregar este recurso.");
const formInput=(label,name,value="",max=140,type="text",required=false)=>`<div class="input-field"><label for="portal_${name}">${E(label)}</label><input id="portal_${name}" name="${name}" type="${type}" ${required?"required":""} maxlength="${max}" value="${E(value)}"></div>`;
const block=(title,contents)=>`<section class="panel portal-block"><h3>${E(title)}</h3>${contents}</section>`;
const modulePath=(cityId,id)=>collection(db,"municipalities",cityId,"moduleEntries",id,"items");

export function mountPortal(root,inform=()=>{},signal,adminMode=false) {
 let user=auth.currentUser,platform=false,cities=[],cityId="",section="",memberMap=new Map(),settings=new Map(),entries=[],status=null,requests=[],editing=null,loading=true,error="",statusMessage="",latest=0,esfQuery="",requestFilter="all",noticeWindowKey="",noticesFeed=[],busy=false;
 let unsubscribeItems=null,unsubscribeUpa=null,unsubscribeNotices=null;
 const stopLive=()=>{unsubscribeItems?.();unsubscribeUpa?.();unsubscribeNotices?.();unsubscribeItems=null;unsubscribeUpa=null;unsubscribeNotices=null;noticesFeed=[];};
 const isAlive=()=>!signal?.aborted&&root.isConnected;
 const informSafe=msg=>{statusMessage=msg;inform(msg);};
  const enabled=m=>settings.get(m.id)?.enabled===true;
 const canUse=m=>!adminMode||canAccessModule({isPlatformAdmin:platform,member:memberMap.get(cityId),moduleId:m.id});
 const manager=()=>canManageModules({isPlatformAdmin:platform,member:memberMap.get(cityId)});
 const approved=m=>adminMode?canUse(m):enabled(m);
 const activeSection=()=>MODULE_BY_ID[section];
 const loadingView=()=>header("Carregando município...","Consultando informações autorizadas.")+'<div class="panel"><p>Carregando...</p></div>';
 const chooseCity=()=>`<div class="portal-choose"><label for="portal_city">Município</label><select id="portal_city">${cities.map(c=>`<option value="${E(c.id)}" ${c.id===cityId?"selected":""}>${E(c.name)} · ${E(c.state)}${!c.active?" (não publicado)":""}</option>`).join("")}</select>${adminMode?`<span class="pill">${platform?"Superadmin":memberMap.get(cityId)?.role==="admin"?"Administrador municipal":"Editor setorial"}</span>`:""}</div>`;
 const sections=()=>`<div class="portal-module-list">${MODULES.filter(approved).map(m=>`<button type="button" class="portal-module ${section===m.id?"active":""}" data-portal-module="${m.id}">${card(m)}<span><strong>${E(m.name)}</strong><small>${E(m.description)}</small></span>${adminMode?`<span class="license-badge ${enabled(m)?"good":"neutral"}">${enabled(m)?"Ativo":"Desligado"}</span>`:""}<span aria-hidden="true">›</span></button>`).join("")}</div>`;
 const currentEntries=()=>entries.filter(x=>x.moduleKey===section);
 const contents=(items=currentEntries())=>items.length?`<div class="data-grid">${items.map(x=>`<article class="data-card"><div class="data-card-top">${card(activeSection())}<span class="pill">${x.published?"Publicado":"Rascunho"}</span></div><h3>${E(x.title)}</h3><p class="data-caption">${E(x.description||"")}</p>${x.details?`<div class="data-detail"><strong>Informações</strong><span>${E(x.details)}</span></div>`:""}${x.hours?`<div class="data-detail"><strong>Horários</strong><span>${E(x.hours)}</span></div>`:""}${x.address?`<div class="data-detail"><strong>Local</strong><span>${E(x.address)}</span></div>`:""}${x.phone?`<div class="data-detail"><strong>Contato</strong><span>${E(x.phone)}</span></div>`:""}${section==="campanhas"&&posterUrl(x.link)?`<img class="portal-poster" loading="lazy" referrerpolicy="no-referrer" src="${E(posterUrl(x.link))}" alt="Cartaz do aviso: ${E(x.title)}">`:""}${validPublicUrl(x.link)?`<a class="text-link" href="${E(validPublicUrl(x.link))}" target="_blank" rel="noopener noreferrer">${section==="campanhas"?"Abrir cartaz ou link":"Abrir link público"} ↗</a>`:""}${adminMode?`<div class="data-card-actions"><button class="btn btn-outline" type="button" data-portal-edit="${E(x.id)}">Editar</button><button class="btn btn-outline" type="button" data-portal-publish="${E(x.id)}">${x.published?"Retirar do ar":"Publicar"}</button></div>`:""}</article>`).join("")}</div>`:empty("Nenhuma informação cadastrada","Este módulo começa vazio. A equipe responsável poderá cadastrar e publicar informações posteriormente.");
 const esfView=()=>{
  const all=currentEntries();
  const summary=summarizeEsf(all);
  const text=esfQuery.trim().toLocaleLowerCase("pt-BR");
  const hits=all.filter(x=>[x.title,x.address,x.hours,x.details,x.description].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(text)));
  return `<section class="portal-overview-grid"><div class="panel"><span class="section-kicker">UNIDADES CADASTRADAS</span><strong>${summary.total}</strong></div>
  ${adminMode?`<div class="panel"><span class="section-kicker">PUBLICADAS</span><strong>${summary.published}</strong></div><div class="panel"><span class="section-kicker">SEM HORÁRIO</span><strong>${summary.missingHours}</strong></div>`:""}</section>
  <div class="portal-directory-toolbar"><label for="esfSearch">Buscar posto, bairro ou equipe</label><input type="search" id="esfSearch" placeholder="Pesquisar unidades..." value="${E(esfQuery)}"></div>
  <div id="esfResults">${contents(hits)}</div>`;
 };
 const noticeHighlight=()=>{
  const list=visibleNotices(entries);
  if(!list.length)return "";
  const item=list[0];
  return `<section class="portal-highlight">
    <span class="section-kicker">AVISO EM DESTAQUE</span>
    <h3>${E(item.title)}</h3><p>${E(item.description||"")}</p>
    ${posterUrl(item.link)?`<button class="btn btn-outline" type="button" data-notice-show="${E(item.id)}">Visualizar cartaz</button>`:""}
  </section>`;
 };
 const maybeShowNotice=()=>{
  if(adminMode||!isAlive()||loading||!enabled(MODULE_BY_ID.campanhas))return;
  const notice=visibleNotices(noticesFeed).find(item=>posterUrl(item.link));
  if(!notice)return;
  const key=noticeSeenKey(cityId,notice.id,notice.updatedAt);
  try{if(localStorage.getItem(key)==="1")return;}catch{}
  if(noticeWindowKey===key)return;
  const popup=root.querySelector("#portalNoticeDialog");
  if(!popup||typeof popup.showModal!=="function")return;
  noticeWindowKey=key;
  popup.querySelector("[data-notice-title]").textContent=notice.title;
  popup.querySelector("[data-notice-text]").textContent=notice.description||"";
  const img=popup.querySelector("[data-notice-image]");
  img.src=posterUrl(notice.link);
  img.alt="Cartaz: "+notice.title;
  popup.dataset.noticeKey=key;
  popup.showModal();
  popup.addEventListener("close",()=>{
   try{localStorage.setItem(key,"1");}catch{}
  },{once:true});
 };
 const editForm=()=>{
  const item=entries.find(x=>x.id===editing)||{};
  return `<section class="form-panel" id="portalEdit"><span class="section-kicker">CADASTRO MUNICIPAL</span><h2>${item.id?"Editar informação":"Cadastrar informação"}</h2><form class="module-form" id="portalContentForm">${formInput(section==="esf"?"Nome do posto / ESF *":"Título *","title",item.title||"",100,"text",true)}${formInput(section==="esf"?"Horário de atendimento":"Horário / escala","hours",item.hours||"",160)}${formInput(section==="esf"?"Endereço da unidade":"Local / endereço","address",item.address||"",180)}${formInput("Telefone institucional","phone",item.phone||"",50)}${formInput(section==="campanhas"?"URL HTTPS do cartaz (PNG, JPG ou WEBP)":"Link público HTTPS","link",item.link||"",300)}<div class="input-field field-wide"><label for="portal_description">Resumo</label><textarea id="portal_description" name="description" maxlength="600" rows="3">${E(item.description||"")}</textarea></div><div class="input-field field-wide"><label for="portal_details">${section==="esf"?"Médico responsável e informações da equipe":"Informações adicionais"}</label><textarea id="portal_details" name="details" maxlength="1000" rows="4">${E(item.details||"")}</textarea></div><label class="admin-toggle field-wide"><input type="checkbox" name="published" ${item.published?"checked":""}> Disponibilizar no portal público</label><div class="form-actions"><button class="btn btn-solid" type="submit">Salvar informação</button><button class="btn btn-outline" type="button" data-portal-action="cancel-edit">Cancelar</button></div></form></section>`;
 };
 const upaView=()=>{
  if(!status&&!adminMode)return empty("A UPA ainda não publicou informações","A fila, a equipe de plantão e a escala serão exibidas após cadastro e publicação pela gestão.");
  const operational=normalizeOperationalInfo(status);
  const queue=operational.queue,room=operational.roomStatus,week=operational.week;
  return `<section class="portal-upa-grid"><div class="panel"><span class="section-kicker">FILA INFORMADA PELA UNIDADE</span><h2>${queue===null?"A confirmar":String(queue)}</h2><p class="module-caption">Quantidade informada manualmente pela equipe. Não representa previsão de espera nem classificação de risco.</p>
  ${adminMode&&queue!==null?`<div class="portal-queue-actions"><button class="btn btn-outline" type="button" data-queue-step="-1" ${queue===0?"disabled":""} aria-label="Registrar saída da fila">− Saída</button><button class="btn btn-solid" type="button" data-queue-step="1" ${queue===9999?"disabled":""} aria-label="Registrar entrada na fila">+ Entrada</button></div><p class="module-caption">Os ajustes são sincronizados com o Firestore; utilize apenas contagem operacional agregada.</p>`:""}</div><div class="panel"><span class="section-kicker">SITUAÇÃO DA SALA VERMELHA</span><h2>${room==="available"?"Informada como disponível":room==="occupied"?"Informada como ocupada":"Não informada"}</h2><p class="module-caption">Não indica disponibilidade de leitos nem substitui orientação de urgência.</p></div></section>
  <div class="data-grid"><div class="panel"><h3>Clínico de plantão</h3><p>${E(status?.clinician||"Não informado")}</p></div><div class="panel"><h3>Pediatria</h3><p>${E(status?.pediatrician||"Não informado")}</p></div><div class="panel"><h3>Atualização</h3><p>${status?.updatedAt?.toDate?.().toLocaleString("pt-BR")||"Não informada"}</p></div></div>
  ${!status&&adminMode?'<div class="disclaimer">Ainda não há situação cadastrada para a UPA deste município. Preencha e salve o formulário abaixo para iniciar o acompanhamento.</div>':""}
  ${block("Escala semanal",`<div class="portal-week">${WEEK_DAYS.map(([key,label])=>`<div><strong>${label}</strong><span>${E(week[key]||"Não informado")}</span></div>`).join("")}</div>`)}
  ${adminMode?`<section class="form-panel"><h2>Atualizar dados da UPA</h2><form class="module-form" id="portalUpaForm"><div class="input-field"><label for="portal_queue">Quantidade atual na fila</label><input type="number" min="0" max="9999" name="queue" id="portal_queue" placeholder="Deixe vazio se não houver informação" value="${queue===null?"":queue}"></div><div class="input-field"><label for="portal_room">Sala vermelha (informação administrativa)</label><select id="portal_room" name="roomStatus"><option value="unknown" ${room==="unknown"?"selected":""}>Não informada</option><option value="available" ${room==="available"?"selected":""}>Informada como disponível</option><option value="occupied" ${room==="occupied"?"selected":""}>Informada como ocupada</option></select></div>${formInput("Clínico de plantão","clinician",status?.clinician||"",100)}${formInput("Pediatria","pediatrician",status?.pediatrician||"",100)}${WEEK_DAYS.map(([key,label])=>formInput(label,key,week[key]||"",160)).join("")}<label class="admin-toggle field-wide"><input type="checkbox" name="published" ${status?.published?"checked":""}> Publicar informações de plantão</label><div class="form-actions"><button class="btn btn-solid" type="submit">Salvar situação da UPA</button></div></form></section>`:""}`;
 };
 const safeGuidance=()=>`<div class="disclaimer"><strong>Orientação, não triagem médica.</strong> Este espaço não avalia gravidade, não faz diagnóstico nem decide prioridade de atendimento. Em situações graves, procure atendimento de urgência imediatamente; no Brasil, SAMU 192.</div>${contents()}`;
 const infoRequest=kind=>kind==="appointment"?
 `<div class="disclaimer">Este pedido é apenas uma solicitação de contato/consulta, não um agendamento confirmado. Não envie sintomas, documentos ou informações clínicas. Em urgência, procure atendimento imediatamente.</div>`:
 `<div class="disclaimer">Inscrição de interesse em curso. A participação depende de confirmação pela organização responsável.</div>`;
 const requestsView=kind=>{
  const isAppointment=kind==="appointment";
  const col=isAppointment?"appointmentRequests":"courseRegistrations";
  const choices=entries.filter(x=>x.published);
  const mine=requests.filter(r=>r.ownerUid===user?.uid);
  const listed=adminMode?(requestFilter==="all"?requests:requests.filter(r=>r.status===requestFilter)):mine;
  return `${infoRequest(kind)}
  ${!adminMode?`<section class="panel"><h3>${isAppointment?"Solicitar atendimento":"Inscrever-se em curso"}</h3>${user?choices.length?`<form id="portalRequestForm" class="module-form"><div class="input-field field-wide"><label for="portal_target">${isAppointment?"Unidade de referência":"Curso"}</label><select name="targetId" id="portal_target" required><option value="">Escolha uma opção</option>${choices.map(x=>`<option value="${E(x.id)}">${E(x.title)}</option>`).join("")}</select></div><div class="form-actions"><button class="btn btn-solid" type="submit">${isAppointment?"Enviar solicitação":"Registrar interesse"}</button></div></form>`:"<p>Não há opções publicadas. A equipe precisa cadastrar uma unidade ou curso primeiro.</p>":`<p>Entre para acompanhar solicitações vinculadas à sua conta.</p><button type="button" class="btn btn-solid" data-portal-action="sign-in">Entrar com Google</button> <a class="btn btn-outline" href="#conta">Entrar com e-mail</a>`}</section>`:""}
  ${adminMode?`<section class="portal-overview-grid">
    ${Object.entries(countRequestStatuses(requests)).map(([key,value])=>`<div class="panel"><span class="section-kicker">${statusLabel(key)}</span><strong>${value}</strong></div>`).join("")}
    </section>`:""}
  ${adminMode?`<div class="portal-directory-toolbar"><label for="requestStatusFilter">Filtrar por andamento</label><select id="requestStatusFilter"><option value="all" ${requestFilter==="all"?"selected":""}>Todas as solicitações</option>${["pending","confirmed","completed","canceled"].map(s=>`<option value="${s}" ${requestFilter===s?"selected":""}>${statusLabel(s)}</option>`).join("")}</select></div>`:""}
  ${block(adminMode?"Solicitações recebidas":"Minhas solicitações",listed.length?`<div class="portal-request-list">${listed.map(r=>`<article class="portal-request"><div><strong>${E(choices.find(c=>c.id===r.targetId)?.title||"Item cadastrado")}</strong><p>${statusLabel(r.status)} · ${r.createdAt?.toDate?.().toLocaleString("pt-BR")||"Recentemente"}</p>${adminMode?`<small>ID da conta: ${E(r.ownerUid)}</small>`:""}</div>${adminMode?`<select data-request-id="${E(r.id)}" aria-label="Atualizar andamento"><option value="pending" ${r.status==="pending"?"selected":""}>Pendente</option><option value="confirmed" ${r.status==="confirmed"?"selected":""}>Confirmado</option><option value="completed" ${r.status==="completed"?"selected":""}>Concluído</option><option value="canceled" ${r.status==="canceled"?"selected":""}>Cancelado</option></select>`:r.status==="pending"?`<button class="btn btn-outline" type="button" data-portal-cancel="${E(r.id)}">Cancelar</button>`:""}</article>`).join("")}</div>`:"<p>Nenhuma solicitação registrada.</p>")}
  ${contents()}`;
 };
 const dashboard=()=>{
  const m=activeSection();
  return `${header(adminMode?"Gerenciar módulos do município":"Serviços do município",adminMode?"Cadastre e publique informações. Os módulos começam vazios e podem ser ativados individualmente.":"Consulte apenas informações publicadas pela organização responsável.",adminMode?"PAINEL ADMINISTRATIVO":"SERVIÇOS PARA A POPULAÇÃO")}
   ${chooseCity()}
   ${adminMode?`<div class="notice"><span class="notice-icon">ⓘ</span><div>Dados separados por município. A gravação requer uma licença vigente e as permissões adequadas no Firebase. Nenhum conteúdo de Pontalina foi importado.</div></div>`:""}
   <div class="portal-shell"><aside class="panel portal-nav"><h3>Módulos</h3>${sections()}</aside><div class="portal-content">
    ${m?`<div class="portal-heading"><div>${card(m)}<div><span class="section-kicker">${E(m.group)}</span><h2>${E(m.name)}</h2><p>${E(m.description)}</p></div></div>${adminMode&&manager()?`<button class="btn btn-outline" type="button" data-portal-action="toggle-module">${enabled(m)?"Desativar módulo":"Ativar módulo"}</button>`:""}</div>
      ${statusMessage?`<div class="notice"><span class="notice-icon">ⓘ</span><div>${E(statusMessage)}</div></div>`:""}
      ${m.special==="upa"?upaView():m.id==="esf"?esfView():m.id==="campanhas"?`${noticeHighlight()}${contents()}`:m.special==="guidance"?safeGuidance():m.special==="appointments"?requestsView("appointment"):m.special==="enrollments"?requestsView("course"):contents()}
      ${adminMode&&m.special!=="upa"&&m.special!=="guidance"?`<div class="module-toolbar"><button class="btn btn-solid" type="button" data-portal-action="create">+ ${m.special==="enrollments"?"Cadastrar curso":m.special==="appointments"?"Cadastrar opção de atendimento":"Cadastrar informação"}</button>${m.id==="campanhas"&&entries.some(x=>x.published)?'<button class="btn btn-outline" type="button" data-portal-action="unpublish-all">Retirar todos do ar</button>':""}</div>`:""}
      ${adminMode&&editing!==null&&m.special!=="upa"&&m.special!=="guidance"?editForm():""}
      ${adminMode&&m.special==="guidance"?`<div class="module-toolbar"><button class="btn btn-solid" data-portal-action="create" type="button">+ Cadastrar orientação revisada</button></div>${editing!==null?editForm():""}`:""}
      `:empty("Escolha um módulo","Selecione uma das áreas para visualizar os recursos disponíveis.")}
   </div></div>
   ${!adminMode?`<dialog class="portal-notice-dialog" id="portalNoticeDialog" aria-label="Aviso importante"><div class="portal-notice-modal"><div class="portal-notice-top"><span class="section-kicker">COMUNICADO IMPORTANTE</span><button class="btn btn-outline" type="button" data-portal-action="dismiss-notice" aria-label="Fechar aviso">×</button></div><h2 data-notice-title></h2><p data-notice-text></p><img data-notice-image referrerpolicy="no-referrer" alt=""><button class="btn btn-solid" type="button" data-portal-action="dismiss-notice">Entendi, fechar aviso</button></div></dialog>`:""}`;
 };
 const render=()=>{
  if(!isAlive())return;
  if(loading){root.innerHTML=loadingView();return;}
  if(error){root.innerHTML=`${header("Consulta indisponível","Não conseguimos carregar a rede municipal.")}<div class="disclaimer">${E(error)}</div><button class="btn btn-outline" data-portal-action="retry">Tentar novamente</button>`;return;}
  if(adminMode&&!user){root.innerHTML=`${header("Administração de módulos","Entre com uma conta autorizada para gerenciar serviços municipais.")}<div class="panel admin-intro"><h2>Conta de administrador</h2><p>O Google identifica você, mas o Firestore é quem autoriza alterações.</p><button class="btn btn-solid" data-portal-action="sign-in">Entrar com Google</button></div>`;return;}
  if(!cities.length){root.innerHTML=`${header("Nenhum município disponível","Ainda não há municípios configurados para esta área.")}<div class="empty-state"><strong>O sistema está em branco</strong><p>Cadastre seu primeiro município na Administração. Nenhuma unidade ou serviço é criado automaticamente.</p>${adminMode?'<a href="#administracao" class="btn btn-solid">Cadastrar município ↗</a>':""}</div>`;return;}
  renderDashboard();
 };
 const renderDashboard=()=>{if(isAlive()){root.innerHTML=dashboard();maybeShowNotice();}};
 const loadAccess=async()=>{
  stopLive();
  const gen=++latest;loading=true;error="";render();
  try{
   let canSeeAll=false;
   if(adminMode&&user){const adminRecord=await getDoc(doc(db,"platformAdmins",user.uid));canSeeAll=adminRecord.exists()&&adminRecord.data().enabled===true;}
   const snap=await getDocs(adminMode&&canSeeAll?collection(db,"municipalities"):query(collection(db,"municipalities"),where("active","==",true)));
   if(!isAlive()||gen!==latest)return;
   platform=canSeeAll;
   const raw=snap.docs.map(d=>({id:d.id,...d.data()}));
   memberMap=new Map();
   if(adminMode&&!platform){
    const pairs=await Promise.all(raw.map(async city=>{
     try{
      const member=await getDoc(doc(db,"municipalities",city.id,"members",user.uid));
      if(member.exists()&&member.data().enabled&&["admin","editor"].includes(member.data().role)){
       memberMap.set(city.id,member.data());return city;
      }
      return null;
     }catch{return null;}
    }));
    cities=pairs.filter(Boolean);
   }else cities=raw;
   cities.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
   const preferred=(()=>{try{return localStorage.getItem(cityKey)}catch{return null}})();
   if(!cities.some(c=>c.id===cityId))cityId=cities.some(c=>c.id===preferred)?preferred:cities[0]?.id||"";
   if(cityId)await loadSettings();
   else{loading=false;render();}
  }catch(e){error=errorText(e);loading=false;render();}
 };
 const loadSettings=async()=>{
  stopLive();
  const gen=++latest;loading=true;statusMessage="";render();
  try{
   const snap=await getDocs(adminMode?collection(db,"municipalities",cityId,"moduleSettings"):query(collection(db,"municipalities",cityId,"moduleSettings"),where("enabled","==",true)));
   if(!isAlive()||gen!==latest)return;
   settings=new Map(snap.docs.map(d=>[d.id,d.data()]));
   if(!MODULE_BY_ID[section]||!approved(MODULE_BY_ID[section]))section=MODULES.find(m=>approved(m))?.id||"";
   await loadSection();
  }catch(e){error=errorText(e);loading=false;render();}
 };
 const subscribeLive=()=>{
  stopLive();
  if(!section || !cityId)return;
  const observedCity=cityId,observedSection=section;
  const onCurrent=()=>isAlive()&&observedCity===cityId&&observedSection===section;
  const itemQuery=adminMode?modulePath(cityId,section):query(modulePath(cityId,section),where("published","==",true));
  unsubscribeItems=onSnapshot(itemQuery,snapshot=>{
   if(!onCurrent())return;
   entries=snapshot.docs.map(x=>({id:x.id,moduleKey:observedSection,...x.data()}))
    .sort((a,b)=>(a.title||"").localeCompare(b.title||"","pt-BR"));
   if(!loading&&editing===null&&!root.querySelector("form:focus-within"))render();
  },e=>{if(onCurrent())console.warn("Sincronização de itens:",e?.code||e);});
  if(!adminMode&&enabled(MODULE_BY_ID.campanhas)){
   unsubscribeNotices=onSnapshot(query(modulePath(cityId,"campanhas"),where("published","==",true)),snapshot=>{
    if(!onCurrent())return;
    noticesFeed=snapshot.docs.map(d=>({id:d.id,...d.data()}));
    maybeShowNotice();
   },e=>{if(onCurrent())console.warn("Avisos públicos:",e?.code||e);});
  }
  if(section==="upa"){
   unsubscribeUpa=onSnapshot(doc(db,"municipalities",cityId,"moduleStatus","upa"),snapshot=>{
    if(!onCurrent())return;
    status=snapshot.exists()&&(adminMode||snapshot.data().published)?snapshot.data():null;
    // Não sobrescreve dados que o profissional esteja digitando no formulário.
    const form=root.querySelector("#portalUpaForm");
    if(!loading&&(!form||!form.contains(document.activeElement)))render();
   },e=>{if(onCurrent())console.warn("Sincronização da UPA:",e?.code||e);});
  }
 };
 const loadSection=async()=>{
  stopLive();
  const gen=++latest;loading=true;editing=null;render();
  if(!section){entries=[];status=null;requests=[];loading=false;render();return;}
  if(adminMode&&!canUse(activeSection())){error="Este módulo não foi autorizado para seu perfil.";loading=false;render();return;}
  try{
   const m=activeSection();
   const items=await getDocs(adminMode?modulePath(cityId,section):query(modulePath(cityId,section),where("published","==",true)));
   if(!isAlive()||gen!==latest)return;
   entries=items.docs.map(x=>({id:x.id,moduleKey:section,...x.data()})).sort((a,b)=>(a.title||"").localeCompare(b.title||"","pt-BR"));
   if(m.special==="upa"){
    let s=null;
    try{s=await getDoc(doc(db,"municipalities",cityId,"moduleStatus","upa"));}catch(e){if(adminMode)throw e;}
    status=s?.exists() && (adminMode||s.data().published)?s.data():null;
   }else status=null;
   if(m.special==="appointments"||m.special==="enrollments"){
    const col=m.special==="appointments"?"appointmentRequests":"courseRegistrations";
    const src=adminMode?collection(db,"municipalities",cityId,col):user?query(collection(db,"municipalities",cityId,col),where("ownerUid","==",user.uid)):null;
    const results=src?await getDocs(src):null;
    requests=results?.docs.map(d=>({id:d.id,...d.data()}))||[];
   }else requests=[];
   if(!isAlive()||gen!==latest)return;
   loading=false;render();subscribeLive();
  }catch(e){error=errorText(e);loading=false;render();}
 };
 const execute=async(fn)=>{
  if(!isAlive()||busy||(adminMode&&!canUse(activeSection())))return;
  busy=true;
  try{await fn();await loadSection();inform("Informações atualizadas.");}
  catch(e){statusMessage=errorText(e);inform(statusMessage);loading=false;render();}
  finally{busy=false;}
 };
 const submit=event=>{
  const form=event.target;
  if(!["portalContentForm","portalUpaForm","portalRequestForm"].includes(form.id))return;
  event.preventDefault();
  if(!form.reportValidity())return;
  if(form.id==="portalContentForm"){
   const fd=new FormData(form),title=String(fd.get("title")||"").trim().slice(0,100),link=String(fd.get("link")||"").trim();
   if(!title||link&&!validPublicUrl(link)){informSafe("Título obrigatório e links precisam começar com https://.");return;}
   const data={title,moduleKey:section,description:String(fd.get("description")||"").trim().slice(0,600),details:String(fd.get("details")||"").trim().slice(0,1000),address:String(fd.get("address")||"").trim().slice(0,180),phone:String(fd.get("phone")||"").trim().slice(0,50),hours:String(fd.get("hours")||"").trim().slice(0,160),link:validPublicUrl(link),published:fd.has("published"),updatedAt:serverTimestamp()};
   const original=entries.find(x=>x.id===editing);
   void execute(async()=>{
    if(original)await updateDoc(doc(db,"municipalities",cityId,"moduleEntries",section,"items",original.id),data);
    else await addDoc(modulePath(cityId,section),{...data,createdAt:serverTimestamp()});
   });
  }
  if(form.id==="portalUpaForm"){
   const fd=new FormData(form),raw=String(fd.get("queue")||"").trim();
   const queue=raw===""?null:Number(raw);
   if(queue!==null&&(!Number.isInteger(queue)||queue<0||queue>9999)){informSafe("Informe um valor de fila entre 0 e 9999, ou deixe vazio.");return;}
   const week=Object.fromEntries(WEEK_DAYS.map(([key])=>[key,String(fd.get(key)||"").trim().slice(0,160)]));
   void execute(async()=>await setDoc(doc(db,"municipalities",cityId,"moduleStatus","upa"),{queue,roomStatus:fd.get("roomStatus")||"unknown",clinician:String(fd.get("clinician")||"").trim().slice(0,100),pediatrician:String(fd.get("pediatrician")||"").trim().slice(0,100),week,published:fd.has("published"),updatedAt:serverTimestamp()}));
  }
  if(form.id==="portalRequestForm"){
   if(!user){informSafe("Entre com Google para continuar.");return;}
   const targetId=String(new FormData(form).get("targetId")||"");
   if(!entries.some(e=>e.id===targetId&&e.published)){informSafe("Selecione uma opção publicada.");return;}
   const col=section==="agendamentos"?"appointmentRequests":"courseRegistrations";
   if(requests.some(r=>r.ownerUid===user.uid&&r.targetId===targetId&&["pending","confirmed"].includes(r.status))){
    informSafe("Você já possui uma solicitação pendente ou confirmada para esta opção.");return;
   }
   void execute(async()=>{
    const data={ownerUid:user.uid,targetId,status:"pending",createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    if(section==="cetec"){
     // Uma inscrição por conta e curso, como no ConecteBR.
     await setDoc(doc(db,"municipalities",cityId,col,user.uid+"_"+targetId),data);
    }else await addDoc(collection(db,"municipalities",cityId,col),data);
   });
  }
 };
 const click=event=>{
  const showButton=event.target.closest("[data-notice-show]");
  if(showButton&&!adminMode){
   const item=entries.find(x=>x.id===showButton.dataset.noticeShow);
   const image=item&&posterUrl(item.link);
   if(!image)return;
   let popup=root.querySelector("#portalNoticeDialog");if(!popup)return;
   popup.querySelector("[data-notice-title]").textContent=item.title;
   popup.querySelector("[data-notice-text]").textContent=item.description||"";
   popup.querySelector("[data-notice-image]").src=image;
   popup.querySelector("[data-notice-image]").alt="Cartaz: "+item.title;
   popup.dataset.noticeKey=noticeSeenKey(cityId,item.id,item.updatedAt);
   popup.showModal();return;
  }
  const queueButton=event.target.closest("[data-queue-step]");
  if(queueButton&&adminMode&&section==="upa"){
   if(!status){informSafe("Cadastre e salve a situação da UPA antes de ajustar a fila.");return;}
   const step=Number(queueButton.dataset.queueStep);
   if(nextQueueValue(normalizeOperationalInfo(status).queue,step)===null){informSafe("Contagem fora do intervalo permitido.");return;}
   queueButton.disabled=true;
   const cityAtClick=cityId;
   void execute(async()=>await runTransaction(db,async tx=>{
    const ref=doc(db,"municipalities",cityAtClick,"moduleStatus","upa");
    const snap=await tx.get(ref);
    if(!snap.exists())throw Error("Cadastre os dados da UPA antes de atualizar a fila.");
    const next=nextQueueValue(normalizeOperationalInfo(snap.data()).queue,step);
    if(next===null)throw Error("Fila fora do intervalo permitido. Atualize e tente novamente.");
    tx.update(ref,{queue:next,updatedAt:serverTimestamp()});
   }));
   return;
  }
  const module=event.target.closest("[data-portal-module]");
  if(module){const next=MODULE_BY_ID[module.dataset.portalModule];if(!next||!approved(next))return;section=next.id;esfQuery="";requestFilter="all";statusMessage="";void loadSection();return;}
  const item=event.target.closest("[data-portal-edit]");
  if(item){editing=item.dataset.portalEdit;render();root.querySelector("#portalEdit")?.scrollIntoView({behavior:"smooth",block:"nearest"});return;}
  const publish=event.target.closest("[data-portal-publish]");
  if(publish){const x=entries.find(e=>e.id===publish.dataset.portalPublish);if(x)void execute(async()=>await updateDoc(doc(db,"municipalities",cityId,"moduleEntries",section,"items",x.id),{published:!x.published,updatedAt:serverTimestamp()}));return;}
  const cancel=event.target.closest("[data-portal-cancel]");
  if(cancel){if(!user)return;const col=section==="agendamentos"?"appointmentRequests":"courseRegistrations";void execute(async()=>await updateDoc(doc(db,"municipalities",cityId,col,cancel.dataset.portalCancel),{status:"canceled",updatedAt:serverTimestamp()}));return;}
  const action=event.target.closest("[data-portal-action]")?.dataset.portalAction;
  if(!action)return;
  if(action==="dismiss-notice"){
   const popup=root.querySelector("#portalNoticeDialog");
   if(popup?.open){try{localStorage.setItem(popup.dataset.noticeKey,"1");}catch{}popup.close();}
   return;
  }
  if(action==="unpublish-all"&&adminMode&&canUse(activeSection())&&section==="campanhas"){
   const active=entries.filter(x=>x.published);
   if(!active.length)return;
   if(!window.confirm("Retirar todos os avisos deste município do portal? Os registros serão preservados."))return;
   void execute(async()=>{
    for(let i=0;i<active.length;i+=400){
      const batch=writeBatch(db);
      for(const item of active.slice(i,i+400)){
        batch.update(doc(db,"municipalities",cityId,"moduleEntries","campanhas","items",item.id),{published:false,updatedAt:serverTimestamp()});
      }
      await batch.commit();
    }
   });
   return;
  }
  if(action==="create"){editing="";render();root.querySelector("#portalEdit")?.scrollIntoView({behavior:"smooth",block:"nearest"});}
  if(action==="cancel-edit"){editing=null;render();}
  if(action==="retry")void loadAccess();
  if(action==="sign-in")void signInWithPopup(auth,provider).catch(e=>informSafe(errorText(e)));
  if(action==="toggle-module"){
   const m=activeSection();if(!m||!adminMode||!manager())return;
   const next=!enabled(m);
   void (async()=>{try{
    await setDoc(doc(db,"municipalities",cityId,"moduleSettings",section),{enabled:next,updatedAt:serverTimestamp()});
    await loadSettings();inform(next?"Módulo ativado.":"Módulo desativado.");
   }catch(e){informSafe(errorText(e));render();}})();
  }
 };
 const input=event=>{
  if(event.target.id!=="esfSearch")return;
  esfQuery=event.target.value;
  const term=esfQuery.trim().toLocaleLowerCase("pt-BR");
  const hits=currentEntries().filter(x=>[x.title,x.address,x.hours,x.details,x.description].some(v=>String(v||"").toLocaleLowerCase("pt-BR").includes(term)));
  const container=root.querySelector("#esfResults");if(container)container.innerHTML=contents(hits);
 };
 const change=event=>{
  if(event.target.id==="requestStatusFilter"&&adminMode){requestFilter=event.target.value;render();return;}
  if(event.target.id==="portal_city"){stopLive();cityId=event.target.value;try{localStorage.setItem(cityKey,cityId)}catch{}section="";esfQuery="";void loadSettings();}
  const select=event.target.closest("[data-request-id]");
  if(select&&adminMode){
   const id=select.dataset.requestId,col=section==="agendamentos"?"appointmentRequests":"courseRegistrations";
   const r=requests.find(x=>x.id===id);
   if(!r||!["pending","confirmed","completed","canceled"].includes(select.value))return;
   void execute(async()=>await updateDoc(doc(db,"municipalities",cityId,col,id),{status:select.value,updatedAt:serverTimestamp()}));
  }
 };
 root.addEventListener("click",click,{signal});
 root.addEventListener("submit",submit,{signal});
 root.addEventListener("change",change,{signal});
 root.addEventListener("input",input,{signal});
 const unsub=onAuthStateChanged(auth,async value=>{
  if(!isAlive())return;
  const oldId=user?.uid||null;
  user=value;
  if(adminMode&&oldId!==user?.uid){void loadAccess();return;}
  if(!adminMode&&cities.length&&(section==="agendamentos"||section==="cetec"))void loadSection();
 });
 signal?.addEventListener("abort",()=>{++latest;stopLive();unsub();},{once:true});
 void loadAccess();
}