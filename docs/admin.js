// Administração inicial: conteúdo PÚBLICO (unidades, avisos e ações).
// Auth Google + Firestore; permissões e isolamento dependem das firestore.rules.
import {auth,db} from "./firebase.js";
import {explainFirebaseError} from "./auth-errors.js";
import {ACCESS_GROUPS,normalizedGrants,canManageModules,adminTabGranted} from "./sector-access.js";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {addDoc,collection,doc,getDoc,getDocs,query,setDoc,updateDoc,serverTimestamp,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const categories={units:"Unidades",notices:"Avisos",events:"Ações"};
const types=["UBS","UPA","Farmácia","Laboratório","Outro"];
const kinds=["Comunicado","Campanha","Serviço","Evento"];
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});

let target=null,toast=()=>{},user=null,isPlatformAdmin=false, cities=[], cityId="",tab="units",records=[],members=[],editId=null,unsub=null,hasInitialized=false,loading=false,notice="",loadSeq=0,memberMap=new Map(),memberEdit=null;
const head=()=>`<div class="page-heading"><div><span class="section-kicker">ADMINISTRAÇÃO SEGURA</span><h1>Central de gerenciamento</h1><p>Organize informações públicas por município. Nesta etapa não são permitidos prontuários, documentos de pacientes nem informações clínicas.</p></div><span class="pill">Acesso restrito</span></div>`;
const feedback=message=>{notice=message;toast(message)};
const err=error=>`${error.code||"Erro"}: ${error.message||"Não foi possível concluir a operação."}`;
const formField=(label,id,value,max=120,required=true)=>`<div class="input-field"><label for="${id}">${label}</label><input id="${id}" name="${id}" value="${esc(value||"")}" maxlength="${max}" ${required?"required":""}></div>`;
const areaField=(label,id,value,max=600)=>`<div class="input-field field-wide"><label for="${id}">${label}</label><textarea id="${id}" name="${id}" maxlength="${max}" rows="4">${esc(value||"")}</textarea></div>`;
function identity(){
 return `<div class="admin-identity"><div><strong>${esc(user.displayName||"Conta Google")}</strong><p>${esc(user.email||"")} · UID: <code>${esc(user.uid)}</code></p></div><button type="button" class="btn btn-outline" data-admin="logout">Sair</button></div>`;
}
function signInScreen(){
 return `${head()}<div class="panel admin-intro"><span class="module-bubble">🔒</span><h2>Entre com uma conta autorizada</h2><p>O login Google identifica você, mas não concede permissão automaticamente. O acesso é liberado somente para administradores cadastrados no Firestore.</p><button class="btn btn-solid" type="button" data-admin="login">Entrar com Google</button><p class="module-caption">Para entrar pelo GitHub Pages, habilite Google no Firebase Authentication e autorize o domínio <code>99eliel.github.io</code>.</p></div>${notice?`<div class="disclaimer">${esc(notice)}</div>`:""}`;
}
function restrictedScreen(){
 return `${head()}${identity()}<div class="disclaimer"><strong>Esta conta ainda não tem autorização.</strong> Seu UID aparece acima. Um administrador autorizado precisa cadastrar esse UID em <code>platformAdmins</code> ou como membro de um município. Sem isso, nenhum conteúdo pode ser alterado.</div>${notice?`<p class="module-caption">${esc(notice)}</p>`:""}`;
}
function chooseCity(){
 return `<div class="admin-top"><div class="input-field"><label for="adminCity">Município</label><select id="adminCity">${cities.map(c=>`<option value="${esc(c.id)}" ${cityId===c.id?"selected":""}>${esc(c.name)} · ${esc(c.state)}${c.active?"":" (inativo)"}</option>`).join("")}</select></div><div class="admin-top-status">${isPlatformAdmin?"Administrador da plataforma":"Equipe municipal"} · informações públicas</div></div>`;
}
function addCityForm(){
 return `<details class="panel admin-accordion"><summary>+ Cadastrar município</summary><form id="newCityForm" class="module-form">${formField("Nome do município *","cityName","",85)}<div class="input-field"><label for="cityState">UF *</label><input id="cityState" name="cityState" maxlength="2" minlength="2" pattern="[A-Za-z]{2}" placeholder="GO" required></div><div class="form-actions"><button class="btn btn-solid" type="submit">Criar município inativo</button></div></form><p class="module-caption">Após o cadastro, ative o município quando as informações estiverem prontas para publicação.</p></details>`;
}
function tabs(){
 const member=memberMap.get(cityId);
 return `<div class="filter-bar" role="group" aria-label="Gerenciamento">${Object.entries(categories).filter(([value])=>adminTabGranted({isPlatformAdmin,member,tab:value})).map(([value,label])=>`<button type="button" class="filter-btn ${tab===value?"active":""}" data-admin-tab="${value}" aria-pressed="${tab===value}">${label}</button>`).join("")}${isPlatformAdmin?`<button type="button" class="filter-btn ${tab==="members"?"active":""}" data-admin-tab="members" aria-pressed="${tab==="members"}">Acessos</button>`:""}</div>`;
}
function recordCard(r){
 const title=r.name||r.title||"Registro";
 const subtitle=tab==="units"?`${r.type||""} · ${r.address||"Endereço não informado"}`:tab==="events"?`${r.date||"Data não informada"} · ${r.place||"Local não informado"}`:r.description||"";
 return `<article class="data-card"><div class="data-card-top"><span class="module-bubble">${tab==="units"?"🏥":tab==="notices"?"📣":"🗓️"}</span><span class="pill">${r.published?"Publicado":"Rascunho"}</span></div><h3>${esc(title)}</h3><p class="data-caption">${esc(subtitle)}</p><div class="data-card-actions"><button type="button" class="btn btn-outline" data-admin-edit="${esc(r.id)}">Editar</button><button type="button" class="btn btn-outline" data-admin-publish="${esc(r.id)}">${r.published?"Retirar do ar":"Publicar"}</button></div></article>`;
}
function dataForm(){
 const r=records.find(x=>x.id===editId)||{};
 const isEdit=Boolean(r.id);
 const common=[];
 if(tab==="units"){
  common.push(formField("Nome da unidade *","name",r.name,90),`<div class="input-field"><label for="type">Tipo de serviço</label><select name="type" id="type">${types.map(t=>`<option value="${esc(t)}" ${r.type===t?"selected":""}>${esc(t)}</option>`).join("")}</select></div>`,formField("Bairro","district",r.district,80,false),formField("Endereço público","address",r.address,180,false),formField("Horários","hours",r.hours,120,false),formField("Telefone institucional","phone",r.phone,50,false));
 }else if(tab==="notices"){
  common.push(formField("Título do aviso *","title",r.title,100),`<div class="input-field"><label for="kind">Categoria</label><select id="kind" name="kind">${kinds.map(k=>`<option value="${esc(k)}" ${r.kind===k?"selected":""}>${esc(k)}</option>`).join("")}</select></div>`,areaField("Descrição do comunicado *","description",r.description,800));
 }else if(tab==="events"){
  common.push(formField("Título da ação *","title",r.title,90),`<div class="input-field"><label for="date">Data *</label><input id="date" name="date" type="date" value="${esc(r.date||"")}" required></div>`,`<div class="input-field"><label for="time">Horário</label><input id="time" name="time" type="time" value="${esc(r.time||"")}"></div>`,formField("Local","place",r.place,120,false),areaField("Descrição","description",r.description,400));
 }
 return `<section class="form-panel admin-editor" id="adminEditor"><span class="section-kicker">${isEdit?"EDITAR REGISTRO":"NOVO REGISTRO"}</span><h2>${isEdit?"Atualizar":"Cadastrar"} ${tab==="units"?"unidade":tab==="notices"?"aviso":"ação"}</h2><form class="module-form" id="adminRecordForm">${common.join("")}<div class="input-field field-wide"><label class="admin-toggle"><input name="published" type="checkbox" ${r.published?"checked":""}> Publicar para os cidadãos após salvar</label><small>Publicações ficam visíveis na aba Rede municipal.</small></div><div class="form-actions"><button class="btn btn-solid" type="submit">${isEdit?"Salvar alterações":"Cadastrar"}</button><button class="btn btn-outline" type="button" data-admin="cancel">Cancelar</button></div></form></section>`;
}
function memberList(){
 if(!members.length)return '<div class="empty-state"><strong>Sem usuários cadastrados</strong><p>Adicione o UID de uma conta autorizada para liberar a gestão.</p></div>';
 return `<div class="panel" style="overflow-x:auto"><h3>Acessos cadastrados</h3><table class="table-like"><thead><tr><th>UID</th><th>Função e setores</th><th>Status</th><th>Ação</th></tr></thead><tbody>${members.map(m=>`<tr><td><code>${esc(m.id)}</code></td><td><strong>${m.role==="admin"?"Administrador municipal":"Editor por setor"}</strong><small class="module-caption">${m.role==="admin"?"Todos os setores":normalizedGrants(m.moduleIds).map(id=>ACCESS_GROUPS.find(g=>g.id===id)?.label||id).join(", ")||"Nenhum setor liberado"}</small></td><td>${m.enabled?"Ativo":"Revogado"}</td><td><div class="member-actions"><button type="button" class="btn btn-outline" data-admin-edit-member="${esc(m.id)}">Editar permissões</button><button type="button" class="btn btn-outline" data-admin-member="${esc(m.id)}">${m.enabled?"Revogar":"Reativar"}</button></div></td></tr>`).join("")}</tbody></table></div>`;
}
function permissionsChecklist(grants=[]){
 const ids=new Set(normalizedGrants(grants));
 return `<fieldset class="sector-checklist"><legend>Setores permitidos para o editor</legend><p>Selecione somente os módulos necessários. O Firebase bloqueia o acesso aos demais setores.</p><div class="sector-grid">${ACCESS_GROUPS.map(item=>`<label class="sector-check"><input type="checkbox" name="moduleIds" value="${item.id}" ${ids.has(item.id)?"checked":""}><span><strong>${esc(item.label)}</strong><small>${esc(item.description)}</small></span></label>`).join("")}</div></fieldset>`;
}
function accessPanel(){
 const edit=members.find(m=>m.id===memberEdit);
 return `<div class="disclaimer">O Superadmin pode dar acesso a um setor específico ou a todos os setores. Use o UID da conta Google/e-mail do profissional; não cadastre dados clínicos aqui. <strong>Novos editores começam sem permissões até você selecionar os setores.</strong></div><section class="panel"><h3>${edit?"Editar acesso existente":"Autorizar colaborador"}</h3><p>As regras do Firestore conferem os setores do usuário em cada operação.</p><form id="grantForm" class="module-form">${formField("UID do usuário *","memberUid",edit?.id||"",128)}<div class="input-field"><label for="role">Nível de acesso</label><select id="role" name="role"><option value="editor" ${edit?.role!=="admin"?"selected":""}>Editor por setor</option><option value="admin" ${edit?.role==="admin"?"selected":""}>Administrador municipal (todos os módulos)</option></select></div>${permissionsChecklist(edit?.moduleIds||[])}<div class="form-actions"><button type="submit" class="btn btn-solid">${edit?"Salvar permissões":"Conceder acesso"}</button>${edit?'<button type="button" class="btn btn-outline" data-admin="cancel-member">Cancelar edição</button>':""}</div></form></section>${memberList()}`;
}
function dashboard(){
 const city=cities.find(c=>c.id===cityId);
 const member=memberMap.get(cityId);
 const visibleTabs=Object.keys(categories).filter(x=>adminTabGranted({isPlatformAdmin,member,tab:x}));
 return `${head()}${identity()}${isPlatformAdmin?addCityForm():""}${cities.length?`${chooseCity()}${isPlatformAdmin?`<div class="notice"><span class="notice-icon">ⓘ</span><div><strong>Visibilidade municipal:</strong> ${city.active?"Ativo para consultas públicas.":"Desativado para consultas públicas."} <button type="button" class="btn btn-outline" data-admin="toggle-city" style="margin-left:10px">${city.active?"Desativar município":"Ativar município"}</button></div></div>`:""}${tabs()}
 <div class="section-head"><div><h2>${tab==="members"?"Gerenciar acessos":`Gerenciar ${categories[tab]?.toLowerCase()||"conteúdo"}`}</h2><p>Os registros salvos aqui ficam disponíveis no Firestore. Somente itens publicados aparecem para visitantes.</p></div>${tab!=="members"?`<button class="btn btn-solid" type="button" data-admin="new-record">+ Novo registro</button>`:""}</div>
 ${tab==="members"?accessPanel():!visibleTabs.length?`<div class="empty-state"><strong>Acesso autorizado apenas aos setores selecionados</strong><p>Use Gerenciar módulos para acessar UPA, ESF, recepção e outros setores permitidos.</p><a href="#gestao-modulos" class="btn btn-solid">Abrir meus módulos</a></div>`:`${records.length?`<div class="data-grid">${records.map(recordCard).join("")}</div>`:`<div class="empty-state"><strong>Nenhum registro nesta área</strong><p>Crie um registro e decida quando torná-lo público.</p></div>`}${editId!==null?dataForm():""}`}`:`<div class="empty-state"><strong>Comece cadastrando o primeiro município.</strong><p>O cadastro estará inicialmente inativo. Depois você poderá adicionar e publicar informações públicas.</p></div>`}
 ${notice?`<div class="notice"><span class="notice-icon">ⓘ</span><div>${esc(notice)}</div></div>`:""}`;
}
function show(){
 if(!target||!target.isConnected)return;
 if(loading){target.innerHTML=`${head()}<div class="panel"><p>Carregando permissões e informações...</p></div>`;return;}
 if(!user)target.innerHTML=signInScreen();
 else if(!isPlatformAdmin&&!cities.length)target.innerHTML=restrictedScreen();
 else target.innerHTML=dashboard();
}
async function loadAccess(){
 const seq=++loadSeq;
 const checkedUser=user;
 loading=true;show();
 try{
  if(!user){cities=[];isPlatformAdmin=false;records=[];memberMap=new Map();return;}
  const userId=user.uid;
  const role=await getDoc(doc(db,"platformAdmins",userId));
  const platform=role.exists()&&role.data().enabled===true;
  const docs=await getDocs(platform?collection(db,"municipalities"):query(collection(db,"municipalities"),where("active","==",true)));
  let available=docs.docs.map(d=>({id:d.id,...d.data()}));
  const nextMembers=new Map();
  if(!platform){
   const permitted=await Promise.all(available.map(async city=>{
    try{
     const member=await getDoc(doc(db,"municipalities",city.id,"members",userId));
     if(member.exists()&&member.data().enabled===true&&["admin","editor"].includes(member.data().role)){
       nextMembers.set(city.id,member.data());
       return city;
     }
     return null;
    }catch{return null;}
   }));
   available=permitted.filter(Boolean);
  }
  if(seq!==loadSeq)return;
  isPlatformAdmin=platform;
  memberMap=nextMembers;
  if(!platform&&tab==="members")tab="units";
  cities=available.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
  if(!cities.some(c=>c.id===cityId))cityId=cities[0]?.id||"";
  if(!isPlatformAdmin&&!adminTabGranted({member:memberMap.get(cityId),tab})){
    tab=Object.keys(categories).find(t=>adminTabGranted({member:memberMap.get(cityId),tab:t}))||"units";
  }
  notice="";
  await loadRecords();
 }catch(error){
  if(seq===loadSeq){notice=`Falha ao ler as permissões: ${err(error)}`;cities=[];isPlatformAdmin=false;}
 }finally{
  // loadRecords avança a versão do carregamento; por isso comparamos a conta.
  if(user===checkedUser){loading=false;show();}
 }
}
async function loadRecords(){
 const seq=++loadSeq;
 if(!cityId){records=[];members=[];show();return;}
 if(!adminTabGranted({isPlatformAdmin,member:memberMap.get(cityId),tab})){
   records=[];members=[];show();return;
 }
 try{
  const snapshot=await getDocs(collection(db,"municipalities",cityId,tab==="members"?"members":tab));
  if(seq!==loadSeq)return;
  if(tab==="members"){
   members=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.id.localeCompare(b.id));
   records=[];
  }else{
   records=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||a.title||"").localeCompare(b.name||b.title||"","pt-BR"));
  }
 }catch(error){
  if(seq===loadSeq){records=[];notice=`Falha ao consultar registros: ${err(error)}`;}
 }
 show();
}
function slugify(str){
 return str.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
async function run(work){
 try{loading=true;show();await work();loading=false;await loadAccess();}
 catch(error){loading=false;feedback(err(error));show();}
}
function values(form){return Object.fromEntries(Array.from(new FormData(form).entries()).map(([k,v])=>[k,String(v).trim()]));}
function parseRecord(form){
 const v=values(form),published=form.querySelector('[name="published"]')?.checked===true;
 if(tab==="units")return {name:v.name?.slice(0,90),type:types.includes(v.type)?v.type:"Outro",district:(v.district||"").slice(0,80),address:(v.address||"").slice(0,180),hours:(v.hours||"").slice(0,120),phone:(v.phone||"").slice(0,50),published};
 if(tab==="notices")return {title:v.title?.slice(0,100),kind:kinds.includes(v.kind)?v.kind:"Comunicado",description:(v.description||"").slice(0,800),published};
 return {title:v.title?.slice(0,90),date:v.date||"",time:v.time||"",place:(v.place||"").slice(0,120),description:(v.description||"").slice(0,400),published};
}
async function onClick(event){
 const button=event.target.closest("[data-admin],[data-admin-tab],[data-admin-edit],[data-admin-publish],[data-admin-member],[data-admin-edit-member]");
 if(!button)return;
 const action=button.dataset.admin;
 if(action==="login"){
  try{
    notice="";
    await signInWithPopup(auth,provider);
  }catch(error){
    const diagnosis=explainFirebaseError(error);
    notice=`${diagnosis.title}: ${diagnosis.message} ${diagnosis.fix} [${diagnosis.code}]`;
    feedback(notice);
    show();
  }
  return;
 }
 if(action==="logout"){await signOut(auth);return;}
 if(!user||!cities.length&&!isPlatformAdmin)return;
 if(button.dataset.adminTab){
  tab=button.dataset.adminTab;editId=null;notice="";
  loading=true;show();await loadRecords();loading=false;show();return;
 }
 if(button.hasAttribute("data-admin-edit-member")&&isPlatformAdmin){
  memberEdit=button.dataset.adminEditMember;show();
  document.querySelector("#grantForm")?.scrollIntoView({behavior:"smooth",block:"nearest"});return;
 }
 if(action==="cancel-member"){memberEdit=null;show();return;}
 if(button.hasAttribute("data-admin-member")&&isPlatformAdmin){
  const member=members.find(m=>m.id===button.dataset.adminMember);
  if(!member)return;
  if(member.enabled&&!window.confirm("Revogar o acesso desta conta ao município?"))return;
  await run(async()=>{await updateDoc(doc(db,"municipalities",cityId,"members",member.id),{enabled:!member.enabled,updatedAt:serverTimestamp()});});
  return;
 }
 if(action==="new-record"){editId="";show();document.querySelector("#adminEditor")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(action==="cancel"){editId=null;show();return;}
 if(action==="toggle-city"&&isPlatformAdmin){
  const city=cities.find(c=>c.id===cityId);if(!city)return;
  await run(async()=>{await updateDoc(doc(db,"municipalities",cityId),{active:!city.active,updatedAt:serverTimestamp()});});
  return;
 }
 if(button.hasAttribute("data-admin-edit")){editId=button.dataset.adminEdit;show();document.querySelector("#adminEditor")?.scrollIntoView({behavior:"smooth",block:"start"});return;}
 if(button.hasAttribute("data-admin-publish")){
  const item=records.find(r=>r.id===button.dataset.adminPublish);if(!item)return;
  await run(async()=>{
   await updateDoc(doc(db,"municipalities",cityId,tab,item.id),{published:!item.published,updatedAt:serverTimestamp()});
  });
 }
}
async function onSubmit(event){
 const form=event.target;if(!["newCityForm","adminRecordForm","grantForm"].includes(form.id))return;
 event.preventDefault();
 if(!form.reportValidity())return;
 if(!user)return;
 if(form.id==="newCityForm"&&isPlatformAdmin){
  const data=values(form),name=(data.cityName||"").slice(0,85),state=(data.cityState||"").toUpperCase();
  if(!name||!/^[A-Z]{2}$/.test(state))return;
  const citySlug=slugify(`${name}-${state}`);
  if(!citySlug)return;
  await run(async()=>{
   const ref=doc(db,"municipalities",citySlug);
   if((await getDoc(ref)).exists())throw Error("Município já cadastrado com esse nome e UF.");
   await setDoc(ref,{name,state,active:false,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   cityId=citySlug;tab="units";editId=null;
  });
  return;
 }
 if(form.id==="grantForm"&&isPlatformAdmin){
  const data=values(form);
  const permissions=normalizedGrants(new FormData(form).getAll("moduleIds"));
  if(!/^[A-Za-z0-9_-]{16,128}$/.test(data.memberUid||"")||!["admin","editor"].includes(data.role))return feedback("Confira o UID e o nível de acesso.");
  if(data.role==="editor"&&!permissions.length)return feedback("Selecione pelo menos um setor para esse editor.");
  const existing=members.find(m=>m.id===data.memberUid);
  if(existing&&memberEdit!==data.memberUid)return feedback("Esta conta já está cadastrada. Use Editar permissões.");
  await run(async()=>{
   await setDoc(doc(db,"municipalities",cityId,"members",data.memberUid),{
    enabled:existing?.enabled??true,role:data.role,
    moduleIds:data.role==="admin"?[]:permissions,
    updatedAt:serverTimestamp()
   });
   memberEdit=null;
  });
  return;
 }
 if(form.id==="adminRecordForm"&&cityId){
  const data=parseRecord(form),id=editId;
  await run(async()=>{
   const ref=id?doc(db,"municipalities",cityId,tab,id):collection(db,"municipalities",cityId,tab);
   if(id)await updateDoc(ref,{...data,updatedAt:serverTimestamp()});
   else await addDoc(ref,{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   editId=null;
  });
 }
}
export function mountAdmin(node,notify,signal){
 if(unsub){unsub();unsub=null;}
 hasInitialized=false;
 target=node;toast=notify||(()=>{});
 user=null;isPlatformAdmin=false;cities=[];records=[];members=[];editId=null;memberEdit=null;memberMap=new Map();loading=true;notice="";
 const currentTarget=node;
 hasInitialized=true;
 unsub=onAuthStateChanged(auth,async current=>{
  if(signal?.aborted)return;
  user=current;editId=null;await loadAccess();
 },error=>{if(signal?.aborted)return;notice=`Erro de autenticação: ${err(error)}`;loading=false;show()});
 node.addEventListener("click",onClick,{signal});
 node.addEventListener("submit",onSubmit,{signal});
 node.addEventListener("change",async event=>{
  if(event.target.id!=="adminCity"||signal?.aborted)return;
  cityId=event.target.value;editId=null;memberEdit=null;notice="";
  if(!adminTabGranted({isPlatformAdmin,member:memberMap.get(cityId),tab})){
   tab=Object.keys(categories).find(t=>adminTabGranted({isPlatformAdmin,member:memberMap.get(cityId),tab:t}))||"units";
  }
  loading=true;show();await loadRecords();loading=false;show();
 },{signal});
 signal?.addEventListener("abort",()=>{
  ++loadSeq;
  unsub?.();unsub=null;hasInitialized=false;
  if(target===currentTarget)target=null;
 },{once:true});
 show();
}