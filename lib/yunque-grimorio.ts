import type {Borrador,Creacion} from "./yunque-borrador";
import {nuevoEfecto,type Efecto} from "./creacion";
import {EVENTOS,EFECTOS_REGLA,nuevaRegla,receta,type Regla,type EfectoRegla,type CondicionRegla,type EventoRegla} from "./reglas";
import type {ReglaPasiva} from "./pasivas";
import {aGrafo,leerRuta,type Nodo,type Ruta,type TipoNodo} from "./yunque-grafo";
import {aplicar,type Fragmento,type Operacion} from "./yunque-operaciones";
/**
 * Piezas del Grimorio del Yunque y qué operaciones produce soltarlas en el lienzo. Puro: nunca toca el Borrador;
 * `planSoltar` devuelve las `Operacion` que el taller pasa a `aplicar` (o `null` si la pieza queda sin conectar).
 */
export type FamiliaGrimorio='acciones'|'modulos'|'eventos'|'condiciones'|'efectos'|'pasivas'|'plantillas'|'coleccion';
export const FAMILIAS_GRIMORIO:{clave:FamiliaGrimorio;nombre:string;ayuda:string}[]=[
 {clave:'acciones',nombre:'Acciones',ayuda:'Lo que se usa en el turno'},
 {clave:'modulos',nombre:'Módulos',ayuda:'Se enganchan a una acción'},
 {clave:'eventos',nombre:'Eventos',ayuda:'Cuándo empieza una regla'},
 {clave:'condiciones',nombre:'Condiciones',ayuda:'Qué debe cumplirse'},
 {clave:'efectos',nombre:'Efectos de regla',ayuda:'Qué ocurre entonces'},
 {clave:'pasivas',nombre:'Pasivas',ayuda:'Funcionan solas'},
 {clave:'plantillas',nombre:'Plantillas',ayuda:'Reglas listas para usar'},
 {clave:'coleccion',nombre:'Colección',ayuda:'Copia piezas de otra creación'},
];
export type Pieza={clave:string;familia:FamiliaGrimorio;tipo:TipoNodo;nombre:string;ayuda:string;icono:string;fragmentos:Fragmento[]};
const MODULOS:TipoNodo[]=['alcance','salvacion','estado','reaccion','transformacion','recurso','vfx','tabla_armas'];
const falla=(m:string):never=>{throw new Error(m);};
const clon=<T,>(x:T):T=>structuredClone(x);
const una=(clave:string,familia:FamiliaGrimorio,tipo:TipoNodo,nombre:string,ayuda:string,icono:string,datos:unknown):Pieza=>({clave,familia,tipo,nombre,ayuda,icono,fragmentos:[{tipo,datos}]});

