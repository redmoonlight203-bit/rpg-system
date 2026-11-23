/**
 * Estados configurables (plan maestro, Apéndice B). Un estado es una DEFINICIÓN DE DATOS hecha de primitivas que el
 * motor sabe ejecutar. Asustado, Dormido o Envenenado no son casos especiales del código: son combinaciones de
 * primitivas. Añadir un estado nuevo no requiere programar: se crea en el Yunque.
 * Módulo puro (el motor Edge lo incrusta).
 */
import type {Inmunidad} from './inmunidades';
import {validarInmunidades} from './inmunidades';
export type CategoriaEstado='mental'|'fisico'|'elemental'|'narrativo';
export type TiradaSalvacion={cd:number;atributo:string};
export type ReaccionElemental={elemento:string;nombre:string;
 /** Dados extra que se suman al daño del componente. */
 dados?:{cantidad:number;caras:number};
 /** Multiplica el daño del componente al final (Superconducción ×2). */
 multiplicador?:number;
 /** El multiplicador solo vale contra criaturas corruptas u oscuras. */
 solo_corruptos?:boolean;
 /** Estado del catálogo que se aplica al objetivo (p. ej. «ciego», «congelado»). */
 aplica_estado?:string;
 /** Texto del registro al multiplicar. */
 mensaje?:string};
export type Primitiva=
 |{tipo:'perder_turno';
   /** Pierde el primer turno siempre (100 %), sin tirada de despertar. */
   primer_turno?:boolean;
   /** Puede usar reacciones mientras dure (por defecto sí). */
   permite_reacciones?:boolean;
   /** El estado se gasta al perder el turno (Congelado, Aturdido). */
   consumir?:boolean}
 |{tipo:'movimiento_forzado';sentido:'alejar'|'acercar';min:number;max:number;
   /** No puede atacar a la fuente mientras dure, ni acorralado. */
   no_ataca_fuente?:boolean}
 |{tipo:'cesion_control';controlador:'gm'|'fuente'}
 |{tipo:'percepcion_alterada';probabilidad:number}
 |{tipo:'dano_periodico';cantidad:number;caras:number;tipo_dano:string;momento:'inicio'|'fin';
   /** Salvación tras el daño para terminar el estado (Quemadura). */
   salvacion_termina?:TiradaSalvacion}
 |{tipo:'curacion_periodica';cantidad:number;caras:number;momento:'inicio'|'fin'}
 |{tipo:'modificador_movimiento';modo:'cero'|'mitad'|'restar';valor?:number}
 |{tipo:'vulnerabilidad_elemental';
   /** El estado desaparece al reaccionar (Mojado). */
   consume?:boolean;reacciones:ReaccionElemental[]}
 |{tipo:'bonos';bonos:Record<string,number>}
 |{tipo:'inmunidad';inmunidades:Inmunidad[]};
export type TipoPrimitiva=Primitiva['tipo'];
export type DuracionEstado={tipo:'turnos';turnos:number}|{tipo:'combate'}|{tipo:'salvacion';salvacion:TiradaSalvacion}|{tipo:'hasta_su_turno'};
export type DefinicionEstado={id:string;nombre:string;icono?:string;categoria:CategoriaEstado;subcategoria?:string;
 duracion:DuracionEstado;efectos:Primitiva[];
 /** Elemento o naturaleza de origen: lo usan las inmunidades y el daño periódico. */
 origen?:string;
 /** Fin anticipado: al recibir daño y/o con una salvación al inicio de su turno. */
 despertar?:{recibir_dano?:boolean;salvacion?:TiradaSalvacion};
 descripcion?:string};
