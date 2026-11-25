/**
 * Grimorio de estados: biblioteca de estados que el GM guarda para reutilizarlos en cualquier habilidad.
 * Un estado guardado es la misma DefinicionEstado de lib/estados. Al usarlo en una habilidad se COPIA en
 * `estado_def`, que es lo que el motor de combate ya ejecuta: no hay casos nuevos en el motor.
 * Módulo puro (sin Supabase) para poder probarlo en Node.
 */
import {CATALOGO_ESTADOS,primitivas,validarDefinicionEstado,movimientoPermitido,type DefinicionEstado,type CategoriaEstado} from './estados';

export type FilaEstado={id:string;definicion:unknown;color?:string|null;updated_at?:string|null};
export type EstadoGuardado={id:string;def:DefinicionEstado;color:string;actualizado?:string};

/** Aura por categoría: el color de la carta cuando el GM no elige uno. */
export const AURA_CATEGORIA:Record<CategoriaEstado,string>={mental:'#9d8ae0',fisico:'#d9734a',elemental:'#4fb3d9',narrativo:'#e3c58f'};
export const NOMBRE_CATEGORIA:Record<CategoriaEstado,string>={mental:'Mental',fisico:'Físico',elemental:'Elemental',narrativo:'Narrativo'};
export const COLOR_VALIDO=/^#[0-9a-fA-F]{6}$/;
/** Ids del catálogo base: un estado propio nunca puede llamarse igual (sustituiría al del motor). */
export const IDS_RESERVADOS:ReadonlySet<string>=new Set(CATALOGO_ESTADOS.map(d=>d.id));

export const auraDe=(d:DefinicionEstado,color?:string|null)=>color&&COLOR_VALIDO.test(color)?color:AURA_CATEGORIA[d.categoria]||AURA_CATEGORIA.narrativo;

/** Convierte una fila de la base en un estado utilizable; descarta las que no validan. */
export function leerFila(f:FilaEstado):EstadoGuardado|null{
 const def=f?.definicion as DefinicionEstado|undefined;
 if(!def||typeof def!=='object'||def.id!==f.id||validarDefinicionEstado(def))return null;
 return {id:f.id,def,color:auraDe(def,f.color),actualizado:f.updated_at||undefined};
}

/** Identificador libre: evita el catálogo base y los ya guardados (sopor → sopor_2 → sopor_3…). */
export function idLibre(base:string,ocupados:Iterable<string>):string{
 const usados=new Set(ocupados);
 const limpio=(base||'estado').slice(0,56);
 if(!IDS_RESERVADOS.has(limpio)&&!usados.has(limpio))return limpio;
 for(let i=2;;i++){const c=`${limpio}_${i}`;if(!IDS_RESERVADOS.has(c)&&!usados.has(c))return c;}
}

/** Validación del grimorio: la del motor más las reglas de la biblioteca. */
export function validarEstadoGuardado(d:DefinicionEstado,color:string,otros:Iterable<string>=[]):string|null{
 const e=validarDefinicionEstado(d);if(e)return e;
 if(IDS_RESERVADOS.has(d.id))return 'Ese nombre ya lo usa un estado del catálogo base. Elige otro.';
 if(new Set(otros).has(d.id))return 'Ya tienes un estado con ese nombre en el grimorio.';
 if(!COLOR_VALIDO.test(color))return 'Elige un color de aura.';
 return null;
}

/** Copia independiente para guardarla dentro de una habilidad (cambios futuros del grimorio no la alteran). */
export const copiaParaHabilidad=(d:DefinicionEstado):DefinicionEstado=>structuredClone(d);

