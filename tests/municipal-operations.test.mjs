import test from "node:test";
import assert from "node:assert/strict";
import {nextQueueValue,statusLabel,normalizeOperationalInfo,summarizeEsf,countRequestStatuses} from "../docs/municipal-operations.js";

test("UPA: entrada e saída têm limites e não inventam contagem inicial",()=>{
 assert.equal(nextQueueValue(null,1),null);
 assert.equal(nextQueueValue(undefined,1),null);
 assert.equal(nextQueueValue(0,-1),null);
 assert.equal(nextQueueValue(0,1),1);
 assert.equal(nextQueueValue(7,-1),6);
 assert.equal(nextQueueValue(9999,1),null);
 assert.equal(nextQueueValue(1,2),null);
});

test("Situação da UPA nunca mostra fila fictícia",()=>{
 assert.equal(normalizeOperationalInfo(null).queue,null);
 assert.equal(normalizeOperationalInfo({queue:0}).queue,0);
 assert.equal(normalizeOperationalInfo({queue:-1}).queue,null);
 assert.equal(normalizeOperationalInfo({queue:9999}).queue,9999);
 assert.equal(normalizeOperationalInfo({queue:10000}).queue,null);
});

test("ESF: resumo usa apenas registros existentes",()=>{
 assert.deepEqual(summarizeEsf([]),{total:0,published:0,missingHours:0});
 assert.deepEqual(summarizeEsf([
  {title:"Unidade X",published:true,hours:"Seg-sex"},
  {title:"Unidade Y",published:false,hours:""}
 ]),{total:2,published:1,missingHours:1});
});

test("Solicitações: estados sem identificação clínica",()=>{
 assert.deepEqual(countRequestStatuses([]),{pending:0,confirmed:0,completed:0,canceled:0});
 assert.deepEqual(countRequestStatuses([{status:"pending"},{status:"pending"},{status:"completed"},{status:"unexpected"}]),{pending:2,confirmed:0,completed:1,canceled:0});
 assert.equal(statusLabel("confirmed"),"Confirmada");
 assert.equal(statusLabel("invalid"),"Não informado");
});
