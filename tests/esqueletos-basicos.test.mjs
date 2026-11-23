import test from 'node:test';
import assert from 'node:assert/strict';
import {m,ef,de,campoE} from './helpers/campo-estados.mjs';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {tipoAnimacionArma}=cargarDependencia('./animaciones-armas');
test('cada arma básica usa su esqueleto; ninguna cae en otro por nombre',()=>{
 const armas={espada:'Espada corta',hacha:'Hacha',lanza:'Lanza',arco:'Arco',baston:'Bastón',punos:'Guanteletes'};
 for(const [esq,nombre] of Object.entries(armas)){
  // Un arma con esqueleto asignado: el nombre ya no decide.
  const c=campoE([{id:'k',bando:'jugador',x:1,efectos:[ef('golpe',{nombre:'Golpe raro',esqueleto:esq})]},{id:'o',bando:'enemigo',x:2}]);
  const a=m.acciones(de(c,'k')).find(x=>x.id==='hab:hk:golpe');
  assert.equal(m.esqueletoDeAccion(de(c,'k'),a,a.id),esq,nombre);
 }
});
test('hacha, martillo y lanza dejan de caer en «espada»; los casos antiguos siguen igual',()=>{
 assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Hacha de guerra'}),'hacha');
 assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Martillo'}),'hacha');
 assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Lanza'}),'lanza');
 assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Bastón'}),'baston');
 assert.equal(tipoAnimacionArma({accionId:'ataque',nombreAccion:'Atacar con Espada de acero'}),'espada');
 assert.equal(tipoAnimacionArma({accionId:'hab:magia',nombreAccion:'Disparo de hielo',naturaleza:'magica',costePh:4}),undefined);
});
test('un esqueleto creado por el GM viaja en el efecto (sin consultar la base)',()=>{
 const guadana={id:'guadana',nombre:'Guadaña',base:'hacha',familia_gesto:'golpe_pesado',longitud_relativa:1.8,fases:{preparacion:220,impacto:100,recuperacion:260},anclas:[{id:'mango',x:10,y:50},{id:'centro',x:50,y:48},{id:'punta',x:90,y:30}]};
 const c=campoE([{id:'k',bando:'jugador',x:1,efectos:[ef('siega',{esqueleto:'guadana',esqueleto_def:guadana})]},{id:'o',bando:'enemigo',x:2}]);
 const a=m.acciones(de(c,'k')).find(x=>x.id==='hab:hk:siega');assert.equal(m.esqueletoDeAccion(de(c,'k'),a,a.id),'guadana');
});