/** Peso de un estado: una cifra orientativa para la carta («poder» de 1 a 5 runas). */
export function poderEstado(d:DefinicionEstado):number{
 let p=0;
 for(const x of d.efectos){
  if(x.tipo==='perder_turno')p+=x.primer_turno?2:3;
  else if(x.tipo==='cesion_control')p+=x.controlador==='fuente'?4:3;
  else if(x.tipo==='dano_periodico'||x.tipo==='curacion_periodica')p+=Math.min(3,x.cantidad*(x.caras+1)/2/4);
  else if(x.tipo==='movimiento_forzado'||x.tipo==='percepcion_alterada')p+=1.5;
  else if(x.tipo==='modificador_movimiento')p+=x.modo==='cero'?1.5:1;
  else if(x.tipo==='bonos')p+=Math.min(2,Object.values(x.bonos).reduce((s,v)=>s+Math.abs(v),0)/3);
  else p+=1;
 }
 const du=d.duracion;
 p*=du.tipo==='turnos'?Math.min(1.6,.7+du.turnos*.15):du.tipo==='hasta_su_turno'?.6:1.1;
 return Math.max(1,Math.min(5,Math.round(p)));
}

// ── Muñeco de pruebas ────────────────────────────────────────────────────────────────────────────
export type EventoPrueba={tipo:'dano'|'cura'|'pierde'|'mueve'|'control'|'percepcion'|'salvacion'|'fin'|'actua';texto:string;valor?:number};
export type TurnoPrueba={n:number;eventos:EventoPrueba[];vida:number;movimiento:number;activo:boolean};
export type ResultadoPrueba={turnos:TurnoPrueba[];pasivos:string[];vidaInicial:number;vidaFinal:number};
const tirarDados=(cantidad:number,caras:number,tirar:(caras:number)=>number)=>{let s=0;for(let i=0;i<cantidad;i++)s+=tirar(caras);return s;};

/**
 * Simulación aproximada del estado sobre un muñeco, turno a turno. No sustituye al motor: sirve para que el GM
 * «vea» su estado en acción antes de usarlo. `tirar(caras)` devuelve un entero 1..caras (inyectable en pruebas).
 */
