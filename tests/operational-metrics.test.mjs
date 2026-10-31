import test from "node:test";
import assert from "node:assert/strict";
import {metricCounts,sanitizedMetricsCsv} from "../docs/operational-metrics.js";

test("relatório sem cadastros começa zerado",()=>{
 assert.deepEqual(metricCounts(),{
  activeModules:0,esfRegistered:0,esfPublished:0,activeNotices:0,
  pendingAppointments:0,pendingEnrollments:0,operationalQueue:null
 });
});
test("conta registros reais e estados pendentes",()=>{
 const m=metricCounts({
  settings:[{enabled:true},{enabled:false},{enabled:true}],
  esf:[{title:"Posto Central",published:true},{title:"",published:false},{title:"Posto Bairro",published:false}],
  notices:[{published:true},{published:false}],
  appointments:[{status:"pending"},{status:"confirmed"},{status:"pending"}],
  enrollments:[{status:"pending"}],
  upaStatus:{queue:0}
 });
 assert.equal(m.activeModules,2);
 assert.equal(m.esfRegistered,2);
 assert.equal(m.esfPublished,1);
 assert.equal(m.activeNotices,1);
 assert.equal(m.pendingAppointments,2);
 assert.equal(m.pendingEnrollments,1);
 assert.equal(m.operationalQueue,0);
});
test("exportação contém contagens agregadas, sem dados pessoais",()=>{
 const metrics=metricCounts();
 const csv=sanitizedMetricsCsv("Município Teste",metrics);
 assert.match(csv,/Município Teste/);
 assert.match(csv,/Fila UPA/);
 assert.ok(!csv.includes("uid"));
 assert.ok(!csv.includes("email"));
});
