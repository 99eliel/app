import test from "node:test";
import assert from "node:assert/strict";
import {posterUrl,noticeSeenKey,visibleNotices} from "../docs/notice-utils.js";
import {explainFirebaseError} from "../docs/auth-errors.js";
import fs from "node:fs";

test("cartaz só é exibido com URL HTTPS apontando para imagem",()=>{
 assert.equal(posterUrl("https://exemplo.com/cartaz.png"),"https://exemplo.com/cartaz.png");
 assert.equal(posterUrl("https://exemplo.com/banner.webp?v=2"),"https://exemplo.com/banner.webp?v=2");
 assert.equal(posterUrl("http://exemplo.com/a.png"),"");
 assert.equal(posterUrl("javascript:alert(1)"),"");
 assert.equal(posterUrl("https://exemplo.com/servico"),"");
 assert.equal(posterUrl("https://usuario:senha@exemplo.com/a.jpg"),"");
});
test("a confirmação do aviso não vaza entre municípios ou versões",()=>{
 const key=noticeSeenKey("cidade-a","aviso-1",{seconds:100});
 assert.notEqual(key,noticeSeenKey("cidade-b","aviso-1",{seconds:100}));
 assert.notEqual(key,noticeSeenKey("cidade-a","aviso-1",{seconds:101}));
 assert.ok(key.startsWith("cs_notice_seen_"));
});
test("avisos publicados mais recentes aparecem primeiro",()=>{
 assert.deepEqual(visibleNotices([
  {id:"a",title:"Mais antigo",published:true,updatedAt:{seconds:10}},
  {id:"b",title:"Rascunho",published:false,updatedAt:{seconds:99}},
  {id:"c",title:"Mais recente",published:true,updatedAt:{seconds:20}}
 ]).map(x=>x.id),["c","a"]);
});
test("conta do cidadão explica erros de e-mail e senha",()=>{
 assert.match(explainFirebaseError({code:"auth/email-already-in-use"}).title,/cadastrado/);
 assert.match(explainFirebaseError({code:"auth/weak-password"}).fix,/6 caracteres/);
});
test("manifest da PWA aponta para raiz do projeto",()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL("../docs/manifest.webmanifest",import.meta.url),"utf8"));
 assert.equal(manifest.start_url,"../#inicio");
 assert.equal(manifest.scope,"../");
 assert.equal(manifest.display,"standalone");
});