// ---- Acciones ----
const accion=(p:Partial<Efecto>):Efecto=>({...nuevoEfecto(),...p});
const ACCIONES:Pieza[]=[
 una('accion:ataque','acciones','accion','Ataque','Un golpe que causa daño','espada',accion({nombre:'Ataque',cantidad:1,caras:8})),
 una('accion:hechizo','acciones','accion','Hechizo de fuego','Daño mágico de fuego','fuego',accion({nombre:'Hechizo de fuego',cantidad:2,caras:6,elemento:'fuego',naturaleza:'magica',coste_ph:2})),
 una('accion:curacion','acciones','accion','Curación','Recupera vida','pocion',accion({nombre:'Curación',efecto:'curacion',cantidad:2,caras:4})),
 una('accion:veneno','acciones','accion','Veneno','Daño al inicio de cada turno','fuego',accion({nombre:'Veneno',efecto:'estado',estado:'Veneno',estado_tipo:'veneno',duracion:3,cantidad:1,caras:4})),
 una('accion:arma','acciones','accion','Crear arma','Un arma temporal en la mano','arco',accion({nombre:'Hoja de luz',efecto:'crear_arma',arma_nombre:'Hoja de luz',arma_slot:'mano_der',duracion:3,cantidad:1,caras:8})),
 una('accion:ph','acciones','accion','Recuperar PH','Devuelve puntos de habilidad','agua',accion({nombre:'Meditar',efecto:'recuperar_ph',cantidad:1,caras:6})),
 una('accion:fatiga','acciones','accion','Aliviar fatiga','Reduce el cansancio','vida',accion({nombre:'Respiro',efecto:'reducir_fatiga',cantidad:1,caras:4})),
];
// ---- Módulos de acción (mismos valores mínimos que `agregar`, más variantes de área) ----
const MODULOS_PIEZAS:Pieza[]=[
 una('modulo:alcance','modulos','alcance','Alcance','Un objetivo a distancia','ojo',{alcance:1,forma:'individual',tamano:0,afecta:'enemigos'}),
 una('modulo:circulo','modulos','alcance','Área en círculo','Golpea alrededor de una casilla','ojo',{alcance:4,forma:'circulo',tamano:2,afecta:'enemigos'}),
 una('modulo:cono','modulos','alcance','Cono','Un abanico desde el lanzador','ojo',{alcance:0,forma:'cono',tamano:3,afecta:'enemigos'}),
 una('modulo:salvacion','modulos','salvacion','Salvación','El objetivo tira para resistir','escudo',{cd:10,atributo:'salvacion',exito:'mitad'}),
 una('modulo:estado','modulos','estado','Estado','Quemadura, veneno, aturdir…','fuego',{estado:'Quemadura',duracion:2,estado_tipo:'quemadura'}),
 una('modulo:reaccion','modulos','reaccion','Reacción','Defensa al recibir daño','escudo',{principal:{reducir:{modo:'mitad'}}}),
 una('modulo:transformacion','modulos','transformacion','Transformación','Cambia de forma por etapas','alma',{id:'forma',nombre:'Transformación',tipo:'forma',etapas:[{id:'etapa',nombre:'Etapa 1',stats:{vida:10}}]}),
 una('modulo:recurso','modulos','recurso','Recurso','Una reserva que sube o baja','pocion',{nombre:'Recurso',inicial:0,cambio:1}),
 una('modulo:vfx','modulos','vfx','Animación','Cómo se ve al usarla','rayo',{}),
 una('modulo:tabla_armas','modulos','tabla_armas','Tabla de armas','Un arma al azar por cara','espada',{caras:2,resultados:[1,2].map(cara=>({cara,nombre:`Arma ${cara}`,cantidad:1,caras:6,modificador:0,tipo_dano:'',arma_slot:'mano_der'}))}),
 una('modulo:invocacion','modulos','invocacion','Invocación','Traer a una criatura','espectro',{claseMaxima:'C',maxHabilidades:1,modo:'jugador_en_combate',duracionTurnos:3}),
];
// ---- Eventos: una regla nueva con ese evento ----
export const ICONO_EVENTO:Record<EventoRegla,string>={equipar:'armadura',desequipar:'anillo',fin_efecto:'alma',usar:'rayo',inicio_combate:'escudo',inicio_turno:'ojo',fin_turno:'libro',atacar:'arco',impactar:'espada',fallar:'hielo',recibir_dano:'vida',causar_dano:'fuego',matar:'espectro',morir:'yugen',fin_combate:'corona'};
const EVENTOS_PIEZAS:Pieza[]=(Object.keys(EVENTOS) as EventoRegla[]).map(ev=>una('evento:'+ev,'eventos','cuando',EVENTOS[ev],ev==='usar'?'El jugador la activa':'Se activa sola','libro',{...nuevaRegla(),nombre:EVENTOS[ev],evento:ev}));
for(const p of EVENTOS_PIEZAS)p.icono=ICONO_EVENTO[(p.fragmentos[0].datos as Regla).evento];
// ---- Condiciones ----
const CONDICIONES_PIEZAS:Pieza[]=([
 ['vida','Vida < 50 %','El portador está malherido','vida',{tipo:'comparar',sujeto:'yo',atributo:'vida_actual',operador:'<',valor:50,porcentaje:true}],
 ['herido','Objetivo herido','Su vida es de 50 % o menos','espada',{tipo:'comparar',sujeto:'objetivo',atributo:'vida_actual',operador:'<=',valor:50,porcentaje:true}],
 ['ph','PH < 25 %','Casi sin puntos de habilidad','agua',{tipo:'comparar',sujeto:'yo',atributo:'ph_actual',operador:'<',valor:25,porcentaje:true}],
 ['estado','En furia','Tiene un estado o forma','alma',{tipo:'estado',sujeto:'yo',estado:'furia'}],
 ['elemento','Ataque de fuego','El ataque es de un elemento','fuego',{tipo:'elemento',elemento:'fuego'}],
 ['probabilidad','Probabilidad 25 %','A veces sí, a veces no','yugen',{tipo:'probabilidad',porcentaje:25}],
 ['terminado','Al acabar un estado','Acaba de terminar uno','alma',{tipo:'estado_terminado',clave:'furia'}],
 ['todas','Todas','Agrupa: deben cumplirse todas','corona',{tipo:'todas',condiciones:[]}],
 ['alguna','Alguna','Agrupa: basta con una','corona',{tipo:'alguna',condiciones:[]}],
 ['no','No','Niega la condición','ojo',{tipo:'no',condicion:{tipo:'siempre'}}],
] as [string,string,string,string,CondicionRegla][]).map(([k,n,a,i,c])=>una('condicion:'+k,'condiciones','si',n,a,i,c));
// ---- Efectos de regla: los 13 tipos con valores válidos ----
export const ICONO_EFECTO_REGLA:Record<EfectoRegla['tipo'],string>={atributo:'corona',transformar:'alma',estado:'fuego',quitar_estado:'agua',dano:'espada',curar:'pocion',ph:'agua',fatiga:'vida',perder_accion:'hielo',salvacion:'escudo',condicional:'ojo',habilidad:'rayo',mensaje:'libro'};
const EFECTOS_BASE:Record<EfectoRegla['tipo'],EfectoRegla>={
 atributo:{tipo:'atributo',destino:'yo',atributo:'armadura',operacion:'sumar',valor:2,duracion:2},
 transformar:{tipo:'transformar',destino:'yo',clave:'furia',nombre:'Furia',duracion:3,cambios:[{atributo:'dano',operacion:'sumar',valor:4}]},
 estado:{tipo:'estado',destino:'objetivo',clave:'aturdido',nombre:'Aturdido',duracion:1},
 quitar_estado:{tipo:'quitar_estado',destino:'yo',clave:'veneno',nombre:'Veneno'},
 dano:{tipo:'dano',destino:'objetivo',valor:{dados:1,caras:6}},
 curar:{tipo:'curar',destino:'yo',valor:{dados:1,caras:6}},
 ph:{tipo:'ph',destino:'yo',valor:2},
 fatiga:{tipo:'fatiga',destino:'yo',valor:-1},
 perder_accion:{tipo:'perder_accion',destino:'objetivo'},
 salvacion:{tipo:'salvacion',destino:'objetivo',cd:12,atributo:'salvacion',exito:[],fallo:[]},
 condicional:{tipo:'condicional',destino:'yo',condicion:{tipo:'probabilidad',porcentaje:50},exito:[],fallo:[]},
 habilidad:{tipo:'habilidad',destino:'yo',duracion:1,accion:{...nuevoEfecto(),nombre:'Golpe concedido'}},
 mensaje:{tipo:'mensaje',destino:'yo',nombre:'¡El poder despierta!'},
};
/** Un efecto de regla nuevo de ese tipo (copia), conservando el destino si se indica. */
export const efectoReglaBase=(tipo:EfectoRegla['tipo'],destino?:EfectoRegla['destino']):EfectoRegla=>{const e=clon(EFECTOS_BASE[tipo]);if(e.accion)e.accion.id=crypto.randomUUID();return destino?{...e,destino}:e;};
const AYUDA_EFECTO:Record<EfectoRegla['tipo'],string>={atributo:'Sube o baja un atributo',transformar:'Cambia de forma un tiempo',estado:'Aplica un estado',quitar_estado:'Retira un estado o forma',dano:'Daño sin tirar impacto',curar:'Recupera vida',ph:'Da o quita PH',fatiga:'Sube o baja la fatiga',perder_accion:'Pierde su acción',salvacion:'Tira y elige rama',condicional:'Si / si no',habilidad:'Una acción prestada',mensaje:'Escribe en el registro'};
const EFECTOS_PIEZAS:Pieza[]=(Object.keys(EFECTOS_REGLA) as EfectoRegla['tipo'][]).map(t=>una('efecto:'+t,'efectos','entonces',EFECTOS_REGLA[t],AYUDA_EFECTO[t],ICONO_EFECTO_REGLA[t],EFECTOS_BASE[t]));
// ---- Pasivas ----
const pasiva=(p:Partial<ReglaPasiva>&{nombre:string}):ReglaPasiva=>({id:'pasiva',condicion:'siempre',evento:'permanente',bonos:{},curacion:0,recuperar_ph:0,reducir_fatiga:0,...p});
const PASIVAS_PIEZAS:Pieza[]=[
 una('pasiva:piedra','pasivas','pasiva','Piel de piedra','+2 de armadura siempre','escudo',pasiva({nombre:'Piel de piedra',bonos:{armadura:2}})),
 una('pasiva:regeneracion','pasivas','pasiva','Regeneración','Cura al iniciar el turno','vida',pasiva({nombre:'Regeneración',evento:'inicio_turno',curacion:2})),
 una('pasiva:espinas','pasivas','pasiva','Espinas','Devuelve daño al ser golpeado','espada',pasiva({nombre:'Espinas',evento:'recibir_impacto',represalia_dados:1,represalia_caras:4})),
 una('pasiva:escamas','pasivas','pasiva','Escamas de dragón','Resiste la magia','dragon',pasiva({nombre:'Escamas de dragón',condicion:'ataque_magico',evento:'recibir_ataque',bonos:{armadura:5},reduccion_pct:50})),
 una('pasiva:aliento','pasivas','pasiva','Último aliento','Más daño con poca vida','fuego',pasiva({nombre:'Último aliento',condicion:'vida_mitad',bonos:{dano:2}})),
];
// ---- Plantillas: las recetas de reglas ya existentes ----
const PLANTILLAS:Pieza[]=([
 ['crecimiento','Ganar vida al matar','Vida máxima permanente al matar','espectro'],
 ['furia','Furia con voluntad','Forma, salvación cada turno y salida','alma'],
 ['objeto','Objeto de transformación','Activa una forma desde un objeto','anillo'],
] as const).map(([k,nombre,ayuda,icono])=>({clave:'plantilla:'+k,familia:'plantillas',tipo:'cuando',nombre,ayuda,icono,fragmentos:receta(k).map(r=>({tipo:'cuando' as TipoNodo,datos:r}))}));

