import test from "node:test";
import assert from "node:assert/strict";
import {LICENSE_STATUS,effectiveLicenseStatus,isLicenseWritable,parseBrlToCents,centsToBrlInput,endOfLocalDate,dateInputFromTimestamp} from "../docs/license-core.js";
const now=Date.parse("2026-10-26T12:00:00Z"),later={toMillis:()=>now+86400000},earlier={toMillis:()=>now-86400000};
test("Sem licença não concede escrita",()=>{
 assert.equal(effectiveLicenseStatus(null,now),"unconfigured");
 assert.equal(isLicenseWritable(null,now),false);
});
test("Estados ativos exigem validade futura",()=>{
 for(const status of ["trial","active","grace"]){
  assert.equal(effectiveLicenseStatus({status,validUntil:later},now),status);
  assert.equal(isLicenseWritable({status,validUntil:later},now),true);
  assert.equal(effectiveLicenseStatus({status,validUntil:earlier},now),"expired");
  assert.equal(isLicenseWritable({status,validUntil:earlier},now),false);
 }
});
test("Suspensa e encerrada não permitem escrita",()=>{
 for(const status of ["suspended","canceled"]){
  assert.equal(isLicenseWritable({status,validUntil:later},now),false);
  assert.equal(effectiveLicenseStatus({status,validUntil:later},now),status);
 }
});
test("Estados desconhecidos permanecem bloqueados",()=>{
 assert.equal(isLicenseWritable({status:"hacked",validUntil:later},now),false);
 assert.equal(isLicenseWritable({status:"active"},now),false);
 assert.deepEqual(LICENSE_STATUS,["trial","active","grace","suspended","canceled"]);
});
test("Valores comerciais em centavos",()=>{
 assert.equal(parseBrlToCents("299,90"),29990);
 assert.equal(parseBrlToCents("1.5"),150);
 assert.equal(parseBrlToCents("0"),0);
 assert.equal(centsToBrlInput(29990),"299,90");
 assert.equal(parseBrlToCents("1.000,00"),null);
 assert.equal(parseBrlToCents("-1"),null);
 assert.equal(parseBrlToCents("1000001"),null);
});
test("Validação de datas",()=>{
 assert.equal(endOfLocalDate("2026-02-30"),null);
 assert.equal(endOfLocalDate("inválido"),null);
 const d=endOfLocalDate("2026-10-30");
 assert.ok(d instanceof Date);
 assert.equal(dateInputFromTimestamp(d),"2026-10-30");
});
