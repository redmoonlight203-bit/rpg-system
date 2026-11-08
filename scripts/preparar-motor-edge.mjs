import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const entrada=new URL('../lib/combate.ts',import.meta.url),salida=new URL('../supabase/functions/equipo-combate/motor.js',import.meta.url);
const compilar=archivo=>ts.transpileModule(readFileSync(archivo,'utf8'),{fileName:archivo.pathname,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
// El mismo motor autónomo se ejecuta en Node y en ambos endpoints de Deno.
// Encapsular la dependencia evita colisiones con funciones del combate (maxVida).
const motor=compilar(entrada).replace(/^import \{([^}]+)\} from ["']\.\/transformaciones["'];$/m,(_linea,nombres)=>{
 const transformaciones=compilar(new URL('../lib/transformaciones.ts',import.meta.url)).replace(/^export /gm,'');
 return `const {${nombres}} = (() => {\n${transformaciones}\nreturn {${nombres}};\n})();`;
});
if(/^import /m.test(motor))throw Error('Falta incorporar una dependencia del motor Edge.');
const content='// GENERADO por scripts/preparar-motor-edge.mjs. No editar directamente.\n'+motor;
if(process.argv.includes('--check')){if(readFileSync(salida,'utf8')!==content)throw Error('Regenera el motor compartido: node scripts/preparar-motor-edge.mjs');}else writeFileSync(salida,content);
