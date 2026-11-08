import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nuevoLogro,condicionesParaEvento} from '../lib/logros.ts';
test('crear un logro comienza por decisión manual y exige asociar un título real',()=>{const l=nuevoLogro();assert.equal(l.evento,'manual');assert.equal(l.titulo_forja_id,null);assert.equal(l.icono,'corona');});
test('al cambiar de disparador se eliminan los filtros que ya no corresponden',()=>{const c={nivel_minimo:10,enemigo_nivel_minimo:5,rondas_maximas:3,sin_caer:true,objeto_id:'pocion'};assert.deepEqual(condicionesParaEvento('manual',c),{});assert.deepEqual(condicionesParaEvento('objeto_adjudicado',c),{nivel_minimo:10,objeto_id:'pocion'});assert.deepEqual(condicionesParaEvento('enemigo_derrotado',c),{nivel_minimo:10,enemigo_nivel_minimo:5,rondas_maximas:3,sin_caer:true});});
