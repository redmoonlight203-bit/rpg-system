// Códices de La creación: cómo se lee cada creación de la Forja (bestiario, tarot, reliquia…).
// Todo lo que decide la presentación vive en una ConfiguracionCodices que el GM edita desde el
// Taller de códices; aquí solo hay lógica pura y los valores por defecto.
import {SLOTS,TIPOS,type Efecto} from './creacion';
import type {ConfiguracionMonstruo} from './monstruos';
import type {ReglaPasiva} from './pasivas';

export const CODICES=['bestiario','expediente','tarot','reliquia','sello','edicto','pergamino'] as const;
export type Codice=typeof CODICES[number];

export const CLAVES_SECCION=[
  'atributos','heraldica','acciones','dados','tirada','pasivas','ritual','reglas',
  'grimorio','arsenal','talismanes','vinculos','variantes','artefacto',
  'requisitos','naturaleza','invocacion','historia','portadores',
] as const;
export type ClaveSeccion=typeof CLAVES_SECCION[number];

/** Secciones que cualquier códice puede mostrar. El título es el valor por defecto; el GM lo cambia. */
export const CATALOGO_SECCIONES:Record<ClaveSeccion,{titulo:string;ayuda:string}>={
  atributos:{titulo:'Atributos',ayuda:'Estadísticas fijas o rangos de la malla.'},
  heraldica:{titulo:'Heráldica',ayuda:'Los atributos como escudos con su bono.'},
  acciones:{titulo:'Acciones y efectos',ayuda:'Acciones con dados, costes y efectos.'},
  dados:{titulo:'Dados',ayuda:'Fórmulas de las acciones de daño.'},
  tirada:{titulo:'Tirada de prueba',ayuda:'Lanza los dados de una acción sin aplicar nada.'},
  pasivas:{titulo:'Pasivas',ayuda:'Pasivas propias en texto.'},
  ritual:{titulo:'Ritual',ayuda:'Pasivas propias como cadena evento → condición → efectos.'},
  reglas:{titulo:'Reglas de la creación',ayuda:'Reglas del motor con sus condiciones y efectos.'},
  grimorio:{titulo:'Grimorio',ayuda:'Habilidades enlazadas, en abanico de cartas.'},
  arsenal:{titulo:'Arsenal',ayuda:'Equipo por espacio, como un muñeco.'},
  talismanes:{titulo:'Talismanes',ayuda:'Pasivas enlazadas, como sellos.'},
  vinculos:{titulo:'Vínculos',ayuda:'Todas las creaciones enlazadas: habilidades, pasivas y equipo.'},
  variantes:{titulo:'Variantes',ayuda:'Variantes de un monstruo; en el bestiario, una lámina por variante.'},
  artefacto:{titulo:'Despertar del artefacto',ayuda:'Niveles del artefacto y cómo se sube.'},
  requisitos:{titulo:'Requisitos',ayuda:'Requisitos de uso, requisitos narrativos y limitaciones.'},
  naturaleza:{titulo:'Vínculo de naturaleza',ayuda:'Bestia, sello y origen del vínculo.'},
  invocacion:{titulo:'Invocación',ayuda:'Plantilla de la criatura invocada.'},
  historia:{titulo:'Historia',ayuda:'Historia y forma activa.'},
  portadores:{titulo:'La portan',ayuda:'Creaciones que incluyen esta.'},
};

export type ReglaAsignacion={id:string;tipo:string;monstruo:'si'|'no'|'*';clasificacion:string;codice:Codice};
export type SeccionConfig={clave:ClaveSeccion;visible:boolean;titulo:string};
export type AjustesCodice={nombre:string;eyebrow:string;secciones:SeccionConfig[]};
export type ConfiguracionCodices={
  version:1;
  asignaciones:ReglaAsignacion[];
  porCreacion:Record<string,Codice>;
  codices:Record<Codice,AjustesCodice>;
  movimiento:{activo:boolean;pagina_ms:number;volteo_ms:number;inclinacion_max:number};
  libro:{dos_paginas_desde:number};
  rastro:{max:number};
  tarot:{tirada:boolean};
};