export const NOMBRE_PRIMITIVA:Record<TipoPrimitiva,string>={perder_turno:'Perder turno',movimiento_forzado:'Movimiento forzado',cesion_control:'Cesión de control',percepcion_alterada:'Percepción alterada',dano_periodico:'Daño periódico',curacion_periodica:'Curación periódica',modificador_movimiento:'Modificador de movimiento',vulnerabilidad_elemental:'Vulnerabilidad elemental',bonos:'Bonos y penalizaciones',inmunidad:'Inmunidad temporal'};
export const ICONO_PRIMITIVA:Record<TipoPrimitiva,string>={perder_turno:'reloj',movimiento_forzado:'ojo',cesion_control:'alma',percepcion_alterada:'ojo',dano_periodico:'fuego',curacion_periodica:'vida',modificador_movimiento:'reloj',vulnerabilidad_elemental:'agua',bonos:'escudo',inmunidad:'escudo'};
export const CATEGORIAS_ESTADO:CategoriaEstado[]=['mental','fisico','elemental','narrativo'];
const SALV:TiradaSalvacion={cd:12,atributo:'salvacion'};
/** Catálogo base. Los estados del motor antiguo son ahora definiciones; sus resultados no cambian. */
export const CATALOGO_ESTADOS:DefinicionEstado[]=[
 {id:'congelado',nombre:'Congelado',icono:'hielo',categoria:'elemental',origen:'hielo',duracion:{tipo:'combate'},efectos:[{tipo:'perder_turno',consumir:true}],descripcion:'Pierde su siguiente turno.'},
 {id:'aturdido',nombre:'Aturdido',icono:'rayo',categoria:'fisico',duracion:{tipo:'turnos',turnos:1},efectos:[{tipo:'perder_turno',consumir:true}],descripcion:'Pierde su siguiente turno.'},
 {id:'mojado',nombre:'Mojado',icono:'agua',categoria:'elemental',origen:'agua',duracion:{tipo:'combate'},efectos:[{tipo:'vulnerabilidad_elemental',consume:true,reacciones:[
  {elemento:'fuego',nombre:'Onda de vapor',dados:{cantidad:1,caras:4},aplica_estado:'ciego'},
  {elemento:'hielo',nombre:'Congelación',aplica_estado:'congelado'},
  {elemento:'luz_sagrada',nombre:'Agua bendita',dados:{cantidad:1,caras:6},multiplicador:2,solo_corruptos:true,mensaje:'Agua bendita contra oscuridad/corrupción: daño sagrado × 2.'},
  {elemento:'electricidad',nombre:'Superconducción',multiplicador:2,mensaje:'Superconducción: daño principal × 2.'}]}],descripcion:'El agua amplifica el siguiente elemento que lo toque.'},
 {id:'quemadura',nombre:'Quemadura',icono:'fuego',categoria:'elemental',origen:'fuego',duracion:{tipo:'combate'},efectos:[{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'fuego',momento:'inicio',salvacion_termina:SALV}]},
 {id:'veneno',nombre:'Envenenado',icono:'pocion',categoria:'fisico',origen:'veneno',duracion:{tipo:'turnos',turnos:3},efectos:[{tipo:'dano_periodico',cantidad:1,caras:4,tipo_dano:'veneno',momento:'inicio'}]},
 {id:'regeneracion',nombre:'Regeneración',icono:'vida',categoria:'fisico',duracion:{tipo:'turnos',turnos:3},efectos:[{tipo:'curacion_periodica',cantidad:1,caras:4,momento:'inicio'}]},
 {id:'dominado',nombre:'Dominado',icono:'alma',categoria:'mental',subcategoria:'control',duracion:{tipo:'combate'},efectos:[{tipo:'cesion_control',controlador:'gm'}],descripcion:'El GM decide sus actos.'},
 {id:'control_mental',nombre:'Control mental',icono:'alma',categoria:'mental',subcategoria:'control',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'cesion_control',controlador:'fuente'}],descripcion:'Quien lo controla decide sus actos; el GM puede cortarlo.'},
 {id:'asustado',nombre:'Asustado',icono:'ojo',categoria:'mental',subcategoria:'miedo',duracion:{tipo:'turnos',turnos:3},efectos:[{tipo:'movimiento_forzado',sentido:'alejar',min:1,max:2,no_ataca_fuente:true}]},
 {id:'hipnotizado',nombre:'Hipnotizado',icono:'ojo',categoria:'mental',subcategoria:'ilusion',duracion:{tipo:'turnos',turnos:3},efectos:[{tipo:'percepcion_alterada',probabilidad:50}]},
 {id:'dormido',nombre:'Dormido',icono:'reloj',categoria:'mental',subcategoria:'control',duracion:{tipo:'turnos',turnos:3},efectos:[{tipo:'perder_turno',permite_reacciones:false},{tipo:'modificador_movimiento',modo:'cero'}],despertar:{recibir_dano:true}},
 {id:'paralizado',nombre:'Paralizado',icono:'rayo',categoria:'fisico',duracion:{tipo:'salvacion',salvacion:SALV},efectos:[{tipo:'perder_turno',primer_turno:true,permite_reacciones:true},{tipo:'modificador_movimiento',modo:'cero'}],despertar:{salvacion:SALV}},
 {id:'en_trance',nombre:'En trance',icono:'alma',categoria:'mental',subcategoria:'confusion',duracion:{tipo:'turnos',turnos:2},efectos:[{tipo:'perder_turno',permite_reacciones:false},{tipo:'modificador_movimiento',modo:'cero'}]},
 {id:'guardia',nombre:'Guardia',icono:'escudo',categoria:'fisico',duracion:{tipo:'hasta_su_turno'},efectos:[{tipo:'bonos',bonos:{armadura:2}}]},
 {id:'ciego',nombre:'Ceguera: -4 al próximo ataque',icono:'ojo',categoria:'elemental',duracion:{tipo:'combate'},efectos:[{tipo:'bonos',bonos:{bono_impacto:-4}}],descripcion:'Se consume en su próximo ataque.'},
 {id:'escarcha',nombre:'Escarcha: ARM a la mitad hasta el próximo ataque',icono:'hielo',categoria:'elemental',origen:'hielo',duracion:{tipo:'combate'},efectos:[],descripcion:'ARM a la mitad contra el próximo ataque.'},
 {id:'marca_luz',nombre:'Marcado por la Luz',icono:'corona',categoria:'elemental',origen:'luz_sagrada',duracion:{tipo:'combate'},efectos:[],descripcion:'El próximo golpe estalla con 1d6.'},
];
const POR_ID=new Map(CATALOGO_ESTADOS.map(d=>[d.id,d]));
export const definicionBase=(id:string|undefined):DefinicionEstado|undefined=>id?POR_ID.get(id):undefined;
/** Definición de una instancia activa: la copia que lleva (estado creado en el Yunque) o la del catálogo. */
export function definicionDe(inst:{tipo?:string;id?:string;def?:DefinicionEstado}):DefinicionEstado|undefined{
 return inst.def||definicionBase(inst.tipo||inst.id);
}
export const primitivas=<T extends TipoPrimitiva>(d:DefinicionEstado|undefined,tipo:T):Extract<Primitiva,{tipo:T}>[]=>(d?.efectos||[]).filter((p):p is Extract<Primitiva,{tipo:T}>=>p.tipo===tipo);
const entero=(v:unknown,min:number,max:number)=>Number.isInteger(v)&&(v as number)>=min&&(v as number)<=max;
const salvValida=(s:TiradaSalvacion|undefined)=>!s||(entero(s.cd,1,100)&&/^[a-z_][a-z0-9_]*$/.test(s.atributo||''));
export function validarDefinicionEstado(d:DefinicionEstado|undefined):string|null{
 if(!d||typeof d!=='object')return 'Estado sin definir.';
 if(!/^[a-z_][a-z0-9_]{0,63}$/.test(d.id||''))return 'El estado necesita un identificador (letras minúsculas y guiones bajos).';
 if(typeof d.nombre!=='string'||!d.nombre.trim()||d.nombre.length>120)return 'El estado necesita un nombre.';
 if(!CATEGORIAS_ESTADO.includes(d.categoria))return 'Categoría de estado inválida.';
 const du=d.duracion;
 if(!du||!['turnos','combate','salvacion','hasta_su_turno'].includes(du.tipo))return 'Elige una duración.';
 if(du.tipo==='turnos'&&!entero(du.turnos,1,99))return 'La duración va de 1 a 99 turnos.';
 if(du.tipo==='salvacion'&&(!du.salvacion||!salvValida(du.salvacion)))return 'Configura la salvación que termina el estado.';
 if(!Array.isArray(d.efectos)||d.efectos.length>8)return 'Hasta 8 primitivas por estado.';
 if(d.despertar&&!salvValida(d.despertar.salvacion))return 'Salvación de despertar inválida.';
 if(d.origen!==undefined&&!/^[a-z_][a-z0-9_]{0,63}$/.test(d.origen))return 'Origen inválido.';
 for(const p of d.efectos){
  if(!p||!(p.tipo in NOMBRE_PRIMITIVA))return 'Primitiva desconocida.';
  if(p.tipo==='movimiento_forzado'&&(!['alejar','acercar'].includes(p.sentido)||!entero(p.min,0,12)||!entero(p.max,1,12)||p.min>p.max))return 'Movimiento forzado: de 0 a 12 casillas (mínimo ≤ máximo).';
  if(p.tipo==='cesion_control'&&!['gm','fuente'].includes(p.controlador))return 'Elige quién controla.';
  if(p.tipo==='percepcion_alterada'&&!entero(p.probabilidad,0,100))return 'Probabilidad de 0 a 100.';
  if((p.tipo==='dano_periodico'||p.tipo==='curacion_periodica')&&(!entero(p.cantidad,1,20)||!entero(p.caras,2,100)||!['inicio','fin'].includes(p.momento)))return 'Dados periódicos de 1 a 20 y de 2 a 100 caras.';
  if(p.tipo==='dano_periodico'&&(!/^[a-z_][a-z0-9_]{0,63}$/.test(p.tipo_dano||'')||!salvValida(p.salvacion_termina)))return 'Indica el tipo de daño periódico.';
  if(p.tipo==='modificador_movimiento'&&(!['cero','mitad','restar'].includes(p.modo)||(p.modo==='restar'&&!entero(p.valor,1,30))))return 'Modificador de movimiento inválido.';
  if(p.tipo==='vulnerabilidad_elemental'&&(!Array.isArray(p.reacciones)||!p.reacciones.length||p.reacciones.some(r=>!r||!r.elemento||!r.nombre||(r.dados&&(!entero(r.dados.cantidad,1,20)||!entero(r.dados.caras,2,100)))||(r.multiplicador!==undefined&&!(r.multiplicador>0&&r.multiplicador<=5)))))return 'Cada reacción elemental necesita elemento, nombre y valores válidos.';
  if(p.tipo==='bonos'&&(!p.bonos||Object.entries(p.bonos).some(([k,v])=>!/^[a-z_][a-z0-9_]*$/.test(k)||!Number.isFinite(v)||Math.abs(v)>1000)))return 'Bonos inválidos.';
  if(p.tipo==='inmunidad'){const e=validarInmunidades(p.inmunidades);if(e)return e;if(!p.inmunidades?.length)return 'Añade al menos una inmunidad.';}
 }
 return null;
}
/** Bonos que suma la definición (además de los bonos propios de la instancia). */
export function bonosDefinicion(d:DefinicionEstado|undefined):Record<string,number>{
 const r:Record<string,number>={};for(const p of primitivas(d,'bonos'))for(const [k,v] of Object.entries(p.bonos))r[k]=(r[k]||0)+v;return r;
}
/** Turnos iniciales de una instancia. 0 = hasta que se consuma o termine el combate. */
export function turnosIniciales(d:DefinicionEstado,pedidos?:number):number{
 if(d.duracion.tipo==='turnos')return Math.max(1,pedidos||d.duracion.turnos);
 if(d.duracion.tipo==='hasta_su_turno')return 1;
 return pedidos&&pedidos>0&&d.duracion.tipo!=='salvacion'?pedidos:0;
}
export function movimientoPermitido(defs:(DefinicionEstado|undefined)[],base:number):number{
 let v=base;
 for(const d of defs)for(const p of primitivas(d,'modificador_movimiento'))v=p.modo==='cero'?0:p.modo==='mitad'?Math.floor(v/2):Math.max(0,v-(p.valor||0));
 return v;
}
export const permiteReacciones=(defs:(DefinicionEstado|undefined)[])=>!defs.some(d=>primitivas(d,'perder_turno').some(p=>p.permite_reacciones===false));
const SUJETO_TIPO:Record<string,string>={fuego:'fuego',veneno:'veneno',agua:'agua',hielo:'hielo',electricidad:'rayo',luz_sagrada:'luz sagrada'};
/** Frase en lenguaje claro: la misma en el editor del Yunque y en el tooltip de combate. */
export function describirEstado(d:DefinicionEstado):string{
 const partes:string[]=[];
 for(const p of d.efectos){
  if(p.tipo==='perder_turno')partes.push((p.primer_turno?'pierde siempre su primer turno':'pierde su turno')+(p.consumir?' (una vez)':'')+(p.permite_reacciones===false?', sin reacciones':''));
  if(p.tipo==='movimiento_forzado')partes.push(`${p.sentido==='alejar'?'se aleja':'se acerca'} ${p.min===p.max?p.max:`${p.min}–${p.max}`} casillas de su fuente cada turno${p.no_ataca_fuente?' y no puede atacarla':''}`);
  if(p.tipo==='cesion_control')partes.push(p.controlador==='gm'?'el GM decide sus actos':'quien lo lanzó decide sus actos (el GM puede cortarlo)');
  if(p.tipo==='percepcion_alterada')partes.push(`ve los bandos invertidos (${p.probabilidad} % cada turno)`);
  if(p.tipo==='dano_periodico')partes.push(`recibe ${p.cantidad}d${p.caras} de ${SUJETO_TIPO[p.tipo_dano]||p.tipo_dano.replace(/_/g,' ')} al ${p.momento} de su turno${p.salvacion_termina?` (salvación CD ${p.salvacion_termina.cd} para apagarlo)`:''}`);
  if(p.tipo==='curacion_periodica')partes.push(`recupera ${p.cantidad}d${p.caras} de vida al ${p.momento} de su turno`);
  if(p.tipo==='modificador_movimiento')partes.push(p.modo==='cero'?'no puede moverse':p.modo==='mitad'?'se mueve a la mitad':`pierde ${p.valor} casillas de movimiento`);
  if(p.tipo==='vulnerabilidad_elemental')partes.push(`reacciona con ${p.reacciones.map(r=>`${SUJETO_TIPO[r.elemento]||r.elemento} (${r.nombre})`).join(', ')}${p.consume?' y se consume':''}`);
  if(p.tipo==='bonos')partes.push(Object.entries(p.bonos).map(([k,v])=>`${v>0?'+':''}${v} ${k.replace(/_/g,' ')}`).join(', '));
  if(p.tipo==='inmunidad')partes.push(`inmune a ${p.inmunidades.map(i=>i.valor.replace(/_/g,' ')).join(', ')}`);
 }
 if(d.despertar?.recibir_dano)partes.push('despierta al recibir daño');
 if(d.despertar?.salvacion)partes.push(`salvación CD ${d.despertar.salvacion.cd} al inicio de cada turno para terminarlo`);
 const du=d.duracion;
 const dura=du.tipo==='turnos'?`dura ${du.turnos} ${du.turnos===1?'turno':'turnos'}`:du.tipo==='combate'?'dura hasta que se consuma o acabe el combate':du.tipo==='salvacion'?`dura hasta superar CD ${du.salvacion.cd}`:'dura hasta el inicio de su siguiente turno';
 return `${d.nombre}: ${[...partes,dura].filter(Boolean).join('; ')}.`;
}
/** Nueva definición vacía para el editor. */
export const estadoVacio=(id='estado_nuevo'):DefinicionEstado=>({id,nombre:'Nuevo estado',icono:'fuego',categoria:'narrativo',duracion:{tipo:'turnos',turnos:2},efectos:[]});