export const PIEZAS:Pieza[]=[...ACCIONES,...MODULOS_PIEZAS,...EVENTOS_PIEZAS,...CONDICIONES_PIEZAS,...EFECTOS_PIEZAS,...PASIVAS_PIEZAS,...PLANTILLAS];

/** Tipos de nodo que el núcleo puede llevar → si la creación admite el tipo `t`. */
export function tipoPermitido(t:TipoNodo,lleva:readonly TipoNodo[]):boolean{
 if(MODULOS.includes(t)||t==='invocacion')return lleva.includes('accion');
 if(t==='si'||t==='entonces')return lleva.includes('cuando');
 return lleva.includes(t);
}
export const piezaPermitida=(p:Pieza,lleva:readonly TipoNodo[])=>p.fragmentos.length>0&&p.fragmentos.every(f=>tipoPermitido(f.tipo,lleva));
const ICONO_COLECCION:Record<string,string>={personaje:'humano',objeto:'espada',habilidad:'fuego',pasiva:'escudo',titulo:'corona',otro:'yugen'};
/** Cada creación de la colección como pieza que copia sus acciones, reglas y pasivas (solo las que admite esta creación). */
export function piezasColeccion(creaciones:Pick<Creacion,'id'|'nombre'|'tipo_creacion'|'configuracion_dados'|'reglas'|'reglas_pasivas'>[],lleva:readonly TipoNodo[]):Pieza[]{
 return creaciones.flatMap(c=>{
  const fragmentos:Fragmento[]=[
   ...(lleva.includes('accion')?(c.configuracion_dados||[]).map(datos=>({tipo:'accion' as TipoNodo,datos})):[]),
   ...(lleva.includes('cuando')?(c.reglas||[]).map(datos=>({tipo:'cuando' as TipoNodo,datos})):[]),
   ...(lleva.includes('pasiva')?(c.reglas_pasivas||[]).map(datos=>({tipo:'pasiva' as TipoNodo,datos})):[]),
  ];
  if(!fragmentos.length)return [];
  const cuenta=(t:TipoNodo,uno:string,varios:string)=>{const n=fragmentos.filter(f=>f.tipo===t).length;return n?`${n} ${n===1?uno:varios}`:'';};
  return [{clave:'coleccion:'+c.id,familia:'coleccion' as const,tipo:fragmentos[0].tipo,nombre:c.nombre||'Sin nombre',
   ayuda:[cuenta('accion','acción','acciones'),cuenta('cuando','regla','reglas'),cuenta('pasiva','pasiva','pasivas')].filter(Boolean).join(' · '),
   icono:ICONO_COLECCION[c.tipo_creacion||'otro']??'yugen',fragmentos}];
 });
}

