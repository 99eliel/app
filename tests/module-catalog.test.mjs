import test from "node:test";
import assert from "node:assert/strict";
import {MODULES,MODULE_IDS,MODULE_BY_ID,escapeText,validPublicUrl} from "../docs/module-catalog.js";

test("módulos sem registros municipais importados",()=>{
 assert.ok(MODULES.length>=15);
 assert.equal(new Set(MODULE_IDS).size,MODULE_IDS.length);
 assert.ok(MODULES.every(m=>m.id&&m.group&&m.name&&m.description));
 assert.ok(!MODULES.some(m=>JSON.stringify(m).includes("Pontalina")));
 assert.ok(!MODULES.some(m=>m.id==="defaultCity"));
});
test("compatibilidade com fluxos do ConecteBR",()=>{
 for(const id of ["upa","esf","agendamentos","triagem","laboratorio","farmacia","cetec","campanhas","escalas","servicos","engenharia","meioambiente","educacao","esportes","infraestrutura"]){
  assert.ok(MODULE_BY_ID[id],id);
 }
});
test("conteúdo externo protege HTML e links",()=>{
 assert.equal(escapeText("<script>alert('x')</script>"),"&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
 assert.equal(validPublicUrl("javascript:alert(1)"),"");
 assert.equal(validPublicUrl("http://site.com"),"");
 assert.equal(validPublicUrl("https://example.com/"),"https://example.com/");
});
