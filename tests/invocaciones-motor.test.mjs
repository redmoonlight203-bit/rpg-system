import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia as cargar} from './helpers/cargar-ts.mjs';
const i=cargar('invocaciones'),c=cargar('combate');
// Habilidad de invocar sin dados (como «Sol sagrado»): debe aparecer igual en la barra.
const config={claseMaxima:'C',maxHabilidades:1,modo:'jugador_en_combate',duracionTurnos:2,costePh:2,maxActivas:1};
const habilidad={id:'h',nombre:'Llamada',stats:{},efectos:[],configuracion_invocacion:config};
function ficha(id,h=habilidad){return {id,forja_id:null,nombre:id,stats:{vida:20,ph:10,fatiga:10,iniciativa:id==='a'?20:0},configuracion:{tipo_creacion:'personaje',habilidades:[h]}};}
function campo(h=habilidad){return c.iniciar(c.agregar(c.agregar(c.nuevoCombate(),ficha('a',h),'jugador',()=>20),ficha('b',h),'enemigo',()=>1),()=>1);}
/** Habilidad con otra duración (la duración la fija la habilidad equipada). */
const dura=d=>({...habilidad,configuracion_invocacion:{...config,duracionTurnos:d}});
const de=(x,id)=>x.miembros.find(m=>m.id===id);
const criatura=(nombre='Lobo')=>({id:'x',forja_id:null,nombre,stats:{vida:8},configuracion:{tipo_creacion:'personaje'}});

test('la acción de invocar aparece aunque la habilidad no tenga dados, con su coste y sus límites',()=>{
 const x=campo();
 const [acc]=c.accionesInvocacion(x,de(x,'a'));
 assert.equal(acc.id,'invocar:h');assert.equal(acc.presupuesto,'principal');assert.equal(acc.efecto.coste_ph,2);assert.equal(acc.efecto.efecto,'invocar');
 assert.equal(acc.bloqueada,undefined);assert.equal(acc.invocacion.id,'h');
 assert.equal(c.acciones(de(x,'a')).filter(a=>a.id.startsWith('invocar:')).length,1);
 assert.equal(c.accionesEnCombate(x,de(x,'a')).filter(a=>a.id.startsWith('invocar:')).length,1,'sin duplicados en la barra');
 assert.throws(()=>c.actuar(x,'a','invocar:h','b',()=>10),/se elige en su ventana|Confirma la criatura/);
 const pobre=structuredClone(x);de(pobre,'a').ph=1;
 assert.match(c.accionesInvocacion(pobre,de(pobre,'a'))[0].bloqueada,/PH insuficientes/);
 const y=c.incorporarInvocacion(x,'a',habilidad,criatura(),2,1,()=>5);
 assert.match(c.accionesInvocacion(y,de(y,'a'))[0].bloqueada,/Ya tienes esta criatura/);
 // La duración y el máximo los fija la habilidad equipada: no se aceptan otros desde fuera.
 assert.throws(()=>c.incorporarInvocacion(x,'a',habilidad,criatura(),9,1,()=>5),/límites de invocación cambiaron/);
});

test('solicitud del jugador: queda pendiente sin pagar; el GM la materializa o la rechaza',()=>{
 const x=campo();
 assert.throws(()=>c.solicitarInvocacion(x,'a','h'),/Diseña tu criatura/);
 assert.throws(()=>c.solicitarInvocacion(x,'a','h',{nombre:'L',stats:{vida:'mucha'},habilidades:[],pasivas:[]}),/inválida/);
 assert.throws(()=>c.solicitarInvocacion(x,'b','h',{nombre:'L',stats:{vida:5},habilidades:[],pasivas:[]}),/durante tu turno/);
 const p={nombre:' Lobo ',stats:{vida:5},habilidades:[],pasivas:[],extra:'ignorado'};
 const y=c.solicitarInvocacion(x,'a','h',p);
 assert.equal(y.solicitud_invocacion.actor,'a');assert.equal(y.solicitud_invocacion.propuesta.nombre,'Lobo');
 assert.equal(y.solicitud_invocacion.propuesta.extra,undefined);
 assert.equal(de(y,'a').ph,10);assert.equal(de(y,'a').accion_usada,false,'no paga hasta validarse');
 assert.throws(()=>c.solicitarInvocacion(y,'a','h',p),/esperando validación/);
 // Rechazo con motivo.
 const r=c.cancelarInvocacion(y,'a','El poder total supera la clase C.');
 assert.equal(r.solicitud_invocacion,undefined);assert.equal(r.invocacion_rechazada.motivo,'El poder total supera la clase C.');
 // Aceptada: paga, gasta la acción y limpia la solicitud.
 const z=c.incorporarInvocacion(y,'a',habilidad,criatura(),2,1,()=>5);
 assert.equal(z.solicitud_invocacion,undefined);assert.equal(de(z,'a').ph,8);assert.equal(de(z,'a').accion_usada,true);
 // Si termina el turno antes de validarla, se descarta con aviso.
 const t=c.siguiente(y,()=>1);
 assert.equal(t.solicitud_invocacion,undefined);assert.match(t.invocacion_rechazada.motivo,/Terminó el turno/);
});

