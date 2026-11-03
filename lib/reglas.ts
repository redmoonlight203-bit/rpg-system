import type { Efecto } from './creacion';
export const EVENTOS = {
 usar: 'Al activar / usar', inicio_combate: 'Al iniciar combate', inicio_turno: 'Al iniciar mi turno', fin_turno: 'Al terminar mi turno',
 atacar: 'Antes de mi ataque', impactar: 'Al impactar', fallar: 'Al fallar', recibir_dano: 'Al recibir daño', causar_dano: 'Al causar daño', matar: 'Al matar a un enemigo', morir: 'Al caer a 0 de vida', fin_combate: 'Al terminar combate',
} as const;
export type EventoRegla = keyof typeof EVENTOS;
export type Sujeto = 'yo' | 'actor' | 'objetivo';
export type DestinoRegla = Sujeto | 'aliados' | 'enemigos' | 'todos';
export type ValorRegla = number | { dados?: number; caras?: number; bono?: number; atributo?: string; desde?: Sujeto; escala?: number; evento?: boolean };
export type CondicionRegla =
 | { tipo: 'siempre' }
 | { tipo: 'todas' | 'alguna'; condiciones: CondicionRegla[] }
 | { tipo: 'no'; condicion: CondicionRegla }
 | { tipo: 'estado'; sujeto: Sujeto; estado: string }
 | { tipo: 'comparar'; sujeto: Sujeto; atributo: string; operador: '<' | '<=' | '=' | '>=' | '>'; valor: number; porcentaje?: boolean }
 | { tipo: 'elemento'; elemento: string }
 | { tipo: 'probabilidad'; porcentaje: number };
