// Compara únicamente los atributos base de nivel 1, sin equipo ni pasivas.
import { readFileSync } from 'node:fs';
import { agregar, iniciar, actuar, siguiente, nuevoCombate } from '../supabase/functions/equipo-combate/motor.js';

const sql=readFileSync(new URL('../supabase/migrations/20261120183100_bases_raciales_balance.sql',import.meta.url),'utf8');
const claves=['vida','armadura','ph','fatiga','bono_impacto','dano','iniciativa','salvacion','movimiento'];
const stats=lista=>Object.fromEntries(lista.split(',').map((v,i)=>[claves[i],Number(v)]));
const razas=Array.from(sql.matchAll(/\('([a-z_]+)',array\[([\d,-]+)\],array\[([\d,-]+)\]\)/g),
  ([,nombre,actual,anterior])=>({nombre,actual:stats(actual),anterior:stats(anterior)}));
if(razas.length!==8)throw Error('Se esperaban ocho perfiles raciales.');
function duelo(a,b,version,semilla){
  let estado=semilla;
  const rng=caras=>{estado=(Math.imul(1664525,estado)+1013904223)>>>0;return 1+Math.floor(estado/2**32*caras);};
  let c=nuevoCombate();
  c.regla='impacto';
  for(const [i,raza] of [a,b].entries()){
    c=agregar(c,{id:raza.nombre,nombre:raza.nombre,forja_id:null,stats:raza[version],configuracion:{tipo_creacion:'personaje'}},i?'enemigo':'jugador',rng);
  }
  c.miembros.forEach((m,i)=>{m.posicion={x:i+1,y:1};});
  c=iniciar(c,rng);
  for(let turno=0;turno<100;turno++){
    const actor=c.miembros.find(m=>m.id===c.actual);
    const rival=c.miembros.find(m=>m.id!==actor?.id);
    if(!actor||!rival)throw Error('Falta un participante.');
    c=actuar(c,actor.id,'ataque',rival.id,rng);
    if(c.miembros.some(m=>m.vida<=0))return c.miembros.find(m=>m.vida>0)?.id;
    c=siguiente(c,rng);
    c.historial=[];c.registro=[];
  }
  return null;
}
const repeticiones=32;
console.log('Duelos desarmados de nivel 1. Semilla 20261120. Porcentajes de victoria sobre los 7 rivales, alternando los bandos.');
console.log('| Raza | Antes | Después |');
console.log('|---|---:|---:|');
const resultados={};
for(const version of ['anterior','actual']){
  const victorias=new Map(razas.map(r=>[r.nombre,0]));
  for(const [i,a] of razas.entries())for(const b of razas.slice(i+1)){
    for(let n=0;n<repeticiones;n++){
      const semilla=20261120+Math.floor(n/2)*65537;
      const ganador=n%2?duelo(b,a,version,semilla):duelo(a,b,version,semilla);
      if(ganador)victorias.set(ganador,victorias.get(ganador)+1);
    }
  }
  resultados[version]=victorias;
}
for(const raza of razas){
  const porcentaje=v=>(resultados[v].get(raza.nombre)*100/(7*repeticiones)).toFixed(1)+' %';
  console.log('| '+[raza.nombre,porcentaje('anterior'),porcentaje('actual')].join(' | ')+' |');
}
