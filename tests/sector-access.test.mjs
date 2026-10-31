import test from "node:test";
import assert from "node:assert/strict";
import {ACCESS_GROUPS,normalizedGrants,canAccessModule,canManageModules,adminTabGranted} from "../docs/sector-access.js";

test("Nenhuma permissão de editor é presumida em perfis antigos",()=>{
 assert.equal(canAccessModule({member:{role:"editor",enabled:true},moduleId:"upa"}),false);
 assert.equal(canAccessModule({member:{role:"editor",enabled:false,moduleIds:["upa"]},moduleId:"upa"}),false);
});
test("Recepção só tem acesso ao próprio módulo",()=>{
 const member={role:"editor",enabled:true,moduleIds:["agendamentos"]};
 assert.equal(canAccessModule({member,moduleId:"agendamentos"}),true);
 assert.equal(canAccessModule({member,moduleId:"upa"}),false);
 assert.equal(adminTabGranted({member,tab:"units"}),false);
 assert.equal(canManageModules({member}),false);
});
test("Administrador municipal possui todas as áreas; Superadmin prevalece",()=>{
 assert.equal(canAccessModule({member:{role:"admin",enabled:true,moduleIds:[]},moduleId:"upa"}),true);
 assert.equal(canManageModules({member:{role:"admin",enabled:true}}),true);
 assert.equal(canAccessModule({isPlatformAdmin:true,moduleId:"farmacia"}),true);
});
test("Escopos são normalizados, duplicados removidos e funções desconhecidas rejeitadas",()=>{
 assert.deepEqual(normalizedGrants(["upa","upa","invalida","esf"]),["upa","esf"]);
 assert.equal(canAccessModule({member:{role:"editor",enabled:true,moduleIds:["qualquer"]},moduleId:"qualquer"}),false);
 assert.equal(ACCESS_GROUPS.length,15);
});
