// Checklist de preparação no Android — não mostra UID, e-mail ou dados pessoais.
import {auth,db} from "./firebase.js";
import {APP_VERSION,BUILD_DATE} from "./mobile-core.js";
import {getPwaState,checkForUpdates} from "./pwa-controller.js";
import {collection,getDocsFromServer,query,where,limit} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const escapeText=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function statusRow(icon,label,value,info="",kind=""){
 return `<div class="android-test-row"><span class="android-test-emoji" aria-hidden="true">${icon}</span><div><strong>${escapeText(label)}</strong><small>${escapeText(info)}</small></div><span class="android-test-result ${kind}">${escapeText(value)}</span></div>`;
}
export function mountAndroidTest(root,toast=()=>{},signal){
 let tested=false,busy=false,apiStatus="",apiDetail="",versionStatus="",versionDetail="";
 const alive=()=>root.isConnected&&!signal?.aborted;
 const render=()=>{
  if(!alive())return;
  const state=getPwaState();
  const installed=state.standalone;
  root.innerHTML=`<div class="page-heading"><div><span class="section-kicker">HOMOLOGAÇÃO NO CELULAR</span><h1>Teste Android</h1><p>Verifique a instalação, a conexão, a versão e o acesso ao Firebase neste dispositivo.</p></div><span class="pill">Versão ${APP_VERSION}</span></div>
   <div class="android-test-hero"><div><span class="section-kicker">CON ECTA SAÚDE · PWA</span><h2>${installed?"Aplicativo instalado":"Preparado para o Android"}</h2><p>${installed?"Você está usando o ConectaSaúde em modo aplicativo.":"Abra este site no Chrome do Android e use Instalar app no menu ⋮."}</p><div class="android-test-actions"><button class="btn btn-solid" type="button" data-pwa-action="install">${installed?"Instalado":"Instalar no Android"}</button><button class="btn btn-outline" type="button" data-pwa-action="check">Verificar atualização</button></div></div><img src="${new URL("./icon-192.png",import.meta.url).href}" width="108" height="108" alt="Ícone ConectaSaúde"></div>
   <section class="panel"><h2 class="android-test-h2">Diagnóstico do dispositivo</h2><div class="android-test-rows">
    ${statusRow("📱","Modo aplicativo",installed?"Instalado":"No navegador","O app instalado abre sem a barra de endereços.",installed?"good":"neutral")}
    ${statusRow("🔒","Conexão segura",state.secure?"HTTPS ativo":"Não segura","Necessário para usar Firebase e instalar o PWA.",state.secure?"good":"bad")}
    ${statusRow("🌐","Internet",state.online?"Conectado":"Offline","Sem internet não é possível consultar os dados municipais.",state.online?"good":"warn")}
    ${statusRow("⚙","Service Worker",!state.serviceWorkerSupported?"Indisponível":state.serviceWorkerControlled?"Ativo":state.registered?"Registrado":"Preparando","Gerencia o cache da interface, nunca os dados do Firestore.",state.serviceWorkerControlled?"good":"neutral")}
    ${statusRow("👤","Firebase Authentication",auth.currentUser?"Conta autenticada":"Sem login","Entre na aba Minha conta para testar o acesso.",auth.currentUser?"good":"neutral")}
    ${statusRow("🔄","Versão do aplicativo","v"+APP_VERSION,"Compilação "+BUILD_DATE,"good")}
    ${tested?statusRow("☁","Consulta ao Firestore",apiStatus,apiDetail,apiStatus==="Aprovada"?"good":"bad"):""}
    ${versionStatus?statusRow("📦","Versão no servidor",versionStatus,versionDetail,versionStatus==="Atualizada"?"good":"warn"):""}
   </div><div class="android-test-actions"><button class="btn btn-solid" type="button" id="androidCheck" ${busy?"disabled":""}>${busy?"Testando...":"Testar Firebase e conexão"}</button><button class="btn btn-outline" type="button" id="androidCopy">Copiar diagnóstico</button></div></section>
   <section class="panel"><h2 class="android-test-h2">Roteiro de testes</h2><div class="android-test-steps">
    <a href="#conta"><strong>1. Login</strong><small>Entre com Google ou e-mail e retorne ao teste.</small><span>›</span></a>
    <a href="#rede"><strong>2. Portal do cidadão</strong><small>Selecione o município e abra os módulos publicados.</small><span>›</span></a>
    <a href="#gestao-modulos"><strong>3. Administração de módulos</strong><small>Com conta autorizada, cadastre um aviso de teste e confira em outro dispositivo.</small><span>›</span></a>
    <a href="#administracao"><strong>4. Permissões</strong><small>Experimente uma conta de editor com acesso somente à recepção.</small><span>›</span></a>
   </div></section><div class="disclaimer"><strong>Teste técnico, não assistencial.</strong> A interface pode funcionar offline, mas cadastros, login e informações atualizadas exigem internet. Não cadastre pacientes nem informações clínicas nesta fase.</div>`;
 };
 const networkTest=async()=>{
  if(busy)return;busy=true;render();
  try{
   const response=await fetch(new URL("./version.json",import.meta.url).href+"?check="+Date.now(),{cache:"no-store"});
   if(!response.ok)throw new Error("Arquivo de versão indisponível (HTTP "+response.status+").");
   const metadata=await response.json();
   versionStatus=metadata.version===APP_VERSION?"Atualizada":"Versão "+metadata.version;
   versionDetail=metadata.version===APP_VERSION?"Seu aplicativo usa a última versão publicada.":"Há uma diferença entre os arquivos locais e a versão do site.";
   const snap=await getDocsFromServer(query(collection(db,"municipalities"),where("active","==",true),limit(1)));
   apiStatus="Aprovada";apiDetail=snap.empty?"Firestore acessível. Não há municípios públicos.":"Firestore acessível. Município público encontrado.";
   tested=true;
  }catch(e){
   apiStatus="Falhou";apiDetail=(e?.code?"["+e.code+"] ":"")+String(e?.message||e).slice(0,140);
   tested=true;toast("Confira a conexão e a autorização do Firebase.");
  }finally{busy=false;render();}
 };
 const handle=event=>{
  const btn=event.target.closest("#androidCheck,#androidCopy");
  if(!btn)return;
  if(btn.id==="androidCheck")void networkTest();
  if(btn.id==="androidCopy"){
   const state=getPwaState();
   const text=[
    "ConectaSaúde Android · v"+APP_VERSION,
    "Instalado: "+(state.standalone?"sim":"não"),
    "HTTPS: "+(state.secure?"sim":"não"),
    "Conectado: "+(state.online?"sim":"não"),
    "Service Worker: "+(state.serviceWorkerControlled?"ativo":state.registered?"registrado":"inativo"),
    "Login: "+(auth.currentUser?"sim":"não"),
    "Firestore: "+(tested?apiStatus+" - "+apiDetail:"não testado"),
    "Versão do servidor: "+(versionStatus||"não consultada")
   ].join("\n");
   if(!navigator.clipboard?.writeText){toast("Seu navegador não permite copiar automaticamente.");return;}
   void navigator.clipboard.writeText(text).then(()=>toast("Diagnóstico copiado."),()=>toast("Não foi possível copiar."));
  }
 };
 root.addEventListener("click",handle,{signal});
 render();
}