// ---- Soltar ----
export type Destino={nodo:string;puerto?:string};
const leer=leerRuta;
const pegar=(fragmento:Fragmento,padre?:string,rama?:'exito'|'fallo'):Operacion=>({op:'pegar',fragmento,...(padre?{padre}:{}),...(rama?{rama}:{})});
const esGrupo=(c:CondicionRegla)=>c.tipo==='todas'||c.tipo==='alguna';
/** Une la condición nueva con la que ya hay: sustituye «siempre», se suma a un grupo, agrupa o niega. */
function combinar(actual:CondicionRegla,nueva:CondicionRegla):CondicionRegla{
 if(actual.tipo==='siempre')return nueva;
 if(nueva.tipo==='no')return {tipo:'no',condicion:actual};
 if(esGrupo(nueva))return {...nueva,condiciones:[actual,...(nueva as {condiciones:CondicionRegla[]}).condiciones]} as CondicionRegla;
 if(esGrupo(actual))return {...actual,condiciones:[...(actual as {condiciones:CondicionRegla[]}).condiciones,nueva]} as CondicionRegla;
 return {tipo:'todas',condiciones:[actual,nueva]};
}
function planCondicion(b:Borrador,n:Nodo,nueva:CondicionRegla):Operacion[]{
 let ruta:Ruta;
 if(n.tipo==='cuando')ruta=[...n.ruta,'condicion'];
 else if(n.tipo==='si'){const c=leer(b,n.ruta) as CondicionRegla;ruta=c.tipo==='no'?[...n.ruta,'condicion']:n.ruta;}
 else if(n.tipo==='entonces'&&(leer(b,n.ruta) as EfectoRegla).tipo==='condicional')ruta=[...n.ruta,'condicion'];
 else return falla('Una condición va en una regla: suéltala sobre «Cuándo», otra condición o un efecto condicional.');
 return [{op:'fijar',ruta,valor:combinar((leer(b,ruta) as CondicionRegla|undefined)??{tipo:'siempre'},clon(nueva))}];
}
function planEfecto(b:Borrador,n:Nodo,f:Fragmento,puerto?:string):Operacion[]{
 if(n.tipo==='cuando')return [pegar(f,n.id)];
 if(n.tipo==='si')return [pegar(f,'cuando:'+(b.reglas[n.ruta[1] as number]?.id??falla('La regla ya no existe.')))];
 if(n.tipo==='entonces'){
  const e=leer(b,n.ruta) as EfectoRegla;
  if(e.tipo==='salvacion'||e.tipo==='condicional')return [pegar(f,n.id,puerto==='fallo'?'fallo':'exito')];
  // Un efecto sin ramas: el nuevo va junto a él, en su misma lista (la regla o la rama de su padre).
  const partes=n.id.split(':');
  if(partes.length===3)return [pegar(f,'cuando:'+partes[1])];
  return [pegar(f,partes.slice(0,-2).join(':'),partes[partes.length-2] as 'exito'|'fallo')];
 }
 return falla('Un efecto va en una regla: suéltalo sobre «Cuándo», «Si» u otro efecto.');
}
/**
 * Operaciones para soltar `pieza` sobre `destino` (un nodo y, si se conoce, el puerto de salida bajo el cursor).
 * `destino=null` es el vacío: las piezas que solo cuelgan del núcleo se unen a él; las demás devuelven `null`
 * (quedan «sin conectar»). Lanza `Error` si ese destino no admite la pieza.
 */
