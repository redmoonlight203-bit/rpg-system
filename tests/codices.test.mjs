import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const c=cargarDependencia('codices');
const claves=lista=>JSON.parse(JSON.stringify(lista.map(p=>p.clave)));
const plano=v=>JSON.parse(JSON.stringify(v));

test('codiceDe elige la metáfora por tipo',()=>{
 assert.equal(c.codiceDe('personaje',true),'bestiario');
 assert.equal(c.codiceDe('personaje',false),'expediente');
 assert.equal(c.codiceDe('habilidad',false),'tarot');
 assert.equal(c.codiceDe('habilidad',true),'tarot');
 assert.equal(c.codiceDe('objeto',false),'reliquia');
 assert.equal(c.codiceDe('pasiva',false),'sello');
 assert.equal(c.codiceDe('titulo',false),'edicto');
 assert.equal(c.codiceDe('otro',false),'pergamino');
 assert.equal(c.codiceDe('desconocido',false),'pergamino');
});

test('romano y arcanoDe',()=>{
 assert.equal(c.romano(0),'0');assert.equal(c.romano(4),'IV');assert.equal(c.romano(9),'IX');
 assert.equal(c.romano(14),'XIV');assert.equal(c.romano(21),'XXI');
 assert.deepEqual(plano(c.arcanoDe('abc')),plano(c.arcanoDe('abc')));
 const numeros=new Set();
 for(let i=0;i<200;i++){const a=c.arcanoDe('id'+i);assert.ok(a.numero>=0&&a.numero<=21);assert.equal(a.romano,c.romano(a.numero));numeros.add(a.numero);}
 assert.ok(numeros.size>=10);
});

test('paginasBestiario omite láminas vacías y despliega variantes',()=>{
 const secciones=['atributos','vinculos','variantes','historia'].map(clave=>({clave,visible:true,titulo:clave}));
 const nada=()=>false;
 assert.deepEqual(claves(c.paginasBestiario(secciones,nada,[])),['lamina','ficha']);
 const variantes=[{id:'v1',nombre:'Joven'},{id:'v2',nombre:'Anciano'}];
 const conDatos=k=>k==='variantes'||k==='historia';
 const p=c.paginasBestiario(secciones,conDatos,variantes);
 assert.deepEqual(claves(p),['lamina','variantes','variantes','historia','ficha']);
 assert.deepEqual(plano(p.filter(x=>x.clave==='variantes').map(x=>x.varianteId)),['v1','v2']);
 assert.equal(p[1].titulo,'Joven');
 assert.deepEqual(claves(c.paginasBestiario(secciones,k=>k==='vinculos',[])),['lamina','vinculos','ficha']);
 const oculta=secciones.map(s=>s.clave==='historia'?{...s,visible:false}:s);
 assert.deepEqual(claves(c.paginasBestiario(oculta,conDatos,[])),['lamina','ficha']);
});

test('variantesBestiario: probabilidades, bonos, equipo y enlaces rotos',()=>{
 const base={habilidades:[],pasivas:[],equipamiento:{}};
 const r=c.variantesBestiario({variantes:[{...base,id:'a',nombre:'A',peso:1,bonos:{fuerza:2,vida:0}},{...base,id:'b',nombre:'B',peso:3,bonos:{}}]},()=>null);
 assert.deepEqual(r.map(v=>v.probabilidad),[25,75]);
 assert.deepEqual(plano(r[0].bonos),[['fuerza',2]]);
 const tres=c.variantesBestiario({variantes:['x','y','z'].map(id=>({...base,id,nombre:id,peso:1,bonos:{}}))},()=>null);
 assert.deepEqual(tres.map(v=>v.probabilidad),[33.3,33.3,33.3]);
 const eq=c.variantesBestiario({variantes:[{...base,id:'e',nombre:'E',peso:1,bonos:{},equipamiento:{
  mano_der:{modo:'catalogo',opciones:['x','borrada']},
  casco:{modo:'generado',nombre:'Garras',rangos:{dano:{min:1,max:3}}},
 }}]},id=>id==='x'?'Hacha':null);
 assert.deepEqual(plano(eq[0].equipo),[{espacio:'Mano derecha',texto:'Hacha o Creación no disponible'},{espacio:'Cabeza',texto:'Generado: Garras (dano 1–3)'}]);
 assert.deepEqual(plano(c.variantesBestiario(null,()=>null)),[]);
});

