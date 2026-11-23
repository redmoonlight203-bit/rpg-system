import * as m from '../../supabase/functions/equipo-combate/motor.js';
export {m};
export const ef=(id,extra={})=>({id,nombre:id,efecto:'dano',cantidad:1,caras:6,modificador:0,coste_ph:0,...extra});
/** Combate en directo (todo impacta) con miembros {id,bando,x,y?,efectos?,stats?}. */
export function campo(miembros,regla='directo'){
 let c=m.nuevoCombate();
 for(const x of miembros)c=m.agregar(c,{id:x.id,nombre:x.id,stats:{vida:50,ph:20,armadura:0,salvacion:0,...x.stats},posicion:{x:x.x,y:x.y??1},configuracion:{tipo_creacion:'personaje',habilidades:[{id:'h'+x.id,nombre:'H',stats:{},efectos:x.efectos||[ef('golpe')]}]}},x.bando,()=>1);
 c=m.iniciar(c,()=>1);c.regla=regla;return c;
}
/** Dados en cola (el último se repite) y registro de las ofertas de reacción. */
export function dados(valores,decide=()=>true){
 let i=0;const r=caras=>{const v=valores[Math.min(i++,valores.length-1)];return Math.min(v,caras);};
 r.ofertas=[];r.consultarReaccion=o=>{r.ofertas.push(o);return decide(o);};return r;
}
export const de=(c,id)=>c.miembros.find(x=>x.id===id);
export function turnoDe(c,id){const n=structuredClone(c);n.actual=id;for(const x of n.miembros)x.accion_usada=false;return n;}