const secciones=(...lista:ClaveSeccion[]):SeccionConfig[]=>lista.map(clave=>({clave,visible:true,titulo:CATALOGO_SECCIONES[clave].titulo}));

export function configuracionBase():ConfiguracionCodices{
  return {
    version:1,
    asignaciones:[
      {id:'monstruos',tipo:'personaje',monstruo:'si',clasificacion:'',codice:'bestiario'},
      {id:'personajes',tipo:'personaje',monstruo:'*',clasificacion:'',codice:'expediente'},
      {id:'habilidades',tipo:'habilidad',monstruo:'*',clasificacion:'',codice:'tarot'},
      {id:'objetos',tipo:'objeto',monstruo:'*',clasificacion:'',codice:'reliquia'},
      {id:'pasivas',tipo:'pasiva',monstruo:'*',clasificacion:'',codice:'sello'},
      {id:'titulos',tipo:'titulo',monstruo:'*',clasificacion:'',codice:'edicto'},
      {id:'otros',tipo:'*',monstruo:'*',clasificacion:'',codice:'pergamino'},
    ],
    porCreacion:{},
    codices:{
      bestiario:{nombre:'Bestiario',eyebrow:'Bestiario · {clasificacion}',secciones:[
        ...secciones('atributos','vinculos','variantes','acciones','pasivas','reglas','requisitos','historia'),
      ].map(s=>s.clave==='atributos'?{...s,titulo:'Ficha de campo'}:s.clave==='vinculos'?{...s,titulo:'Anatomía'}:s.clave==='historia'?{...s,titulo:'Crónica'}:s)},
      expediente:{nombre:'Expediente de héroe',eyebrow:'Expediente · {clasificacion}',secciones:secciones('atributos','grimorio','arsenal','talismanes','acciones','pasivas','reglas','naturaleza','invocacion','requisitos','historia')},
      tarot:{nombre:'Carta de tarot',eyebrow:'Arcano {romano} · {clasificacion}',secciones:secciones('tirada','requisitos','reglas','vinculos','portadores','historia')},
      reliquia:{nombre:'Reliquia',eyebrow:'Reliquia · {clasificacion}',secciones:[
        ...secciones('atributos','dados','artefacto','acciones','requisitos','reglas','vinculos','portadores','historia'),
      ].map(s=>s.clave==='atributos'?{...s,titulo:'Inscripción'}:s)},
      sello:{nombre:'Sello',eyebrow:'Sello · {clasificacion}',secciones:secciones('ritual','reglas','requisitos','vinculos','portadores','historia')},
      edicto:{nombre:'Edicto',eyebrow:'Por decreto de Kuroi',secciones:secciones('heraldica','reglas','requisitos','vinculos','historia','portadores')},
      pergamino:{nombre:'Pergamino',eyebrow:'{tipo} / {clasificacion}',secciones:secciones('atributos','acciones','pasivas','reglas','vinculos','requisitos','historia','portadores')},
    },
    movimiento:{activo:true,pagina_ms:650,volteo_ms:600,inclinacion_max:6},
    libro:{dos_paginas_desde:900},
    rastro:{max:8},
    tarot:{tirada:true},
  };
}

export const esCodice=(v:unknown):v is Codice=>typeof v==='string'&&(CODICES as readonly string[]).includes(v);
const esClave=(v:unknown):v is ClaveSeccion=>typeof v==='string'&&(CLAVES_SECCION as readonly string[]).includes(v);
const esObjeto=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const texto=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):null;

function acotar(v:unknown,min:number,max:number,defecto:number,nombre:string,avisos:string[]):number{
  if(typeof v!=='number'||!Number.isFinite(v))return defecto;
  const r=Math.min(max,Math.max(min,Math.round(v)));
  if(r!==Math.round(v))avisos.push(`${nombre} se ajustó a ${r} (permitido entre ${min} y ${max}).`);
  return r;
}

