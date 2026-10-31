// Regras de apresentação de avisos do portal.
// Links são apenas para imagens HTTPS públicas; sem conteúdo embutido do usuário.
export function posterUrl(value) {
 if(typeof value!=="string"||!value.trim())return "";
 try{
  const url=new URL(value.trim());
  if(url.protocol!=="https:"||url.username||url.password)return "";
  return /\.(?:png|jpe?g|webp)(?:$|[?#])/i.test(url.href)?url.href:"";
 }catch{return "";}
}
export function noticeSeenKey(cityId,id,updatedAt){
 const safe=s=>String(s??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,140);
 const version=updatedAt?.seconds||updatedAt?.toMillis?.()||"0";
 return "cs_notice_seen_"+safe(cityId)+"_"+safe(id)+"_"+safe(version);
}
export function visibleNotices(entries) {
 return (entries||[]).filter(item=>item?.published===true&&item?.title).sort((a,b)=>{
  const left=Number(a.updatedAt?.seconds||0),right=Number(b.updatedAt?.seconds||0);
  return right-left;
 });
}