test('vinculosDe deduplica y marca las creaciones borradas',()=>{
 const items=[{id:'h1',nombre:'Tajo'},{id:'p1',nombre:'Piel'},{id:'o1',nombre:'Espada'},{id:'h2',nombre:'Mordisco'}];
 const item={id:'m',nombre:'M',habilidades:['h1','h1','zz'],pasivas:['p1'],equipamiento:{mano_der:'o1'},
  configuracion_monstruo:{variantes:[{id:'v',nombre:'V',peso:1,bonos:{},habilidades:['h1','h2'],pasivas:['p1'],equipamiento:{}}]}};
 const v=plano(c.vinculosDe(item,items));
 assert.equal(v.length,5);
 assert.equal(v.find(x=>x.id==='zz').nombre,null);
 assert.deepEqual(v.find(x=>x.id==='o1'),{id:'o1',nombre:'Espada',tipo:'equipo',espacio:'Mano derecha'});
 assert.ok(v.some(x=>x.id==='h2'&&x.tipo==='habilidad'));
});

test('portadoresDe encuentra a quien la lleva',()=>{
 const items=[
  {id:'h',nombre:'Hoja'},
  {id:'M',nombre:'Bestia',configuracion_monstruo:{variantes:[{id:'v',nombre:'V',peso:1,bonos:{},habilidades:['h'],pasivas:[],equipamiento:{}}]}},
  {id:'A',nombre:'Axel',habilidades:['h']},
  {id:'C',nombre:'Cero'},
 ];
 assert.deepEqual(plano(c.portadoresDe('h',items)).map(x=>x.id),['A','M']);
 assert.deepEqual(plano(c.portadoresDe('o',[{id:'X',nombre:'X',equipamiento:{casco:'o'}}])),[{id:'X',nombre:'X'}]);
});

test('avanzarRastro no crea ciclos y respeta el máximo',()=>{
 assert.deepEqual(plano(c.avanzarRastro(['a','b','c'],'b')),['a','b']);
 assert.deepEqual(plano(c.avanzarRastro(['a'],'b')),['a','b']);
 assert.deepEqual(plano(c.avanzarRastro([],'a')),['a']);
 const ocho=['1','2','3','4','5','6','7','8'];
 assert.deepEqual(plano(c.avanzarRastro(ocho,'9')),['2','3','4','5','6','7','8','9']);
 assert.deepEqual(plano(c.avanzarRastro(['1','2','3'],'4',3)),['2','3','4']);
});

test('cadenaPasiva convierte la regla en un ritual legible',()=>{
 const r={id:'r',nombre:'Piel',evento:'recibir_dano',condicion:'vida_mitad',reduccion_pct:20,bonos:{armadura:2,fuerza:0}};
 assert.deepEqual(plano(c.cadenaPasiva(r,k=>k.toUpperCase())),[
  {tipo:'evento',texto:'Al recibir daño'},{tipo:'condicion',texto:'Vida a la mitad'},
  {tipo:'efecto',texto:'Reduce 20% de daño'},{tipo:'efecto',texto:'ARMADURA +2'}]);
 assert.equal(c.cadenaPasiva({id:'s',nombre:'S',evento:'permanente',condicion:'siempre'},k=>k).length,2);
});

test('espacioDe traduce el tipo de espacio',()=>{
 assert.equal(c.espacioDe('casco'),'Cabeza');assert.equal(c.espacioDe('mano'),'Mano');
 assert.equal(c.espacioDe('dos_manos'),'Dos manos');assert.equal(c.espacioDe('accesorio'),'Accesorio');
 assert.equal(c.espacioDe('ninguno'),null);assert.equal(c.espacioDe(''),null);
});

