import {m,ef,dados,de,turnoDe} from './campo-reacciones.mjs';
export {m,ef,dados,de,turnoDe};
/** Habilidad pasiva que solo concede inmunidades. */
export const defensas=(...inmunidades)=>ef('defensas',{efecto:'estado',cantidad:0,solo_pasivo:true,inmunidades});
export const aplica=(id,extra={})=>ef(id,{efecto:'estado',estado:'',duracion:2,cantidad:0,...extra});
/** Como `campo`, con pasivas y mapa opcionales. Todos empiezan en (x, y ?? 1). */
export function campoE(miembros,{regla='directo',columnas=10,filas=10,muros=[]}={}){
 let c=m.nuevoCombate();
 for(const x of miembros)c=m.agregar(c,{id:x.id,nombre:x.id,stats:{vida:50,ph:20,armadura:0,salvacion:0,movimiento:6,...x.stats},posicion:{x:x.x,y:x.y??1},configuracion:{tipo_creacion:'personaje',pasivas:x.pasivas,habilidades:[{id:'h'+x.id,nombre:'H',stats:{},efectos:x.efectos||[ef('golpe')]}]}},x.bando,()=>1);
 c=m.configurarMapa(c,{id:'p',version:1,nombre:'Prueba',columnas,filas,celdas:Object.fromEntries(muros.map(k=>[k,'muro']))});
 c=m.iniciar(c,()=>1);c.regla=regla;return c;
}
/** Contador de tiradas: cuántas veces se pidió un dado. */
export function contado(valores){const r=dados(valores);r.n=0;const f=caras=>{r.n++;return r(caras);};f.consultarReaccion=r.consultarReaccion;f.ofertas=r.ofertas;Object.defineProperty(f,'n',{get:()=>r.n});return f;}
