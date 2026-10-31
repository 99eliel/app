// Helpers sem dependências: versão e diagnóstico Android.
export const APP_VERSION="2.1.0";
export const BUILD_DATE="2026-10-31";
export function versionParts(version){
 if(typeof version!=="string"||!/^\d+(?:\.\d+){0,3}$/.test(version))return null;
 return version.split(".").map(Number);
}
export function compareVersions(a,b){
 const left=versionParts(a),right=versionParts(b);
 if(!left||!right)return null;
 for(let i=0;i<Math.max(left.length,right.length);i++){
  const diff=(left[i]||0)-(right[i]||0);
  if(diff)return diff>0?1:-1;
 }
 return 0;
}
export function isStandalone({displayMode=false,iosStandalone=false}={}){
 return displayMode===true||iosStandalone===true;
}
export function installedStatus({standalone=false,swSupported=false,swControlled=false,online=true}={}){
 return {standalone:!!standalone,swSupported:!!swSupported,swControlled:!!swControlled,online:!!online};
}
