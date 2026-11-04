import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const entrada=new URL('../lib/combate.ts',import.meta.url),salida=new URL('../supabase/functions/equipo-combate/motor.js',import.meta.url);
const content='// GENERADO por scripts/preparar-motor-edge.mjs. No editar directamente.\n'+ts.transpileModule(readFileSync(entrada,'utf8'),{fileName:'combate.ts',compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
if(process.argv.includes('--check')){if(readFileSync(salida,'utf8')!==content)throw Error('Regenera el motor compartido: node scripts/preparar-motor-edge.mjs');}else writeFileSync(salida,content);