export type CambioRegla = { atributo: string; operacion: 'sumar' | 'multiplicar' | 'fijar'; valor: ValorRegla };
export type EfectoRegla = {
 tipo: 'atributo' | 'transformar' | 'estado' | 'quitar_estado' | 'dano' | 'curar' | 'ph' | 'fatiga' | 'perder_accion' | 'salvacion' | 'condicional' | 'habilidad' | 'mensaje';
 destino: DestinoRegla;
 valor?: ValorRegla;
 atributo?: string;
 operacion?: CambioRegla['operacion'];
 duracion?: number; // 0: hasta fin de combate, positivo: turnos del receptor.
 permanente?: boolean;
 acumular?: boolean;
 limite?: number;
 clave?: string;
 nombre?: string;
 cambios?: CambioRegla[];
 accion?: Efecto;
 cd?: number;
 condicion?: CondicionRegla;
 exito?: EfectoRegla[];
 fallo?: EfectoRegla[];
};
export type Regla = {
 id: string; nombre: string; evento: EventoRegla; condicion: CondicionRegla; efectos: EfectoRegla[];
 coste_ph: number; coste_fatiga: number; enfriamiento: number; usos: number; prioridad: number;
};
export function nuevaRegla(): Regla {
 return {id:crypto.randomUUID(),nombre:'Nueva regla',evento:'usar',condicion:{tipo:'siempre'},efectos:[],coste_ph:0,coste_fatiga:0,enfriamiento:0,usos:0,prioridad:0};
}
export const EFECTOS_REGLA = { atributo:'Modificar atributo', transformar:'Transformar', estado:'Aplicar estado', quitar_estado:'Quitar estado / forma', dano:'Infligir daño directo', curar:'Curar', ph:'Modificar PH actual', fatiga:'Modificar Fatiga actual', perder_accion:'Perder acción del turno', salvacion:'Tirada de salvación', condicional:'Si / entonces / si no', habilidad:'Conceder acción temporal', mensaje:'Registrar mensaje' } as const;
export const DESTINOS = {yo:'Portador',actor:'Autor del evento',objetivo:'Objetivo del evento',aliados:'Aliados vivos (incluye portador)',enemigos:'Enemigos vivos',todos:'Todos los vivos'} as const;
const clave = (s: unknown) => typeof s==='string' && /^[a-z_][a-z0-9_]{0,63}$/.test(s);
const entero = (v: unknown,min=0,max=1000000) => typeof v==='number' && Number.isInteger(v) && v>=min && v<=max;
const sujeto = (v:unknown)=>['yo','actor','objetivo'].includes(String(v));
export function validarReglas(input: unknown): string | null {
 let nodos=0;
 try {
  const fallo=(mensaje:string):never=>{throw Error(mensaje);};
  const objeto=(v:unknown):Record<string,unknown>=> v!==null && typeof v==='object' && !Array.isArray(v)?v as Record<string,unknown>:fallo('Se esperaba un objeto de regla.');
  function valor(v:unknown){if(typeof v==='number'){if(!Number.isFinite(v)||Math.abs(v)>1000000)fallo('Valor numérico inválido.');return;}
   const o=objeto(v); if(o.dados!==undefined&&!entero(o.dados,0,100))fallo('De 0 a 100 dados.');if(o.caras!==undefined&&!entero(o.caras,2,1000))fallo('De 2 a 1000 caras.');if(o.dados&&!o.caras)fallo('Faltan caras.');
   for(const k of ['bono','escala'])if(o[k]!==undefined&&(typeof o[k]!=='number'||!Number.isFinite(o[k])||Math.abs(o[k] as number)>1000000))fallo('Fórmula inválida.');
   if(o.atributo!==undefined&&!clave(o.atributo))fallo('Atributo inválido.');if(o.desde!==undefined&&!sujeto(o.desde))fallo('Sujeto inválido.');if(o.evento!==undefined&&typeof o.evento!=='boolean')fallo('Valor del evento inválido.');
  }
  function nodo(depth:number){if(depth>8||++nodos>500)fallo('Máximo 8 niveles y 500 bloques.');}
  function condicion(v:unknown,d=0){nodo(d);const c=objeto(v);
   switch(c.tipo){case 'siempre':return;case 'todas':case 'alguna':if(!Array.isArray(c.condiciones)||!c.condiciones.length)fallo('Añade condiciones al grupo.');(c.condiciones as unknown[]).forEach(x=>condicion(x,d+1));return;
    case 'no':condicion(c.condicion,d+1);return;
    case 'estado':if(!sujeto(c.sujeto)||typeof c.estado!=='string'||!c.estado.trim()||c.estado.length>100)fallo('Estado o sujeto inválido.');return;
    case 'comparar':if(!sujeto(c.sujeto)||!clave(c.atributo)||!['<','<=','=','>=','>'].includes(String(c.operador))||typeof c.valor!=='number'||!Number.isFinite(c.valor)||Math.abs(c.valor)>1000000)fallo('Comparación inválida.');return;
    case 'elemento':if(!['ninguno','fuego','agua','hielo','electricidad','luz_sagrada'].includes(String(c.elemento)))fallo('Elemento inválido.');return;
    case 'probabilidad':if(!entero(c.porcentaje,0,100))fallo('Probabilidad de 0 a 100.');return;
    default:fallo('Condición desconocida.');}
  }
  function efectos(v:unknown,d=0){if(!Array.isArray(v)||v.length>50)fallo('Máximo 50 efectos por rama.');for(const x of v as unknown[]){nodo(d);const e=objeto(x);
   if(!Object.hasOwn(EFECTOS_REGLA,String(e.tipo))||!Object.hasOwn(DESTINOS,String(e.destino)))fallo('Efecto o destino desconocido.');
   if(e.valor!==undefined)valor(e.valor);
   for(const k of ['duracion','limite'])if(e[k]!==undefined&&!entero(e[k]))fallo('Duración y límite deben ser enteros no negativos.');
   if(e.clave!==undefined&&(typeof e.clave!=='string'||!e.clave.trim()||e.clave.length>100))fallo('Clave de efecto inválida.');
   for(const k of ['permanente','acumular'])if(e[k]!==undefined&&typeof e[k]!=='boolean')fallo('Configuración inválida.');
   if(e.permanente&&(e.tipo!=='atributo'||e.operacion!=='sumar'))fallo('Los cambios permanentes deben sumar un atributo.');
   if(e.tipo==='atributo'&&(!clave(e.atributo)||!['sumar','multiplicar','fijar'].includes(String(e.operacion))||e.valor===undefined))fallo('Configura atributo, operación y valor.');
   if(['estado','quitar_estado','transformar'].includes(String(e.tipo))&&!e.clave)fallo('Escribe la clave del estado o forma.');
   if(e.tipo==='transformar'){if(!Array.isArray(e.cambios)||!e.cambios.length||e.cambios.length>30)fallo('Configura entre 1 y 30 cambios de forma.');for(const cambio of e.cambios as unknown[]){const c=objeto(cambio);if(!clave(c.atributo)||!['sumar','multiplicar','fijar'].includes(String(c.operacion)))fallo('Cambio de forma inválido.');valor(c.valor);}}
   if(e.tipo==='salvacion'){if(!entero(e.cd,1,1000)||!clave(e.atributo))fallo('Salvación inválida.');efectos(e.exito||[],d+1);efectos(e.fallo||[],d+1);}
   if(e.tipo==='condicional'){condicion(e.condicion,d+1);efectos(e.exito||[],d+1);efectos(e.fallo||[],d+1);}
   if(e.tipo==='habilidad'){const a=objeto(e.accion);if(typeof a.id!=='string'||!a.id||typeof a.nombre!=='string'||!a.nombre.trim()||!['dano','curacion','recuperar_ph','reducir_fatiga','estado','crear_arma'].includes(String(a.efecto))||!entero(a.cantidad,0,100)||!entero(a.caras,2,1000)||!entero(a.modificador,-1000000)||!entero(a.coste_ph)||!entero(a.duracion)||(a.coste_fatiga!==undefined&&!entero(a.coste_fatiga)))fallo('Acción concedida inválida.');}
  }}
  if(!Array.isArray(input)||input.length>40)fallo('Máximo 40 reglas por creación.');const ids=new Set();
  for(const v of input as unknown[]){const r=objeto(v);if(typeof r.id!=='string'||!r.id||ids.has(r.id))fallo('Identificador de regla ausente o repetido.');ids.add(r.id);
   if(typeof r.nombre!=='string'||!r.nombre.trim()||r.nombre.length>120||!Object.hasOwn(EVENTOS,String(r.evento)))fallo('Nombre o evento inválido.');
   for(const k of ['coste_ph','coste_fatiga','enfriamiento','usos'])if(!entero(r[k]))fallo('Costes, usos y enfriamiento inválidos.');if(!entero(r.prioridad,-1000,1000))fallo('Prioridad inválida.');
   condicion(r.condicion);efectos(r.efectos);if(!(r.efectos as unknown[]).length)fallo('Añade al menos un efecto.');
  }return null;
 }catch(e){return e instanceof Error?e.message:'Reglas inválidas.';}
}
export function receta(tipo:'crecimiento'|'furia'|'objeto'):Regla[]{
 const r=nuevaRegla();
 if(tipo==='crecimiento')return [{...r,nombre:'Devorador de vida',evento:'matar',efectos:[{tipo:'atributo',destino:'yo',atributo:'vida',operacion:'sumar',valor:1,permanente:true,acumular:true}]}];
 const forma:EfectoRegla={tipo:'transformar',destino:'yo',clave:'furia',nombre:'Furia',duracion:0,cambios:[{atributo:'dano',operacion:'sumar',valor:8},{atributo:'armadura',operacion:'sumar',valor:3},{atributo:'vida',operacion:'sumar',valor:15}]};
 return [{...r,nombre:tipo==='objeto'?'Usar objeto de transformación':'Desatar furia',usos:1,efectos:[forma]}, {...nuevaRegla(),nombre:'Mantener la voluntad',evento:'inicio_turno',condicion:{tipo:'estado',sujeto:'yo',estado:'furia'},efectos:[{tipo:'salvacion',destino:'yo',cd:12,atributo:'salvacion',exito:[],fallo:[{tipo:'perder_accion',destino:'yo'}]}]}, {...nuevaRegla(),nombre:'Abandonar furia',condicion:{tipo:'estado',sujeto:'yo',estado:'furia'},efectos:[{tipo:'quitar_estado',destino:'yo',clave:'furia'}]}];
}
