import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const ui=cargarDependencia('combate-interfaz');

test('la capa se deduce de los estados que ya produce el motor',()=>{
 assert.equal(ui.capaDe(['En vuelo']),'aire');
 assert.equal(ui.capaDe(['Envenenado','Bajo tierra']),'subsuelo');
 assert.equal(ui.capaDe(['Sumergido']),'agua');
 assert.equal(ui.capaDe(['Etéreo']),'plano');
 assert.equal(ui.capaDe(['Derribado']),'suelo');
 assert.equal(ui.capaDe(undefined),'suelo');
});

test('un efecto «solo suelo» no alcanza el aire, igual que el motor',()=>{
 assert.equal(ui.alcanzaCapa({suelo:true},'aire').ok,false);
 assert.equal(ui.alcanzaCapa({suelo:true},'suelo').ok,true);
 assert.equal(ui.alcanzaCapa({},'aire').ok,true);
 const p=ui.previsualizar({accion:'Terremoto',efecto:{suelo:true},objetivo:{nombre:'Grifo'},capa:'aire',segundoClic:false,pendiente:false});
 assert.match(p.bloqueo,/aire/);assert.equal(p.pista,'No se puede ejecutar.');
});

test('acciones propias y objetivos naturales del clic directo',()=>{
 assert.equal(ui.esAccionPropia('guardia'),true);
 assert.equal(ui.esAccionPropia('x',{efecto:'transformacion'}),true);
 assert.equal(ui.esAccionPropia('x',{efecto:'dano',tablero:{origen_area:'lanzador'}}),true);
 assert.equal(ui.esAccionPropia('ataque',{efecto:'dano'}),false);
 const yo={id:'a',bando:'jugador'};
 assert.equal(ui.objetivoValido({efecto:'dano'},yo,{id:'b',bando:'enemigo'}),true);
 assert.equal(ui.objetivoValido({efecto:'dano'},yo,{id:'c',bando:'jugador'}),false);
 assert.equal(ui.objetivoValido({efecto:'dano'},yo,{id:'b',bando:'enemigo',vida:0}),false);
 assert.equal(ui.objetivoValido({efecto:'curacion'},yo,{id:'c',bando:'jugador',vida:0}),true);
 assert.equal(ui.objetivoValido({efecto:'curacion'},yo,{id:'b',bando:'enemigo'}),false);
});

test('la previsualización explica qué pasará y cuánto cuesta, sin porcentajes',()=>{
 const p=ui.previsualizar({accion:'Bola de fuego',objetivo:{nombre:'Orco',vida:7,max_vida:12},victimas:['Orco','Lobo'],casillas:9,coste:{ph:3},segundoClic:false,pendiente:false});
 assert.equal(p.titulo,'Bola de fuego');
 assert.ok(p.lineas.includes('Objetivo: Orco (7/12 de vida)'));
 assert.ok(p.lineas.includes('9 casillas · 2 afectados: Orco, Lobo'));
 assert.ok(p.lineas.includes('Coste: 3 PH y tu acción.'));
 assert.ok(!p.lineas.join(' ').includes('%'));
 assert.equal(p.pista,'Clic para ejecutar.');
 assert.equal(ui.previsualizar({accion:'A',segundoClic:true,pendiente:false}).pista,'Toca para previsualizar; otra vez para ejecutar.');
 assert.equal(ui.previsualizar({accion:'A',segundoClic:true,pendiente:true}).pista,'Toca otra vez para ejecutar.');
});

test('el resumen de turno cuenta daño, reservas, capa y estados',()=>{
 const antes={vida:20,max_vida:20,ph:5,fatiga:0,accion_usada:false,estados:['Guardia'],capa:'suelo',movimiento:6};
 const despues={vida:14,max_vida:20,ph:2,fatiga:1,accion_usada:true,estados:['En vuelo'],capa:'aire',movimiento:2};
 assert.deepEqual([...ui.resumenTurno(antes,despues)],[
  'Perdiste 6 de vida (14/20).','Gastaste 3 PH (quedan 2).','Fatiga +1 (total 1).','Te moviste 4 casillas.',
  'Pasaste de suelo a aire.','Nuevos estados: En vuelo.','Terminan: Guardia.','Usaste tu acción.']);
 assert.deepEqual([...ui.resumenTurno(antes,antes)],['No usaste tu acción.']);
});

test('atajos y consumibles fijados',()=>{
 assert.equal(ui.ranuraDeTecla('1'),0);assert.equal(ui.ranuraDeTecla('9'),8);
 assert.equal(ui.ranuraDeTecla('0'),null);assert.equal(ui.ranuraDeTecla('q'),null);
 const lista=[{id:'a'},{id:'b'},{id:'c'}];
 assert.deepEqual([...ui.ordenarConsumibles(lista,['c','a']).map(x=>x.id)],['c','a','b']);
 // Sin almacenamiento (privado, tests) todo funciona con los valores por defecto.
 assert.equal(ui.leerFijados('x').length,0);
 assert.equal(ui.leerSegundoClic(true),true);assert.equal(ui.leerSegundoClic(false),false);
 assert.equal(ui.notaPendiente(['capa:aire']),'capa:aire');
});

test('los consumibles de la barra se agrupan por nombre y respetan los fijados',()=>{
 const f=[{id:'1',nombre:'Poción',consumible:true,acciones:[{id:'x'}]},{id:'2',nombre:'Poción',consumible:true,acciones:[{id:'x'}]},{id:'3',nombre:'Pergamino',consumible:true,acciones:[{id:'y',bloqueada:'PH insuficientes.'}]},{id:'4',nombre:'Espada',acciones:[{id:'z'}]}];
 const todos=ui.consumiblesBarra(f,[]);
 assert.deepEqual([...todos.map(c=>`${c.nombre}×${c.cantidad}`)],['Poción×2','Pergamino×1']);
 assert.equal(todos[1].bloqueada,'PH insuficientes.');
 assert.deepEqual([...ui.consumiblesBarra(f,['Pergamino','Desaparecido']).map(c=>c.nombre)],['Pergamino']);
});

test('el inventario es una ventana privada: no usa la sincronización del combate',async()=>{
 const {readFileSync}=await import('node:fs');
 const ventana=readFileSync(new URL('../components/VentanaInventario.tsx',import.meta.url),'utf8');
 assert.ok(!/useSincronizacionCombate|supabase|channel\(/.test(ventana));
 // La página del jugador abre el inventario en la ventana, sin salir del combate.
 const jugador=readFileSync(new URL('../app/ficha/combate/page.tsx',import.meta.url),'utf8');
 assert.ok(jugador.includes('<VentanaInventario')&&!jugador.includes("router.push('/ficha/equipamiento')"));
});
