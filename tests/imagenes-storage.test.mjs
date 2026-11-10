import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {webcrypto} from "node:crypto";
import vm from "node:vm";
import ts from "typescript";

const source=ts.transpileModule(readFileSync(new URL("../lib/imagenes-storage.ts",import.meta.url),"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
}).outputText;
const image="data:image/webp;base64,QUJD";
function cargar({user={id:"usuario-123"},uploadError=null,files=[]}={}) {
  const env={files,uploaded:[],user};
  const storage={
    upload:async(path,bytes,opts)=>{env.uploaded.push({path,bytes:Buffer.from(bytes),opts});return {error:uploadError};},
    list:async()=>({data:files.map(name=>({name})),error:null}),
    getPublicUrl:path=>({data:{publicUrl:"https://example.supabase.co/storage/v1/object/public/imagenes/"+path}})
  };
  const supabase={auth:{getUser:async()=>({data:{user},error:null})},storage:{from:bucket=>{assert.equal(bucket,"imagenes");return storage;}}};
  const exports={};
  vm.runInNewContext(source,{
    exports,require:module=>module==="./supabase"?{supabase}:{prepararPortada:async()=>image,validarPortada:x=>x.startsWith("data:image/")?null:"bad"},
    atob,Uint8Array,crypto:webcrypto,Buffer,Error
  });
  return {api:exports,env};
}
test("publica WebP con hash estable, sin upsert ni clave administrativa",async()=>{
  const {api,env}=cargar();
  const url=await api.publicarDataImage(image);
  assert.match(url,/usuario-123\/retratos\/[a-f0-9]{64}\.webp$/);
  assert.equal(env.uploaded.length,1);
  assert.equal(env.uploaded[0].bytes.toString(),"ABC");
  assert.equal(env.uploaded[0].opts.upsert,false);
  assert.equal(env.uploaded[0].opts.contentType,"image/webp");
});
test("reintento seguro reutiliza imagen ya almacenada",async()=>{
  const {api,env}=cargar({uploadError:{message:"Already exists"}});
  // El nombre está definido por SHA256 del contenido ABC.
  const digest="b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78";
  env.files.push(digest+".webp");
  const url=await api.publicarDataImage(image);
  assert.ok(url.endsWith(digest+".webp"));
});
test("sin sesión autenticada no intenta publicar",async()=>{
  const {api,env}=cargar({user:null});
  await assert.rejects(api.publicarDataImage(image),/Inicia sesión/);
  assert.equal(env.uploaded.length,0);
});
test("rechaza tipo de imagen sin autorización de Storage",async()=>{
  const {api,env}=cargar();
  await assert.rejects(api.publicarDataImage("data:image/jpeg;base64,QUJD"),/WebP o PNG/);
  assert.equal(env.uploaded.length,0);
});
