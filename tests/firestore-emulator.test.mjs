import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {initializeTestEnvironment, assertSucceeds, assertFails} from "@firebase/rules-unit-testing";
import {collection,doc,addDoc,getDoc,getDocs,query,where,setDoc,updateDoc,Timestamp} from "firebase/firestore";

const projectId="demo-conectasaude-ci";
const timestamp=()=>Timestamp.fromDate(new Date("2026-10-01T10:00:00Z"));
const expiration=()=>Timestamp.fromDate(new Date("2099-01-01T00:00:00Z"));

test("Regras Firestore: permissões e isolamento multi-município", async t=>{
 const env=await initializeTestEnvironment({
  projectId,
  firestore:{
   host:"127.0.0.1",
   port:8080,
   rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")
  }
 });
 try{
  await env.withSecurityRulesDisabled(async context=>{
   const db=context.firestore();
   await setDoc(doc(db,"platformAdmins","owner"),{enabled:true});
   for(const id of ["cidade-a","cidade-b"]){
    await setDoc(doc(db,"municipalities",id),{
     name:id==="cidade-a"?"Cidade A":"Cidade B",state:"GO",
     active:true,createdAt:timestamp(),updatedAt:timestamp()
    });
    await setDoc(doc(db,"licenses",id),{
     status:id==="cidade-a"?"active":"suspended",
     planCode:"Inicial",validUntil:expiration(),
     monthlyPriceCents:0,notes:"",
     createdAt:timestamp(),updatedAt:timestamp()
    });
    await setDoc(doc(db,"municipalities",id,"moduleSettings","esf"),{
     enabled:true,updatedAt:timestamp()
    });
    await setDoc(doc(db,"municipalities",id,"moduleSettings","agendamentos"),{
     enabled:true,updatedAt:timestamp()
    });
    await setDoc(doc(db,"municipalities",id,"moduleEntries","esf","items","unit-public"),{
     moduleKey:"esf",title:"Posto Público",description:"",
     details:"",address:"",phone:"",hours:"",link:"",
     published:true,createdAt:timestamp(),updatedAt:timestamp()
    });
    await setDoc(doc(db,"municipalities",id,"moduleEntries","esf","items","unit-private"),{
     moduleKey:"esf",title:"Rascunho",description:"",
     details:"",address:"",phone:"",hours:"",link:"",
     published:false,createdAt:timestamp(),updatedAt:timestamp()
    });
    await setDoc(doc(db,"municipalities",id,"moduleEntries","agendamentos","items","option-1"),{
     moduleKey:"agendamentos",title:"Consulta disponível",description:"",
     details:"",address:"",phone:"",hours:"",link:"",
     published:true,createdAt:timestamp(),updatedAt:timestamp()
    });
   }
   await setDoc(doc(db,"municipalities","cidade-a","members","editor-a"),{
    role:"editor",enabled:true,moduleIds:["esf","agendamentos"],updatedAt:timestamp()
   });
   await setDoc(doc(db,"municipalities","cidade-a","members","reception-a"),{
    role:"editor",enabled:true,moduleIds:["agendamentos"],updatedAt:timestamp()
   });
   await setDoc(doc(db,"municipalities","cidade-a","members","admin-a"),{
    role:"admin",enabled:true,moduleIds:[],updatedAt:timestamp()
   });
   await setDoc(doc(db,"municipalities","cidade-b","members","editor-b"),{
    role:"editor",enabled:true,moduleIds:["esf"],updatedAt:timestamp()
   });
  });

  const superDb=env.authenticatedContext("owner").firestore();
  const citizenDb=env.authenticatedContext("citizen").firestore();
  const editorA=env.authenticatedContext("editor-a").firestore();
  const editorB=env.authenticatedContext("editor-b").firestore();
  const receptionA=env.authenticatedContext("reception-a").firestore();
  const adminA=env.authenticatedContext("admin-a").firestore();
  const anonymous=env.unauthenticatedContext().firestore();

  await t.test("Superadmin lê licença e edita módulos",async()=>{
   await assertSucceeds(getDoc(doc(superDb,"licenses","cidade-a")));
   await assertSucceeds(setDoc(doc(superDb,"municipalities","cidade-a","moduleSettings","upa"),{
    enabled:true,updatedAt:Timestamp.now()
   }));
  });

  await t.test("Cidadão não lê licenças ou documentos privados",async()=>{
   await assertFails(getDoc(doc(citizenDb,"licenses","cidade-a")));
   await assertFails(getDoc(doc(anonymous,"platformAdmins","owner")));
   await assertFails(getDoc(doc(citizenDb,"municipalities","cidade-a","moduleEntries","esf","items","unit-private")));
   await assertSucceeds(getDoc(doc(anonymous,"municipalities","cidade-a","moduleEntries","esf","items","unit-public")));
  });

  await t.test("Cidadão não pode editar conteúdos nem se tornar Superadmin",async()=>{
   await assertFails(setDoc(doc(citizenDb,"platformAdmins","citizen"),{enabled:true}));
   await assertFails(updateDoc(doc(citizenDb,"municipalities","cidade-a","moduleEntries","esf","items","unit-public"),{title:"Alterado"}));
   await assertFails(setDoc(doc(citizenDb,"municipalities","cidade-a","members","citizen"),{
    role:"admin",enabled:true,updatedAt:Timestamp.now()
   }));
  });

  await t.test("Setores: editor ESF pode cadastrar ESF, mas não gerenciar habilitações",async()=>{
   const newEsf={
    moduleKey:"esf",title:"Outra ESF",description:"",details:"",address:"",
    phone:"",hours:"",link:"",published:false,
    createdAt:Timestamp.now(),updatedAt:Timestamp.now()
   };
   await assertSucceeds(addDoc(collection(editorA,"municipalities","cidade-a","moduleEntries","esf","items"),newEsf));
   await assertFails(setDoc(doc(editorA,"municipalities","cidade-a","moduleSettings","farmacia"),{enabled:true,updatedAt:Timestamp.now()}));
   await assertFails(addDoc(collection(editorA,"municipalities","cidade-a","moduleEntries","farmacia","items"),{...newEsf,moduleKey:"farmacia"}));
   await assertFails(getDoc(doc(editorA,"municipalities","cidade-b","moduleEntries","esf","items","unit-private")));
  });

  await t.test("Recepção não visualiza rascunhos de outros setores",async()=>{
   await assertFails(getDoc(doc(receptionA,"municipalities","cidade-a","moduleEntries","esf","items","unit-private")));
   await assertSucceeds(getDoc(doc(receptionA,"municipalities","cidade-a","moduleEntries","esf","items","unit-public")));
   await assertSucceeds(getDocs(collection(receptionA,"municipalities","cidade-a","appointmentRequests")));
   await assertFails(getDoc(doc(receptionA,"licenses","cidade-a")));
  });

  await t.test("Administrador municipal pode ativar módulos, editor suspenso não pode editar",async()=>{
   await assertSucceeds(setDoc(doc(adminA,"municipalities","cidade-a","moduleSettings","farmacia"),{
    enabled:true,updatedAt:Timestamp.now()
   }));
   await assertFails(setDoc(doc(editorB,"municipalities","cidade-b","moduleEntries","esf","items","new"),{
    moduleKey:"esf",title:"Bloqueado",description:"",details:"",address:"",phone:"",
    hours:"",link:"",published:false,createdAt:Timestamp.now(),updatedAt:Timestamp.now()
   }));
  });

  await t.test("Superadmin concede setores, sem permitir autoelevação",async()=>{
   await assertSucceeds(setDoc(doc(superDb,"municipalities","cidade-a","members","new-editor"),{
    role:"editor",enabled:true,moduleIds:["upa"],updatedAt:Timestamp.now()
   }));
   await assertFails(setDoc(doc(citizenDb,"municipalities","cidade-a","members","citizen"),{
    role:"admin",enabled:true,moduleIds:[],updatedAt:Timestamp.now()
   }));
   await assertFails(setDoc(doc(superDb,"municipalities","cidade-a","members","bad-editor"),{
    role:"editor",enabled:true,moduleIds:["admin-panel"],updatedAt:Timestamp.now()
   }));
  });

  await t.test("Solicitação válida só pode ser criada pelo próprio cidadão",async()=>{
   const requestData={ownerUid:"citizen",targetId:"option-1",status:"pending",
    createdAt:Timestamp.now(),updatedAt:Timestamp.now()};
   await assertSucceeds(addDoc(collection(citizenDb,"municipalities","cidade-a","appointmentRequests"),requestData));
   await assertFails(addDoc(collection(citizenDb,"municipalities","cidade-a","appointmentRequests"),{...requestData,ownerUid:"editor-a"}));
   await assertFails(addDoc(collection(citizenDb,"municipalities","cidade-b","appointmentRequests"),requestData));
   await assertSucceeds(getDocs(query(collection(citizenDb,"municipalities","cidade-a","appointmentRequests"),where("ownerUid","==","citizen"))));
  });
 }finally{
  await env.cleanup();
 }
});