/** Acepta cualquier valor (archivo importado, fila antigua…) y devuelve una configuración válida. Nunca lanza. */
export function normalizarConfiguracion(raw:unknown):{config:ConfiguracionCodices;avisos:string[]}{
  const base=configuracionBase(),avisos:string[]=[];
  if(!esObjeto(raw))return {config:base,avisos:raw==null?[]:['El archivo no contiene una configuración de códices; se usan los valores por defecto.']};
  const tipos=new Set<string>(['*',...TIPOS.map(t=>t.valor)]);
  let asignaciones=base.asignaciones;
  if(Array.isArray(raw.asignaciones)){
    asignaciones=[];
    raw.asignaciones.slice(0,50).forEach((a,i)=>{
      if(!esObjeto(a)||!esCodice(a.codice)||!tipos.has(String(a.tipo))||!['si','no','*'].includes(String(a.monstruo))){
        avisos.push(`Se descartó la regla de asignación ${i+1}: tipo, monstruo o códice desconocido.`);return;
      }
      asignaciones.push({id:texto(a.id,60)||`regla-${i+1}`,tipo:String(a.tipo),monstruo:a.monstruo as ReglaAsignacion['monstruo'],clasificacion:texto(a.clasificacion,100)||'',codice:a.codice});
    });
  }
  const porCreacion:Record<string,Codice>={};
  if(esObjeto(raw.porCreacion))for(const [id,c] of Object.entries(raw.porCreacion).slice(0,2000)){
    if(esCodice(c)&&id.length<=100)porCreacion[id]=c;else avisos.push(`Se descartó «Ver como» de ${id}: códice desconocido.`);
  }
  const codices=base.codices;
  if(esObjeto(raw.codices))for(const [k,v] of Object.entries(raw.codices)){
    if(!esCodice(k)){avisos.push(`Se descartó el códice desconocido «${k}».`);continue;}
    if(!esObjeto(v))continue;
    const ajustes={...codices[k]};
    ajustes.nombre=texto(v.nombre,60)||ajustes.nombre;
    const eyebrow=texto(v.eyebrow,120);if(eyebrow!==null)ajustes.eyebrow=eyebrow;
    if(Array.isArray(v.secciones)){
      const vistas=new Set<string>();ajustes.secciones=[];
      for(const s of v.secciones.slice(0,60)){
        const clave=esObjeto(s)?s.clave:undefined;
        if(!esClave(clave)){avisos.push(`Se descartó la sección «${String(clave)}» de ${ajustes.nombre}.`);continue;}
        if(vistas.has(clave))continue;vistas.add(clave);
        ajustes.secciones.push({clave,visible:(s as Record<string,unknown>).visible!==false,titulo:texto((s as Record<string,unknown>).titulo,60)||CATALOGO_SECCIONES[clave].titulo});
      }
    }
    codices[k]=ajustes;
  }
  const m=esObjeto(raw.movimiento)?raw.movimiento:{};
  const movimiento={
    activo:typeof m.activo==='boolean'?m.activo:base.movimiento.activo,
    pagina_ms:acotar(m.pagina_ms,0,2000,base.movimiento.pagina_ms,'La duración de pasar página',avisos),
    volteo_ms:acotar(m.volteo_ms,0,2000,base.movimiento.volteo_ms,'La duración de voltear la carta',avisos),
    inclinacion_max:acotar(m.inclinacion_max,0,15,base.movimiento.inclinacion_max,'La inclinación máxima',avisos),
  };
  const libro={dos_paginas_desde:acotar(esObjeto(raw.libro)?raw.libro.dos_paginas_desde:undefined,480,1600,base.libro.dos_paginas_desde,'El ancho para dos páginas',avisos)};
  const rastro={max:acotar(esObjeto(raw.rastro)?raw.rastro.max:undefined,2,20,base.rastro.max,'La longitud del rastro',avisos)};
  const tarot={tirada:esObjeto(raw.tarot)&&typeof raw.tarot.tirada==='boolean'?raw.tarot.tirada:base.tarot.tirada};
  return {config:{version:1,asignaciones,porCreacion,codices,movimiento,libro,rastro,tarot},avisos};
}

