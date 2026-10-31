// Android/PWA: instalação, estado online e atualização sem interromper formulários.
import {APP_VERSION,compareVersions,isStandalone} from "./mobile-core.js";
let deferredInstall=null,registration=null,remoteVersion=null,latestError="",started=false;
const scopeBase=new URL("../",import.meta.url);
const workerUrl=new URL("../sw.js",import.meta.url);
const manifestVersionUrl=new URL("./version.json",import.meta.url);
let uiNotify=()=>{};
const standalone=()=>isStandalone({
 displayMode:typeof window.matchMedia==="function"&&window.matchMedia("(display-mode: standalone)").matches,
 iosStandalone:navigator.standalone===true
});
function banner(content,action){
 const el=document.querySelector("#pwaMessage");
 if(!el)return;
 if(!content){el.hidden=true;el.innerHTML="";return;}
 const t=document.createElement("span");t.textContent=content;
 el.replaceChildren(t);
 if(action){
  const b=document.createElement("button");b.type="button";b.className="btn btn-solid";
  b.textContent=action.label;b.dataset.pwaAction=action.type;el.append(b);
 }
 el.hidden=false;
}
function connection(){
 const offline=!navigator.onLine;
 document.body.classList.toggle("app-offline",offline);
 const elem=document.querySelector("#connectionState");
 if(elem){elem.hidden=!offline;elem.textContent="Sem internet · alterações e dados ao vivo indisponíveis";}
 if(offline)banner("Você está offline. Informações municipais e autenticação exigem conexão.");
 else if(remoteVersion&&compareVersions(remoteVersion,APP_VERSION)>0)showUpdateBanner();
 else banner("",null);
}
function showUpdateBanner(){
 banner("Versão "+remoteVersion+" disponível. Atualize depois de salvar seus formulários.",
 {label:"Atualizar aplicativo",type:"reload"});
}
export function getPwaState(){
 return {
  version:APP_VERSION,
  newestVersion:remoteVersion,
  standalone:standalone(),
  installPromptAvailable:!!deferredInstall,
  online:navigator.onLine,
  serviceWorkerSupported:"serviceWorker" in navigator,
  serviceWorkerControlled:!!navigator.serviceWorker?.controller,
  registered:!!registration?.active,
  browser: navigator.userAgentData?.brands?.map(v=>v.brand).join(", ")||"Navegador Android",
  secure:window.isSecureContext,
  latestError
 };
}
export async function checkVersion({notify=true}={}){
 try{
  const response=await fetch(manifestVersionUrl.href+"?t="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Versão não disponível (HTTP "+response.status+").");
  const v=await response.json();
  if(typeof v.version!=="string")throw new Error("Versão publicada inválida.");
  remoteVersion=v.version;
  if(compareVersions(remoteVersion,APP_VERSION)>0){showUpdateBanner();if(notify)uiNotify("Atualização disponível.");}
  else if(notify)uiNotify("Aplicativo atualizado: v"+APP_VERSION);
  latestError="";
  return remoteVersion;
 }catch(e){
  latestError=String(e.message||e);
  if(notify)uiNotify("Não foi possível consultar a versão. Verifique sua conexão.");
  return null;
 }
}
export async function checkForUpdates(){
 try{registration=registration||await navigator.serviceWorker?.getRegistration(scopeBase.href);await registration?.update();}catch(e){latestError=String(e.message||e);}
 return checkVersion();
}
export function installApp(){
 if(standalone()){uiNotify("O ConectaSaúde já está instalado.");return;}
 if(!deferredInstall){
  uiNotify("No Chrome Android: abra ⋮ e escolha Instalar app ou Adicionar à tela inicial.");
  return;
 }
 const prompt=deferredInstall;deferredInstall=null;
 void (async()=>{
  try{await prompt.prompt();const result=await prompt.userChoice;
   uiNotify(result?.outcome==="accepted"?"Instalação iniciada.":"Instalação cancelada.");
  }catch(e){uiNotify("Use o menu ⋮ do Chrome e escolha Instalar app.");}
 })();
}
export function applyUpdate(){
 // Recarrega somente após toque explícito: não apaga formulários em edição.
 if(registration?.waiting)registration.waiting.postMessage({type:"SKIP_WAITING"});
 window.location.reload();
}
export function setupPwa(notify=()=>{}){
 if(started)return;
 started=true;uiNotify=notify;
 window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();deferredInstall=event;
  document.documentElement.classList.add("pwa-installable");
 });
 window.addEventListener("appinstalled",()=>{
  deferredInstall=null;document.documentElement.classList.remove("pwa-installable");
  banner("",null);uiNotify("ConectaSaúde instalado com sucesso.");
 });
 window.addEventListener("online",connection);
 window.addEventListener("offline",connection);
 document.addEventListener("click",event=>{
  const action=event.target.closest("[data-pwa-action]")?.dataset.pwaAction;
  if(action==="install")installApp();
  if(action==="check")void checkForUpdates();
  if(action==="reload")applyUpdate();
 });
 connection();
 if("serviceWorker" in navigator&&window.isSecureContext){
  const start=async()=>{
   try{
    registration=await navigator.serviceWorker.register(workerUrl.href,{scope:scopeBase.pathname,updateViaCache:"none"});
    registration.addEventListener("updatefound",()=>{
     const current=registration.installing;
     current?.addEventListener("statechange",()=>{
      if(current.state==="installed"&&navigator.serviceWorker.controller){
       banner("Nova versão de arquivos disponível. Atualize depois de salvar seus formulários.",
       {label:"Atualizar aplicativo",type:"reload"});
      }
     });
    });
    await registration.update();
    await checkVersion({notify:false});
   }catch(e){latestError=String(e.message||e);console.warn("PWA:",e);}
  };
  if(document.readyState==="complete")void start();
  else window.addEventListener("load",start,{once:true});
 }
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&navigator.onLine)void checkForUpdates();});
}
