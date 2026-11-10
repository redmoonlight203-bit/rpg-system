import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const archivos=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
let fallos=0;
for(const archivo of archivos){
 if(/\.(zip|rar)$/i.test(archivo)){console.error('Archivo comprimido prohibido: '+archivo);fallos++;continue;}
 if(/(^|\/)\.env/.test(archivo)){console.error('Archivo de entorno versionado: '+archivo);fallos++;continue;}
 const contenido=readFileSync(archivo);
 if(contenido.includes(0))continue;
 const texto=contenido.toString('utf8');
 const clavePrivada=/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|\bsb_secret_[A-Za-z0-9_-]{20,}/.test(texto);
 const jwtPrivado=[...texto.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].some(m=>{
  try{return JSON.parse(Buffer.from(m[1],'base64url').toString()).role==='service_role';}catch{return false;}
 });
 if(clavePrivada||jwtPrivado){console.error('Posible clave privada en '+archivo+' (valor oculto)');fallos++;}
}
console.log('Archivos revisados: '+archivos.length+'. Hallazgos: '+fallos+'.');
process.exitCode=fallos?1:0;