/** «Ver como» de la creación; si no, la primera regla que coincide; si ninguna, pergamino. */
export function resolverCodice(item:{id:string;tipo:string},tipo:string,monstruo:boolean,c:ConfiguracionCodices):Codice{
  const propio=c.porCreacion[item.id];
  if(propio)return propio;
  const regla=c.asignaciones.find(a=>(a.tipo==='*'||a.tipo===tipo)&&(a.monstruo==='*'||(a.monstruo==='si')===monstruo)&&(!a.clasificacion||a.clasificacion===item.tipo));
  return regla?.codice||'pergamino';
}

export function codiceDe(tipo:string,monstruo:boolean):Codice{
  return resolverCodice({id:'',tipo:''},tipo,monstruo,configuracionBase());
}

export function plantilla(textoBase:string,vars:Record<string,string|number>):string{
  return textoBase.replace(/\{([a-z_]+)\}/g,(todo,clave:string)=>clave in vars?String(vars[clave]):todo);
}

export function seccionesVisibles(c:ConfiguracionCodices,codice:Codice):SeccionConfig[]{
  return c.codices[codice].secciones.filter(s=>s.visible);
}

const ROMANOS:[number,string][]=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
export function romano(n:number):string{
  if(n<=0)return '0';
  let resto=Math.floor(n),r='';
  for(const [valor,letra] of ROMANOS)while(resto>=valor){r+=letra;resto-=valor;}
  return r;
}

/** Número de arcano estable (0–21) a partir del id (FNV-1a de 32 bits). */
export function arcanoDe(id:string):{numero:number;romano:string}{
  let hash=0x811c9dc5;
  for(let i=0;i<id.length;i++){hash^=id.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}
  const numero=hash%22;
  return {numero,romano:romano(numero)};
}

export type PaginaBestiario={clave:'lamina'|'ficha'|ClaveSeccion;titulo:string;varianteId?:string};
/** Láminas del bestiario: la lámina de portada, una por sección visible con datos (una por variante) y la ficha final. */
export function paginasBestiario(lista:SeccionConfig[],tieneDatos:(clave:ClaveSeccion)=>boolean,variantes:{id:string;nombre:string}[]):PaginaBestiario[]{
  const paginas:PaginaBestiario[]=[{clave:'lamina',titulo:'Lámina'}];
  for(const s of lista){
    if(!s.visible)continue;
    if(s.clave==='variantes'){for(const v of variantes)paginas.push({clave:'variantes',titulo:v.nombre,varianteId:v.id});continue;}
    if(tieneDatos(s.clave))paginas.push({clave:s.clave,titulo:s.titulo});
  }
  paginas.push({clave:'ficha',titulo:'Ficha'});
  return paginas;
}

const NOMBRE_SLOT=(clave:string)=>SLOTS.find(s=>s.clave===clave)?.nombre||clave;
const rango=(min:number,max:number)=>`${min}–${max}`;

export type VarianteLegible={id:string;nombre:string;probabilidad:number;bonos:[string,number][];habilidades:string[];pasivas:string[];equipo:{espacio:string;texto:string}[]};
export function variantesBestiario(config:ConfiguracionMonstruo|null|undefined,nombreDe:(id:string)=>string|null):VarianteLegible[]{
  const lista=config?.variantes||[];
  const total=lista.reduce((n,v)=>n+(Number(v.peso)||0),0);
  return lista.map(v=>({
    id:v.id,nombre:v.nombre,
    probabilidad:total>0?Math.round((Number(v.peso)||0)/total*1000)/10:0,
    bonos:Object.entries(v.bonos||{}).filter(([,n])=>n),
    habilidades:[...(v.habilidades||[])],pasivas:[...(v.pasivas||[])],
    equipo:Object.entries(v.equipamiento||{}).map(([slot,e])=>({
      espacio:NOMBRE_SLOT(slot),
      texto:e.modo==='catalogo'
        ?e.opciones.map(id=>nombreDe(id)||'Creación no disponible').join(' o ')
        :`Generado: ${e.nombre||'sin nombre'}${Object.keys(e.rangos||{}).length?` (${Object.entries(e.rangos||{}).map(([k,r])=>`${k} ${rango(r.min,r.max)}`).join(', ')})`:''}`,
    })),
  }));
}

