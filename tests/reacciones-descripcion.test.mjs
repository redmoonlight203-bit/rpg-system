import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {lineaCosteReaccion}=cargarDependencia('reacciones');
const {describirReaccion}=cargarDependencia('descripciones');
const base={principal:{reducir:{modo:'mitad'}}};

test('sin coste ni límites: «Sin coste»',()=>{
 assert.equal(lineaCosteReaccion(base),'Sin coste');
 assert.equal(lineaCosteReaccion({...base,usos:{tipo:'ilimitado'}}),'Sin coste');
 assert.equal(lineaCosteReaccion({...base,coste:0},0),'Sin coste');
});
test('coste propio o de la acción',()=>{
 assert.equal(lineaCosteReaccion({...base,coste:3},1),'3 PH');
 assert.equal(lineaCosteReaccion(base,2),'2 PH');
});
test('usos, enfriamiento y una por ronda',()=>{
 assert.equal(lineaCosteReaccion({...base,coste:2,usos:{tipo:'encuentro',maximo:1}}),'2 PH · 1 uso por encuentro');
 assert.equal(lineaCosteReaccion({...base,usos:{tipo:'turno',maximo:2}}),'Sin coste de PH · 2 usos por ronda');
 assert.equal(lineaCosteReaccion({...base,enfriamiento:1}),'Sin coste de PH · enfriamiento 1 ronda');
 assert.equal(lineaCosteReaccion({...base,enfriamiento:3,coste:1}),'1 PH · enfriamiento 3 rondas');
 assert.equal(lineaCosteReaccion({...base,una_por_ronda:true}),'Sin coste de PH · 1 uso por ronda');
});
test('con usos restantes (menú de decisión y ficha)',()=>{
 assert.equal(lineaCosteReaccion({...base,coste:2,usos:{tipo:'encuentro',maximo:3}},0,2),'2 PH · 1 uso por encuentro'.replace('1 uso','3 usos')+' (quedan 2)');
});
test('la descripción en lenguaje claro termina con la misma línea',()=>{
 for(const [r,c] of [[base,0],[{...base,coste:2,enfriamiento:1},0],[{disparador:'tras_fallar_ataque',principal:{repetir_tirada:{}}},3]]){
  const f=describirReaccion(r,c);assert.ok(f.endsWith('Coste: '+lineaCosteReaccion(r,c)+'.'),f);
 }
});
test('cada disparador se explica en su frase',()=>{
 const casos={
  antes_ser_atacado:[{contraatacar:{cantidad:1,caras:6}},/Antes de que te ataquen.*contraataca 1d6/],
  despues_ser_atacado:[{reducir:{modo:'mitad'}},/Al recibir cualquier golpe.*mitad/],
  tras_fallar_ataque:[{repetir_tirada:{}},/Tras fallar un ataque.*repite la tirada/],
  tras_fallar_prueba:[{repetir_tirada:{}},/Tras fallar una salvación.*repite la tirada/],
  aliado_atacado:[{interponerse:{}},/aliado a 2 casillas.*se interpone/],
  aliado_ataca:[{contraatacar:{cantidad:1,caras:4,modificador:2}},/aliado golpea.*1d4\+2/],
  aliado_cae:[{contraatacar:{cantidad:2,caras:6}},/cae un aliado.*2d6/],
  apuntado_por_area:[{reducir:{modo:'todo'}},/área.*todo el daño/],
  fin_de_turno:[{contraatacar:{cantidad:1,caras:8}},/termina su turno.*1d8/],
 };
 for(const [d,[pr,patron]] of Object.entries(casos))assert.match(describirReaccion({disparador:d,alcance:d==='aliado_atacado'?2:undefined,principal:pr}),patron,d);
});
