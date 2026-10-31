import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {inflateSync} from "node:zlib";

const base=new URL("../",import.meta.url);
const text=rel=>readFileSync(new URL(rel,base),"utf8");

test("Identidade do Android aponta para o aplicativo em /app",()=>{
 const m=JSON.parse(text("docs/manifest.webmanifest"));
 assert.equal(m.start_url,"../#inicio");
 assert.equal(m.scope,"../");
 assert.equal(m.id,"../");
 assert.equal(m.display,"standalone");
 assert.ok(m.icons.some(x=>x.sizes==="192x192"&&x.type==="image/png"));
 assert.ok(m.icons.some(x=>x.sizes==="512x512"&&x.type==="image/png"));
 for(const image of m.icons){
  assert.ok(existsSync(new URL("docs/"+image.src.replace(/^\.\//,""),base)),image.src);
 }
});

test("Ícones PNG possuem resolução e dados válidos para Android",()=>{
 for(const [dimension,path] of [[192,"docs/icon-192.png"],[512,"docs/icon-512.png"]]){
  const image=readFileSync(new URL(path,base));
  assert.equal(image.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(image.readUInt32BE(16),dimension);
  assert.equal(image.readUInt32BE(20),dimension);
  let offset=8,chunks=[],finish=false;
  while(offset+12<=image.length){
   const size=image.readUInt32BE(offset);
   const tag=image.toString("ascii",offset+4,offset+8);
   assert.ok(offset+12+size<=image.length,"Chunk inválido "+tag);
   if(tag==="IDAT")chunks.push(image.subarray(offset+8,offset+8+size));
   offset+=size+12;
   if(tag==="IEND"){finish=true;break;}
  }
  assert.ok(chunks.length,"Sem pixels IDAT");
  assert.ok(finish,"PNG não finalizado");
  assert.ok(inflateSync(Buffer.concat(chunks)).length>100,"Pixels não decodificáveis");
 }
});

test("PWA publica versão e apresenta instalação no Android",()=>{
 const version=JSON.parse(text("docs/version.json"));
 assert.match(version.version,/^\d+\.\d+\.\d+$/);
 assert.match(text("docs/index.html"),/mobileMenuButton/);
 assert.match(text("docs/index.html"),/teste-android/);
 assert.match(text("index.html"),/docs\/manifest.webmanifest/);
 assert.match(text("docs/pwa-controller.js"),/beforeinstallprompt/);
 assert.match(text("sw.js"),/cs-static-/);
});

test("A atualização nunca salva respostas de API Firebase em cache HTTP",()=>{
 const sw=text("sw.js");
 assert.match(sw,/url\.origin!==self\.location\.origin/);
 assert.match(sw,/new URL\(req\.url\)/);
 assert.match(sw,/staticFile/);
 assert.ok(!sw.includes("firebaseio.com"));
});
