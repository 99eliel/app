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
    role:"editor",enabled:true,updatedAt:timestamp()
   });
   await setDoc(doc(db,"municipalities","cidade-b","members","editor-b"),{
    role:"editor",enabled:true,updatedAt:timestamp()
   });
  });

  const superDb=env.authenticatedContext("owner").firestore();
  const citizenDb=env.authenticatedContext("citizen").firestore();
  const editorA=env.authenticatedContext("editor-a").firestore();
  const editorB=env.authenticatedContext("editor-b").firestore();
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

  await t.test("Editor pode escrever apenas no próprio município licenciado",async()=>{
   await assertSucceeds(setDoc(doc(editorA,"municipalities","cidade-a","moduleSettings","laboratorio"),{
    enabled:true,updatedAt:Timestamp.now()
   }));
   await assertFails(getDoc(doc(editorA,"municipalities","cidade-b","moduleEntries","esf","items","unit-private")));
   await assertFails(setDoc(doc(editorA,"municipalities","cidade-b","moduleSettings","laboratorio"),{
    enabled:true,updatedAt:Timestamp.now()
   }));
   await assertFails(setDoc(doc(editorB,"municipalities","cidade-b","moduleSettings","laboratorio"),{
    enabled:true,updatedAt:Timestamp.now()
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