export type Vinculo={id:string;nombre:string|null;tipo:'habilidad'|'pasiva'|'equipo';espacio?:string};
export type FuenteVinculos={id:string;nombre:string;habilidades?:string[];pasivas?:string[];equipamiento?:Record<string,string>;configuracion_monstruo?:ConfiguracionMonstruo|null};

export function vinculosDe(item:FuenteVinculos,items:FuenteVinculos[]):Vinculo[]{
  const nombre=(id:string)=>items.find(i=>i.id===id)?.nombre??null;
  const vistos=new Set<string>(),r:Vinculo[]=[];
  const meter=(id:string,tipo:Vinculo['tipo'],espacio?:string)=>{
    if(!id||vistos.has(id))return;vistos.add(id);
    r.push(espacio?{id,nombre:nombre(id),tipo,espacio}:{id,nombre:nombre(id),tipo});
  };
  for(const id of item.habilidades||[])meter(id,'habilidad');
  for(const id of item.pasivas||[])meter(id,'pasiva');
  for(const [slot,id] of Object.entries(item.equipamiento||{}))meter(id,'equipo',NOMBRE_SLOT(slot));
  for(const v of item.configuracion_monstruo?.variantes||[]){
    for(const id of v.habilidades||[])meter(id,'habilidad');
    for(const id of v.pasivas||[])meter(id,'pasiva');
  }
  return r;
}

export function portadoresDe(id:string,items:FuenteVinculos[]):{id:string;nombre:string}[]{
  return items
    .filter(i=>i.id!==id&&(
      (i.habilidades||[]).includes(id)||(i.pasivas||[]).includes(id)||Object.values(i.equipamiento||{}).includes(id)||
      (i.configuracion_monstruo?.variantes||[]).some(v=>(v.habilidades||[]).includes(id)||(v.pasivas||[]).includes(id)||
        Object.values(v.equipamiento||{}).some(e=>e.modo==='catalogo'&&e.opciones.includes(id)))))
    .map(i=>({id:i.id,nombre:i.nombre}))
    .sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}

/** Abre `id` en el rastro: si ya estaba, se recorta hasta él (sin ciclos); si se pasa del máximo, cae el más antiguo. */
export function avanzarRastro(rastro:string[],id:string,max=8):string[]{
  const i=rastro.indexOf(id);
  if(i>=0)return rastro.slice(0,i+1);
  return [...rastro,id].slice(-Math.max(1,max));
}

export const EVENTOS_PASIVA:Record<string,string>={permanente:'Siempre activa',inicio_turno:'Al iniciar turno',recibir_ataque:'Al recibir ataque',recibir_impacto:'Al recibir impacto',recibir_dano:'Al recibir daño'};
export const CONDICIONES_PASIVA:Record<string,string>={siempre:'Siempre',vida_mitad:'Vida a la mitad',sin_arma:'Sin arma',ataque_magico:'Ataque mágico',ataque_natural:'Ataque natural',ataque_elemental:'Ataque elemental'};
export type PasoRitual={tipo:'evento'|'condicion'|'efecto';texto:string};
export function cadenaPasiva(r:ReglaPasiva,etiqueta:(clave:string)=>string):PasoRitual[]{
  const pasos:PasoRitual[]=[
    {tipo:'evento',texto:EVENTOS_PASIVA[r.evento]||String(r.evento)},
    {tipo:'condicion',texto:CONDICIONES_PASIVA[r.condicion]||String(r.condicion)},
  ];
  const efectos=[
    r.reduccion_pct?`Reduce ${r.reduccion_pct}% de daño`:'',
    r.curacion?`Cura ${r.curacion}`:'',
    r.recuperar_ph?`Recupera ${r.recuperar_ph} PH`:'',
    r.reducir_fatiga?`Reduce ${r.reducir_fatiga} Fatiga`:'',
    r.represalia_dados?`Represalia ${r.represalia_dados}d${r.represalia_caras}`:'',
    ...Object.entries(r.bonos||{}).filter(([,v])=>v).map(([k,v])=>`${etiqueta(k)} ${v>0?'+':''}${v}`),
  ].filter(Boolean);
  for(const t of efectos)pasos.push({tipo:'efecto',texto:t});
  return pasos;
}