test('tirarPrueba usa el generador y respeta los límites',()=>{
 assert.deepEqual(plano(c.tirarPrueba({cantidad:2,caras:6,modificador:3},()=>0.999)),{dados:[6,6],total:15});
 assert.deepEqual(plano(c.tirarPrueba({cantidad:2,caras:6,modificador:3},()=>0)),{dados:[1,1],total:5});
 assert.deepEqual(plano(c.tirarPrueba({cantidad:0,caras:6,modificador:4},()=>0)),{dados:[],total:4});
 assert.equal(c.tirarPrueba({cantidad:500,caras:2,modificador:0},()=>0).dados.length,100);
});

// ---- Ampliación A: configuración ----

test('configuracionBase cubre los siete códices con secciones del catálogo',()=>{
 const base=c.configuracionBase();
 assert.equal(base.version,1);
 assert.deepEqual(Object.keys(base.codices).sort(),[...c.CODICES].sort());
 for(const ajustes of Object.values(base.codices)){
  assert.ok(ajustes.nombre&&ajustes.secciones.length);
  for(const s of ajustes.secciones)assert.ok(c.CLAVES_SECCION.includes(s.clave),s.clave);
 }
 assert.ok(base.codices.bestiario.secciones.some(s=>s.clave==='variantes'));
 assert.ok(base.codices.tarot.secciones.some(s=>s.clave==='portadores'));
 assert.notEqual(c.configuracionBase(),base,'cada llamada devuelve una copia nueva');
});

test('resolverCodice: «Ver como», luego reglas en orden, luego pergamino',()=>{
 const base=c.configuracionBase();
 const item={id:'x',tipo:'bestias'};
 assert.equal(c.resolverCodice(item,'personaje',true,base),'bestiario');
 assert.equal(c.resolverCodice(item,'personaje',false,base),'expediente');
 const propia={...base,asignaciones:[{id:'r1',tipo:'*',monstruo:'*',clasificacion:'bestias',codice:'edicto'},...base.asignaciones]};
 assert.equal(c.resolverCodice(item,'personaje',true,propia),'edicto');
 assert.equal(c.resolverCodice({id:'y',tipo:'otra'},'personaje',true,propia),'bestiario');
 assert.equal(c.resolverCodice(item,'habilidad',false,{...base,porCreacion:{x:'sello'}}),'sello');
 assert.equal(c.resolverCodice(item,'habilidad',false,{...base,asignaciones:[]}),'pergamino');
});

test('normalizarConfiguracion completa, acota y avisa sin lanzar',()=>{
 for(const raro of [null,undefined,42,'texto',[]]){
  const r=c.normalizarConfiguracion(raro);
  assert.deepEqual(plano(r.config),plano(c.configuracionBase()));
 }
 const r=c.normalizarConfiguracion({
  asignaciones:[{id:'a',tipo:'habilidad',monstruo:'*',clasificacion:'',codice:'inventado'},{id:'b',tipo:'objeto',monstruo:'no',clasificacion:'',codice:'sello'}],
  porCreacion:{x:'tarot',y:'nada'},
  codices:{tarot:{nombre:'',eyebrow:'Arcano {romano}',secciones:[{clave:'historia',visible:false,titulo:''},{clave:'falsa',visible:true,titulo:'X'}]}},
  movimiento:{activo:false,pagina_ms:99999,volteo_ms:-4,inclinacion_max:80},
  libro:{dos_paginas_desde:5},rastro:{max:1000},tarot:{tirada:false},
 });
 const k=r.config;
 assert.deepEqual(plano(k.asignaciones).map(a=>a.id),['b']);
 assert.deepEqual(plano(k.porCreacion),{x:'tarot'});
 assert.equal(k.codices.tarot.nombre,c.configuracionBase().codices.tarot.nombre);
 assert.deepEqual(plano(k.codices.tarot.secciones),[{clave:'historia',visible:false,titulo:c.CATALOGO_SECCIONES.historia.titulo}]);
 assert.deepEqual(plano(k.codices.sello),plano(c.configuracionBase().codices.sello));
 assert.deepEqual(plano(k.movimiento),{activo:false,pagina_ms:2000,volteo_ms:0,inclinacion_max:15});
 assert.equal(k.libro.dos_paginas_desde,480);assert.equal(k.rastro.max,20);assert.equal(k.tarot.tirada,false);
 assert.ok(r.avisos.length>=3);
 assert.ok(r.avisos.some(a=>a.includes('falsa')));
});

