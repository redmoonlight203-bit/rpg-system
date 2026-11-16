// Auditoría estática de pantallas (Fase 3 del plan). Uso: node scripts/auditar-pantallas.mjs . > auditoria.json
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';import path from 'node:path';
const raiz=process.argv[2];
const paginas=[];(function rec(d){for(const f of readdirSync(d)){const p=path.join(d,f);if(statSync(p).isDirectory())rec(p);else if(f==='page.tsx')paginas.push(p);}})(path.join(raiz,'app'));
function resolver(desde,imp){if(!imp.startsWith('.'))return null;const b=path.resolve(path.dirname(desde),imp);for(const c of [b,b+'.tsx',b+'.ts',b+'/index.tsx',b+'/index.ts'])if(existsSync(c)&&statSync(c).isFile())return c;return null;}
function arbol(f,vistos=new Set()){if(vistos.has(f))return vistos;vistos.add(f);const t=readFileSync(f,'utf8');for(const m of t.matchAll(/(?:import|from)\s*\(?\s*['"]([^'"]+)['"]/g)){const r=resolver(f,m[1]);if(r&&/components|app/.test(r)&&!/lib\//.test(r))arbol(r,vistos);}return vistos;}
const filas=[];
for(const p of paginas.sort()){const fs=[...arbol(p)];const t=fs.map(f=>readFileSync(f,'utf8')).join('\n');
 const ruta='/'+path.relative(path.join(raiz,'app'),path.dirname(p)).replace(/\\/g,'/');
 filas.push({ruta,archivos:fs.length,lineas:t.split('\n').length,kb:Math.round(Buffer.byteLength(t)/1024),
  from:(t.match(/\.from\(['"`]/g)||[]).length,rpc:(t.match(/\.rpc\(/g)||[]).length,fn:(t.match(/functions\.invoke|fetch\(/g)||[]).length,
  selectAll:(t.match(/select\(\s*['"`]\*['"`]\s*\)|select\(\)/g)||[]).length,
  carga:/[Cc]argando|aria-busy|Skeleton|cargando/.test(t),vacio:/EmptyState|[Aa]ún no|[Tt]odavía no|No hay|vacío|Sin /.test(t),
  error:/error|Error/.test(t),reintentar:/[Rr]eintentar|[Vv]olver a intentar|[Ii]ntentar de nuevo/.test(t),
  alert:(t.match(/window\.alert|\balert\(/g)||[]).length,errCrudo:(t.match(/\.message\)|error\.message|\{error\.message|e\.message/g)||[]).length,
  limit:/\.limit\(|\.range\(/.test(t)});}
console.log(JSON.stringify(filas));
