import test from 'node:test';
import assert from 'node:assert/strict';
import { cargarDependencia } from './helpers/cargar-ts.mjs';
const {presupuestoEncuentro}=cargarDependencia('presupuesto-encuentro');
test('cantidad de combatientes, copias idénticas, cero medido y perfiles sin evaluación',()=>{
  const forja=(id,ipe)=>({id,origen:'forja',balance_ipe:ipe});
  const catalogo=[forja('a',2.5),forja('b',0),forja('c',null)];
  const miembro=(bando,forja_id,personaje_id)=>({bando,forja_id,personaje_id});
  const r=presupuestoEncuentro([
    miembro('enemigo','a'),miembro('enemigo','a'),miembro('enemigo','c'),
    miembro('jugador','b'),miembro('jugador','a','42'),
  ],catalogo);
  assert.deepEqual({...r.enemigo},{ipe:5,medidos:2,participantes:3});
  assert.deepEqual({...r.jugador},{ipe:0,medidos:1,participantes:2});
});