test('normalizarConfiguracion elimina secciones repetidas',()=>{
 const r=c.normalizarConfiguracion({codices:{sello:{nombre:'S',eyebrow:'',secciones:[{clave:'ritual',visible:true,titulo:'A'},{clave:'ritual',visible:true,titulo:'B'}]}}});
 assert.deepEqual(plano(r.config.codices.sello.secciones).map(s=>s.titulo),['A']);
});

test('plantilla sustituye marcadores conocidos y deja los demás',()=>{
 assert.equal(c.plantilla('Arcano {romano} · {clasificacion}',{romano:'IV',clasificacion:'Fuego'}),'Arcano IV · Fuego');
 assert.equal(c.plantilla('{nombre} {desconocido}',{nombre:'Axel'}),'Axel {desconocido}');
 assert.equal(c.plantilla('',{nombre:'x'}),'');
});

test('seccionesVisibles respeta orden y visibilidad',()=>{
 const base=c.configuracionBase();
 base.codices.sello.secciones=[{clave:'historia',visible:true,titulo:'H'},{clave:'ritual',visible:false,titulo:'R'},{clave:'reglas',visible:true,titulo:'G'}];
 assert.deepEqual(plano(c.seccionesVisibles(base,'sello')).map(s=>s.clave),['historia','reglas']);
});

// ---- Ampliación A: persistencia ----
const memoria=(inicial=null)=>{let v=inicial;return {leer:()=>v,escribir:s=>{v=s;},get valor(){return v;}};};

test('leerConfiguracion: el servidor manda y se normaliza',async()=>{
 const local=memoria(JSON.stringify({rastro:{max:3}}));
 const r=await c.leerConfiguracion(async()=>({data:{config:{rastro:{max:5}}},error:null}),local);
 assert.equal(r.origen,'servidor');assert.equal(r.config.rastro.max,5);assert.equal(r.error,undefined);
});

test('leerConfiguracion: sin fila en el servidor usa la copia local o la base',async()=>{
 const conLocal=await c.leerConfiguracion(async()=>({data:null,error:null}),memoria(JSON.stringify({rastro:{max:3}})));
 assert.equal(conLocal.origen,'local');assert.equal(conLocal.config.rastro.max,3);
 const sinNada=await c.leerConfiguracion(async()=>({data:null,error:null}),memoria());
 assert.equal(sinNada.origen,'base');assert.equal(sinNada.config.rastro.max,8);
});

test('leerConfiguracion: un fallo del servidor no rompe la vista',async()=>{
 const tablaFalta=await c.leerConfiguracion(async()=>({data:null,error:{code:'PGRST205',message:'not found'}}),memoria());
 assert.equal(tablaFalta.origen,'base');assert.match(tablaFalta.error,/aún no está preparada/);
 const lanza=await c.leerConfiguracion(async()=>{throw Error('red');},memoria('no es json'));
 assert.equal(lanza.origen,'base');assert.match(lanza.error,/No se pudo leer/);
 const localRoto=await c.leerConfiguracion(async()=>({data:null,error:null}),{leer(){throw Error('bloqueado');},escribir(){}});
 assert.equal(localRoto.origen,'base');
});

test('escribirConfiguracion guarda en el servidor y en la copia local',async()=>{
 const local=memoria(),enviado=[];
 const base=c.configuracionBase();
 const ok=await c.escribirConfiguracion(base,async cfg=>{enviado.push(cfg);return {error:null};},local);
 assert.equal(ok.origen,'servidor');assert.equal(enviado.length,1);assert.equal(JSON.parse(local.valor).version,1);
 const falla=await c.escribirConfiguracion(base,async()=>({error:{code:'42501',message:'Solo el GM puede configurar los códices.'}}),local);
 assert.equal(falla.origen,'local');assert.match(falla.error,/Solo el GM/);
});
