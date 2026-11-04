import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Firebase Hosting publica a pasta docs e não altera regras do Firestore",()=>{
 const config=JSON.parse(read("firebase.json"));
 const projects=JSON.parse(read(".firebaserc"));
 assert.equal(config.hosting.public,"docs");
 assert.equal(projects.projects.default,"conectesaude-1");
 assert.equal(config.firestore.rules,"firestore.rules");
 assert.ok(!config.hosting.ignore.includes("**/.*"),"well-known precisa ser publicada");
 assert.match(read("docs/index.html"),/href="\.\/manifest\.webmanifest"/);
});
test("PWA específico do Firebase usa arquivos na raiz do Hosting",()=>{
 const sw=read("docs/sw.js");
 assert.ok(sw.includes('"./app.js"'));
 assert.ok(sw.includes('"./styles.css"'));
 assert.ok(sw.includes('"./manifest.webmanifest"'));
 assert.ok(!sw.includes('"./docs/app.js"'));
 assert.match(read("docs/pwa-controller.js"),/new URL\("\.\.\/sw\.js",import\.meta\.url\)/);
});
test("Digital Asset Links pode ser enviado sem reescrever para index",()=>{
 const h=JSON.parse(read("firebase.json")).hosting;
 const paths=h.headers.map(x=>x.source);
 assert.ok(paths.includes("/.well-known/assetlinks.json"));
 assert.ok(!h.rewrites||!h.rewrites.some(r=>r.source.includes(".well-known")));
});