test('la criatura muerta o expirada deja el campo; si cae el invocador, se desvanece',()=>{
 let x=c.incorporarInvocacion(campo(dura(1)),'a',dura(1),criatura(),1,1,()=>5);
 const id=x.miembros[2].id;
 // Muere por daño: sale del tablero en cuanto se registra el golpe.
 const larga=c.incorporarInvocacion(campo(dura(5)),'a',dura(5),criatura(),5,1,()=>5);
 const golpeada=structuredClone(larga);const id2=golpeada.miembros[2].id;de(golpeada,id2).vida=1;de(golpeada,'b').stats.bono_impacto=50;
 let g=golpeada;while(g.actual!=='b')g=c.siguiente(g,()=>1);
 const pb=c.posicionesTablero(g)[ 'b'];de(g,id2).posicion={x:pb.x+1,y:pb.y};
 g=c.actuar(g,'b','ataque',id2,()=>20);
 assert.equal(de(g,id2),undefined,'la criatura muerta no queda como cadáver');
 // Expira tras su turno.
 let e=x;for(let k=0;k<6&&de(e,id);k++)e=c.siguiente(e,()=>1);
 assert.equal(de(e,id),undefined);assert.match(e.registro.join('\n'),/termina su invocación/);
 // El invocador cae: la criatura se desvanece aunque le quedaran turnos.
 let f=c.incorporarInvocacion(campo(dura(5)),'a',dura(5),criatura(),5,1,()=>5);
 const fid=f.miembros[2].id;
 while(f.actual!=='b')f=c.siguiente(f,()=>1);
 de(f,'a').vida=1;de(f,'b').stats.bono_impacto=50;
 const pf=c.posicionesTablero(f)['b'];de(f,'a').posicion={x:pf.x+1,y:pf.y};
 f=c.actuar(f,'b','ataque','a',()=>20);
 assert.ok(de(f,'a').vida<=0);
 assert.equal(de(f,fid),undefined);assert.match(f.registro.join('\n'),/se desvanece/);
 // El combate no termina por perder una invocación ni la cuenta como derrota.
 assert.ok(!(g.eventos||[]).some(ev=>ev.objetivo===id2));
});

test('preparación: criatura temporal desde el catálogo y especie con malla al nivel del invocador',()=>{
 const cat=[{id:'g',nombre:'Mordisco',tipo_creacion:'habilidad',clase:'C',stats:{},configuracion_dados:[{id:'m'}]},{id:'p',nombre:'Piel',tipo_creacion:'pasiva',clase:'C',reglas:[],reglas_pasivas:[{id:'r'}]}];
 const t=i.criaturaTemporal({nombre:' Lobo ',stats:{vida:9},habilidades:['g'],pasivas:['p']},cat);
 assert.equal(t.nombre,'Lobo');assert.equal(t.configuracion.habilidades[0].efectos[0].id,'m');assert.equal(t.configuracion.pasivas[0].reglas[0].id,'r');
 assert.throws(()=>i.criaturaTemporal({nombre:'L',stats:{vida:9},habilidades:['p'],pasivas:[]},cat),/ya no está disponible/);
 assert.throws(()=>i.criaturaTemporal({nombre:'L',stats:{vida:0},habilidades:[],pasivas:[]},cat),/vida positiva/);
 const base={stats:{vida:1,armadura:2},configuracion:{bonos_equipamiento:{vida:3}}};
 const malla={es_grupo:true,stats_rango:{vida:{min:10,max:100}},nivel_maximo:10};
 assert.equal(i.statsCriaturaExistente(base,malla,1,()=>0.5).vida,13);
 assert.equal(i.statsCriaturaExistente(base,malla,10,()=>0.5).vida,103);
 assert.equal(i.statsCriaturaExistente(base,malla,50,()=>0.5).nivel,10,'con el tope de la especie');
 assert.deepEqual({...i.statsCriaturaExistente(base,{es_grupo:false},7)},{vida:1,armadura:2});
 assert.deepEqual({...i.propuestaInicial({...config,rangos:{vida:{min:4,max:9},fuerza:{min:2,max:5}}}).stats},{vida:4,fuerza:2});
});
