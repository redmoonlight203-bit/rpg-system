import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as motor from '../supabase/functions/equipo-combate/motor.js';
const entrada=readFileSync(new URL('../supabase/functions/combate-jugador/index.ts',import.meta.url),'utf8').replace(/^import .* from '\.\.\/equipo-combate\/motor.js';/m,'const {actuar,siguiente,acciones,estadisticas,maxVida,dadoSeguro}=motor;');
const jugador='00000000-0000-0000-0000-000000000001', combate='00000000-0000-0000-0000-000000000002';
function servidor({auth=true,turno=true,usada=false}={}){
 let handler;const escrituras=[];let c=motor.agregar(motor.nuevoCombate(),{id:'a',nombre:'Axel',stats:{vida:20,ph:10,fatiga:5},configuracion:{tipo_creacion:"personaje"}},'jugador',()=>10);c=motor.agregar(c,{id:'b',nombre:'Secreto enemigo',stats:{vida:100,ph:500},configuracion:{tipo_creacion:"personaje",habilidades:[{nombre:'Ataque secreto',stats:{}}]}},'enemigo',()=>1);c=motor.iniciar(c,()=>10);c.actual=turno?'a':'b';c.miembros[0].personaje_id='1';c.miembros[0].accion_usada=usada;
 const mock=async(url,options)=>{if(url.endsWith('/auth/v1/user'))return Response.json(auth?{id:jugador}:{error:'no'},{status:auth?200:401});if(url.endsWith('/jugador_contexto_servidor'))return Response.json({id:combate,nombre:'Prueba',version:3,combate:c,actor:c.miembros[0]});if(url.endsWith('/jugador_confirmar_servidor')){escrituras.push(JSON.parse(options.body));return Response.json(null);}throw Error(url);};
 new Function('Deno','fetch','Response','motor',entrada)({env:{get:k=>k==='SUPABASE_URL'?'https://test':'secreto-servidor'},serve:f=>handler=f},mock,Response,motor);return {handler,escrituras};
}
const req=body=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({combate_id:combate,actor_id:'a',...body})});
test('rechaza sesión inválida',async()=>{const s=servidor({auth:false});assert.equal((await s.handler(req({}))).status,401);assert.equal(s.escrituras.length,0);});
test('consulta oculta estadísticas, habilidades e historial de enemigos',async()=>{const s=servidor();const r=await s.handler(req({}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.combate,undefined);assert.equal(data.objetivos[1].stats,undefined);assert.equal(JSON.stringify(data).includes('Ataque secreto'),false);});
test('no acepta actuar fuera de turno, versión obsoleta o acción ya consumida',async()=>{for(const [options,version] of [[{turno:false},3],[{},2],[{usada:true},3]]){const s=servidor(options);assert.equal((await s.handler(req({operacion:'actuar',version,accion_id:'guardia',objetivo_id:'a'}))).status,400);assert.equal(s.escrituras.length,0);}});
test('calcula acción en servidor e ignora resultado inventado por cliente',async()=>{const s=servidor();assert.equal((await s.handler(req({operacion:'actuar',version:3,accion_id:'guardia',objetivo_id:'a',p_datos:{vida:9999}}))).status,200);assert.equal(s.escrituras.length,1);assert.equal(s.escrituras[0].p_usuario,jugador);assert.equal(s.escrituras[0].p_datos.miembros[0].accion_usada,true);assert.equal(s.escrituras[0].p_datos.miembros[0].vida,20);});
test('pasar turno se calcula con el motor compartido',async()=>{const s=servidor();assert.equal((await s.handler(req({operacion:'pasar',version:3}))).status,200);assert.equal(s.escrituras[0].p_datos.actual,'b');});
