import test from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {comprobarInmunidad,validarInmunidades,describirInmunidades}=cargarDependencia('./inmunidades');
const dano=(...tipos)=>({clase:'dano',tipos});
const estado=(estado,extra={})=>({clase:'estado',estado,...extra});
test('cada combinación de tipo y modo',()=>{
 const casos=[
  // [inmunidad, candidato, bloqueado, resistido]
  [{tipo:'dano',valor:'fuego',modo:'bloquear_dano'},dano('fuego'),true,false],
  [{tipo:'dano',valor:'fuego',modo:'bloquear_aplicacion'},dano('fuego'),false,false],
  [{tipo:'dano',valor:'fuego',modo:'bloquear_todo'},dano('fuego'),true,false],
  [{tipo:'dano',valor:'fuego',modo:'resistir'},dano('fuego'),false,true],
  [{tipo:'estado',valor:'quemadura',modo:'bloquear_aplicacion'},estado('quemadura'),true,false],
  [{tipo:'estado',valor:'quemadura',modo:'bloquear_todo'},estado('quemadura'),true,false],
  [{tipo:'estado',valor:'quemadura',modo:'resistir'},estado('quemadura'),false,true],
  [{tipo:'categoria',valor:'mental',modo:'bloquear_aplicacion'},estado('asustado',{categoria:'mental',subcategoria:'miedo'}),true,false],
  [{tipo:'categoria',valor:'mental:control',modo:'bloquear_aplicacion'},estado('asustado',{categoria:'mental',subcategoria:'miedo'}),false,false],
  [{tipo:'categoria',valor:'mental:control',modo:'bloquear_todo'},estado('dominado',{categoria:'mental',subcategoria:'control'}),true,false],
  [{tipo:'categoria',valor:'mental',modo:'bloquear_dano'},estado('asustado',{categoria:'mental'}),false,false],
  [{tipo:'dano',valor:'veneno',modo:'bloquear_todo'},estado('envenenado',{origen:'veneno'}),true,false],
 ];
 for(const [i,c,b,r] of casos){const res=comprobarInmunidad([i],c);assert.equal(res.bloqueado,b,JSON.stringify([i,c]));assert.equal(res.resistido,r,JSON.stringify([i,c]));}
});
test('inmunidad al fuego sin inmunidad a Quemadura',()=>{
 const dragon=[{tipo:'dano',valor:'fuego',modo:'bloquear_dano'}];
 assert.equal(comprobarInmunidad(dragon,dano('fuego','magica')).bloqueado,true);
 assert.equal(comprobarInmunidad(dragon,estado('quemadura',{origen:'fuego'})).bloqueado,false);
 assert.equal(describirInmunidades(dragon),'Inmune al fuego; no a Quemadura.');
});
test('sin inmunidades nunca bloquea; la lista ignora solo lo indicado',()=>{
 assert.equal(JSON.stringify(comprobarInmunidad([],dano('fuego'))),JSON.stringify({bloqueado:false,resistido:false,motivo:''}));
 assert.equal(comprobarInmunidad(undefined,estado('x')).bloqueado,false);
 const mente=[{tipo:'categoria',valor:'mental:control',modo:'bloquear_aplicacion',origen:'Mente Inquebrantable'}];
 const control=estado('control_mental',{categoria:'mental',subcategoria:'control'});
 assert.equal(comprobarInmunidad(mente,control).bloqueado,true);
 assert.match(comprobarInmunidad(mente,control).motivo,/Mente Inquebrantable/);
 assert.equal(comprobarInmunidad(mente,control,['categoria:mental']).bloqueado,false);
 assert.equal(comprobarInmunidad(mente,control,['estado:control_mental']).bloqueado,true,'ignorar otro tipo no atraviesa');
});
test('inmunidad de equipo: al desequipar la lista ya no la contiene',()=>{
 const equipada=[{tipo:'estado',valor:'congelado',modo:'bloquear_aplicacion',origen:'Anillo',duracion:'equipada'}];
 assert.equal(comprobarInmunidad(equipada,estado('congelado')).bloqueado,true);
 assert.equal(comprobarInmunidad([],estado('congelado')).bloqueado,false);
});
test('validación',()=>{
 assert.equal(validarInmunidades([{tipo:'dano',valor:'fuego',modo:'bloquear_dano'}]),null);
 assert.match(validarInmunidades([{tipo:'x',valor:'fuego',modo:'bloquear_dano'}]),/tipo y modo/);
 assert.match(validarInmunidades([{tipo:'estado',valor:'quemadura',modo:'bloquear_dano'}]),/no causa daño/);
 assert.match(validarInmunidades([{tipo:'dano',valor:'fuego',modo:'resistir',duracion:'turnos',turnos:0}]),/turnos/);
});