const ESPACIOS:Record<string,string>={mano:'Mano',dos_manos:'Dos manos',accesorio:'Accesorio',titulo:'Título'};
export function espacioDe(slotTipo:string):string|null{
  if(!slotTipo||slotTipo==='ninguno')return null;
  return ESPACIOS[slotTipo]||SLOTS.find(s=>s.tipos.includes(slotTipo)&&s.tipos.length===1)?.nombre||slotTipo;
}

export function tirarPrueba(e:Pick<Efecto,'cantidad'|'caras'|'modificador'>,rng:()=>number=Math.random):{dados:number[];total:number}{
  const cantidad=Math.max(0,Math.min(100,Math.floor(Number(e.cantidad)||0)));
  const caras=Math.max(1,Math.floor(Number(e.caras)||1));
  const dados=Array.from({length:cantidad},()=>Math.min(caras,Math.max(1,1+Math.floor(rng()*caras))));
  return {dados,total:dados.reduce((n,d)=>n+d,0)+(Number(e.modificador)||0)};
}

// ---- Persistencia: servidor (tabla forja_codices) con copia local de respaldo ----
export type AlmacenLocal={leer:()=>string|null;escribir:(texto:string)=>void};
export type OrigenConfiguracion='servidor'|'local'|'base';
type RespuestaServidor={data:unknown;error:{code?:string;message?:string}|null};

function mensajeServidor(error:{code?:string;message?:string}|null|undefined,accion:string):string{
  if(error?.code==='PGRST205'||error?.code==='42P01')return 'La configuración de códices aún no está preparada en el servidor; se usa la copia de este navegador.';
  return error?.message?`${accion}: ${error.message}`:`${accion}.`;
}
function leerLocal(local:AlmacenLocal):unknown{
  try{const texto=local.leer();return texto?JSON.parse(texto):null;}catch{return null;}
}

/** Lee la configuración: servidor → copia local → valores por defecto. Nunca lanza. */
export async function leerConfiguracion(servidor:()=>Promise<RespuestaServidor>,local:AlmacenLocal):Promise<{config:ConfiguracionCodices;origen:OrigenConfiguracion;avisos:string[];error?:string}>{
  let error:string|undefined,remota:unknown=null;
  try{
    const r=await servidor();
    if(r.error)error=mensajeServidor(r.error,'No se pudo leer la configuración de códices');
    else remota=(r.data as {config?:unknown}|null)?.config??null;
  }catch(e){error=`No se pudo leer la configuración de códices: ${e instanceof Error?e.message:String(e)}`;}
  if(remota){const n=normalizarConfiguracion(remota);return {...n,origen:'servidor'};}
  const copia=leerLocal(local);
  if(copia){const n=normalizarConfiguracion(copia);return error?{...n,origen:'local',error}:{...n,origen:'local'};}
  const base={config:configuracionBase(),avisos:[] as string[],origen:'base' as const};
  return error?{...base,error}:base;
}

/** Guarda en el servidor y siempre deja copia local; si el servidor falla, informa y conserva la copia. */
export async function escribirConfiguracion(config:ConfiguracionCodices,servidor:(c:ConfiguracionCodices)=>Promise<{error:{code?:string;message?:string}|null}>,local:AlmacenLocal):Promise<{origen:'servidor'|'local';error?:string}>{
  try{local.escribir(JSON.stringify(config));}catch{/* sin almacenamiento local: solo servidor */}
  try{
    const r=await servidor(config);
    if(r.error)return {origen:'local',error:mensajeServidor(r.error,'No se pudo guardar en el servidor')};
    return {origen:'servidor'};
  }catch(e){return {origen:'local',error:`No se pudo guardar en el servidor: ${e instanceof Error?e.message:String(e)}`};}
}