export function planSoltar(b:Borrador,pieza:Pieza,destino:Destino|null):Operacion[]|null{
 const enNucleo=!destino||destino.nodo==='nucleo';
 const n=enNucleo?null:aGrafo(b,{creaciones:[]}).nodos.find(x=>x.id===destino!.nodo)??falla('Ese nodo ya no existe.');
 if(pieza.fragmentos.length!==1||pieza.familia==='plantillas'||pieza.familia==='coleccion'){
  if(n)falla(`«${pieza.nombre}» se suma al núcleo: suéltala en el vacío o sobre el núcleo.`);
  return pieza.fragmentos.map(f=>pegar(f,'nucleo'));
 }
 const f=pieza.fragmentos[0];
 switch(f.tipo){
  case 'accion':case 'pasiva':
   if(n)falla(`«${pieza.nombre}» cuelga del núcleo: suéltala en el vacío o sobre el núcleo.`);
   return [pegar(f,'nucleo')];
  case 'cuando':
   if(!n)return [pegar(f,'nucleo')];
   if(n.tipo==='cuando')return [{op:'fijar',ruta:[...n.ruta,'evento'],valor:(f.datos as Regla).evento}];
   return falla('Un evento empieza una regla: suéltalo en el vacío, sobre el núcleo o sobre otro «Cuándo» para cambiarlo.');
  case 'invocacion':
   if(!n)return [pegar(f,'nucleo')];
   if(n.tipo==='accion')return [pegar(f,n.id)];
   return falla('La invocación va en el núcleo o en una acción.');
 }
 if(!destino)return null;
 if(!n)return falla(`«${pieza.nombre}» no cuelga del núcleo: suéltala sobre ${f.tipo==='si'?'una regla':f.tipo==='entonces'?'una regla':'una acción'}.`);
 if(f.tipo==='si')return planCondicion(b,n,f.datos as CondicionRegla);
 if(f.tipo==='entonces')return planEfecto(b,n,f,destino.puerto);
 if(MODULOS.includes(f.tipo)){
  if(n.tipo==='accion')return [pegar(f,n.id)];
  if(MODULOS.includes(n.tipo)&&n.ruta[0]==='efectos')return [pegar(f,'accion:'+b.efectos[n.ruta[1] as number].id)];
  return falla('Los módulos se enganchan a una acción.');
 }
 return falla(`No se puede soltar «${pieza.nombre}» ahí.`);
}
/** El borrador resultante de soltar la pieza, o un Error si no aplica (o `null` si quedaría sin conectar). */
export function resultadoSoltar(b:Borrador,pieza:Pieza,destino:Destino|null):Borrador|null{
 const ops=planSoltar(b,pieza,destino);
 return ops?ops.reduce((x,o)=>aplicar(x,o),b):null;
}
/** ¿Se puede soltar ahí y queda conectado? */
export function probarSoltar(b:Borrador,pieza:Pieza,destino:Destino|null):boolean{
 try{return resultadoSoltar(b,pieza,destino)!==null;}catch{return false;}
}
