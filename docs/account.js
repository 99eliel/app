// Área do cidadão: autenticação e acompanhamento de pedidos.
// Não grava CPF, dados clínicos ou perfis públicos.
import {auth,db} from "./firebase.js";
import {escapeText as E} from "./module-catalog.js";
import {statusLabel} from "./municipal-operations.js";
import {explainFirebaseError} from "./auth-errors.js";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {collection,getDocs,query,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const heading='<div class="page-heading"><div><span class="section-kicker">CONTA DO CIDADÃO</span><h1>Minha conta</h1><p>Entre para acompanhar suas próprias solicitações e inscrições. Nenhum dado clínico é solicitado.</p></div><span class="pill">Conta pessoal</span></div>';
const provider=new GoogleAuthProvider();
const input=(label,name,type,extra="")=>`<div class="input-field"><label for="account_${name}">${label}</label><input name="${name}" id="account_${name}" type="${type}" required ${extra}></div>`;
export function mountAccount(root,notify=()=>{},signal){
 let user=auth.currentUser,mode="login",records=[],loading=false,notice="",loadVersion=0;
 const alive=()=>root.isConnected&&!signal?.aborted;
 const authMessage=e=>{
  const x=explainFirebaseError(e);
  return `${x.title}: ${x.message} ${x.fix} [${x.code}]`;
 };
 const render=()=>{
  if(!alive())return;
  if(!user){
   root.innerHTML=heading+`<div class="account-layout"><section class="panel account-auth"><div class="filter-bar"><button class="filter-btn ${mode==="login"?"active":""}" data-account-mode="login" type="button">Entrar</button><button class="filter-btn ${mode==="register"?"active":""}" data-account-mode="register" type="button">Criar conta</button><button class="filter-btn ${mode==="reset"?"active":""}" data-account-mode="reset" type="button">Recuperar senha</button></div>
   <h2>${mode==="login"?"Acessar minha conta":mode==="register"?"Criar conta com e-mail":"Recuperar acesso"}</h2>
   <form class="module-form" id="accountForm">
    ${input("E-mail","email","email",'autocomplete="email" maxlength="254"')}
    ${mode!=="reset"?input("Senha","password","password",mode==="register"?'autocomplete="new-password" minlength="6"':'autocomplete="current-password"'):""}
    ${mode==="register"?input("Confirmar senha","confirm","password",'autocomplete="new-password" minlength="6"'):""}
    <div class="form-actions"><button class="btn btn-solid" type="submit" ${loading?"disabled":""}>${loading?"Aguarde...":mode==="login"?"Entrar":mode==="register"?"Criar conta":"Enviar e-mail de recuperação"}</button></div>
   </form>
   ${mode!=="reset"?'<div class="account-separator">ou</div><button type="button" class="btn btn-outline" data-account="google" '+(loading?"disabled":"")+'>Continuar com Google</button>':""}
   ${notice?`<div class="disclaimer" role="status">${E(notice)}</div>`:""}
   </section>
   <aside class="panel account-about"><span class="module-bubble">🔐</span><h3>Privacidade primeiro</h3><p>Sua conta é usada apenas para autenticação e acompanhamento das próprias solicitações. O cadastro não pede CPF, telefone ou informações médicas.</p><p>O acesso administrativo é concedido separadamente por um Superadmin.</p><a class="text-link" href="#rede">Explorar os serviços do município ↗</a></aside></div>`;
   return;
  }
  root.innerHTML=heading+`<div class="account-summary"><div><strong>${E(user.displayName||user.email||"Conta autenticada")}</strong><p>${E(user.email||"Conta Google")} · ${user.emailVerified?"E-mail verificado":"E-mail não verificado"}</p></div><button class="btn btn-outline" type="button" data-account="logout">Sair da conta</button></div>
  ${!user.emailVerified?`<div class="notice"><span class="notice-icon">ⓘ</span><div>Seu endereço de e-mail ainda não foi verificado. <button class="btn btn-outline" type="button" data-account="verify">Enviar verificação</button></div></div>`:""}
  ${notice?`<div class="disclaimer">${E(notice)}</div>`:""}
  <div class="section-head"><div><h2>Minhas solicitações</h2><p>Pedidos que você enviou em municípios ativos.</p></div><button class="btn btn-outline" type="button" data-account="reload" ${loading?"disabled":""}>Atualizar</button></div>
  ${loading?'<div class="panel"><p>Buscando solicitações...</p></div>':records.length?`<div class="account-records">${records.map(r=>`<article class="panel account-record"><span class="section-kicker">${r.type==="appointment"?"SOLICITAÇÃO DE CONSULTA":"INSCRIÇÃO EM CURSO"}</span><h3>${E(r.cityName)}</h3><p>Referência: ${E(r.targetName||"Cadastro municipal")}</p><span class="license-badge ${r.status==="pending"?"warn":r.status==="confirmed"||r.status==="completed"?"good":"neutral"}">${statusLabel(r.status)}</span><small>${r.createdAt?.toDate?.().toLocaleString("pt-BR")||"Data não informada"}</small></article>`).join("")}</div>`:'<div class="empty-state"><strong>Nenhuma solicitação encontrada</strong><p>Quando você fizer pedidos ou inscrições, eles aparecerão aqui.</p><a class="btn btn-solid" href="#rede">Encontrar serviços municipais ↗</a></div>'}
  <p class="module-caption">Solicitações não equivalem a consultas confirmadas. Em urgência, procure atendimento de saúde imediatamente.</p>`;
 };
 const fetchRequests=async()=>{
  const id=++loadVersion;
  if(!user)return;
  loading=true;render();
  try{
   const snap=await getDocs(query(collection(db,"municipalities"),where("active","==",true)));
   const municipalities=snap.docs.map(x=>({id:x.id,...x.data()}));
   const all=await Promise.all(municipalities.map(async city=>{
    try{
     const [a,b]=await Promise.all(["appointmentRequests","courseRegistrations"].map(path=>getDocs(query(collection(db,"municipalities",city.id,path),where("ownerUid","==",user.uid)))));
     const queries=[...a.docs.map(d=>({...d.data(),id:d.id,cityName:city.name,type:"appointment"})),...b.docs.map(d=>({...d.data(),id:d.id,cityName:city.name,type:"enrollment"}))];
     // Só identificadores institucionais, sem informação médica ou e-mails.
     return queries;
    }catch(e){console.warn("Pedidos indisponíveis para um município:",e?.code||e);return [];}
   }));
   if(!alive()||id!==loadVersion)return;
   records=all.flat().sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  }catch(e){if(id===loadVersion)notice=authMessage(e);}
  finally{if(id===loadVersion){loading=false;render();}}
 };
 const accountClick=event=>{
  const tab=event.target.closest("[data-account-mode]");
  if(tab){mode=tab.dataset.accountMode;notice="";render();return;}
  const action=event.target.closest("[data-account]")?.dataset.account;
  if(action==="google"){
   loading=true;notice="";render();
   void signInWithPopup(auth,provider).catch(e=>{notice=authMessage(e);loading=false;render();});
  }
  if(action==="logout")void signOut(auth).catch(e=>{notice=authMessage(e);render();});
  if(action==="reload")void fetchRequests();
  if(action==="verify"&&user)void sendEmailVerification(user).then(()=>{notice="E-mail de verificação enviado. Confira também a caixa de spam.";render();}).catch(e=>{notice=authMessage(e);render();});
 };
 const onSubmit=event=>{
  if(event.target.id!=="accountForm")return;
  event.preventDefault();if(!event.target.reportValidity())return;
  const fd=new FormData(event.target),email=String(fd.get("email")||"").trim(),password=String(fd.get("password")||""),confirm=String(fd.get("confirm")||"");
  if(mode==="register"&&password!==confirm){notice="As senhas digitadas não coincidem.";render();return;}
  const work=mode==="login"?()=>signInWithEmailAndPassword(auth,email,password):
    mode==="register"?async()=>{const cred=await createUserWithEmailAndPassword(auth,email,password);try{await sendEmailVerification(cred.user);}catch{}return cred;}:
    async()=>{await sendPasswordResetEmail(auth,email);};
  loading=true;notice="";render();
  void work().then(()=>{
   if(mode==="reset"){notice="Se o e-mail estiver cadastrado, você receberá instruções de recuperação.";loading=false;render();}
   else if(mode==="register"){notice="Conta criada. Confira seu e-mail para verificar o endereço.";loading=false;render();}
  }).catch(e=>{notice=authMessage(e);loading=false;render();});
 };
 root.addEventListener("click",accountClick,{signal});
 root.addEventListener("submit",onSubmit,{signal});
 const unsub=onAuthStateChanged(auth,current=>{
  if(!alive())return;
  const oldUid=user?.uid;
  user=current;
  notice="";loading=false;render();
  if(user&&oldUid!==user.uid)void fetchRequests();
  if(!user){records=[];loadVersion++;}
 });
 signal?.addEventListener("abort",()=>{loadVersion++;unsub();},{once:true});
 render();
 if(user)void fetchRequests();
}
