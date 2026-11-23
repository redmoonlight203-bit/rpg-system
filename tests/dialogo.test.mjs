import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {crearColaDialogos}=cargarDependencia('dialogo',{Promise});

test('confirmar resuelve true al aceptar',async()=>{
 const d=crearColaDialogos();
 const p=d.confirmar({titulo:'Borrar',mensaje:'¿Seguro?',aceptar:'Borrar',cancelar:'Volver',peligro:true});
 assert.equal(d.actual().titulo,'Borrar');assert.equal(d.actual().peligro,true);
 d.responder(true);assert.equal(await p,true);assert.equal(d.actual(),null);
});
test('confirmar resuelve false al cancelar',async()=>{
 const d=crearColaDialogos();const p=d.confirmar({titulo:'t',mensaje:'m'});d.responder(false);assert.equal(await p,false);
});
test('Esc cancela y otras teclas no',async()=>{
 const d=crearColaDialogos();const p=d.confirmar({titulo:'t',mensaje:'m'});
 assert.equal(d.tecla('a'),false);assert.ok(d.actual());
 assert.equal(d.tecla('Escape'),true);assert.equal(await p,false);assert.equal(d.tecla('Escape'),false);
});
test('avisar se cierra con aceptar o Esc y resuelve sin valor',async()=>{
 const d=crearColaDialogos();const p=d.avisar({titulo:'Hecho',mensaje:'Listo'});
 assert.equal(d.actual().tipo,'avisar');assert.equal(d.actual().aceptar,'Entendido');d.tecla('Escape');assert.equal(await p,undefined);
});
test('las peticiones simultáneas se muestran en orden y notifican a los suscriptores',async()=>{
 const d=crearColaDialogos();let avisos=0;const fuera=d.suscribir(()=>avisos++);
 const a=d.confirmar({titulo:'A',mensaje:''}),b=d.confirmar({titulo:'B',mensaje:''});
 assert.equal(d.actual().titulo,'A');d.responder(true);assert.equal(d.actual().titulo,'B');d.responder(false);
 assert.deepEqual([await a,await b],[true,false]);assert.ok(avisos>=4);fuera();d.avisar({titulo:'C',mensaje:''});assert.ok(avisos<=5);
});
