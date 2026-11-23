import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const inm=cargarDependencia('./inmunidades');
const {validarDefinicionEstado,CATALOGO_ESTADOS,describirEstado,turnosIniciales,estadoVacio}=cargarDependencia('./estados',{});
test('el catálogo base se valida completo',()=>{for(const d of CATALOGO_ESTADOS)assert.equal(validarDefinicionEstado(d),null,d.id);});
test('duraciones, primitivas y origen se validan',()=>{
 const base={...estadoVacio('miedo_profundo'),efectos:[{tipo:'perder_turno'},{tipo:'dano_periodico',cantidad:1,caras:6,tipo_dano:'necrotico',momento:'fin'}],origen:'sombra'};
 assert.equal(validarDefinicionEstado(base),null);
 assert.match(validarDefinicionEstado({...base,duracion:{tipo:'turnos',turnos:0}}),/1 a 99/);
 assert.match(validarDefinicionEstado({...base,efectos:[{tipo:'teletransporte'}]}),/desconocida/);
 assert.match(validarDefinicionEstado({...base,origen:'Fuego!'}),/Origen/);
 assert.match(validarDefinicionEstado({...base,efectos:[{tipo:'movimiento_forzado',sentido:'alejar',min:3,max:1}]}),/Movimiento/);
 assert.match(validarDefinicionEstado({...base,efectos:[{tipo:'inmunidad',inmunidades:[]}]}),/al menos una/);
});
test('frase clara del estado y turnos iniciales',()=>{
 const asustado=CATALOGO_ESTADOS.find(d=>d.id==='asustado');
 assert.equal(describirEstado(asustado),'Asustado: se aleja 1–2 casillas de su fuente cada turno y no puede atacarla; dura 3 turnos.');
 assert.equal(turnosIniciales(asustado),3);assert.equal(turnosIniciales(asustado,5),5);
 assert.equal(turnosIniciales(CATALOGO_ESTADOS.find(d=>d.id==='mojado')),0);
 assert.ok(inm.validarInmunidades);
});
