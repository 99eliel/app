import test from "node:test";
import assert from "node:assert/strict";
import {APP_VERSION,compareVersions,versionParts,isStandalone,installedStatus} from "../docs/mobile-core.js";
test("Versão do aplicativo segue semver",()=>{
 assert.deepEqual(versionParts(APP_VERSION),[2,1,0]);
 assert.equal(compareVersions("2.1.0","2.0.9"),1);
 assert.equal(compareVersions("2.1.0","2.1.0"),0);
 assert.equal(compareVersions("2.1.0","2.1.5"),-1);
 assert.equal(compareVersions("invalid","2.1.0"),null);
});
test("Modo instalado reconhece Chrome no Android e navegadores iOS",()=>{
 assert.equal(isStandalone({displayMode:true}),true);
 assert.equal(isStandalone({iosStandalone:true}),true);
 assert.equal(isStandalone({}),false);
});
test("Diagnóstico não finge conexão nem instalação",()=>{
 assert.deepEqual(installedStatus({}),{
  standalone:false,swSupported:false,swControlled:false,online:true
 });
 assert.equal(installedStatus({swSupported:true,swControlled:false}).swControlled,false);
});
