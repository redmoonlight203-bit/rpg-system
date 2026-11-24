import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const entrada=new URL('../lib/combate.ts',import.meta.url),salida=new URL('../supabase/functions/equipo-combate/motor.js',import.meta.url);
const compilar=archivo=>ts.transpileModule(readFileSync(archivo,'utf8'),{fileName:archivo.pathname,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
// El mismo motor autónomo se ejecuta en Node y en ambos endpoints de Deno.
// Encapsular la dependencia evita colisiones con funciones del combate (maxVida).
const motor0=compilar(entrada);
// Incrusta las dependencias puras del motor, también cuando son transitivas.
const incrustar=(texto,modulo)=>texto.replace(new RegExp(`^import \\{([^}]+)\\} from ["']\\./${modulo}["'];$`,'m'),(_linea,nombres)=>{
 // Las dependencias puras pueden importar otras puras (estados → inmunidades): se incrustan dentro de su ámbito.
 let fuente=compilar(new URL(`../lib/${modulo}.ts`,import.meta.url)).replace(/^export /gm,'');
 for(const [,interno] of fuente.matchAll(/^import \{[^}]+\} from ["']\.\/([\w-]+)["'];$/gm))fuente=incrustar(fuente,interno);
 return `const {${nombres}} = (() => {\n${fuente}\nreturn {${nombres}};\n})();`;
});
const motor=['transformaciones','huellas-combate','patron-area','vision','reacciones','artefactos-voces','espejo-mental','inmunidades','estados','recursos','rasgos','conceptos-basicos','animaciones-armas','esqueletos'].reduce(incrustar,motor0);
if(/^import /m.test(motor))throw Error('Falta incorporar una dependencia del motor Edge.');
const content='// GENERADO por scripts/preparar-motor-edge.mjs. No editar directamente.\n'+motor;
if(process.argv.includes('--check')){if(readFileSync(salida,'utf8')!==content)throw Error('Regenera el motor compartido: node scripts/preparar-motor-edge.mjs');}else writeFileSync(salida,content);