export function simularEstado(d:DefinicionEstado,{vida=30,movimiento=6,maxTurnos=5,tirar=(c:number)=>1+Math.floor(Math.random()*c)}:{vida?:number;movimiento?:number;maxTurnos?:number;tirar?:(caras:number)=>number}={}):ResultadoPrueba{
 const turnos:TurnoPrueba[]=[],pasivos:string[]=[];
 for(const p of primitivas(d,'bonos'))pasivos.push(Object.entries(p.bonos).map(([k,v])=>`${v>0?'+':''}${v} ${k.replace(/_/g,' ')}`).join(', '));
 for(const p of primitivas(d,'inmunidad'))pasivos.push(`Inmune a ${p.inmunidades.map(i=>i.valor.replace(/_/g,' ')).join(', ')}`);
 for(const p of primitivas(d,'vulnerabilidad_elemental'))for(const r of p.reacciones)pasivos.push(`Si le alcanza ${r.elemento.replace(/_/g,' ')}: ${r.nombre}${r.multiplicador?` (daño ×${r.multiplicador})`:''}${r.aplica_estado?` → ${r.aplica_estado.replace(/_/g,' ')}`:''}`);
 const du=d.duracion;
 const limite=du.tipo==='turnos'?Math.min(du.turnos,maxTurnos):du.tipo==='hasta_su_turno'?1:maxTurnos;
 const movBase=movimientoPermitido([d],movimiento);
 let hp=vida,activo=true;
 const periodico=(momento:'inicio'|'fin',ev:EventoPrueba[])=>{
  let recibido=0;
  for(const p of primitivas(d,'dano_periodico'))if(p.momento===momento){
   const v=tirarDados(p.cantidad,p.caras,tirar);hp=Math.max(0,hp-v);recibido+=v;
   ev.push({tipo:'dano',valor:v,texto:`${p.cantidad}d${p.caras} de ${p.tipo_dano.replace(/_/g,' ')}: −${v}`});
   if(p.salvacion_termina){const s=tirar(20);if(s>=p.salvacion_termina.cd){ev.push({tipo:'salvacion',valor:s,texto:`Salvación ${s} ≥ CD ${p.salvacion_termina.cd}: se libra`});activo=false;}
    else ev.push({tipo:'salvacion',valor:s,texto:`Salvación ${s} < CD ${p.salvacion_termina.cd}: sigue`});}
  }
  for(const p of primitivas(d,'curacion_periodica'))if(p.momento===momento){const v=tirarDados(p.cantidad,p.caras,tirar);const antes=hp;hp=Math.min(vida,hp+v);ev.push({tipo:'cura',valor:v,texto:`${p.cantidad}d${p.caras} de curación: +${hp-antes}`});}
  if(recibido&&activo&&d.despertar?.recibir_dano){ev.push({tipo:'fin',texto:'El daño lo despierta'});activo=false;}
 };
 for(let n=1;n<=limite&&activo&&hp>0;n++){
  const ev:EventoPrueba[]=[];
  if(du.tipo==='hasta_su_turno'){ev.push({tipo:'fin',texto:'Al iniciar su turno, el estado se desvanece'});turnos.push({n,eventos:ev,vida:hp,movimiento,activo:false});activo=false;break;}
  periodico('inicio',ev);
  const salv=d.despertar?.salvacion||(du.tipo==='salvacion'?du.salvacion:undefined);
  const perder=primitivas(d,'perder_turno');
  const pierdeSeguro=perder.some(p=>p.primer_turno)&&n===1;
  if(activo&&salv&&!pierdeSeguro){const s=tirar(20);if(s>=salv.cd){ev.push({tipo:'salvacion',valor:s,texto:`Salvación ${s} ≥ CD ${salv.cd}: rompe el estado`});activo=false;}else ev.push({tipo:'salvacion',valor:s,texto:`Salvación ${s} < CD ${salv.cd}: no lo rompe`});}
  if(activo&&hp>0){
   if(perder.length){const p=perder[0];ev.push({tipo:'pierde',texto:`Pierde el turno${p.permite_reacciones===false?' (sin reacciones)':''}`});if(perder.some(x=>x.consumir)){ev.push({tipo:'fin',texto:'El estado se consume'});activo=false;}}
   else{
    for(const p of primitivas(d,'cesion_control'))ev.push({tipo:'control',texto:p.controlador==='gm'?'El GM decide sus actos':'Su captor decide sus actos'});
    for(const p of primitivas(d,'percepcion_alterada')){const r=tirar(100);ev.push({tipo:'percepcion',valor:r,texto:r<=p.probabilidad?`Confunde los bandos (${r} ≤ ${p.probabilidad})`:`Ve con claridad (${r} > ${p.probabilidad})`});}
    for(const p of primitivas(d,'movimiento_forzado')){const c=p.min+Math.floor((tirar(p.max-p.min+1)-1));ev.push({tipo:'mueve',valor:c,texto:`${p.sentido==='alejar'?'Huye':'Es arrastrado'} ${c} casilla${c===1?'':'s'}${p.no_ataca_fuente?' y no ataca a su fuente':''}`});}
    if(!ev.some(e=>e.tipo==='control'||e.tipo==='mueve'))ev.push({tipo:'actua',texto:movBase<movimiento?`Actúa con ${movBase} de movimiento`:'Actúa con normalidad'});
   }
  }
  if(activo)periodico('fin',ev);
  if(hp<=0)ev.push({tipo:'fin',texto:'¡El muñeco cae!'});
  if(activo&&du.tipo==='turnos'&&n===du.turnos){ev.push({tipo:'fin',texto:'Se agota la duración'});activo=false;}
  turnos.push({n,eventos:ev,vida:hp,movimiento:perder.length&&ev.some(e=>e.tipo==='pierde')?0:movBase,activo});
  if(!activo)break;
 }
 return {turnos,pasivos,vidaInicial:vida,vidaFinal:hp};
}
