import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {validarReaccion}=cargarDependencia('creacion');
const {DISPARADORES,RESULTADOS_POR_DISPARADOR}=cargarDependencia('reacciones');

test('los nueve disparadores existen',()=>{
 assert.deepEqual([...DISPARADORES],['antes_ser_atacado','despues_ser_atacado','tras_fallar_ataque','tras_fallar_prueba','aliado_atacado','aliado_ataca','aliado_cae','apuntado_por_area','fin_de_turno']);
 for(const d of DISPARADORES)assert.ok(RESULTADOS_POR_DISPARADOR[d].length,d);
});
const validas={
 antes_ser_atacado:{disparador:'antes_ser_atacado',principal:{contraatacar:{cantidad:1,caras:6}}},
 despues_ser_atacado:{disparador:'despues_ser_atacado',principal:{reducir:{modo:'mitad'},contraatacar:{cantidad:1,caras:4,modificador:1}}},
 tras_fallar_ataque:{disparador:'tras_fallar_ataque',principal:{repetir_tirada:{}}},
 tras_fallar_prueba:{disparador:'tras_fallar_prueba',principal:{repetir_tirada:{}}},
 aliado_atacado:{disparador:'aliado_atacado',alcance:2,principal:{interponerse:{}}},
 aliado_ataca:{disparador:'aliado_ataca',principal:{contraatacar:{cantidad:1,caras:8}}},
 aliado_cae:{disparador:'aliado_cae',principal:{contraatacar:{cantidad:2,caras:6}}},
 apuntado_por_area:{disparador:'apuntado_por_area',principal:{reducir:{modo:'todo'}}},
 fin_de_turno:{disparador:'fin_de_turno',alcance:1,principal:{contraatacar:{cantidad:1,caras:6}}},
};
test('una combinación válida por disparador',()=>{
 for(const [d,r] of Object.entries(validas))assert.equal(validarReaccion(r),null,d);
});
test('coste, usos y enfriamiento',()=>{
 const base=validas.tras_fallar_ataque;
 assert.equal(validarReaccion({...base,coste:3,usos:{tipo:'encuentro',maximo:1},enfriamiento:2}),null);
 assert.equal(validarReaccion({...base,usos:{tipo:'ilimitado'}}),null);
 assert.match(validarReaccion({...base,coste:-1}),/[Cc]oste/);
 assert.match(validarReaccion({...base,usos:{tipo:'siempre',maximo:1}}),/[Uu]sos/);
 assert.match(validarReaccion({...base,usos:{tipo:'turno',maximo:0}}),/[Uu]sos/);
 assert.match(validarReaccion({...base,enfriamiento:1.5}),/[Ee]nfriamiento/);
});
test('rechaza lo que el motor no sabe resolver',()=>{
 const malas=[
  [{disparador:'aliado_ataca',principal:{repetir_tirada:{}}},/aliado/i],
  [{disparador:'tras_fallar_ataque',principal:{reducir:{modo:'mitad'}}},/fallar/i],
  [{disparador:'despues_ser_atacado',principal:{interponerse:{}}},/./],
  [{disparador:'fin_de_turno',principal:{contraatacar:{cantidad:0,caras:6}}},/[Cc]ontraataque/],
  [{disparador:'algo_raro',principal:{reducir:{modo:'mitad'}}},/[Dd]isparador/],
  [{disparador:'tras_fallar_ataque',principal:{}},/./],
  [{disparador:'aliado_cae',seguimiento:{devolver:{}}},/seguimiento/i],
  [{disparador:'aliado_atacado',alcance:0,principal:{interponerse:{}}},/[Aa]lcance/],
 ];
 for(const [r,patron] of malas){const f=validarReaccion(r);assert.ok(f,JSON.stringify(r));assert.match(f,patron,JSON.stringify(r));}
});
test('los datos antiguos siguen validando',()=>{
 const kion=JSON.parse(readFileSync(new URL('./fixtures/kion-defensas.json',import.meta.url),'utf8'));
 assert.ok(kion);
 for(const r of [
  {prioridad:10,principal:{salvacion:{cd:14,atributo:'salvacion'},reducir:{modo:'mitad'},animacion:'axioma-defensa',permite_seguimiento:true}},
  {naturaleza:'fisica',sin_forma:'limitless',seguimiento:{devolver:{maximo:6}}},
  {una_por_ronda:true,principal:{reducir:{modo:'fijo',valor:2}},esquiva_opuesta:{caras:20,contra_caras:6}},
 ])assert.equal(validarReaccion(r),null,JSON.stringify(r));
});
