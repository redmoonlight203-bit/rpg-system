import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const A=cargarDependencia('artefactos');
const dos={niveles:[
 {nivel:1,nombre:'Hoja dormida',condicion_subida:null,cambios:{stats:{filo:2}}},
 {nivel:2,nombre:'Hoja hambrienta',condicion_subida:{tipo:'contador',contador:'armas devoradas',meta:3},cambios:{stats:{filo:4},descripcion:'Los dientes asoman.'}},
]};

test('un artefacto de dos niveles es válido y se guarda tal cual',()=>{
 assert.equal(A.validarArtefacto(dos),null);
 assert.deepEqual(JSON.parse(JSON.stringify(A.normalizarArtefacto(JSON.parse(JSON.stringify(dos))))).niveles,JSON.parse(JSON.stringify(dos.niveles)));
});
test('orden: los niveles empiezan en 1 y son consecutivos',()=>{
 assert.match(A.validarArtefacto({niveles:[]}),/al menos un nivel/i);
 assert.match(A.validarArtefacto({niveles:[{...dos.niveles[1],nivel:2}]}),/empiezan en 1/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],nivel:3}]}),/consecutiv/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],nombre:' '}]}),/nombre/i);
});
test('condiciones: el nivel 1 no tiene; los demás, un contador con meta o un evento',()=>{
 assert.match(A.validarArtefacto({niveles:[{...dos.niveles[0],condicion_subida:{tipo:'evento',evento:'x'}},dos.niveles[1]]}),/nivel 1/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],condicion_subida:null}]}),/condici/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],condicion_subida:{tipo:'contador',contador:'armas',meta:0}}]}),/meta/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],condicion_subida:{tipo:'evento',evento:''}}]}),/evento/i);
 assert.match(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],condicion_subida:{tipo:'otra'}}]}),/condici/i);
 assert.equal(A.validarArtefacto({niveles:[dos.niveles[0],{...dos.niveles[1],condicion_subida:{tipo:'evento',evento:'Beber sangre de dragón'}}]}),null);
});
test('nivelAlcanzado sube por contador o evento, en orden',()=>{
 const tres={niveles:[...dos.niveles,{nivel:3,nombre:'Rey',condicion_subida:{tipo:'evento',evento:'Coronación'},cambios:{}}]};
 assert.equal(A.nivelAlcanzado(tres,{contadores:{'armas devoradas':2},eventos:[]}),1);
 assert.equal(A.nivelAlcanzado(tres,{contadores:{'armas devoradas':3},eventos:[]}),2);
 assert.equal(A.nivelAlcanzado(tres,{contadores:{'armas devoradas':1},eventos:['Coronación']}),1,'no salta niveles');
 assert.equal(A.nivelAlcanzado(tres,{contadores:{'armas devoradas':5},eventos:['Coronación']}),3);
});
test('stats del nivel: se acumulan los cambios hasta el nivel actual',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(A.statsDeNivel(dos,2))),{filo:6});
 assert.deepEqual(JSON.parse(JSON.stringify(A.statsDeNivel(dos,1))),{filo:2});
});
