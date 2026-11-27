import {patronDesde,validarPatron} from './patron-area';
import {huellaDe,casillasHuella,claveHuella,cabeHuella,distanciaHuellas,validarHuella,type Huella,type FuenteHuella} from "./huellas-combate";
import type {ConfiguracionVFX} from "./vfx";
import {activarTransformacion,cambiarEtapaTransformacion,terminarTransformacion,avanzarTurnoTransformacion,danarTransformado,forzarPosesion,type TransformacionActiva,type DefinicionTransformacion} from "./transformaciones";
import {ID_REALIDAD,formasAlcanzables,transicionEntre} from "./transformaciones-grafo";
import {migrarTransformacion} from "./transformaciones-migracion";
import type {EtapaEvolutiva,Recuperacion} from "./evolucion";
import type { Regla, EventoRegla, CondicionRegla, EfectoRegla, ValorRegla, Sujeto } from "./reglas";
import { type Efecto, type Elemento, type AlcanceHabilidad, type Reaccion, type ResultadoReaccion, type ContraataqueReaccion } from "./creacion";
import {proyectarVista,desproyectar,proyectarRespuesta,type OpcionesEspejo} from "./espejo-mental";
import {activarVoz,avanzarVoz,vozNiega,type ConfigVoces,type EstadoVoz} from "./artefactos-voces";
import {normalizarReaccion,disparadorDe,lineaCosteReaccion,CON_ALCANCE,type DisparadorReaccion} from "./reacciones";
import { type ReglaPasiva } from "./pasivas";
import {comprobarInmunidad,norm,type Inmunidad,type CandidatoInmunidad} from "./inmunidades";
import {definicionElemento,type EfectoImpacto} from "./elementos";
import {TIPOS_ESTADO_LEGADO,iconoEstado,capaDeEstados,type CapaEstado,describirEstado,definicionDe,definicionBase,primitivas,bonosDefinicion,turnosIniciales,movimientoPermitido,permiteReacciones,type DefinicionEstado,type Primitiva} from "./estados";
import {potenciar,potenciadoresPara,etiquetasDe,describirPotenciado,type Rasgo,type EleccionPotenciador} from "./rasgos";
import {generarRecurso,gastarRecurso,topeRecurso,type DefinicionRecurso,type EventoRecurso} from "./recursos";
import {DESARMADO_BASE,GUARDIA_BASE,describirConcepto,type ConceptoDesarmado,type ConceptoGuardia} from "./conceptos-basicos";
export {describirConcepto};
import {tipoAnimacionArma} from "./animaciones-armas";
import {esqueletoBase,type Esqueleto} from "./esqueletos";
import {direccionAtaque,puntosDebiles,sumarRecompensas,describirRecompensa,NOMBRE_DIRECCION,type Vision,type RecompensaPunto,type DireccionOcular,type AparienciaOjo} from "./vision";
export type RequisitosUso={razas?:string[];minimos?:Record<string,number>;nivel_minimo?:number;habilidades?:string[];desbloqueo_automatico?:boolean;
 /** Clanes (cualquiera de la lista). Se comprueban al heredar: el servidor entrega y retira la copia. */
 clanes?:string[];
 /** Se entrega sola a quien cumpla el linaje (razas) y/o pertenezca a uno de los clanes. */
 herencia?:boolean};
export function validarRequisitos(r:RequisitosUso|undefined):string|null{
 if(r===undefined)return null;
 if(!r||typeof r!=='object'||Array.isArray(r))return 'Requisitos inválidos.';
 if(r.habilidades!==undefined&&(!Array.isArray(r.habilidades)||r.habilidades.length>20||r.habilidades.some(x=>typeof x!=='string'||! /^[0-9a-f-]{36}$/i.test(x))))return 'Selecciona habilidades previas válidas.';
 if(r.desbloqueo_automatico!==undefined&&typeof r.desbloqueo_automatico!=='boolean')return 'Desbloqueo automático inválido.';
 if(r.clanes!==undefined&&(!Array.isArray(r.clanes)||r.clanes.length>20||r.clanes.some(x=>typeof x!=='string'||! /^[0-9a-f-]{36}$/i.test(x))))return 'Selecciona clanes válidos.';
 if(r.herencia!==undefined&&typeof r.herencia!=='boolean')return 'Herencia inválida.';
 if(r.herencia&&!r.razas?.length&&!r.clanes?.length)return 'Para heredarla, elige al menos un linaje (raza) o un clan.';
 if(r.nivel_minimo!==undefined&&(!Number.isInteger(r.nivel_minimo)||r.nivel_minimo<1||r.nivel_minimo>100))return 'El nivel requerido debe estar entre 1 y 100.';
 if(r.razas!==undefined&&(!Array.isArray(r.razas)||r.razas.length>50||r.razas.some(x=>typeof x!=='string'||!x.trim()||x.length>100)))return 'Selecciona razas válidas.';
 if(r.minimos!==undefined&&(!r.minimos||typeof r.minimos!=='object'||Array.isArray(r.minimos)||Object.keys(r.minimos).length>50||Object.entries(r.minimos).some(([k,v])=>!/^[a-z_][a-z0-9_]{0,63}$/.test(k)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000)))return 'Los mínimos deben ser atributos válidos y números de 0 a 1000000.';
 return null;
}
export function faltantesRequisitos(r:RequisitosUso|undefined,razas:string[],stats:Record<string,number>,conocidas:string[]=[]):string[]{
 const error=validarRequisitos(r);if(error)return [error];if(!r)return [];
 const normal=(s:string)=>s.trim().toLocaleLowerCase();
 const errores:string[]=[];
 if(r.habilidades?.some(id=>!conocidas.includes(id)))errores.push('Debes conocer todas las habilidades previas requeridas.');
 if(r.nivel_minimo!==undefined&&(stats.nivel??1)<r.nivel_minimo)errores.push('Nivel requerido: '+r.nivel_minimo);
 if(r.razas?.length&&!r.razas.some(x=>razas.map(normal).includes(normal(x))))errores.push('Raza requerida: '+r.razas.join(' o '));
 for(const [k,min] of Object.entries(r.minimos||{}))if((stats[k]||0)<min)errores.push(`${k}: necesita ${min}, tiene ${stats[k]||0}`);
 return errores;
}
function baseRequisitos(m:Combatiente){return Object.fromEntries(Object.entries(m.stats).map(([k,v])=>[k,v-(m.configuracion.bonos_equipamiento?.[k]||0)]));}
function requisitosFuente(m:Combatiente,f:{requisitos_uso?:RequisitosUso}){return faltantesRequisitos(f.requisitos_uso,[m.configuracion.raza||'',...(m.configuracion.linaje_raza||[])],baseRequisitos(m),[...(m.configuracion.habilidades_conocidas||[]),...(m.configuracion.habilidades||[]).map(h=>h.forja_id||h.id||'')]);}
export type Situacion = "activo" | "inconsciente" | "muerto" | "retirado" | "rendido" | "capturado";
export type PoliticaEncuentro = {campana?:string;modo:"oficial"|"entrenamiento"; automatico:boolean; limite_rondas:number; exp_base:number; exp_objetivo:number; dificultad:number; reparto:"replicar"|"repartir"|"participacion"; premiar_retirados:boolean};
export type CierreEncuentro = {id:string; motivo:string; ganador:Bando|null; ronda:number; participantes:{id:string;nombre:string;bando:Bando;personaje_id?:string;situacion:Situacion;invocado:boolean}[]};
export type EventoDominio = {id:string;tipo:"enemigo_derrotado"|"encuentro_finalizado";actor?:string;objetivo?:string;ronda:number};
export type Bando = "jugador" | "enemigo";
export type Fuente = {
  forja_id?:string;
  configuracion_invocacion?: import("./invocaciones").ConfiguracionInvocacion;
  requisitos_uso?: RequisitosUso;
  id?: string;
  nombre: string;
  stats: Record<string, number>;
  efectos?: Efecto[];
  slot_tipo?: string;
  tipo_creacion?: string;
  consumible?: boolean;
  descripcion?: string;
  imagen_url?: string;
  reglas?: Regla[];
  reglas_pasivas?: ReglaPasiva[];
};
export type Config = {
  huella?: Huella;
  habilidades_conocidas?:string[];
  tabla_botin_id?: string;
  exp_recompensa?: number;
  equipo_saqueable?: boolean;
  imagen_url?: string;
  raza?: string;
  linaje_raza?: string[];
  tipo_creacion?: string;
  bonos_equipamiento?: Record<string, number>;
  efectos?: Efecto[];
  /** Acciones propias del personaje (columna `configuracion_dados`); nunca se mezclan con `habilidades`. */
  acciones_personaje?: Efecto[];
  stats_base?: Record<string, number>;
  rangos_malla?:Record<string,{min:number;max:number}>;nivel_maximo?:number;
  equipamiento?: Record<string, Fuente>;
  habilidades?: Fuente[];
  pasivas?: { requisitos_uso?:RequisitosUso; id?: string; nombre: string; reglas: ReglaPasiva[]; reglas_motor?: Regla[]; inmunidades?: Inmunidad[] }[];
  reglas?: Regla[];
  reglas_pasivas?: ReglaPasiva[];
  reserva?: Fuente[];
  consumidos?: string[];
  /** Conceptos básicos propios (desarmado, guardia) que sustituyen a los de por defecto. */
  conceptos?: (ConceptoDesarmado|ConceptoGuardia)[];
  /** Inmunidades propias de la creación (además de las de habilidades, pasivas, estados y equipo). */
  inmunidades?: Inmunidad[];
};
export type Terreno = "muro"|"dificil"|"cobertura"|"peligro";
export type MapaCombate = {id:string;version:1;nombre:string;columnas:number;filas:number;celdas:Record<string,Terreno>;procedural?:import('./mapas-procedurales').ProcedenciaMapa};
export type Posicion = { x: number; y: number };
export type Combatiente = {
  /** Formato antiguo de solicitud (por combatiente); hoy vive en `Combate.solicitud_invocacion`. Se borra al invocar. */
  solicitud_invocacion?: {accion:string;turno:number};
  ultima_defensa?:{id:string;animacion:string};
  recursos_especiales?:Record<string,number>;
  hechizos_observados?:Record<string,string>;
  hechizos_aprendidos?:string[];
  ronda_asistida?:number;
  rondas_reacciones?:Record<string,number>;
  /** Usos de cada reacción (por id de efecto): en el encuentro, en la ronda actual y la ronda del último uso. */
  usos_reaccion?:Record<string,{encuentro:number;ronda:number;en_ronda:number;ultima:number}>;
  /** Reducciones elegidas antes del golpe (antes_ser_atacado, aliado_atacado, área); recibir las consume. */
  reduccion_reaccion?:NonNullable<NonNullable<Reaccion['principal']>['reducir']>[];
  /** Voz de demonio del artefacto que empuña (la asigna el GM tras una salvación fallida). */
  voz_artefacto?:EstadoVoz;
  voz_config?:ConfigVoces;
  /** Ya repitió la prueba contra una negativa en este encuentro. */
  voz_resistida?:boolean;
  /** Espejo mental: solo cambia lo que ve su jugador. `aviso` hasta que empiece su siguiente turno. */
  espejo_mental?:OpcionesEspejo&{aviso:boolean};
  /** Percepción alterada (Hipnotizado): como el espejo, solo cambia la vista de su jugador en este turno. */
  percepcion_alterada?:OpcionesEspejo&{aviso:boolean};
  situacion?: Situacion;
  neutral?: boolean;
  contribucion?: number;
  transformacion?: TransformacionActiva|null;
  transformaciones_usadas?: string[];
  /** Evolución o etapa permanente alcanzada durante este encuentro (se guarda al finalizar si el encuentro es real). */
  evolucion?: EvolucionEnCombate;
  /** Etapa histórica recreada: nunca toca al personaje real ni otorga recompensas. */
  etapa_historica?: {etapa_id:string;nombre:string};
  /** Transformación por grafo de tipo forma: vida que le queda a cada forma en este encuentro («def:forma»; 0 = rota). */
  vidas_formas?: Record<string, number>;
  posicion?: Posicion;
  movimiento?: { turno: number; gastado: number };
  id: string;
  forja_id: string | null;
  nombre: string;
  personaje_id?: string;
  nivel?: number;
  exp_total?:number;
  invocacion?: {invocador:string;habilidad:string;restantes:number;apariencia?:string};
  bando: Bando;
  stats: Record<string, number>;
  configuracion: Config;
  vida: number;
  ph: number;
  fatiga: number;
  iniciativa: number;
  dado_iniciativa: number;
  turnos: number;
  accion_usada: boolean;
  /** Acciones gastadas por tipo: principales y adicionales del turno `turno` (propio) y legendarias de la ronda `ronda`.
   *  Sin este campo (combates antiguos) no se ha gastado nada extra. */
  gasto_acciones?: {turno:number;principal:number;adicional:number;ronda:number;legendaria:number};
  /** Ataque múltiple en curso: tras el primer disparo, el resto de la acción (otro disparo o moverse) hasta agotarla o acabar el turno. */
  rafaga?: Rafaga;
  uso_fatiga?: boolean;
  agotado?: boolean;
  grupo_cercania?: string;
  corrupto?: boolean;
  cooldowns: Record<string, number>;
  motor?: EstadoMotor;
  arma?: {
    efecto: Efecto;
    nombre: string;
    slot: string;
    restantes: number;
    creada: number;
  };
  estados: {
    id: string;
    nombre: string;
    restantes: number;
    creado: number;
    bonos: Record<string, number>;
    origen?: string;
    inicio?: boolean;
    tipo?: string;
    cantidad?: number;
    caras?: number;
    cd?: number;
    atributo?: string;
    /** Ojo abierto (primitiva «Visión»). */
    vision?: Vision;
    /** Definición creada en el Yunque (los estados del catálogo se resuelven por `tipo`). */
    def?: DefinicionEstado;
    /** Quién lo causó: huir de él, no atacarlo, o controlar al afectado. */
    fuente?: string;
    /** Turnos ya perdidos por este estado (el primero puede ser obligatorio). */
    turnos_perdidos?: number;
  }[];
};
export type CambioVida = {id:string;delta:number};
export type MovimientoVisual = {id:string;desde:Posicion;hasta:Posicion;tipo?:"dash"|"salto"|"teletransporte"|"carrera"|"forzado"};
export type AparicionVisual = {id:string;animacion:string;posicion:Posicion;escala?:number};
export type EventoVisual = {emisor?:string;action_id?:string;secuencia?:number;recibido_en?:number;creado_en?:number;vfx?:ConfiguracionVFX;movimientos?:MovimientoVisual[];transformaciones?:AparicionVisual[];activaciones?:AparicionVisual[];area?:Posicion[];id:string;nombre:string;dados:{caras:number;valor:number}[];resultado?:string;cambios_vida?:CambioVida[];animacion?:Efecto["animacion"];arma_visual?:import('./animaciones-armas').TipoAnimacionArma;esqueleto?:import('./esqueletos').Esqueleto;desde?:Posicion;hasta?:Posicion};
export type Combate = {
  reaccion_pendiente?:SolicitudReaccion;
  /** Invocación pedida por un jugador: la valida y la materializa la pantalla del GM (sin clics). No se paga hasta entonces. */
  solicitud_invocacion?:SolicitudInvocacion;
  /** Última solicitud rechazada, para que el jugador vea el motivo. */
  invocacion_rechazada?:{id:string;actor:string;motivo:string};
  pasos_deshacer?:number;
  fuentes_botin?: {id:string;nombre:string;tabla_botin_id:string}[];
  mapa?: MapaCombate;
  politica?: PoliticaEncuentro;
  cierre?: CierreEncuentro;
  eventos?: EventoDominio[];
  evento_visual?: EventoVisual;
  fase: "preparacion" | "en_curso" | "finalizado";
  ronda: number;
  actual: string | null;
  regla: "impacto" | "reduccion" | "directo";
  miembros: Combatiente[];
  registro: string[];
  resultado?: "Fallo" | "Fallo critico" | "Critico" | "Impacto";
  historial?: Combate[];
  progreso_confirmado?: boolean;
  /** Quién recibió de verdad el último golpe individual (p. ej. tras interponerse). Solo para la animación. */
  objetivo_final?: string;
};
export type Accion = {
  ilustracion?: { forja_id?: string; imagen_url?: string };
  invocacion?: Fuente;
  regla_detalle?: Regla;
  bloqueada?: string;
  id: string;
  nombre: string;
  efecto: Efecto;
  enfriamiento: number;
  regla?: string;
  /** Qué acción del turno gasta: solo las de habilidad y equipo pueden ser adicionales o legendarias. */
  presupuesto: TipoPresupuesto;
  /** Potenciadores de rasgos compatibles con la técnica (Apéndice C). */
  potenciadores?: PotenciadorDisponible[];
  /** Transformación por grafo: forma a la que lleva esta acción. */
  forma_destino?: string;
};
export type PotenciadorDisponible={rasgo:string;rasgo_nombre:string;potenciador:string;nombre:string;ph:number;fatiga:number;
  recurso?:{id:string;nombre:string;min:number;max:number;saldo:number};componentes:{elemento:string;cantidad:number;caras:number;por_unidad?:boolean}[]};
function ilustracionFuente(fuente: Pick<Fuente, "id" | "forja_id" | "imagen_url">): Accion["ilustracion"] {
  const forja_id = fuente.forja_id || fuente.id;
  return forja_id || fuente.imagen_url ? { forja_id, imagen_url: fuente.imagen_url } : undefined;
}
export type OfertaReaccion={defensor:string;nombre:string;reaccion:string;coste:number;efecto:string;disparador?:DisparadorReaccion;usos_restantes?:number|null;enfriamiento?:number;
 /** Línea de coste, usos y enfriamiento (lineaCosteReaccion), la misma que en el Yunque y la ficha. */
 linea?:string};
type OrdenAtaque={actor:string;accion:string;objetivo:string;forzar:boolean;centro?:Posicion;potenciadores?:EleccionPotenciador[]};
type OrdenGolpe=OrdenAtaque|{turno:'siguiente'|'iniciar'}|{objeto:string;actor:string;efecto:string;objetivo:string};
type SolicitudReaccion={oferta:OfertaReaccion;orden:OrdenGolpe;tiradas:{caras:number;valor:number}[];respuestas:boolean[]};
export type RNG = ((caras: number) => number)&{consultarReaccion?:(oferta:OfertaReaccion)=>boolean};
export type Rafaga = { accion: string; nombre: string; total: number; restantes: number };
/** Disparos de un ataque múltiple: cada dado es un ataque con su propia tirada para impactar (2–20). */
export function disparosRafaga(e: Pick<Efecto, "rafaga" | "efecto" | "cantidad">): number {
  return e.rafaga && e.efecto === "dano" ? e.cantidad : 0;
}
/** ¿Le queda algo por hacer con su acción? También durante una ráfaga a medias. */
export function accionDisponible(m: { accion_usada: boolean; rafaga?: { restantes: number } }): boolean {
  return !m.accion_usada || (m.rafaga?.restantes || 0) > 0;
}
export type TipoPresupuesto='principal'|'adicional'|'legendaria';
export type SolicitudInvocacion={id:string;actor:string;habilidad:string;ronda:number;propuesta?:import("./invocaciones").PropuestaInvocacion};
export type PresupuestoAcciones=Record<TipoPresupuesto,number>;
/** ¿Puede ejecutarse ahora una acción de este presupuesto? La principal sigue su regla de siempre; adicional y legendaria dependen de lo que quede de su propio presupuesto (antes o después de la principal). */
export function accionUsableAhora(presupuesto:TipoPresupuesto|undefined,m:{accion_usada:boolean;rafaga?:{restantes:number}},restante?:Partial<PresupuestoAcciones>|null):boolean{
  const t=presupuesto||'principal';
  return t==='principal'?accionDisponible(m):(restante?.[t]||0)>0;
}
/** Atributos que suman acciones al turno (sobre 1 principal, 0 adicionales y 0 legendarias). Varias fuentes se suman en `estadisticas`. */
export const CLAVE_PRESUPUESTO:Record<TipoPresupuesto,string>={principal:'acciones_principal',adicional:'acciones_adicional',legendaria:'acciones_legendaria'};
/** Fuente sintética con las acciones propias del personaje (`configuracion.acciones_personaje`). */
export const FUENTE_PROPIAS='propias';
/** Habilidades del combatiente más sus acciones propias (primero), como una fuente más. Solo lectura: no se guarda en `habilidades`. */
export function habilidadesDe(m:Combatiente):Fuente[]{
  const propias=m.configuracion.acciones_personaje;
  return [...(Array.isArray(propias)&&propias.length?[{id:FUENTE_PROPIAS,nombre:'Acciones del personaje',stats:{},efectos:propias}]:[]),...(m.configuracion.habilidades||[])];
}
export function presupuestoDeStats(s:Record<string,number>):PresupuestoAcciones{
  const extra=(t:TipoPresupuesto)=>{const v=Math.floor(s[CLAVE_PRESUPUESTO[t]]||0);return Number.isFinite(v)?v:0;};
  return {principal:Math.max(0,1+extra('principal')),adicional:Math.max(0,extra('adicional')),legendaria:Math.max(0,extra('legendaria'))};
}
/** Estimación para vistas que solo conocen las estadísticas (jugador): no sabe lo ya gastado en adicional/legendaria, y el motor rechaza lo que sobre. */
export function presupuestoEstimado(stats:Record<string,number>,accion_usada:boolean):PresupuestoAcciones{
  return {...presupuestoDeStats(stats),principal:accion_usada?0:1};
}
export function presupuestoDe(m:Combatiente):PresupuestoAcciones{return presupuestoDeStats(estadisticas(m));}
/** Se recarga sola: lo gastado solo cuenta en el turno propio (`m.turnos`) o la ronda (`c.ronda`) en que se anotó. */
export function presupuestoRestante(c:Pick<Combate,'ronda'>,m:Combatiente):PresupuestoAcciones{
  const p=presupuestoDe(m),g=m.gasto_acciones,turno=g?.turno===m.turnos,ronda=g?.ronda===c.ronda;
  return {principal:m.accion_usada?0:Math.max(0,p.principal-(turno?g!.principal:0)),adicional:Math.max(0,p.adicional-(turno?g!.adicional:0)),legendaria:Math.max(0,p.legendaria-(ronda?g!.legendaria:0))};
}
export function tipoPresupuesto(e:Pick<Efecto,'presupuesto'>):TipoPresupuesto{
  return e.presupuesto==='adicional'||e.presupuesto==='legendaria'?e.presupuesto:'principal';
}
/** Anota una acción gastada; lo de otro turno u otra ronda se descarta. */
function anotarGasto(c:Combate,m:Combatiente,tipo:TipoPresupuesto){
  const g=m.gasto_acciones,turno=g?.turno===m.turnos,ronda=g?.ronda===c.ronda;
  m.gasto_acciones={turno:m.turnos,principal:turno?g!.principal:0,adicional:turno?g!.adicional:0,ronda:c.ronda,legendaria:ronda?g!.legendaria:0};
  m.gasto_acciones[tipo]++;
}
/** Cierra una acción principal ya gastada (`accion_usada`): con más de una principal se anota y, si queda otra, se libera.
 *  Con una sola no anota nada (los datos antiguos no cambian). Sirve a cualquier camino que gaste la principal. */
function cerrarPrincipal(c:Combate,m:Combatiente){
  if(!m.accion_usada||(m.rafaga?.restantes||0)>0||presupuestoDe(m).principal<=1)return;
  anotarGasto(c,m,'principal');
  if(presupuestoRestante(c,{...m,accion_usada:false}).principal>0)m.accion_usada=false;
}
export function dadoSeguro(caras: number) {
  if (!Number.isInteger(caras) || caras < 2 || caras > 4294967296)
    throw Error("El dado requiere caras enteras entre 2 y 4294967296.");
  const a = new Uint32Array(1),
    limite = Math.floor(4294967296 / caras) * caras;
  do {
    crypto.getRandomValues(a);
  } while (a[0] >= limite);
  return (a[0] % caras) + 1;
}
const copia = <T>(v: T): T => JSON.parse(JSON.stringify(v));
export const nuevoCombate = (): Combate => ({
  politica: {modo:"oficial",automatico:true,limite_rondas:0,exp_base:0,exp_objetivo:0,dificultad:1,reparto:"replicar",premiar_retirados:false},
  fase: "preparacion",
  ronda: 1,
  actual: null,
  regla: "impacto",
  miembros: [],
  registro: [],
});
function log(c: Combate, t: string) {
  c.registro.unshift(t);
  c.registro = c.registro.slice(0, 300);
}
function piezas(m: Combatiente) {
  const p = Object.fromEntries(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>!requisitosFuente(m,p).length));
  if (m.arma) {
    delete p[m.arma.slot];
    if (m.arma.efecto.arma_slot === "dos_manos") {
      delete p.mano_der;
      delete p.mano_izq;
    }
  }
  return p;
}
function armado(m: Combatiente) {
  return (
    !!m.arma ||
    Object.values(piezas(m)).some((p) =>
      p.efectos?.some((e) => e.efecto === "dano"),
    )
  );
}
/** La pasiva racial tiene prioridad sobre versiones equipadas con el mismo nombre.
 * Evita apilar Escamas de Dragon antiguas y raciales sin modificar las fichas existentes. */
function pasivasAplicables(m: Combatiente) {
  const todas = (m.configuracion.pasivas || []).filter(p=>!requisitosFuente(m,p).length);
  const raciales = todas.filter((p) => String(p.id || "").startsWith("raza:"));
  const otras = todas.filter((p) => !String(p.id || "").startsWith("raza:"));
  const vistas = new Set<string>();
  return [...raciales, ...otras].filter((p) => {
    const nombre = (p.nombre || "").normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
    if (vistas.has(nombre)) return false;
    vistas.add(nombre);
    return true;
  });
}

export function reglas(m: Combatiente) {
  const todas = [
    ...(m.configuracion.reglas_pasivas || []),
    ...pasivasAplicables(m).flatMap((p) => p.reglas || []),
    ...Object.values(piezas(m)).filter(p=>!requisitosFuente(m,p).length).flatMap((p) => p.reglas_pasivas || []),
  ];
  return [...new Map(todas.map((r) => [JSON.stringify(r), r])).values()];
}
function cumple(m: Combatiente, r: ReglaPasiva, e?: Efecto) {
  if (r.elemento && r.elemento !== "cualquiera" && r.elemento !== elementoDe(e))
    return false;
  return (
    (r.condicion === "ataque_magico" && !!e && (e.coste_ph > 0 || (r.id === "dragon_escamas_ipe" && e.naturaleza === "magica"))) ||
    (r.condicion === "ataque_natural" &&
      !!e &&
      e.coste_ph === 0 &&
      (e.naturaleza === "natural" || (e.coste_fatiga || 0) > 0)) ||
    (r.condicion === "ataque_elemental" &&
      !!e &&
      elementoDe(e) !== "ninguno") ||
    r.condicion === "siempre" ||
    (r.condicion === "vida_mitad" &&
      m.vida <= Math.max(1, m.stats.vida || m.stats.hp || 1) / 2) ||
    (r.condicion === "sin_arma" && !armado(m))
  );
}
export function estadisticas(m: Combatiente) {
  const s = { ...m.stats };
  const excluidos=new Set(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>requisitosFuente(m,p).length).map(([slot])=>slot));
  if(m.arma)for(const slot of m.arma.efecto.arma_slot==='dos_manos'?['mano_der','mano_izq']:[m.arma.slot])excluidos.add(slot);
  for(const slot of excluidos)for(const [k,v] of Object.entries(m.configuracion.equipamiento?.[slot]?.stats||{}))if(k in s&&!['peso','durabilidad','dano','caras_dano','dados_dano'].includes(k))s[k]-=v;
  let impactoMutacion = 0;
  for (const r of reglas(m))
    if (r.evento === "permanente" && cumple(m, r))
      for (const [k, v] of Object.entries(r.bonos)) {
        s[k] = (s[k] || 0) + v;
        if (r.id==='kuro_sangre_mutada' && k==='bono_impacto') impactoMutacion=Math.max(impactoMutacion,v);
      }
  for (const e of m.estados)
    for (const [k, v] of Object.entries(e.bonos || {})) s[k] = (s[k] || 0) + v;
  for (const mod of m.motor?.modificadores || [])
    for (const cambio of mod.cambios) {
      // Sangre Mutada y Versatilidad comparten la precisión de adaptación humana.
      if (impactoMutacion && mod.clave==='versatilidad_nata' && cambio.atributo==='bono_impacto' && cambio.operacion==='sumar' && cambio.valor>0) {
        s.bono_impacto+=Math.max(0,cambio.valor-impactoMutacion);
        continue;
      }
      const anterior = s[cambio.atributo] || 0;
      s[cambio.atributo] = cambio.operacion === 'sumar' ? anterior + cambio.valor : cambio.operacion === 'multiplicar' ? anterior * cambio.valor : cambio.valor;
    }
  return s;
}
export function maxVida(m: Combatiente) {
  const s = m.transformacion?.tipo==='poder'&&!m.transformacion.vida_maxima_alterada?m.transformacion.stats_originales:estadisticas(m);
  return Math.max(1, s.vida ?? s.hp ?? 1);
}
/** Nunca permite gastar PH que excedan la capacidad real o un recurso inválido. */
export function phDisponibles(m:Combatiente):number {
 const max=estadisticas(m).ph;
 if(typeof max!=='number'||!Number.isFinite(max)||max<=0||typeof m.ph!=='number'||!Number.isFinite(m.ph))return 0;
 return Math.max(0,Math.min(max,m.ph));
}
function normalizar(m: Combatiente) {
  const s = estadisticas(m);
  m.vida = Math.max(0, Math.min(m.vida, maxVida(m)));
  m.ph = phDisponibles(m);
  m.fatiga = Math.max(0, Math.min(m.fatiga, s.fatiga || 0));
}
export function agregar(
  c: Combate,
  f: {
    id: string;
    forja_id: string | null;
    nombre: string;
    nivel?: number;
    vida_actual?: number;
    ph_actual?: number;
    fatiga_actual?: number;
    stats: Record<string, number>;
    configuracion: Config;
  },
  bando: Bando,
  rng: RNG = dadoSeguro,
) {
  if (c.fase !== "preparacion")
    throw Error("Añade personajes durante la preparación.");
  if (f.configuracion.tipo_creacion !== "personaje")
    throw Error("Solo se admiten personajes.");
  const n = copia(c);
  if (n.miembros.some((m) => m.id === f.id)) return n;
  const m: Combatiente = {
    ...f,
    stats: { ...f.stats, nivel: f.nivel ?? f.stats.nivel ?? 1 },
    nivel: f.nivel ?? f.stats.nivel ?? 1,
    bando,
    vida: f.stats.vida ?? f.stats.hp ?? 1,
    ph: 0,
    fatiga: 0,
    iniciativa: 0,
    dado_iniciativa: 0,
    turnos: 0,
    accion_usada: false,
    cooldowns: {},
    estados: [],
  };
  for (const [k, v] of Object.entries(m.configuracion.bonos_equipamiento || {}))
    if (!(k in m.stats)) m.stats[k] = v;
  m.vida = f.vida_actual == null ? maxVida(m) : Math.max(0, Math.min(maxVida(m), f.vida_actual));
  m.ph = f.ph_actual == null ? Math.max(0, estadisticas(m).ph || 0) : Math.max(0, Math.min(estadisticas(m).ph || 0, f.ph_actual));
  m.fatiga = Math.max(0, f.fatiga_actual ?? 0);
  m.corrupto = !!m.stats.corrupto;
  m.grupo_cercania = "";
  m.dado_iniciativa = rng(20);
  m.iniciativa = m.dado_iniciativa + (estadisticas(m).iniciativa || 0);
  m.configuracion.reserva ||= [...new Map(Object.values(m.configuracion.equipamiento||{}).filter(p=>p.id).map(p=>[p.id,p])).values()];
  for(const p of Object.values(m.configuracion.equipamiento||{})){const faltan=requisitosFuente(m,p);if(faltan.length)throw Error(`${p.nombre}: ${faltan.join('; ')}`);}
  n.miembros.push(m);
  activarEquipo(n,m,rng);
  log(
    n,
    `${m.nombre} → ${bando}. Iniciativa ${m.dado_iniciativa} + ${estadisticas(m).iniciativa || 0} = ${m.iniciativa}. Vida ${m.vida}, ARM ${estadisticas(m).armadura || 0}.`,
  );
  return n;
}
/** Incorporate a prepared party as one change; existing members never reroll initiative. */
export function agregarParty(c:Combate, fuentes:(Parameters<typeof agregar>[1]&{personaje_id?:string;requiere_configuracion?:boolean})[], bando:Bando, rng:RNG=dadoSeguro):Combate {
  if(c.fase!=='preparacion')throw Error('Añade la party antes de iniciar el combate.');
  if(!fuentes.length)throw Error('La party no tiene integrantes disponibles.');
  const vistos=new Set<string>();
  const nuevos=fuentes.filter(f=>{
    if(!f.personaje_id||vistos.has(f.personaje_id))throw Error('La party contiene un personaje repetido o inválido.');
    vistos.add(f.personaje_id);
    const actual=c.miembros.find(m=>m.personaje_id===f.personaje_id);
    if(actual&&actual.bando!==bando)throw Error(`${f.nombre} ya está en otro bando del encuentro.`);
    if(f.requiere_configuracion||!(f.stats.vida>0||f.stats.hp>0))throw Error(`Configura la vida de ${f.nombre} en su ficha antes de añadir la party.`);
    return !actual;
  });
  if(c.miembros.length+nuevos.length>100)throw Error('La party completa excede el máximo de cien participantes.');
  let next=c;
  for(const f of nuevos)next=agregar(next,copia({...f,nivel:f.nivel??f.stats.nivel??1}),bando,rng);
  return next;
}
function orden(c: Combate) {
  return c.miembros
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.iniciativa - a.m.iniciativa || a.i - b.i)
    .map((v) => v.m);
}
export function elementoDe(e?: Efecto): Elemento {
  if (e?.elemento) return e.elemento;
  const t = (e?.tipo_dano || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (t === "fuego") return "fuego";
  if (t === "agua") return "agua";
  if (["electrico", "electricidad"].includes(t)) return "electricidad";
  if (["hielo", "frio"].includes(t)) return "hielo";
  if (["luz sagrada", "luz_sagrada"].includes(t)) return "luz_sagrada";
  return "ninguno";
}
function dados(c: Combate, n: number, caras: number, rng: RNG, nombre: string) {
  const vs = Array.from({ length: n }, () => rng(caras));
  const total = vs.reduce((a, b) => a + b, 0);
  if (n) log(c, `${nombre}: ${n}d${caras} [${vs.join(", ")}] = ${total}.`);
  return total;
}
export function salvacion(
  c: Combate,
  m: Combatiente,
  cd = 12,
  atributo = "salvacion",
  rng: RNG = dadoSeguro,
) {
  const d = rng(20),
    bono = estadisticas(m)[atributo] || 0;
  let exito = d + bono >= cd;
  log(
    c,
    `${m.nombre}: salvación d20 (${d}) + ${atributo} (${bono}) = ${d + bono}, CD ${cd}: ${exito ? "superada" : "fallida"}.`,
  );
  if (!exito && c.fase === "en_curso")
    for (const r of evaluarReacciones(c, m, "tras_fallar_prueba")) {
      if (!ofrecer(c, m, r, rng, "tras_fallar_prueba")) continue;
      const d2 = rng(20);
      exito = d2 + bono >= cd;
      log(c, `${m.nombre} repite la salvación: d20 (${d2}) + ${atributo} (${bono}) = ${d2 + bono}, CD ${cd}: ${exito ? "superada" : "fallida"}.`);
      break;
    }
  return exito;
}
function tiene(m: Combatiente, tipo: string) {
  return m.estados.some((e) => (e.tipo || e.id) === tipo);
}
function quitarEstado(m: Combatiente, tipo: string) {
  m.estados = m.estados.filter((e) => (e.tipo || e.id) !== tipo);
}
/** Inmunidades vigentes: personaje, habilidades (incluidas las heredadas por linaje), pasivas, estados activos y
 * equipo equipado. Al desequipar, el objeto deja de estar en `piezas` y su inmunidad desaparece sola. */
export function inmunidadesDe(m: Combatiente): Inmunidad[] {
  const r: Inmunidad[] = [];
  const sumar = (l: Inmunidad[] | undefined, origen: string) => { for (const i of l || []) r.push({ ...i, origen: i.origen || origen }); };
  sumar(m.configuracion.inmunidades, m.nombre);
  for (const h of habilidadesDe(m).filter(h => !requisitosFuente(m, h).length)) for (const e of h.efectos || []) sumar(e.inmunidades, h.nombre);
  for (const p of Object.values(piezas(m))) for (const e of p.efectos || []) sumar(e.inmunidades, p.nombre);
  for (const p of m.configuracion.pasivas || []) sumar(p.inmunidades, p.nombre);
  for (const e of m.estados) for (const p of primitivas(definicionDe(e), 'inmunidad')) sumar(p.inmunidades, e.nombre);
  return r;
}
const NATURALEZA_DANO: Record<string, string[]> = { magica: ['magica', 'magico'], fisica: ['fisica', 'fisico'], natural: ['natural'] };
/** Tipos de daño que una inmunidad puede reconocer: elemento, tipo de daño y naturaleza. */
export function candidatoDano(e: Efecto, elemento?: string): CandidatoInmunidad {
  const nat = e.naturaleza && e.naturaleza !== 'automatica' ? e.naturaleza : (e.coste_ph || 0) > 0 ? 'magica' : 'fisica';
  const tipos = [elemento || elementoDe(e), norm(e.tipo_dano || ''), ...(NATURALEZA_DANO[nat] || [])].filter(t => t && t !== 'ninguno');
  return { clase: 'dano', tipos, categoria: e.categoria, subcategoria: e.subcategoria };
}
/** Comprueba la inmunidad a un estado ANTES de la salvación (inmunidad completa: no hay tirada). */
function puedeAplicar(c: Combate, t: Combatiente, id: string, def?: DefinicionEstado, e?: Efecto): 'si' | 'no' | 'resiste' {
  const d = def || definicionBase(id);
  const r = comprobarInmunidad(inmunidadesDe(t), { clase: 'estado', estado: d?.id || id, categoria: e?.categoria || d?.categoria, subcategoria: e?.subcategoria || d?.subcategoria, origen: d?.origen }, e?.ignora);
  if (r.bloqueado) { log(c, `${t.nombre}: ${r.motivo}; no sufre ${d?.nombre || id}.`); return 'no'; }
  return r.resistido ? 'resiste' : 'si';
}
/** Aplica un estado del catálogo (o una definición) con sus bonos, si la inmunidad lo permite. */
function aplicarDefinicion(c: Combate, t: Combatiente, d: DefinicionEstado, fuente?: string, duracion?: number, extras: Partial<Combatiente["estados"][number]> = {}, e?: Efecto) {
  const permiso = puedeAplicar(c, t, d.id, d, e);
  if (permiso === 'no') return false;
  let turnos = turnosIniciales(d, duracion);
  if (permiso === 'resiste' && turnos > 1) { turnos = Math.max(1, Math.floor(turnos / 2)); log(c, `${t.nombre} resiste ${d.nombre}: dura ${turnos} turno(s).`); }
  estado(t, d.id, d.nombre, turnos, bonosDefinicion(d), { ...(definicionBase(d.id) === d ? {} : { def: d }), ...(fuente ? { fuente } : {}), ...(d.duracion.tipo === 'hasta_su_turno' ? { inicio: true } : {}), ...extras });
  return true;
}
function estado(
  m: Combatiente,
  tipo: string,
  nombre: string,
  duracion = 0,
  bonos: Record<string, number> = {},
  extras: Partial<Combatiente["estados"][number]> = {},
) {
  const existente = m.estados.find((e) => (e.tipo || e.id) === tipo);
  if (existente) {
    existente.restantes = existente.restantes === 0 || duracion === 0 ? 0 : Math.max(existente.restantes, duracion);
    existente.creado = m.turnos;
    for (const [k, v] of Object.entries(bonos))
      if (Math.abs(v) > Math.abs(existente.bonos[k] || 0))
        existente.bonos[k] = v;
    if (
      (extras.cantidad || 0) * (extras.caras || 0) >
      (existente.cantidad || 0) * (existente.caras || 0)
    )
      Object.assign(existente, extras);
    return;
  }
  m.estados.push({
    id: tipo,
    tipo,
    nombre,
    restantes: duracion,
    creado: m.turnos,
    bonos,
    ...extras,
  });
}
function curarCombatiente(m:Combatiente,cantidad:number){
 if(situacionCombatiente(m)==='muerto')return;
 m.vida=Math.min(maxVida(m),m.vida+Math.max(0,cantidad));
 if(m.vida>0&&m.situacion==='inconsciente')m.situacion='activo';
}
function recuperar(m: Combatiente, r: ReglaPasiva) {
  curarCombatiente(m,r.curacion);
  m.ph += r.recuperar_ph;
  if (!m.agotado) m.fatiga -= r.reducir_fatiga;
  normalizar(m);
}
function reactivas(m: Combatiente, e: Efecto, evento: ReglaPasiva["evento"]) {
  return reglas(m).filter((r) => r.evento === evento && cumple(m, r, e));
}
function activarReglas(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  rs: ReglaPasiva[],
  rng: RNG,
) {
  for (const r of rs) {
    log(c, `${t.nombre}: ${r.nombre} (${r.evento}).`);
    recuperar(t, r);
    if (a.id !== t.id && (r.represalia_dados || 0) > 0) {
      const v = dados(
        c,
        r.represalia_dados!,
        r.represalia_caras || 6,
        rng,
        "Represalia " + r.nombre,
      );
      Object.assign(a,danarTransformado(a,v).actor);
      log(
        c,
        `${a.nombre} sufre ${v} por represalia, sin encadenar otras represalias.`,
      );
    }
  }
}
export function reaccionDe(e:Efecto):Reaccion|undefined{return e.reaccion;}
/** Efectos del combatiente con las defensas antiguas normalizadas a `reaccion` (sin escribir en el estado). */
function efectosConReaccion(m:Combatiente):Efecto[]{return habilidadesDe(m).flatMap(h=>h.efectos||[]).map(normalizarReaccion);}
type ReaccionDisponible={p:Efecto;r:Reaccion;coste:number;restantes:number|null};
/** Coste, usos y enfriamiento: null si ahora no se puede ofrecer. */
function disponibilidad(c:Combate,t:Combatiente,p:Efecto,r:Reaccion):ReaccionDisponible|null{
  if(!permiteReacciones(t.estados.map(definicionDe)))return null;
  const coste=t.transformacion?.definicion_id==='limitless'&&p.ley_limitless?0:(r.coste??p.coste_ph??0);
  if(phDisponibles(t)<coste||(r.una_por_ronda&&t.rondas_reacciones?.[p.id]===c.ronda))return null;
  const u=t.usos_reaccion?.[p.id];
  if(r.enfriamiento&&u&&c.ronda<=u.ultima+r.enfriamiento)return null;
  let restantes:number|null=null;
  if(r.usos&&r.usos.tipo!=='ilimitado'){
    const usados=r.usos.tipo==='encuentro'?(u?.encuentro||0):(u&&u.ronda===c.ronda?u.en_ronda:0);
    restantes=(r.usos.maximo||1)-usados;
    if(restantes<=0)return null;
  }
  return {p,r,coste,restantes};
}
/** Pregunta al dueño (rng.consultarReaccion) y, si la usa, paga PH y anota el uso. */
function ofrecer(c:Combate,t:Combatiente,d:ReaccionDisponible,rng:RNG,disparador:DisparadorReaccion,anotar=true):boolean{
  if(rng.consultarReaccion&&!rng.consultarReaccion({defensor:t.id,nombre:t.nombre,reaccion:d.p.nombre,efecto:d.p.id,coste:d.coste,disparador,usos_restantes:d.restantes,enfriamiento:d.r.enfriamiento||0,linea:lineaCosteReaccion({...d.r,coste:d.coste},0,d.restantes)}))return false;
  if(d.r.una_por_ronda)t.rondas_reacciones={...t.rondas_reacciones,[d.p.id]:c.ronda};
  if(d.r.usos||d.r.enfriamiento){
    const u=t.usos_reaccion?.[d.p.id];
    t.usos_reaccion={...t.usos_reaccion,[d.p.id]:{encuentro:(u?.encuentro||0)+1,ronda:c.ronda,en_ronda:(u&&u.ronda===c.ronda?u.en_ronda:0)+1,ultima:c.ronda}};
  }
  t.ph=phDisponibles(t)-d.coste;
  if(anotar)log(c,t.nombre+' activa '+d.p.nombre+' ('+d.coste+' PH).');
  return true;
}
/** Reacciones que el disparador ofrece ahora al dueño, por prioridad. `cerca`: a quién mide el alcance. */
export function evaluarReacciones(c:Combate,dueno:Combatiente,disparador:DisparadorReaccion,contexto:{efecto?:Efecto;cerca?:Combatiente}={}):ReaccionDisponible[]{
  if(!combatienteActivo(dueno))return [];
  const forma=dueno.transformacion?.definicion_id,e=contexto.efecto;
  const magico=!!e&&(e.naturaleza==='magica'||e.coste_ph>0);
  const pos=contexto.cerca&&CON_ALCANCE.includes(disparador)?posicionesTablero(c):null;
  return efectosConReaccion(dueno).map((p,i)=>({p,r:p.reaccion,i}))
    .filter((x):x is {p:Efecto;r:Reaccion;i:number}=>!!x.r&&disparadorDe(x.r)===disparador)
    .filter(({r})=>(!r.naturaleza||!e||(r.naturaleza==='magica')===magico)&&(!r.forma||forma===r.forma)&&(!r.sin_forma||forma!==r.sin_forma))
    .filter(({r})=>!pos||!contexto.cerca||(!!pos[dueno.id]&&!!pos[contexto.cerca.id]&&distanciaEntreFichas(dueno,pos[dueno.id],contexto.cerca,pos[contexto.cerca.id])<=(r.alcance||1)))
    .sort((x,y)=>(y.r.prioridad||0)-(x.r.prioridad||0)||x.i-y.i)
    .map(x=>disponibilidad(c,dueno,x.p,x.r)).filter((d):d is ReaccionDisponible=>!!d);
}
function conMiembro(c:Combate,id:string,fn:(n:Combate,m:Combatiente)=>void){
  return registrar(c,()=>{const n=copia(c),m=n.miembros.find(x=>x.id===id);if(!m)throw Error('Combatiente no encontrado.');fn(n,m);return n;});
}
/** Tomar el artefacto: salvación; si falla, la voz queda pendiente hasta que el GM la elija. */
/** Sin nadie a quien preguntar, las reacciones del jugador no se gastan solas: se rechazan. */
const sinPreguntar=(rng:RNG):RNG=>rng.consultarReaccion?rng:Object.assign((caras:number)=>rng(caras),{consultarReaccion:()=>false});
export function tomarArtefacto(c:Combate,id:string,config:ConfigVoces,rng:RNG=dadoSeguro){
  return conMiembro(c,id,(n,m)=>{
    if(puedeAplicar(n,m,'voz_artefacto',{id:'voz_artefacto',nombre:'la voz del artefacto',categoria:'mental',subcategoria:'posesion',duracion:{tipo:'combate'},efectos:[]})==='no')return;
    if(salvacion(n,m,config.cd,config.atributo,sinPreguntar(rng))){log(n,`${m.nombre} empuña el artefacto y acalla su voz.`);return;}
    m.voz_artefacto={estado:'pendiente'};m.voz_config=copia(config);
    log(n,`${m.nombre} empuña el artefacto: una voz se abre paso en su mente.`);
  });
}
export function asignarVoz(c:Combate,id:string,vozId:string){
  return conMiembro(c,id,(n,m)=>{
    if(!m.voz_config)throw Error('Este combatiente no oye ninguna voz.');
    m.voz_artefacto=activarVoz(m.voz_config,vozId);
    log(n,`La voz habla a ${m.nombre}: «${m.voz_artefacto.estado==='activa'?m.voz_artefacto.texto:''}»`);
  });
}
export function responderVoz(c:Combate,id:string,respuesta:string){
  return conMiembro(c,id,(n,m)=>{
    const v=m.voz_artefacto;
    if(v?.estado!=='activa'||v.tipo!=='pregunta')throw Error('No hay ninguna pregunta que responder.');
    if(v.respuesta)throw Error('Ya respondiste a la voz.');
    const r=String(respuesta||'').trim();
    if(v.opciones?.length?!v.opciones.some(o=>o.trim()===r):!r||r.length>200)throw Error('Elige una de las opciones de la voz.');
    m.voz_artefacto={...v,respuesta:r};
    log(n,`${m.nombre} responde a la voz: «${r}».`);
  });
}
/** Contra una negativa, el portador puede repetir la prueba una vez por encuentro. */
export function resistirVoz(c:Combate,id:string,rng:RNG=dadoSeguro){
  return conMiembro(c,id,(n,m)=>{
    const v=m.voz_artefacto;
    if(v?.estado!=='activa'||v.tipo!=='negativa')throw Error('Solo se resiste una negativa de la voz.');
    if(m.voz_resistida)throw Error('Ya repetiste la prueba: solo una vez por encuentro.');
    m.voz_resistida=true;
    const cfg=m.voz_config;
    if(salvacion(n,m,cfg?.cd??14,cfg?.atributo??'voluntad',sinPreguntar(rng))){delete m.voz_artefacto;log(n,`${m.nombre} se impone a la voz.`);}
    else log(n,`La voz sigue negándole a ${m.nombre} su habilidad.`);
  });
}
/** Estado Dominado: el GM decide por el combatiente; el jugador no puede actuar. */
export function dominar(c:Combate,id:string,activo:boolean){
  return conMiembro(c,id,(n,m)=>{
    m.estados=m.estados.filter(e=>e.tipo!=='dominado');
    if(activo&&puedeAplicar(n,m,'dominado')==='no')return;
    if(activo)m.estados.push({id:'dominado',tipo:'dominado',nombre:'Dominado',restantes:0,creado:m.turnos,bonos:{}});
    log(n,activo?`${m.nombre} queda dominado: el GM decide sus actos.`:`${m.nombre} recupera el control.`);
  });
}
/** El GM lanza el espejo mental sobre un combatiente. */
export function lanzarEspejo(c:Combate,id:string,opciones:OpcionesEspejo){
  return conMiembro(c,id,(n,m)=>{if(puedeAplicar(n,m,'espejo_mental',{id:'espejo_mental',nombre:'Espejo mental',categoria:'mental',subcategoria:'ilusion',duracion:{tipo:'combate'},efectos:[]})==='no')return;m.espejo_mental={...copia(opciones),aviso:true};log(n,`${m.nombre}: su mente se nubla (espejo mental).`);});
}
export function quitarEspejo(c:Combate,id:string){
  return conMiembro(c,id,(n,m)=>{delete m.espejo_mental;log(n,`${m.nombre}: el GM disipa el espejo mental.`);});
}
/** Primitiva «Cesión de control»: quién decide los actos del afectado (null: su jugador). */
export function controlDe(m:Pick<Combatiente,'estados'>):{controlador:'gm'|'fuente';fuente?:string;estado:string}|null{
  for(const s of m.estados){const p=primitivas(definicionDe(s),'cesion_control')[0];if(p)return {controlador:p.controlador==='fuente'&&s.fuente?'fuente':'gm',fuente:s.fuente,estado:s.nombre};}
  return null;
}
export const estaDominado=(m:Pick<Combatiente,'estados'>)=>!!controlDe(m);
/** Combatientes que `controlador` dirige ahora (control mental de un rival). */
export const controladosPor=(c:Combate,controlador:string)=>c.miembros.filter(m=>{const k=controlDe(m);return k?.controlador==='fuente'&&k.fuente===controlador&&combatienteActivo(m);});
/** El GM corta cualquier cesión de control en cualquier momento. */
export function cortarControl(c:Combate,id:string){
  return conMiembro(c,id,(n,m)=>{
    const antes=m.estados.length;
    m.estados=m.estados.filter(s=>!primitivas(definicionDe(s),'cesion_control').length);
    log(n,antes!==m.estados.length?`El GM corta el control sobre ${m.nombre}: recupera su voluntad.`:`${m.nombre} no estaba controlado.`);
  });
}
/** El GM decide las reacciones de enemigos, NPC sin jugador, dominados y poseídos. */
export const reaccionLaDecideGM=(m:Pick<Combatiente,'bando'|'personaje_id'|'estados'|'transformacion'>)=>m.bando==='enemigo'||!m.personaje_id||!!controlDe(m)||!!m.transformacion?.descontrolada;
/** Reacciones del combatiente para su ficha: frase de coste con usos restantes y si ahora podría usarse. */
export function reaccionesDe(c:Combate,m:Combatiente):{id:string;nombre:string;disparador:DisparadorReaccion;linea:string;lista:boolean}[]{
  return efectosConReaccion(m).filter((p):p is Efecto&{reaccion:Reaccion}=>!!p.reaccion).map(p=>{
    const r=p.reaccion,u=m.usos_reaccion?.[p.id];
    const restantes=r.usos&&r.usos.tipo!=='ilimitado'?Math.max(0,(r.usos.maximo||1)-(r.usos.tipo==='encuentro'?(u?.encuentro||0):(u&&u.ronda===c.ronda?u.en_ronda:0))):null;
    const coste=m.transformacion?.definicion_id==='limitless'&&p.ley_limitless?0:(r.coste??p.coste_ph??0);
    return {id:p.id,nombre:p.nombre,disparador:disparadorDe(r),linea:lineaCosteReaccion({...r,coste},0,restantes),lista:!!disponibilidad(c,m,p,r)};
  });
}
function contraatacar(c:Combate,dueno:Combatiente,victima:Combatiente,ca:ContraataqueReaccion,rng:RNG,nombre:string){
  const v=Math.max(0,dados(c,ca.cantidad,ca.caras,rng,nombre)+(ca.modificador||0));
  Object.assign(victima,danarTransformado(victima,v).actor);
  log(c,`${victima.nombre} sufre ${v} por ${nombre} de ${dueno.nombre}, sin encadenar reacciones.`);
}
/** Resuelve la parte principal de una reacción ya pagada (disparadores distintos de recibir el golpe). */
function resolverPrincipal(c:Combate,dueno:Combatiente,d:ReaccionDisponible,rng:RNG,ctx:{victima?:Combatiente;protegido?:Combatiente}):boolean{
  const pr=d.r.principal;
  if(!pr)return false;
  if(pr.salvacion&&!salvacion(c,dueno,pr.salvacion.cd,pr.salvacion.atributo,rng))return false;
  if(pr.contraatacar&&ctx.victima&&ctx.victima.vida>0)contraatacar(c,dueno,ctx.victima,pr.contraatacar,rng,d.p.nombre);
  if(pr.reducir&&ctx.protegido)(ctx.protegido.reduccion_reaccion||=[]).push({...pr.reducir});
  if(pr.animacion)dueno.ultima_defensa={id:crypto.randomUUID(),animacion:pr.animacion};
  return true;
}
/** Ofrece el disparador a cada candidato y resuelve las que acepta. */
function dispararReacciones(c:Combate,candidatos:Combatiente[],disparador:DisparadorReaccion,rng:RNG,ctx:{efecto?:Efecto;cerca?:Combatiente;victima?:Combatiente;protegido?:(dueno:Combatiente)=>Combatiente|undefined;hasta?:()=>boolean}){
  for(const dueno of candidatos)for(const previa of evaluarReacciones(c,dueno,disparador,ctx)){
    if(ctx.hasta?.())return;
    // Otra reacción aceptada antes pudo gastar los PH o los usos: se vuelve a comprobar.
    const d=disponibilidad(c,dueno,previa.p,previa.r);
    if(d&&ofrecer(c,dueno,d,rng,disparador))resolverPrincipal(c,dueno,d,rng,{victima:ctx.victima,protegido:ctx.protegido?.(dueno)});
  }
}
function recibir(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  e: Efecto,
  total: number,
  rs: ReglaPasiva[],
  rng: RNG,
) {
  if (total > 0 && !e.componentes?.length) {
    const inm = comprobarInmunidad(inmunidadesDe(t), candidatoDano(e), e.ignora);
    if (inm.bloqueado) { log(c, `${t.nombre}: ${inm.motivo}; no recibe daño.`); total = 0; }
    else if (inm.resistido) { const antes = total; total = Math.floor(total / 2); log(c, `${t.nombre}: ${inm.motivo} (${antes} → ${total}).`); }
  }
  const alDano = reactivas(t, e, "recibir_dano");
  const reduccion = Math.max(
    0,
    ...[...rs, ...alDano].map((r) => r.reduccion_pct || 0),
  );
  if (reduccion) {
    const antes = total;
    total = Math.floor(total * (1 - reduccion / 100));
    log(
      c,
      `${t.nombre}: reducción ${reduccion}% (${antes} → ${total}); no se acumulan porcentajes.`,
    );
  }
  if(t.reduccion_reaccion?.length){
    for(const r of t.reduccion_reaccion){const antes=total;total-=r.modo==='todo'?total:r.modo==='mitad'?total-Math.floor(total/2):Math.min(total,r.valor||0);log(c,`${t.nombre}: su reacción frena el golpe (${antes} → ${total}).`);}
    delete t.reduccion_reaccion;
  }
  const reacciones=efectosConReaccion(t).map(p=>({p,r:reaccionDe(p)})).filter((x):x is {p:Efecto;r:Reaccion}=>!!x.r&&disparadorDe(x.r)==='despues_ser_atacado');
  if(total>0 && a.id!==t.id && reacciones.length){
    const forma=t.transformacion?.definicion_id;
    const magico=e.naturaleza==='magica'||e.coste_ph>0;
    const aplica=(r:Reaccion)=>(!r.naturaleza||(r.naturaleza==='magica')===magico)&&(!r.forma||forma===r.forma)&&(!r.sin_forma||forma!==r.sin_forma);
    const pagar=(p:Efecto,r:Reaccion)=>{const d=disponibilidad(c,t,p,r);return !!d&&ofrecer(c,t,d,rng,'despues_ser_atacado');};
    const resolver=(res:ResultadoReaccion,cantidad:number,nombre:string)=>{
      if(res.contraatacar&&a.vida>0)contraatacar(c,t,a,res.contraatacar,rng,nombre);
      if(res.reservar){
        const {recurso,proporcion,maximo}=res.reservar,saldo=t.recursos_especiales?.[recurso]||0;
        t.recursos_especiales={...t.recursos_especiales,[recurso]:Math.min(maximo,saldo+Math.floor(cantidad*proporcion))};
      }
      if(res.devolver)Object.assign(a,danarTransformado(a,res.devolver.maximo===undefined?cantidad:Math.min(cantidad,res.devolver.maximo)).actor);
    };
    // Principales por prioridad (estable): la primera que se paga resuelve el golpe, aunque falle su salvación.
    const principales=reacciones.map((x,i)=>({...x,i})).filter(x=>x.r.principal?.reducir&&!x.r.esquiva_opuesta&&aplica(x.r)).sort((x,y)=>(y.r.prioridad||0)-(x.r.prioridad||0)||x.i-y.i);
    for(const x of principales){
      const pr=x.r.principal!,reducir=pr.reducir!;
      if(!pagar(x.p,x.r))continue;
      if(!pr.salvacion||salvacion(c,t,pr.salvacion.cd,pr.salvacion.atributo,rng)){
        const detenido=reducir.modo==='todo'?total:reducir.modo==='mitad'?total-Math.floor(total/2):Math.min(total,reducir.valor||0);
        total-=detenido;
        resolver(pr,detenido,x.p.nombre);
        if(pr.permite_seguimiento){
          const sig=reacciones.find(y=>y!==x&&y.r.seguimiento&&aplica(y.r));
          if(sig && pagar(sig.p,sig.r))resolver(sig.r.seguimiento!,detenido,sig.p.nombre);
        }
        if(pr.animacion)t.ultima_defensa={id:crypto.randomUUID(),animacion:pr.animacion};
      }
      break;
    }
  }
  const perdido = Math.min(t.vida, Math.max(0, total));
  const resultadoDano=danarTransformado(t,perdido);
  if(resultadoDano.forma_rota)guardarVidaForma(t,0);
  Object.assign(t,resultadoDano.actor);
  if(resultadoDano.forma_rota)log(c,`${t.nombre}: su forma se rompe y recupera su vida anterior.`);
  const cayo = perdido > 0 && resultadoDano.muerto;
  log(c, `${t.nombre} recibe ${perdido} daño; vida ${t.vida}.`);
  if (perdido > 0)
    for (const s of [...t.estados])
      if (definicionDe(s)?.despertar?.recibir_dano) { quitarEstado(t, s.tipo || s.id); log(c, `${t.nombre} despierta: termina ${s.nombre}.`); }
  if (perdido > 0) {
    activarReglas(c, a, t, alDano, rng);
    emitirMotor(c, 'recibir_dano', t, a, t, rng, e, perdido);
    if (a.id !== t.id) emitirMotor(c, 'causar_dano', a, a, t, rng, e, perdido);
    eventoRecurso(c, t, 'recibir_dano');
    if (a.id !== t.id) eventoRecurso(c, a, 'causar_dano');
    if (cayo && t.vida <= 0) {
      if (a.id !== t.id)
        dispararReacciones(c, c.miembros.filter(w=>w.id!==t.id&&w.id!==a.id&&w.bando===t.bando), "aliado_cae", rng, {cerca:t, victima:a, hasta:()=>a.vida<=0});
      emitirMotor(c, 'morir', t, a, t, rng, e, perdido);
      if (a.id !== t.id && a.bando !== t.bando) emitirMotor(c, 'matar', a, a, t, rng, e, perdido);
    }
  }
  return perdido;
}
function area(
  c: Combate,
  a: Combatiente,
  t: Combatiente,
  e: Efecto,
  total: number,
  rng: RNG,
) {
  const antes = reactivas(t, e, "recibir_ataque");
  activarReglas(c, a, t, antes, rng);
  const impacto = reactivas(t, e, "recibir_impacto");
  activarReglas(c, a, t, impacto, rng);
  return recibir(c, a, t, e, total, [...antes, ...impacto], rng);
}
function entrar(c: Combate, m: Combatiente, rng: RNG) {
  aplicarTerreno(c,m,rng);
  if(m.espejo_mental){
    const e=m.espejo_mental;
    if(salvacion(c,m,e.cd??14,e.atributo??'voluntad',rng)){delete m.espejo_mental;log(c,`${m.nombre}: su mente se aclara.`);}
    else m.espejo_mental={...e,aviso:false};
  }
  const percepcion=m.estados.flatMap(s=>primitivas(definicionDe(s),'percepcion_alterada'))[0];
  if(percepcion&&rng(100)<=percepcion.probabilidad){m.percepcion_alterada={espejar:false,intercambiar:true,ocultar:false,aviso:true};log(c,`${m.nombre}: su percepción se altera este turno.`);}
  else delete m.percepcion_alterada;
  m.turnos++;
  // Posesión: se revisa cada turno mientras la vida esté en el umbral, incluso
  // en estado normal. No consume acción ni PH y respeta el resultado del dado.
  if(m.vida>0&&!m.transformacion?.descontrolada){
    const activaciones=habilidadesDe(m).flatMap(h=>h.efectos||[]).filter(e=>!!e.transformacion?.posesion);
    for(const e of activaciones){
      const d=e.transformacion!,p=d.posesion!;
      if(m.transformacion&&m.transformacion.definicion_id!==d.id)continue;
      if(m.vida*100>maxVida(m)*p.umbral_pct)continue;
      // Ruta especial: solo una inmunidad configurada a la posesión la bloquea (sin decisión por defecto).
      if(puedeAplicar(c,m,'posesion',{id:'posesion',nombre:'la posesión',categoria:'mental',subcategoria:'posesion',duracion:{tipo:'combate'},efectos:[]})==='no')break;
      if(!salvacion(c,m,p.cd,'salvacion',rng)){
        if(!aplicarFormaConEspacio(c,m,forzarPosesion(m,d,p.etapa_id),rng)){log(c,`${m.nombre}: no hay espacio para la forma de posesión.`);break;}
        log(c,`${m.nombre} pierde el control: se manifiesta ${d.etapas.find(et=>et.id===p.etapa_id)?.nombre||d.nombre}.`);
      }else log(c,`${m.nombre} resiste la posesión por este turno.`);
      break;
    }
  }
  m.accion_usada = false;
  delete m.rafaga;
  m.uso_fatiga = false;
  m.estados = m.estados.filter((e) => !e.inicio);
  for (const k of Object.keys(m.cooldowns))
    m.cooldowns[k] = Math.max(0, m.cooldowns[k] - 1);
  mantenerVisiones(c, m);
  for (const r of reglas(m))
    if (r.evento === "inicio_turno" && cumple(m, r)) {
      recuperar(m, r);
      log(c, `${m.nombre}: ${r.nombre} al iniciar turno.`);
    }
  emitirMotor(c, 'inicio_turno', m, m, m, rng);
  eventoRecurso(c, m, 'inicio_turno');
  periodicos(c, m, 'inicio', rng);
  perderTurno(c, m, rng);
  for (const s of [...m.estados]) for (const p of primitivas(definicionDe(s), 'movimiento_forzado')) if (s.fuente && combatienteActivo(m)) moverForzado(c, m, p, s.fuente, rng);
  normalizar(m);
  c.actual = m.id;
  log(c, `Ronda ${c.ronda} · Turno de ${m.nombre}.`);
  if(m.transformacion?.descontrolada&&!m.accion_usada)resolverTurnoDescontrolado(c,m.id,rng);
}
/** Primitivas «Daño periódico» y «Curación periódica» de todos los estados activos. */
function periodicos(c: Combate, m: Combatiente, momento: 'inicio' | 'fin', rng: RNG) {
  for (const e of [...m.estados]) {
    const d = definicionDe(e);
    for (const p of (d?.efectos || []) as Primitiva[]) {
      if ((p.tipo !== 'dano_periodico' && p.tipo !== 'curacion_periodica') || p.momento !== momento) continue;
      if (!m.estados.includes(e)) break;
      // La instancia puede traer sus propios dados (acción que la aplicó); si no, los de la definición.
      const v = dados(c, e.cantidad ?? p.cantidad, e.caras ?? p.caras, rng, `${m.nombre}: ${e.nombre}`);
      if (p.tipo === 'curacion_periodica') curarCombatiente(m, v);
      else recibir(c, m, m, { ...basico(), efecto: 'dano', tipo_dano: p.tipo_dano }, v, [], rng);
      log(c, `${m.nombre}: ${e.nombre}, vida ${m.vida}.`);
      if (p.tipo === 'dano_periodico' && p.salvacion_termina && m.estados.includes(e) && salvacion(c, m, e.cd || p.salvacion_termina.cd, e.atributo || p.salvacion_termina.atributo, rng)) {
        quitarEstado(m, e.tipo || e.id);
        log(c, e.tipo === 'quemadura' ? `${m.nombre} apaga la quemadura.` : `${m.nombre} se libra de ${e.nombre}.`);
      }
    }
  }
}
/** Primitiva «Perder turno» con despertar por salvación (Paralizado, Dormido…) y estados que se consumen. */
function perderTurno(c: Combate, m: Combatiente, rng: RNG) {
  const pierden: Combatiente["estados"] = [];
  for (const e of [...m.estados]) {
    const d = definicionDe(e); if (!d) continue;
    const pt = primitivas(d, 'perder_turno')[0];
    const sv = d.despertar?.salvacion || (d.duracion.tipo === 'salvacion' ? d.duracion.salvacion : undefined);
    const obligado = !!pt?.primer_turno && !e.turnos_perdidos;
    if (sv && !obligado) {
      if (salvacion(c, m, sv.cd, sv.atributo, rng)) { quitarEstado(m, e.tipo || e.id); log(c, `${m.nombre} se libera de ${e.nombre}.`); continue; }
    }
    if (!pt) continue;
    pierden.push(e); e.turnos_perdidos = (e.turnos_perdidos || 0) + 1;
  }
  if (!pierden.length) return;
  m.accion_usada = true;
  for (const e of pierden) if (primitivas(definicionDe(e), 'perder_turno').some(p => p.consumir)) quitarEstado(m, e.tipo || e.id);
  const clasicos = pierden.every(e => ['congelado', 'aturdido'].includes(e.tipo || ''));
  log(c, clasicos ? `${m.nombre} pierde su turno por congelación/aturdimiento.` : `${m.nombre} pierde su turno: ${pierden.map(e => e.nombre).join(', ')}.`);
}
/** Primitiva «Movimiento forzado»: se aleja (o acerca) de la fuente por casillas libres, sin atravesar muros. */
function moverForzado(c: Combate, m: Combatiente, p: Extract<Primitiva, { tipo: 'movimiento_forzado' }>, fuente: string, rng: RNG) {
  const pos = posicionesTablero(c), dims = dimensionesTablero(c), origen = pos[fuente], desde = pos[m.id];
  if (!origen || !desde) return;
  const ocupadas = new Set(casillasOtras(c.miembros,pos,m.id).map(claveHuella));
  let actual = desde, pasos = 0;
  while (pasos < p.max) {
    const d0 = distanciaCasillas(actual, origen);
    const opciones = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: actual.x + dx, y: actual.y + dy }))
      .filter(q => cabeHuella(huellaReserva(m),q,dims,r=>c.mapa?.celdas[claveHuella(r)]==='muro'||ocupadas.has(claveHuella(r))))
      .map(q => ({ q, d: distanciaCasillas(q, origen) }))
      .filter(v => p.sentido === 'alejar' ? v.d > d0 : v.d < d0 && v.d >= 1)
      .sort((u, v) => p.sentido === 'alejar' ? v.d - u.d : u.d - v.d);
    if (!opciones.length) break;
    actual = opciones[0].q; pasos++;
  }
  if (!pasos) { log(c, `${m.nombre} quiere ${p.sentido === 'alejar' ? 'huir' : 'acercarse'}, pero no tiene casilla libre.`); return; }
  for (const x of c.miembros) x.posicion = pos[x.id];
  m.posicion = { ...actual };
  c.evento_visual = { ...(c.evento_visual || { id: crypto.randomUUID(), nombre: m.nombre, dados: [] }), movimientos: [...(c.evento_visual?.movimientos || []), { id: m.id, desde, hasta: actual, tipo: 'forzado' }] };
  log(c, `${m.nombre} ${p.sentido === 'alejar' ? 'huye' : 'se acerca'} ${pasos} ${pasos === 1 ? 'casilla' : 'casillas'} (${actual.x + 1}, ${actual.y + 1}).`);
  aplicarTerreno(c, m, rng);
}
function iniciarInterno(c: Combate, rng: RNG) {
  if (c.fase !== "preparacion") throw Error("El combate ya empezó.");
  const n = copia(c),
    primero = orden(n).find(combatienteActivo);
  if (!primero) throw Error("Añade personajes en pie.");
  const espacios=posicionesTablero(n);
  if(n.miembros.some(m=>!espacios[m.id]))throw Error("No hay espacio para todas las fichas en el mapa.");
  n.fase = "en_curso";
  for (const m of n.miembros) emitirMotor(n, 'inicio_combate', m, m, m, rng);
  for (const m of n.miembros) eventoRecurso(n, m, 'inicio_combate');
  for (const m of n.miembros) if (combatienteActivo(m)) mantenerVisiones(n, m);
  const vivo = orden(n).find(combatienteActivo);
  if (!vivo) { cerrarEncuentro(n,'Sin combatientes activos',null); return n; }
  entrar(n, vivo, rng);
  return n;
}
// En cola solo durante la resolución. Nunca copiamos una animación del turno anterior.
const activacionesPendientes=new WeakMap<Combate,AparicionVisual[]>();
function siguienteInterno(c: Combate, rng: RNG) {
  if (c.fase !== "en_curso") throw Error("Inicia el combate.");
  const n = copia(c),
    a = n.miembros.find((m) => m.id === n.actual);
  const pendientes=activacionesPendientes.get(c);if(pendientes)activacionesPendientes.set(n,pendientes);
  delete n.resultado;
  if (a && combatienteActivo(a))
    dispararReacciones(n, n.miembros.filter(w=>w.id!==a.id&&w.bando!==a.bando), "fin_de_turno", rng, {cerca:a, victima:a, hasta:()=>a.vida<=0});
  if (a) {
    if(a.voz_artefacto?.estado==='activa'){const v=avanzarVoz(a.voz_artefacto);if(v)a.voz_artefacto=v;else{delete a.voz_artefacto;log(n,`${a.nombre}: la voz calla.`);}}
    if(a.transformacion&&a.turnos>(a.transformacion.creado_turno??-1)){const actualizado=avanzarTurnoTransformacion(a);Object.assign(a,actualizado);if(!a.transformacion)log(n,`${a.nombre}: termina su transformación.`);}
    emitirMotor(n, 'fin_turno', a, a, a, rng);
    periodicos(n, a, 'fin', rng);
    eventoRecurso(n, a, 'fin_turno');
    caducarMotor(n,a,rng);
    if (
      (estadisticas(a).fatiga || 0) > 0 &&
      a.fatiga >= (estadisticas(a).fatiga || 0)
    )
      a.agotado = true;
    if (!a.agotado && !a.uso_fatiga && a.fatiga > 0) {
      a.fatiga = Math.max(0, a.fatiga - 1);
      log(n, `${a.nombre} recupera 1 Fatiga.`);
    }
    if (a.arma && a.arma.creada < a.turnos) {
      a.arma.restantes--;
      if (a.arma.restantes <= 0) {
        log(
          n,
          `${a.nombre}: ${a.arma.nombre} desaparece; se restaura su equipo.`,
        );
        delete a.arma;
      }
    }
    a.estados = a.estados.filter((e) => {
      if (e.restantes > 0 && !e.inicio && e.creado < a.turnos) {
        e.restantes--;
        return e.restantes > 0;
      }
      return true;
    });
    normalizar(a);
    if(a.invocacion){a.invocacion.restantes--;if(a.invocacion.restantes<=0){a.vida=0;log(n,`${a.nombre}: termina su invocación.`);}}
  }
  // Una solicitud de invocación no sobrevive al turno en que se pidió.
  if(n.solicitud_invocacion){const sol=n.solicitud_invocacion;delete n.solicitud_invocacion;n.invocacion_rechazada={id:sol.id,actor:sol.actor,motivo:'Terminó el turno antes de validar la invocación.'};}
  const lista = orden(n),
    idx = lista.findIndex((m) => m.id === n.actual);
  for (let p = 1; p <= lista.length; p++) {
    const i = (Math.max(0, idx) + p) % lista.length;
    if (i === 0) n.ronda++;
    if (combatienteActivo(lista[i])) {
      entrar(n, lista[i], rng);
      if (combatienteActivo(lista[i])) {retirarInvocaciones(n);return n;}
    }
  }
  cerrarEncuentro(n,'Sin combatientes activos',null);
  return n;
}
/** `autor`: a quién se acreditan derrotas y contribución; por defecto, quien tiene el turno.
 *  Una acción legendaria fuera de turno pasa a su dueño. */
function registrar(c: Combate, fn: () => Combate, rng:RNG=dadoSeguro, autor:string|null=c.actual) {
  if(c.reaccion_pendiente)throw Error('Hay una reacción pendiente de respuesta.');
  const {historial:_historial,...sinHistorial}=c;
  const previo = copia(sinHistorial) as Combate;
  let n = fn();
  for(const m of n.miembros)delete m.reduccion_reaccion;
  if(c.fase==='en_curso'){
    for(const m of n.miembros){
      const anterior=c.miembros.find(x=>x.id===m.id);
      if(anterior&&anterior.vida>0&&m.vida<=0&&!m.invocacion){
        const id=`derrota:${m.id}`;
        if(!(n.eventos||[]).some(e=>e.id===id))(n.eventos||=[]).push({id,tipo:'enemigo_derrotado',actor:autor||undefined,objetivo:m.id,ronda:n.ronda});
      }
    }
    const a=n.miembros.find(m=>m.id===autor);
    if(a)a.contribucion=(a.contribucion||0)+n.miembros.reduce((t,m)=>{const antes=c.miembros.find(v=>v.id===m.id);return t+(antes?Math.max(0,m.bando!==a.bando?antes.vida-m.vida:m.vida-antes.vida):0);},0);
  }
  if(n.fase==='en_curso')desvanecerHuerfanas(n);
  evaluarCierre(n);
  if(n.fase==='en_curso'&&n.actual&&!n.miembros.some(m=>m.id===n.actual&&combatienteActivo(m))){n=siguienteInterno(n,rng);evaluarCierre(n);}
  if(n.fase==='en_curso')retirarInvocaciones(n);
  n.historial = n.fase==='finalizado' ? [] : [...(c.historial || []), previo].slice(-10);
  return registrarCambiosVida(c,n);
}
export function iniciar(c: Combate, rng: RNG = dadoSeguro) {
  return registrar(c, () => iniciarInterno(c, rng),rng);
}
export function siguiente(c: Combate, rng: RNG = dadoSeguro) {
  return registrar(c, () => siguienteInterno(c, rng),rng);
}
export function deshacer(c: Combate) {
  const h = [...(c.historial || [])],
    previo = h.pop();
  if(c.fase==='finalizado')throw Error("Un encuentro terminado no se puede deshacer.");
  if (c.progreso_confirmado) throw Error("El progreso ya fue aplicado a las fichas.");
  if (!previo) throw Error("No hay una acción anterior.");
  return registrarCambiosVida(c,{ ...copia(previo), evento_visual:undefined, historial: h });
}
export function situacionCombatiente(m:Combatiente):Situacion{return m.situacion&&m.situacion!=='activo'?m.situacion:m.vida<=0?'inconsciente':'activo';}
export function combatienteActivo(m:Combatiente){return situacionCombatiente(m)==='activo'&&!m.neutral;}
function cerrarEncuentro(n:Combate,motivo:string,ganador:Bando|null){
 if(n.cierre)return;
 const originales=copia(n.miembros);
 n.fase='finalizado';n.actual=null;limpiarFinal(n);
 if(motivo==='Bando sin combatientes activos'||motivo==='Sin combatientes activos'){
  const activos=new Set(n.miembros.filter(combatienteActivo).map(m=>m.bando));ganador=activos.size===1?activos.values().next().value??null:null;
 }
 n.cierre={id:crypto.randomUUID(),motivo,ganador,ronda:n.ronda,participantes:originales.map(antes=>{const m=n.miembros.find(m=>m.id===antes.id)||antes;return {id:m.id,nombre:m.nombre,bando:m.bando,personaje_id:m.personaje_id,situacion:situacionCombatiente(m),invocado:!!antes.invocacion};})};
 (n.eventos||=[]).push({id:n.cierre.id,tipo:'encuentro_finalizado',ronda:n.ronda});
}
function evaluarCierre(n:Combate){
 if(n.cierre||n.fase==='preparacion')return;
 if(n.fase==='finalizado'){cerrarEncuentro(n,'Sin combatientes activos',null);return;}
 if(n.politica?.automatico===false)return;
 const bandos=new Set(n.miembros.filter(m=>!m.neutral&&!m.invocacion).map(m=>m.bando));
 if(bandos.size<2)return;
 const activos=new Set(n.miembros.filter(combatienteActivo).map(m=>m.bando));
 if(activos.size<=1)cerrarEncuentro(n,'Bando sin combatientes activos',activos.values().next().value??null);
 else if(n.politica?.limite_rondas&&n.ronda>n.politica.limite_rondas)cerrarEncuentro(n,'Límite de rondas',null);
}
export function resolverObjetivo(c:Combate,ganador:Bando|null,motivo='Objetivo cumplido'){
 if(c.fase!=='en_curso')throw Error('Inicia el encuentro.');
 return registrar(c,()=>{const n=copia(c);cerrarEncuentro(n,motivo,ganador);return n;});
}
export function cambiarSituacion(c:Combate,id:string,situacion:Situacion){
 if(c.fase!=='en_curso')throw Error('El encuentro no está en curso.');
 if(!['activo','inconsciente','muerto','retirado','rendido','capturado'].includes(situacion))throw Error('Situación inválida.');
 return registrar(c,()=>{const n=copia(c),m=n.miembros.find(m=>m.id===id);if(!m)throw Error('Participante no encontrado.');m.situacion=situacion;if(situacion==='muerto')m.vida=0;log(n,`${m.nombre}: ${situacion}.`);return n;});
}
function limpiarFinal(n:Combate){n.miembros=n.miembros.filter(m=>!m.invocacion);for(const m of n.miembros){if(m.transformacion)Object.assign(m,terminarTransformacion(m));m.transformaciones_usadas=[];delete m.vidas_formas;emitirMotor(n,'fin_combate',m,m,m,dadoSeguro);for(const d of recursosDe(m)){if(d.recuperacion==='vaciar')m.recursos_especiales={...m.recursos_especiales,[d.id]:0};else if(d.recuperacion!=='conservar'&&m.recursos_especiales)delete m.recursos_especiales[d.id];}m.estados=[];delete m.percepcion_alterada;if(m.motor){m.motor.modificadores=[];m.motor.habilidades=[];}delete m.arma;normalizar(m);}log(n,'Combate terminado: los estados temporales y armas efímeras desaparecen.');}
export function finalizar(c:Combate){if(c.fase==='finalizado')return copia(c);return registrar(c,()=>{const n=copia(c);cerrarEncuentro(n,'Finalización manual del GM',null);return n;});}
export function descansar(c: Combate) {
  if (c.fase === "en_curso")
    throw Error("El descanso requiere terminar el combate.");
  return registrar(c, () => {
    const n = copia(c);
    for (const m of n.miembros) {
      m.fatiga = 0;
      m.agotado = false;
    }
    log(n, "Descanso: Fatiga y agotamiento recuperados.");
    return n;
  });
}
export function configurarParticipante(
  c: Combate,
  id: string,
  patch: { grupo_cercania?: string; corrupto?: boolean; salvacion?: number },
) {
  return registrar(c, () => {
    const n = copia(c),
      m = n.miembros.find((m) => m.id === id);
    if (!m) throw Error("Personaje inexistente.");
    if (patch.salvacion !== undefined) {
      if (!Number.isFinite(patch.salvacion) || Math.abs(patch.salvacion) > 1000)
        throw Error("Bono de salvación inválido.");
      m.stats.salvacion = patch.salvacion;
    }
    if (patch.grupo_cercania !== undefined)
      m.grupo_cercania = patch.grupo_cercania;
    if (patch.corrupto !== undefined) m.corrupto = patch.corrupto;
    return n;
  });
}
/** Legacy attacks receive finite reach even inside saved encounter snapshots. Explicit ranges win. */
export function conAlcance(e:Efecto, contexto=''):Efecto {
  if(e.tablero || !['dano','estado'].includes(e.efecto))return e;
  const texto=`${contexto} ${e.nombre||''} ${e.arma_nombre||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let alcance=1;
  if(/\b(arco|ballesta|flecha|disparo)\b/.test(texto))alcance=8;
  else if(/\b(lanza|alabarda|pica)\b/.test(texto))alcance=2;
  else if(!/desarmado|puno|punetazo|patada|mordisco|golpe|filo|espada|daga|martillo|hacha|mazo|corte/.test(texto) && (e.naturaleza==='magica'||(e.coste_ph||0)>0||/fuego|hielo|frio|plasma|energia|electri|arcano|magico/.test((e.tipo_dano||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())||/proyectil|rayo|bola de|llamas|cadenas/.test(texto)))alcance=6;
  return {...e,tablero:{alcance,forma:'individual',tamano:0,afecta:'todos'}};
}
/** Conceptos básicos vigentes. Sustitución por id: personaje > objeto equipado > habilidad (incluidas las heredadas). */
export function conceptosDe(m: Combatiente): { desarmado: ConceptoDesarmado; guardia: ConceptoGuardia } {
  const r: { desarmado: ConceptoDesarmado; guardia: ConceptoGuardia } = { desarmado: DESARMADO_BASE, guardia: GUARDIA_BASE };
  const fuentes = [...(m.configuracion.conceptos || []), ...Object.values(piezas(m)).flatMap(p => (p.efectos || []).flatMap(e => e.concepto ? [e.concepto] : [])),
    ...habilidadesDe(m).filter(h => !requisitosFuente(m, h).length).flatMap(h => (h.efectos || []).flatMap(e => e.concepto ? [e.concepto] : []))];
  for (const id of ['desarmado', 'guardia'] as const) { const c = fuentes.find(x => x.id === id); if (c) (r as Record<string, unknown>)[id] = c; }
  return r;
}
/** Efecto del desarmado del combatiente. El concepto por defecto devuelve exactamente el ataque antiguo. */
function desarmadoDe(m: Combatiente): Efecto {
  const c = conceptosDe(m).desarmado;
  if (c === DESARMADO_BASE) return basico();
  return { ...basico(), nombre: c.nombre, cantidad: c.dano.cantidad, caras: c.dano.caras, modificador: c.dano.modificador, tipo_dano: c.dano.tipo_dano,
    ...(c.dano.elemento && c.dano.elemento !== 'ninguno' ? { elemento: c.dano.elemento } : {}), ...(c.dano.naturaleza ? { naturaleza: c.dano.naturaleza } : {}),
    coste_fatiga: c.coste.fatiga || undefined, esqueleto: c.animacion, ...(c.estado_impacto ? { estado_impacto: c.estado_impacto } : {}),
    tablero: { alcance: c.alcance, forma: 'individual', tamano: 0, afecta: 'todos' } };
}
/** Definición visual del esqueleto (propio del GM o base) con los ajustes de longitud y color del arma. */
export function esqueletoVisual(e: Efecto | undefined): Esqueleto | undefined {
  if (!e || (!e.esqueleto_def && !e.esqueleto_ajustes)) return undefined;
  const base = e.esqueleto_def || esqueletoBase(e.esqueleto);
  if (!base) return undefined;
  return { ...base, longitud_relativa: e.esqueleto_ajustes?.longitud ?? base.longitud_relativa, color: e.esqueleto_ajustes?.color ?? base.color };
}
/** Esqueleto de la animación de un ataque: el asignado al arma o al concepto; el nombre solo para datos antiguos. */
export function esqueletoDeAccion(m: Combatiente, accion: Pick<Accion, 'nombre' | 'efecto'> | undefined, accionId: string): string | undefined {
  const e = accion?.efecto;
  if (e?.efecto !== 'dano') return undefined;
  if (e.esqueleto_def) return e.esqueleto_def.id;
  if (e.esqueleto) return e.esqueleto;
  if (accionId === 'ataque' && m.arma?.efecto.esqueleto) return m.arma.efecto.esqueleto;
  return tipoAnimacionArma({ accionId, nombreAccion: accion?.nombre, nombreEfecto: e.nombre, nombreArma: m.arma?.nombre, nombreArmaEfecto: e.arma_nombre, naturaleza: e.naturaleza, costePh: e.coste_ph });
}
function basico(): Efecto {
  return {
    id: "basico",
    nombre: "Ataque desarmado",
    efecto: "dano",
    cantidad: 1,
    caras: 4,
    modificador: 0,
    tipo_dano: "físico",
    estado: "",
    duracion: 0,
    coste_ph: 0,
  };
}
export function acciones(m: Combatiente) {
  const lista: Omit<Accion,'presupuesto'>[] = [];
  if(m.transformacion&&!m.transformacion.descontrolada)lista.push({id:'volver_forma',nombre:'Volver a la forma original',efecto:{...basico(),efecto:'transformacion'},enfriamiento:0});
  if (m.arma)
    lista.push({
      id: "ataque",
      nombre: `Atacar con ${m.arma.nombre}`,
      efecto: {
        ...m.arma.efecto,
        efecto: "dano",
        coste_ph: 0,
        coste_fatiga: 0,
        duracion: 0,
      },
      enfriamiento: 0,
    });
  else {
    const p = ['mano_der','mano_izq'].map(slot=>piezas(m)[slot]).find(p=>p?.efectos?.some(e=>e.efecto==='dano'));
    if (p) lista.push({id:'ataque',nombre:`Atacar con ${p.nombre}`,efecto:p.efectos!.find(e=>e.efecto==='dano')!,enfriamiento:0,ilustracion:ilustracionFuente(p)});
    else if (manosLibres(m)>0||conceptosDe(m).desarmado.requiere_mano===false) lista.push({id:'ataque',nombre:conceptosDe(m).desarmado.nombre,efecto:desarmadoDe(m),enfriamiento:0});
  }
  if ((m.arma || lista.some(a=>a.id==='ataque'&&a.efecto.id!=='basico')) && (manosLibres(m)>0||conceptosDe(m).desarmado.requiere_mano===false))
    lista.push({id:'desarmado',nombre:`${conceptosDe(m).desarmado.nombre} · ${conceptosDe(m).desarmado.requiere_mano===false?'arma natural':'mano libre'}`,efecto:desarmadoDe(m),enfriamiento:0});
  for (const h of habilidadesDe(m).filter(h=>!requisitosFuente(m,h).length))
    {
    const config=h.configuracion_invocacion;
    if(config)lista.push({id:`invocar:${h.id}`,nombre:`Invocar · ${h.nombre}`,invocacion:h,ilustracion:ilustracionFuente(h),enfriamiento:0,
      efecto:{...basico(),efecto:'invocar',cantidad:0,coste_ph:config.costePh??0,coste_fatiga:config.costeFatiga??0}});
    for (const e of h.efectos || [])
      lista.push({
        id: `hab:${h.id}:${e.id}`,
        nombre: h.id===FUENTE_PROPIAS?e.nombre:`${h.nombre} · ${e.nombre}`,
        ilustracion: h.id===FUENTE_PROPIAS?undefined:ilustracionFuente(h),
        efecto: e,
        enfriamiento: Math.max(
          0,
          h.stats.enfriamiento || h.stats.cooldown || 0,
        ),
      });
    }
  for (const [slot, p] of Object.entries(piezas(m)).filter(([,p])=>!requisitosFuente(m,p).length))
    for (const e of p.efectos || [])
      lista.push({
        id: `equipo:${slot}:${e.id}`,
        nombre: `${p.nombre} · ${e.nombre}`,
        ilustracion: ilustracionFuente(p),
        efecto: e,
        enfriamiento: 0,
      });
  for (const h of m.motor?.habilidades || []) lista.push({id:`motor-hab:${h.id}`,nombre:h.accion.nombre,efecto:h.accion,enfriamiento:0});
  for (const {clave, regla, fuente} of reglasMotor(m)) if (regla.evento === 'usar') lista.push({id:`regla:${clave}`,nombre:regla.nombre,regla_detalle:regla,ilustracion:fuente&&ilustracionFuente(fuente),bloqueada:regla.usos>0&&(m.motor?.usos[clave]||0)>=regla.usos?'Sin usos restantes.':undefined,efecto:{...basico(),efecto:'estado',estado:regla.nombre,cantidad:0,coste_ph:regla.coste_ph,coste_fatiga:regla.coste_fatiga},enfriamiento:regla.enfriamiento,regla:clave});
  const rasgos=rasgosDe(m);
  const definiciones=lista.flatMap(a=>a.efecto.transformacion?[a.efecto.transformacion]:[]);
  const exclusivos=new Set(definiciones.flatMap(d=>d.etapas.flatMap(e=>e.habilidades||[])));
  const permitidos=new Set(definiciones.find(d=>d.id===m.transformacion?.definicion_id)?.etapas.find(e=>e.id===m.transformacion?.etapa_id)?.habilidades||[]);
  // Un ojo permanente sin dados propios es una pasiva: no aparece como acción.
  // Solo habilidad y equipo eligen presupuesto; un ataque múltiple siempre es la acción principal.
  return lista.map((a):Accion=>({...a,presupuesto:/^(hab|equipo):/.test(a.id)&&!disparosRafaga(a.efecto)?tipoPresupuesto(a.efecto):'principal'})).filter(a=>!a.efecto.solo_pasivo).filter(a=>!reaccionDe(normalizarReaccion(a.efecto))).filter(a=>!(a.efecto.vision?.modo==='permanente'&&!(a.efecto.cantidad>0))).filter(a=>!exclusivos.has(a.efecto.id)||permitidos.has(a.efecto.id)).filter(a=>!a.efecto.requisito_forma || (estadisticas(m)[a.efecto.requisito_forma.atributo]||0)>=a.efecto.requisito_forma.minimo).flatMap((a):Accion|Accion[]=>{
   const d=a.efecto.transformacion;
   if(d?.transiciones?.length)return opcionesDeForma(m,a,d);
   if(d&&m.transformacion?.definicion_id===d.id){const i=d.etapas.findIndex(e=>e.id===m.transformacion?.etapa_id);return {...a,nombre:i<d.etapas.length-1?'Avanzar a '+d.etapas[i+1].nombre:a.nombre,efecto:{...a.efecto,coste_ph:0,coste_fatiga:0},bloqueada:i===d.etapas.length-1?'Ya está en la última etapa.':d.etapas[i+1]?.descontrolada?'Esta fase requiere fallar la salvación de posesión.':undefined};}
   if(d&&(m.transformacion||m.transformaciones_usadas?.includes(d.id)))return {...a,bloqueada:m.transformacion?'Otra transformación está activa.':'Ya utilizada en este encuentro.'};
   const efecto=m.transformacion?.definicion_id==='limitless' && a.efecto.ley_limitless
     ? {...a.efecto,coste_ph:0} : a.efecto;
   if(vozNiega(m.voz_artefacto,a))return {...a,efecto:conAlcance(efecto,a.nombre),bloqueada:'La voz del artefacto te lo niega.'};
   const conTablero=conAlcance(efecto,a.nombre),pots=rasgos.length&&efecto.efecto==='dano'?potenciadoresDisponibles(m,conTablero,rasgos):[];
   return {...a,efecto:conTablero,...(pots.length?{potenciadores:pots}:{})};
  });
}
/** Transformación por grafo: una acción por cada forma a la que se puede ir
 * desde la actual. La vuelta a la realidad es «volver_forma». Cambiar entre formas
 * solo cuesta lo que marque su transición; entrar desde la realidad, además, el coste
 * de la acción. Una cadena («uno») sigue siendo de un uso por encuentro; el cambio
 * libre («ambos») desde la realidad se puede repetir. */
function opcionesDeForma(m:Combatiente,a:Accion,d:DefinicionTransformacion):Accion[]{
  const activa=m.transformacion;
  if(activa&&activa.definicion_id!==d.id)return [{...a,bloqueada:'Otra transformación está activa.'}];
  const g=migrarTransformacion(d),desde=activa?activa.etapa_id:ID_REALIDAD;
  // Solo formas guardadas: datos antiguos con ids repetidos se ven con sufijo en el grafo, pero no existen en el motor.
  const destinos=formasAlcanzables(g,desde).filter(id=>id!==ID_REALIDAD&&d.etapas.some(e=>e.id===id));
  if(!destinos.length)return activa?[]:[{...a,bloqueada:'No hay ninguna forma conectada a la realidad.'}];
  return destinos.map(id=>{
    const f=g.formas.find(x=>x.id===id)!,t=transicionEntre(g,desde,id);
    const ph=(activa?0:a.efecto.coste_ph||0)+Math.max(0,t?.coste?.ph||0),fatiga=(activa?0:a.efecto.coste_fatiga||0)+Math.max(0,t?.coste?.fatiga||0);
    const bloqueada=f.control?'Esta forma solo se manifiesta al perder el control.'
      :d.tipo==='forma'&&m.vidas_formas?.[claveVidaForma(d.id,id)]===0?'Forma rota: no puede volver a ella en este encuentro.'
      :(m.cooldowns?.[a.id]||0)>0?'Habilidad en enfriamiento.'
      :!activa&&t?.sentido==='uno'&&m.transformaciones_usadas?.includes(usoCadena(d.id,id))?'Ya utilizada en este encuentro.':undefined;
    return {...a,id:`${a.id}>${id}`,nombre:activa?`Cambiar a ${f.nombre}`:`${a.nombre} · ${f.nombre}`,forma_destino:id,
      efecto:{...a.efecto,coste_ph:ph,coste_fatiga:fatiga},...(bloqueada?{bloqueada}:{})};
  });
}
const claveVidaForma=(defId:string,etapa:string)=>`${defId}:${etapa}`;
/** Marca de uso de una cadena de un grafo: por transformación y forma de entrada. */
const usoCadena=(defId:string,destino:string)=>`${defId}>${destino}`;
/** En una transformación por grafo de tipo forma, cada forma tiene su propia barra de vida
 * durante el encuentro: al salir de ella se guarda lo que le quedaba (0 si se rompió). */
function guardarVidaForma(m:Combatiente,vida=m.vida){
  const activa=m.transformacion;
  if(!activa||activa.tipo!=='forma'||!definicionEnCombate(m)?.transiciones?.length)return;
  m.vidas_formas={...m.vidas_formas,[claveVidaForma(activa.definicion_id,activa.etapa_id)]:Math.max(0,vida)};
}
/** Al entrar en una forma ya usada, recupera la vida que tenía; una forma nueva empieza llena. */
function restaurarVidaForma(m:Combatiente,d:DefinicionTransformacion,destino:string){
  const activa=m.transformacion;if(!activa||activa.tipo!=='forma')return;
  const guardada=m.vidas_formas?.[claveVidaForma(d.id,destino)];
  const max=Math.max(1,Math.trunc(m.stats.vida??m.stats.hp??1));
  m.vida=guardada===undefined?max:Math.min(max,guardada);
  activa.vida_forma=m.vida;
}
/** Coste de volver a la realidad: solo el que marque una transición directa. */
function costeVuelta(m:Combatiente){
  const d=definicionEnCombate(m);
  if(!d?.transiciones?.length||!m.transformacion)return {ph:0,fatiga:0};
  const t=transicionEntre(migrarTransformacion(d),m.transformacion.etapa_id,ID_REALIDAD);
  return {ph:Math.max(0,t?.coste?.ph||0),fatiga:Math.max(0,t?.coste?.fatiga||0)};
}
/** El GM devuelve a un personaje a su cuerpo original, incluso desde una forma
 * que ha tomado el control. No gasta la acción ni cuesta recursos. */
export function volverALaRealidadGM(c:Combate,actorId:string){
  return registrar(c,()=>{
    const n=copia(c),a=n.miembros.find(m=>m.id===actorId);
    if(!a)throw Error('El personaje no está en el combate.');
    if(!a.transformacion)throw Error('No hay transformación activa.');
    guardarVidaForma(a);Object.assign(a,terminarTransformacion(a));normalizar(a);
    log(n,`El GM devuelve a ${a.nombre} a su cuerpo original.`);
    return n;
  });
}
/** Encuentra una casilla libre desde la que un ataque con dash/salto/teletransporte alcance al blanco.
 * El dash recorre un camino ortogonal sin atravesar muros ni criaturas; los saltos
 * ignoran criaturas intermedias pero no muros, y el teletransporte solo valida la llegada.
 * El movimiento es parte de la acción y nunca consume los puntos de movimiento normal.
 */
/** IA simple y determinista para la criatura poseída. Nunca cambia su bando:
 * puede atacar aliados y enemigos indistintamente sin regalar la victoria al
 * bando original. El servidor ejecuta la acción, no el cliente del jugador. */
/** Una pausa de reacción (motor o arena) nunca se trata como un intento fallido. */
function esPausaReaccion(e:unknown){return !(e instanceof Error)||(e as {pausa_reaccion?:boolean}).pausa_reaccion===true;}
function resolverTurnoDescontrolado(c:Combate,actorId:string,rng:RNG){
 let actor=c.miembros.find(m=>m.id===actorId);
 if(!actor||!actor.transformacion?.descontrolada||!combatienteActivo(actor)||actor.accion_usada)return;
 const otros=()=>c.miembros.filter(m=>m.id!==actorId&&combatienteActivo(m)).sort((u,v)=>{
  const p=posicionesTablero(c),origen=p[actorId];
  return distanciaCasillas(origen,p[u.id])-distanciaCasillas(origen,p[v.id])||u.id.localeCompare(v.id);
 });
 const intentarAtacar=()=>{
  const posibilidades=acciones(actor!).filter(ac=>ac.efecto.efecto==='dano'&&!ac.bloqueada&&(actor!.cooldowns[ac.id]||0)<=0&&phDisponibles(actor!)>=(ac.efecto.coste_ph||0)&&!((ac.efecto.coste_fatiga||0)>0&&(actor!.agotado||actor!.fatiga+(ac.efecto.coste_fatiga||0)>(estadisticas(actor!).fatiga||0))))
    .sort((u,v)=>Number(v.id.startsWith('hab:'))-Number(u.id.startsWith('hab:'))||(v.efecto.cantidad||0)*(v.efecto.caras||0)-(u.efecto.cantidad||0)*(u.efecto.caras||0));
  for(const t of otros())for(const ac of posibilidades){
   const p=posicionesTablero(c),area=ac.efecto.tablero;
   if(!area)continue;
   if(area.forma==='personalizada'){
    const celdas=new Set(areaDesdeFicha(actor!,p[actorId],p[t.id],area,dimensionesTablero(c),c.mapa).map(claveHuella));
    if(!casillasHuella(t,p[t.id]).some(q=>celdas.has(claveHuella(q))))continue;
   }else if(!alcanceVisibleEntreFichas(actor!,p[actorId],t,p[t.id],area.origen_area==='lanzador'?area.tamano:area.alcance,c.mapa))continue;
   try{
    if(area.movimiento_lanzador&&!['aterrizaje','recorrido'].includes(area.origen_area||''))destinoAtaqueMovil(c,actor!,t,area.movimiento_lanzador);
    const n=actuarInterno(c,actorId,ac.id,t.id,rng,false,undefined,true);
    Object.assign(c,n);
    log(c,`${actor!.nombre} poseído ataca sin distinguir aliados de enemigos: ${t.nombre}.`);
    return true;
   }catch(e){if(esPausaReaccion(e))throw e;continue;}
  }
  return false;
 };
 if(intentarAtacar())return;
 // Si no llega con ninguna habilidad, se aproxima al personaje más cercano
 // utilizando las mismas reglas de movimiento y terreno que el resto.
 const objetivo=otros()[0];
 if(objetivo){
  const p=posicionesTablero(c),origen=p[actorId],blanco=p[objetivo.id];
  const candidatos=casillasAlcanzables(c,actorId);
  const mejor=Object.entries(candidatos).map(([clave,coste])=>{
    const [x,y]=clave.split(',').map(Number),p={x,y};
    return {p,coste,d:distanciaEntreFichas(actor!,p,objetivo,blanco)};
  }).filter(x=>x.d<distanciaEntreFichas(actor!,origen,objetivo,blanco))
    .sort((a,b)=>a.d-b.d||a.coste-b.coste||a.p.y-b.p.y||a.p.x-b.p.x)[0];
  if(mejor){
   for(const miembro of c.miembros)miembro.posicion=p[miembro.id];
   actor!.posicion={...mejor.p};
   actor!.movimiento={turno:actor!.turnos,gastado:(actor!.movimiento?.turno===actor!.turnos?actor!.movimiento.gastado:0)+mejor.coste};
   aplicarTerreno(c,actor!,rng);
   log(c,`${actor!.nombre} avanza automáticamente hacia ${objetivo.nombre}.`);
   if(actor!.vida>0&&intentarAtacar())return;
  }
 }
 actor=c.miembros.find(m=>m.id===actorId);
 if(actor){actor.accion_usada=true;log(c,`${actor.nombre} descontrolado no encuentra un objetivo al que golpear este turno.`);}
}
function destinoAtaqueMovil(c:Combate,a:Combatiente,t:Combatiente,m:NonNullable<AlcanceHabilidad['movimiento_lanzador']>):Posicion {
 if(m.tipo==='carrera')throw Error('Una carrera debe utilizar el motor de trayectorias.');
 const posiciones=posicionesTablero(c),origen=posiciones[a.id],blanco=posiciones[t.id],dim=dimensionesTablero(c);
 if(!origen||!blanco)throw Error('La posición del atacante o del objetivo no existe.');
 if(distanciaEntreFichas(a,origen,t,blanco)<=m.alcance_golpe)return {...origen};
 const ocupadas=new Set(casillasOtras(c.miembros,posiciones,a.id).map(claveHuella));
 const libres=(p:Posicion)=>cabeHuella(huellaReserva(a),p,dim,q=>ocupadas.has(claveHuella(q))||c.mapa?.celdas[claveHuella(q)]==='muro');
 const distancias=new Map<string,number>([[origen.x+','+origen.y,0]]);
 if(m.tipo==='dash'){
  // BFS de costes: terreno difícil cuesta dos casillas.
  const pendientes=[{p:origen,coste:0}];
  while(pendientes.length){
   pendientes.sort((x,y)=>x.coste-y.coste);
   const {p,coste}=pendientes.shift()!;
   if(coste!==distancias.get(p.x+','+p.y))continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const v={x:p.x+dx,y:p.y+dy},k=v.x+','+v.y;
    const nuevo=coste+(c.mapa?.celdas[k]==='dificil'?2:1);
    if(!libres(v)||nuevo>m.casillas||(distancias.has(k)&&distancias.get(k)!<=nuevo))continue;
    distancias.set(k,nuevo);pendientes.push({p:v,coste:nuevo});
   }
  }
 }
 const candidatos:{p:Posicion;coste:number}[]=[];
 for(let y=0;y<dim.filas;y++)for(let x=0;x<dim.columnas;x++){
  const p={x,y};
  if(!libres(p)||distanciaEntreFichas(a,p,t,blanco)>m.alcance_golpe)continue;
  const distancia=distanciaCasillas(origen,p);
  const coste=m.tipo==='dash'?distancias.get(p.x+','+p.y):distancia;
  if(coste===undefined||coste>m.casillas||m.tipo==='salto'&&!lineaVisible(origen,p,c.mapa))continue;
  candidatos.push({p,coste});
 }
 candidatos.sort((u,v)=>u.coste-v.coste||distanciaCasillas(u.p,blanco)-distanciaCasillas(v.p,blanco)||u.p.y-v.p.y||u.p.x-v.p.x);
 if(!candidatos.length)throw Error('No hay una casilla libre y alcanzable para ejecutar el movimiento del ataque.');
 return candidatos[0].p;
}

/** Calcula una embestida de recorrido o un aterrizaje en una casilla libre antes de gastar la acción. */
function planearAtaqueDeArea(c:Combate,a:Combatiente,punto:Posicion,m:NonNullable<AlcanceHabilidad['movimiento_lanzador']>):{destino:Posicion;trayecto:Posicion[]}{
 const posiciones=posicionesTablero(c),origen=posiciones[a.id],dim=dimensionesTablero(c);
 if(!origen)throw Error('El atacante no tiene posición.');
 const clave=(p:Posicion)=>p.x+','+p.y;
 const ocupados=new Set(casillasOtras(c.miembros,posiciones,a.id).map(claveHuella));
 const suelo=(p:Posicion)=>cabeHuella(huellaReserva(a),p,dim,q=>c.mapa?.celdas[clave(q)]==='muro');
 const libre=(p:Posicion)=>cabeHuella(huellaReserva(a),p,dim,q=>ocupados.has(clave(q))||c.mapa?.celdas[clave(q)]==='muro');
 if(m.tipo==='carrera'){
  const dx=punto.x-origen.x,dy=punto.y-origen.y,pasos=Math.max(Math.abs(dx),Math.abs(dy));
  if(!pasos)throw Error('Elige hacia dónde correr.');
  const trayecto:Posicion[]=[];let anterior=origen,coste=0,destino=origen;
  for(let i=1;i<=Math.max(pasos,m.casillas);i++){
   const p={x:Math.round(origen.x+dx*i/pasos),y:Math.round(origen.y+dy*i/pasos)};
   if(!suelo(p)||casillasHuella(huellaReserva(a),anterior).some(q=>!lineaVisible(q,{x:q.x+p.x-anterior.x,y:q.y+p.y-anterior.y},c.mapa)))break;
   const nuevo=coste+distanciaCasillas(anterior,p);
   if(nuevo>m.casillas)break;
   trayecto.push(p);coste=nuevo;anterior=p;
   if(libre(p))destino=p;
  }
  if(!trayecto.length)throw Error('Un muro bloquea la carrera.');
  if(!trayecto.some(p=>p.x===punto.x&&p.y===punto.y)&&distanciaCasillas(anterior,punto)>m.alcance_golpe)throw Error('La carrera no llega al objetivo.');
  return {destino:{...destino},trayecto};
 }
 const distancias=new Map<string,number>([[clave(origen),0]]);
 if(m.tipo==='dash'){
  const pendientes=[{p:origen,coste:0}];
  while(pendientes.length){
   pendientes.sort((u,v)=>u.coste-v.coste);
   const {p,coste}=pendientes.shift()!;
   if(coste!==distancias.get(clave(p)))continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const v={x:p.x+dx,y:p.y+dy},k=clave(v);
    const nuevo=coste+(c.mapa?.celdas[k]==='dificil'?2:1);
    if(!libre(v)||nuevo>m.casillas||(distancias.has(k)&&distancias.get(k)!<=nuevo))continue;
    distancias.set(k,nuevo);pendientes.push({p:v,coste:nuevo});
   }
  }
 }
 const opciones:{p:Posicion;coste:number}[]=[];
 for(let y=Math.max(0,origen.y-m.casillas);y<=Math.min(dim.filas-1,origen.y+m.casillas);y++)
 for(let x=Math.max(0,origen.x-m.casillas);x<=Math.min(dim.columnas-1,origen.x+m.casillas);x++){
  const p={x,y};if(!libre(p))continue;
  const costo=m.tipo==='dash'?distancias.get(clave(p)):distanciaCasillas(origen,p);
  if(costo===undefined||costo>m.casillas||m.tipo==='salto'&&!lineaVisible(origen,p,c.mapa))continue;
  opciones.push({p,coste:costo});
 }
 opciones.sort((u,v)=>distanciaCasillas(u.p,punto)-distanciaCasillas(v.p,punto)||u.coste-v.coste||u.p.y-v.p.y||u.p.x-v.p.x);
 const elegido=opciones[0];
 if(!elegido||distanciaCasillas(elegido.p,punto)>1)throw Error('No hay una casilla libre y alcanzable para aterrizar.');
 return {destino:{...elegido.p},trayecto:[{...elegido.p}]};
}
function areaDeRecorrido(trayecto:Posicion[],ancho:number,dim:{columnas:number;filas:number}):Posicion[]{
 const vistas=new Set<string>(),resultado:Posicion[]=[];
 for(const base of trayecto)for(let dx=-ancho;dx<=ancho;dx++)for(let dy=-ancho;dy<=ancho;dy++){
  if(Math.abs(dx)+Math.abs(dy)>ancho)continue;
  const p={x:base.x+dx,y:base.y+dy},k=p.x+','+p.y;
  if(p.x<0||p.y<0||p.x>=dim.columnas||p.y>=dim.filas||vistas.has(k))continue;
  vistas.add(k);resultado.push(p);
 }
 return resultado;
}
/** Presupuesto de acciones por turno alrededor de `actuarBase`.
 *  - Principal: la de siempre. Si el combatiente tiene más de una, al gastarla entera (sin ráfaga pendiente) se anota y,
 *    si le queda otra, `accion_usada` vuelve a `false`. Con una sola no se anota nada: los datos antiguos no cambian.
 *  - Adicional: solo en su turno, antes o después de la principal. Legendaria: dentro o fuera de su turno.
 *    Ninguna de las dos gasta la principal. */
function actuarInterno(
  c: Combate,
  actorId: string,
  accionId: string,
  objetivoId: string,
  rng: RNG,
  forzar: boolean,
  centro?: Posicion,
  autonomo = false,
  potenciadores: EleccionPotenciador[] = [],
) {
  const base=(entrada:Combate,fueraDeTurno=false)=>actuarBase(entrada,actorId,accionId,objetivoId,rng,forzar,centro,autonomo,potenciadores,fueraDeTurno);
  if(accionId.startsWith(PREFIJO_INVOCAR))throw Error('La invocación se elige en su ventana.');
  const actor=c.miembros.find(m=>m.id===actorId);
  // El turno automático de una criatura descontrolada no lleva cuentas de presupuesto.
  if(!actor||autonomo)return base(c);
  const tipo=/^(hab|equipo):/.test(accionId)?acciones(actor).find(v=>v.id===accionId)?.presupuesto||'principal':'principal';
  if(tipo==='principal'){
    if(!actor.accion_usada&&presupuestoRestante(c,actor).principal<=0)throw Error('No le quedan acciones principales este turno.');
    const n=base(c),a=n.miembros.find(m=>m.id===actorId);
    if(a)cerrarPrincipal(n,a);
    return n;
  }
  if(tipo==='adicional'&&(c.fase!=='en_curso'||c.actual!==actorId))throw Error('Solo puede actuar el personaje de turno.');
  if(tipo==='legendaria'&&(c.fase!=='en_curso'||!combatienteActivo(actor)))throw Error(`${actor.nombre} no puede usar acciones legendarias ahora.`);
  const quedan=presupuestoRestante(c,actor)[tipo];
  if(quedan<=0)throw Error(tipo==='adicional'?'No le quedan acciones adicionales este turno.':'No le quedan acciones legendarias esta ronda.');
  // Se ejecuta como si la principal estuviera libre y luego se restaura: ninguna de las dos la gasta.
  const n=base({...c,miembros:c.miembros.map(m=>m.id===actorId?{...m,accion_usada:false}:m)},tipo==='legendaria');
  const a=n.miembros.find(m=>m.id===actorId)!;
  a.accion_usada=actor.accion_usada;
  anotarGasto(n,a,tipo);
  log(n,`${a.nombre} usa una acción ${tipo} (quedan ${quedan-1}).`);
  return n;
}
function actuarBase(
  c: Combate,
  actorId: string,
  accionId: string,
  objetivoId: string,
  rng: RNG,
  forzar: boolean,
  centro: Posicion|undefined,
  autonomo: boolean,
  potenciadores: EleccionPotenciador[],
  fueraDeTurno: boolean,
) {
  const n = copia(c),
    a = n.miembros.find((m) => m.id === actorId);
  delete n.resultado;
  if (n.fase !== "en_curso" || (!fueraDeTurno && n.actual !== actorId) || !a || !combatienteActivo(a))
    throw Error("Solo puede actuar el personaje de turno.");
  if(a.transformacion?.descontrolada&&!autonomo)throw Error('La criatura está fuera de control: su turno es automático.');
  const ojo=accionId.startsWith('hab:')||accionId.startsWith('equipo:')?acciones(a).find(v=>v.id===accionId):undefined;
  if(ojo?.efecto.vision?.modo==='abrir')return abrirOjo(n,a,ojo);
  // Ráfaga a medias: solo se puede seguir disparando (o moverse, que no pasa por aquí).
  const continua=!!a.rafaga&&a.rafaga.restantes>0;
  if(continua&&accionId!==a.rafaga!.accion)throw Error(`Ráfaga en curso (${a.rafaga!.nombre}): dispara de nuevo o muévete.`);
  if(continua&&potenciadores.length)throw Error('Los potenciadores se eligen en el primer disparo.');
  if (a.accion_usada&&!continua) throw Error("Ya utilizó su acción.");
  if (accionId.startsWith('regla:')) {
    const clave = accionId.slice(6), entrada = reglasMotor(a).find(r=>r.clave===clave);
    if (!entrada || entrada.regla.evento !== 'usar') throw Error('La regla activa no existe.');
    const t = n.miembros.find(m=>m.id===objetivoId) || a;
    if(phDisponibles(a)<entrada.regla.coste_ph)throw Error('PH insuficientes.');
    const alcance=acciones(a).find(v=>v.id===accionId)?.efecto.tablero;
    const posiciones=posicionesTablero(n);
    if(alcance&&distanciaEntreFichas(a,posiciones[a.id],t,posiciones[t.id])>alcance.alcance)throw Error('El destino está fuera del alcance de la habilidad.');
    if(!lineaEntreFichas(a,posiciones[a.id],t,posiciones[t.id],n.mapa))throw Error('Un muro bloquea la trayectoria.');
    ejecutarRegla(n,a,entrada.clave,entrada.regla,a,t,rng,undefined,0,true);
    a.accion_usada=true;
    return n;
  }
  if(accionId==='volver_forma'){if(!a.transformacion)throw Error('No hay transformación activa.');const vuelta=costeVuelta(a),cuerpo={...a,...terminarTransformacion(a)};/* el coste se paga con el cuerpo original: sus límites mandan */if(vuelta.fatiga&&(a.agotado||a.fatiga+vuelta.fatiga>(estadisticas(cuerpo).fatiga||0)))throw Error('Fatiga insuficiente para volver.');if(phDisponibles(cuerpo)<vuelta.ph)throw Error('PH insuficientes para volver.');guardarVidaForma(a);Object.assign(a,terminarTransformacion(a));a.ph-=vuelta.ph;a.fatiga+=vuelta.fatiga;if(vuelta.fatiga)a.uso_fatiga=true;normalizar(a);a.accion_usada=true;log(n,`${a.nombre} vuelve a su cuerpo original.`);return n;}
  if (accionId === "guardia") {
    // Concepto básico «Guardia» (Apéndice D · B): por defecto +2 ARM hasta su siguiente turno, como siempre.
    const g = conceptosDe(a).guardia, manos = Object.values(piezas(a));
    if (g.condiciones.requiere_escudo && !manos.some(p => ['mano', 'dos_manos'].includes(p.slot_tipo || '') && (/escudo|broquel|rodela/i.test(p.nombre) || (p.stats.bloqueo || 0) > 0))) throw Error(`${g.nombre} requiere un escudo.`);
    if (g.condiciones.sin_dos_manos && (manos.some(p => p.slot_tipo === 'dos_manos') || a.arma?.efecto.arma_slot === 'dos_manos')) throw Error(`${g.nombre} no admite un arma a dos manos.`);
    if (phDisponibles(a) < g.coste.ph) throw Error('PH insuficientes.');
    const sf = estadisticas(a).fatiga || 0;
    if (g.coste.fatiga && (a.agotado || a.fatiga + g.coste.fatiga > sf)) throw Error('Fatiga insuficiente.');
    a.ph = phDisponibles(a) - g.coste.ph; a.fatiga += g.coste.fatiga; if (g.coste.fatiga) a.uso_fatiga = true;
    const turnos = g.duracion.tipo === 'turnos' ? g.duracion.turnos : 1;
    const def: DefinicionEstado | undefined = g.condiciones.inmovil ? { id: 'guardia', nombre: g.nombre, icono: 'escudo', categoria: 'fisico', duracion: g.duracion.tipo === 'turnos' ? { tipo: 'turnos', turnos } : { tipo: 'hasta_su_turno' }, efectos: [{ tipo: 'bonos', bonos: g.bonos }, { tipo: 'modificador_movimiento', modo: 'cero' }] } : undefined;
    estado(a, "guardia", g.nombre, turnos, { ...g.bonos }, { ...(g.duracion.tipo === 'hasta_su_turno' ? { inicio: true } : {}), ...(def ? { def } : {}) });
    if (g !== GUARDIA_BASE) log(n, `${a.nombre} se pone en guardia: ${g.nombre}.`);
    a.accion_usada = true;
    return n;
  }
  const act = acciones(a).find((v) => v.id === accionId);
  if (act && vozNiega(a.voz_artefacto, act)) throw Error('La voz del artefacto te lo niega.');
  if (!act) throw Error("La acción no existe.");
  // Las opciones de una transformación por grafo («accion>forma») comparten el enfriamiento de su acción.
  if (!continua && (a.cooldowns[act.id.split(">")[0]] || 0) > 0) throw Error("Habilidad en enfriamiento.");
  if(act.efecto.efecto==="transformacion"){
    const d=act.efecto.transformacion;
    if(!d)throw Error("Transformación sin configurar.");
    if(act.forma_destino!==undefined){
      if(act.bloqueada)throw Error(act.bloqueada);
      const destino=act.forma_destino,ph=act.efecto.coste_ph||0,fatiga=act.efecto.coste_fatiga||0;
      if(fatiga&&(a.agotado||a.fatiga+fatiga>(estadisticas(a).fatiga||0)))throw Error("Fatiga insuficiente para transformarse.");
      if(phDisponibles(a)<ph)throw Error("PH insuficientes.");
      const nombre=d.etapas.find(x=>x.id===destino)?.nombre||destino;
      if(d.tipo==='forma'&&a.vidas_formas?.[claveVidaForma(d.id,destino)]===0)throw Error('Forma rota: no puede volver a ella en este encuentro.');
      if(a.transformacion){
        const vidaSaliente=a.vida,origen=a.transformacion.etapa_id;
        const cambio=cambiarEtapaTransformacion(a,d,destino);
        if(!aplicarFormaConEspacio(n,a,{...cambio,ph:cambio.ph-ph},rng))throw Error('No hay espacio para esa transformación.');
        a.vidas_formas={...a.vidas_formas,...(d.tipo==='forma'?{[claveVidaForma(d.id,origen)]:vidaSaliente}:{})};
        restaurarVidaForma(a,d,destino);
        log(n,`${a.nombre} cambia a ${nombre}.`);
      }else{
        // El cambio libre se puede repetir; solo la entrada a una cadena («uno») se marca como usada,
        // por destino, para que usar una parte del grafo no gaste la otra (ver opcionesDeForma).
        const usadas=a.transformaciones_usadas||[],libre={...a,transformaciones_usadas:usadas.filter(x=>x!==d.id)};
        if(!aplicarFormaConEspacio(n,a,activarTransformacion(libre,{...d,coste_ph:ph,duracion_turnos:act.efecto.duracion||d.duracion_turnos},destino),rng))throw Error('No hay espacio para esa transformación.');
        const entrada=transicionEntre(migrarTransformacion(d),ID_REALIDAD,destino);
        a.transformaciones_usadas=entrada?.sentido==='uno'?[...usadas.filter(x=>x!==d.id),usoCadena(d.id,destino)]:usadas.filter(x=>x!==d.id);
        restaurarVidaForma(a,d,destino);
        log(n,`${a.nombre} activa ${d.nombre}: ${nombre}.`);
      }
      a.fatiga+=fatiga;if(fatiga)a.uso_fatiga=true;
    }
    else{
    if(!a.transformacion){const fatiga=act.efecto.coste_fatiga||0;if(fatiga&&(a.agotado||a.fatiga+fatiga>(estadisticas(a).fatiga||0)))throw Error("Fatiga insuficiente para transformarse.");a.fatiga+=fatiga;if(fatiga)a.uso_fatiga=true;}
    if(a.transformacion){if(a.transformacion.definicion_id!==d.id)throw Error("Otra transformación está activa.");const indice=d.etapas.findIndex(x=>x.id===a.transformacion?.etapa_id);if(indice<0||indice===d.etapas.length-1)throw Error("No hay otra etapa.");if(d.etapas[indice+1].descontrolada)throw Error('Esta etapa solo puede activarse tras fallar la salvación de posesión.');if(!aplicarFormaConEspacio(n,a,cambiarEtapaTransformacion(a,d,d.etapas[indice+1].id),rng))throw Error('No hay espacio para esa transformación.');log(n,`${a.nombre} avanza a ${d.etapas[indice+1].nombre}.`);}
    else{if(a.transformaciones_usadas?.includes(d.id))throw Error("Transformación ya utilizada en esta partida.");if(phDisponibles(a)<(act.efecto.coste_ph||0))throw Error("PH insuficientes.");if(!aplicarFormaConEspacio(n,a,activarTransformacion(a,{...d,coste_ph:act.efecto.coste_ph,duracion_turnos:act.efecto.duracion||d.duracion_turnos}),rng))throw Error('No hay espacio para esa transformación.');log(n,`${a.nombre} activa ${d.nombre}.`);}
    }
    if(a.transformacion&&!a.transformacion.creado_turno)a.transformacion.creado_turno=a.turnos;
    // Una reacción al daño de crecimiento puede romper la forma ya aplicada.
    if(a.transformacion&&!a.transformacion.etapa_id)throw Error('Etapa inválida.');
    if(act.enfriamiento)a.cooldowns[act.id.split(">")[0]]=act.enfriamiento+1;
    a.accion_usada=true;normalizar(a);return n;
  }
  let e = act.efecto;
  const disparos = disparosRafaga(e);
  if (e.rafaga && !disparos) throw Error("El ataque múltiple solo es para acciones de daño.");
  if (disparos) {
    if (!Number.isInteger(disparos) || disparos < 2 || disparos > 20) throw Error("Un ataque múltiple necesita entre 2 y 20 dados (uno por disparo).");
    if (e.tablero && e.tablero.forma !== "individual") throw Error("Cada disparo de un ataque múltiple va a un solo objetivo: usa alcance individual.");
    // Cada disparo es un ataque de un dado con su propia tirada para impactar.
    e = { ...e, cantidad: 1 };
  }
  // Potenciadores de rasgos (Apéndice C): el coste se paga una vez; los componentes se suman a la técnica.
  let extra = {ph:0,fatiga:0,recursos:[] as {id:string;nombre:string;cantidad:number}[]};
  if (potenciadores.length) {
    if (e.efecto !== "dano") throw Error("Solo las técnicas de daño aceptan potenciadores.");
    const r = potenciar(e, rasgosDe(a), potenciadores);
    e = { ...r.efecto, ...(r.estados.length ? { estados_potenciador: r.estados } : {}) };
    extra = r.coste;
    for (const p of extra.recursos) { const d = recursosDe(a).find(x => x.id === p.id); if (!d || saldoRecurso(a, d) < p.cantidad) throw Error(`${p.nombre}: saldo insuficiente.`); }
  }
  const
    s = estadisticas(a),
    coste = continua ? 0 : (e.coste_ph || 0) + extra.ph,
    fatiga = continua ? 0 : (e.coste_fatiga || 0) + extra.fatiga,
    t = n.miembros.find((m) => m.id === objetivoId);
  if(coste>0 && (s.silencio_ph||0)>0)throw Error('Silencio del Núcleo impide gastar PH.');
  const tactica=e.tablero;
  if(tactica){const fallo=validarTactica(e);if(fallo)throw Error(fallo);}
  const posiciones=posicionesTablero(n), origen=posiciones[a.id];
  const objetivoEnAlcance=t&&tactica&&casillasHuella(t,posiciones[t.id])
    .filter(q=>alcanceVisibleEntreFichas(a,origen,{},q,tactica.alcance,n.mapa))
    .sort((p,q)=>distanciaEntreFichas(a,origen,{},p)-distanciaEntreFichas(a,origen,{},q))[0];
  const patron=tactica?.forma==='personalizada';
  const apuntaPatron=patron&&tactica.patron?.orientacion==='apuntar';
  const apuntado=apuntaPatron?(centro||(t&&t.id!==a.id?posiciones[t.id]:undefined))
    :tactica?.origen_area==='lanzador'?origen:centro || objetivoEnAlcance || (t?posiciones[t.id]:undefined);
  const dimensiones=dimensionesTablero(n);
  const requiereAreaMovil=tactica?.origen_area==='aterrizaje'||tactica?.origen_area==='recorrido';
  const plan=requiereAreaMovil&&tactica?.movimiento_lanzador&&apuntado?planearAtaqueDeArea(n,a,apuntado,tactica.movimiento_lanzador):undefined;
  const punto=patron?origen:tactica?.origen_area==='aterrizaje'&&plan?plan.destino:apuntado;
  let objetivos=t?[t]:[];
  if(e.portal && tactica && apuntado){
    if(!alcanceVisibleEntreFichas(a,origen,{},apuntado,tactica.alcance,n.mapa)||!cabeFichaEn(n,a,apuntado,posiciones))throw Error('El umbral necesita una casilla libre visible dentro del alcance.');
    if(phDisponibles(a)<coste)throw Error('PH insuficientes.');
    a.ph=phDisponibles(a)-coste;
    a.posicion={...apuntado};
    a.accion_usada=true;
    aplicarTerreno(n,a,rng);
    log(n,a.nombre+' cruza el Umbral Espacial.');
    return n;
  }
  const dash=e.efecto==='desplazamiento';
  if(dash&&(!centro||!tactica||!Number.isInteger(tactica.alcance)||tactica.alcance<1||tactica.alcance>30||!casillasAlcanzables(n,a.id,tactica.alcance)[centro.x+','+centro.y]))throw Error('Elige una casilla libre y alcanzable para el dash.');
  if(tactica&&!dash){
    if(apuntaPatron&&(!apuntado||!origen||(apuntado.x===origen.x&&apuntado.y===origen.y)||!cabeHuella({},apuntado,dimensiones,()=>false)))throw Error('Elige una casilla para orientar el patrón desde el lanzador.');
    if(!apuntado||(!patron&&(!cabeHuella({},apuntado,dimensiones,()=>false)||distanciaEntreFichas(a,origen,{},apuntado)>tactica.alcance)))throw Error('El destino está fuera del alcance de la habilidad.');
    if(!patron&&!alcanceVisibleEntreFichas(a,origen,{},apuntado,tactica.alcance,n.mapa))throw Error('Un muro bloquea la trayectoria.');
    if(!punto||requiereAreaMovil&&!plan)throw Error('No hay un destino válido para el movimiento ofensivo.');
    const area=tactica.origen_area==='recorrido'&&plan
      ?[...areaDeRecorrido(plan.trayecto.flatMap(p=>casillasHuella(a,p)),tactica.movimiento_lanzador?.ancho||0,dimensiones),...(distanciaCasillas(plan.trayecto[plan.trayecto.length-1],apuntado)<=(tactica.movimiento_lanzador?.alcance_golpe||0)?[apuntado]:[])]
      :areaDesdeFicha(a,origen,patron?apuntado:punto,tactica,dimensiones,n.mapa);
    const celdas=new Set(area.map(claveHuella));
    objetivos=n.miembros.filter(m=>{
      const p=m.id===a.id&&plan?plan.destino:posiciones[m.id];
      return !(e.suelo&&tiene(m,'vuelo'))&&(m.vida>0||e.efecto==='curacion'&&situacionCombatiente(m)!=='muerto')
        &&objetivoDelArea(a,m,e)&&casillasHuella(m,p).some(q=>celdas.has(claveHuella(q)));
    });
    if(!objetivos.length)throw Error('No hay objetivos válidos en el área.');
    for(const m of n.miembros)m.posicion=posiciones[m.id];
    objetivos.sort((u,v)=>tactica.origen_area==='recorrido'
      ?distanciaCasillas(posiciones[u.id],origen)-distanciaCasillas(posiciones[v.id],origen)||u.id.localeCompare(v.id)
      :(e.efecto==='dano'&&tactica.forma!=='individual'?Number(u.id===a.id)-Number(v.id===a.id):0)||distanciaCasillas(posiciones[u.id],punto)-distanciaCasillas(posiciones[v.id],punto)||u.id.localeCompare(v.id));
  }
  // Movimiento forzado con «no ataca a la fuente» (Asustado): ni de frente ni dentro de un área.
  const temidos=a.estados.filter(s=>s.fuente&&primitivas(definicionDe(s),'movimiento_forzado').some(p=>p.no_ataca_fuente)).map(s=>s.fuente!);
  if(temidos.length&&e.efecto==='dano'){
    if(t&&temidos.includes(t.id)&&!tactica?.forma||t&&temidos.includes(t.id)&&tactica?.forma==='individual')throw Error(`${a.nombre} está asustado: no puede atacar a su fuente.`);
    objetivos=objetivos.filter(o=>!temidos.includes(o.id));
    if(tactica&&!objetivos.length)throw Error('No hay objetivos válidos en el área.');
  }
  if(typeof coste!=='number'||!Number.isFinite(coste)||coste<0)throw Error('Coste de PH inválido.');
  if (phDisponibles(a) < coste) throw Error("PH insuficientes.");
  a.ph=phDisponibles(a);
  if (e.efecto !== "crear_arma" && !t && !tactica) throw Error("Elige un objetivo.");
  const forzando =
    fatiga > 0 && (a.agotado || a.fatiga + fatiga > (s.fatiga || 0));
  if (forzando && !forzar)
    throw Error(
      "Agotamiento: activa Forzar natural para usarla sufriendo 1d4 de daño.",
    );
  if(e.recurso&&!continua){
    const {nombre,inicial,cambio}=e.recurso;
    if(!nombre.trim()||!Number.isSafeInteger(inicial)||inicial<0||!Number.isSafeInteger(cambio))throw Error('Recurso inválido.');
    const recursos=a.recursos_especiales??={};
    const previo=Object.hasOwn(recursos,nombre)?recursos[nombre]:inicial;
    if(e.recurso.descargar){
      if(e.efecto!=='dano'||previo<1)throw Error('Necesitas energía almacenada para descargarla.');
      e={...e,modificador:e.modificador+previo};
      log(n,'Descarga de '+previo+' puntos de '+nombre+'.');
    }
    const saldo=e.recurso?.descargar?0:previo+cambio;
    if(saldo<0)throw Error(nombre+': saldo insuficiente.');
    a.recursos_especiales={...recursos,[nombre]:saldo};
    log(n,nombre+': '+saldo);
  }
  for (const p of extra.recursos) {
    const d = recursosDe(a).find(x => x.id === p.id)!;
    a.recursos_especiales = { ...a.recursos_especiales, [d.id]: gastarRecurso(d, saldoRecurso(a, d), p.cantidad) };
    log(n, `${a.nombre} gasta ${p.cantidad} ${d.nombre} (quedan ${a.recursos_especiales[d.id]}).`);
  }
  a.ph -= coste;
  if(coste>0 && (s.retribucion||0)>0){
    const golpe=Math.min(6,coste);
    Object.assign(a,danarTransformado(a,golpe).actor);
    log(n,'Retribución Universal causa '+golpe+' de daño.');
    if(a.vida<=0){a.accion_usada=true;return n;}
  }
  a.fatiga = Math.min(s.fatiga || 0, a.fatiga + fatiga);
  if (fatiga) a.uso_fatiga = true;
  a.accion_usada = true;
  if (fatiga && a.fatiga >= (s.fatiga || 0)) a.agotado = true;
  if (act.enfriamiento && !continua) a.cooldowns[act.id] = act.enfriamiento + 1;
  if (disparos) {
    const restantes = continua ? a.rafaga!.restantes - 1 : disparos - 1;
    const numero = disparos - restantes;
    if (restantes > 0) a.rafaga = { accion: act.id, nombre: act.nombre, total: disparos, restantes };
    else delete a.rafaga;
    log(n, `${act.nombre}: disparo ${numero} de ${disparos}${t ? ` contra ${t.nombre}` : ""}.`);
  }
  if (forzando) {
    const v = dados(n, 1, 4, rng, "Daño por agotamiento");
    Object.assign(a,danarTransformado(a,v).actor);
    if (!a.vida) {
      log(n, `${a.nombre} cae por agotamiento antes de ejecutar la habilidad.`);
      return n;
    }
  }
  if (!continua) log(n, `${act.nombre}: coste ${coste} PH y ${fatiga} Fatiga.`);
  // Misma frase que la vista previa del menú de potenciadores: lo previsto y lo registrado coinciden.
  if (potenciadores.length) log(n, `Técnica potenciada: ${describirPotenciado(e.nombre || act.nombre, e, extra)}.`);
  eventoRecurso(n, a, "usar_etiqueta", etiquetasDe(e));
  if(e.vision?.modo==='con_accion')activarVision(n,a,e);
  if(dash&&centro){
    for(const m of n.miembros)m.posicion=posiciones[m.id];
    a.posicion={...centro};aplicarTerreno(n,a,rng);
    log(n,a.nombre+' se desplaza sin gastar movimiento.');return n;
  }
  if(tactica?.movimiento_lanzador){
    const destino=plan?.destino||(t&&combatienteActivo(t)?destinoAtaqueMovil(n,a,t,tactica.movimiento_lanzador):undefined);
    if(!destino)throw Error('Elige un destino válido para el movimiento ofensivo.');
    const previo=posicionesTablero(n)[a.id];
    a.posicion={...destino};
    const recorrido=distanciaCasillas(previo,destino);
    if(recorrido){log(n,`${a.nombre}: ${tactica.movimiento_lanzador.tipo} ${recorrido} casillas hasta (${destino.x+1}, ${destino.y+1}) antes de golpear.`);aplicarTerreno(n,a,rng);}
    if(a.vida<=0)return n;
  }

  if(e.aprendizaje){
    const objetivo=objetivos[0],clave=objetivo&&a.hechizos_observados?.[objetivo.id];
    const fuente=objetivo?.configuracion.habilidades?.find(h=>(h.forja_id||h.id)===clave);
    if(!clave||!fuente)throw Error('Selecciona al lanzador de un hechizo que hayas visto durante este encuentro.');
    if(requisitosFuente(a,fuente).length)throw Error('Faltan requisitos para aprender este hechizo.');
    if(a.configuracion.habilidades?.some(h=>(h.forja_id||h.id)===clave))throw Error('Ya conoces ese hechizo.');
    const {cd,bono}=e.aprendizaje;
    if(!Number.isInteger(cd)||cd<1||cd>100||!Number.isInteger(bono)||Math.abs(bono)>100)throw Error('Aprendizaje sin una CD válida.');
    const tirada=rng(20);
    log(n,a.nombre+' intenta aprender '+fuente.nombre+': '+tirada+' + '+bono+' contra CD '+cd+'.');
    if(tirada+bono>=cd){
      a.configuracion.habilidades=[...(a.configuracion.habilidades||[]),{...copia(fuente),id:clave,forja_id:clave}];
      a.hechizos_aprendidos=[...new Set([...(a.hechizos_aprendidos||[]),clave])];
      log(n,a.nombre+' aprende '+fuente.nombre+'.');
    }else log(n,'No logra aprender el hechizo.');
    return n;
  }
  const magia=habilidadesDe(a).find(h=>h.id!==FUENTE_PROPIAS&&accionId==='hab:'+h.id+':'+e.id);
  const claveMagia=magia?.forja_id||magia?.id;
  if(claveMagia&&(e.naturaleza==='magica'||coste>0)&&!normalizarReaccion(e).reaccion){
    for(const testigo of n.miembros){
      if(testigo.id===a.id||!combatienteActivo(testigo)||tiene(testigo,'ciego')||!habilidadesDe(testigo).some(h=>h.efectos?.some(ef=>ef.aprendizaje)))continue;
      if(lineaVisible(posiciones[testigo.id],origen,n.mapa))testigo.hechizos_observados={...testigo.hechizos_observados,[a.id]:claveMagia};
    }
  }
  if (e.efecto === "crear_arma") {
    if (e.tabla_armas) {
      const tabla = e.tabla_armas;
      if (!Number.isInteger(tabla.caras) || tabla.caras < 2 || tabla.caras > 100 || !Array.isArray(tabla.resultados) || tabla.resultados.length !== tabla.caras || new Set(tabla.resultados.map(r=>r.cara)).size !== tabla.caras || tabla.resultados.some(r=>!Number.isInteger(r.cara)||r.cara<1||r.cara>tabla.caras)) throw Error('La tabla de armas está incompleta.');
      const cara = dados(n, 1, tabla.caras, rng, 'Creación de arma');
      const r = tabla.resultados.find(r=>r.cara===cara);
      if (!r || !r.nombre?.trim() || !Number.isInteger(r.cantidad) || r.cantidad<1 || r.cantidad>100 || !Number.isInteger(r.caras) || r.caras<2 || r.caras>1000 || !Number.isInteger(r.modificador) || Math.abs(r.modificador)>1000000 || !['mano_der','mano_izq','dos_manos'].includes(r.arma_slot)) throw Error('Arma del resultado inválida.');
      e = {...e, tabla_armas:undefined, arma_nombre:r.nombre, cantidad:r.cantidad, caras:r.caras, modificador:r.modificador, tipo_dano:r.tipo_dano, elemento:r.elemento, arma_slot:r.arma_slot};
      log(n, `${act.nombre}: d${tabla.caras} → ${cara}: ${r.nombre}.`);
    }
    a.arma = {
      efecto: { ...e },
      nombre: e.arma_nombre || "Arma temporal",
      slot: e.arma_slot === "mano_izq" ? "mano_izq" : "mano_der",
      restantes: e.duracion,
      creada: a.turnos,
    };
    log(n, `${a.nombre} crea ${a.arma.nombre} durante ${e.duracion} turnos.`);
    normalizar(a);
    return n;
  }
  if(punto&&tactica&&tactica.forma!=='individual')
    for(const objetivo of objetivos)if(objetivo.id!==a.id)dispararReacciones(n,[objetivo],'apuntado_por_area',rng,{efecto:e,protegido:()=>objetivo});
  for(const objetivo of objetivos){
    if(a.vida<=0)break;
    resolverEfecto(n,a,objetivo,e,act,rng,punto);
  }
  if(tactica&&punto)log(n,`${act.nombre}: ${patron?'patrón desde':tactica.origen_area==='recorrido'?'recorrido':'centro'} (${punto.x+1}, ${punto.y+1}), ${objetivos.length} objetivos afectados.`);
  return n;
}
function resolverEfecto(n:Combate,a:Combatiente,t:Combatiente,e:Efecto,act:Accion,rng:RNG,centro?:Posicion){
  const s=estadisticas(a);
  if (e.efecto === "transformacion")throw Error("Transformación solo puede ejecutarse sobre el usuario.");
  if (e.efecto !== "dano") {
    // Inmunidad completa: se bloquea ANTES de la salvación (no hay tirada).
    const defEstado = e.efecto === "estado" && !e.aterrizar && !e.vuelo && !e.aprendizaje ? (e.estado_def || definicionBase(e.estado_tipo || "")) : undefined;
    const claveEstado = e.estado_def ? e.estado_def.id : (e.estado_tipo || "narrativo") === "narrativo" ? "estado:" + e.id : e.estado_tipo!;
    const permiso = e.efecto === "estado" && !e.aterrizar && !e.vuelo && !e.aprendizaje ? puedeAplicar(n, t, claveEstado, defEstado, e) : 'si';
    if (permiso === 'no') { normalizar(t); return n; }
    const supera = e.salvacion
      ? salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng)
      : false;
    if(e.aterrizar){
      if(!tiene(t,'vuelo'))throw Error('Elige un objetivo en vuelo.');
      quitarEstado(t,'vuelo');aplicarTerreno(n,t,rng);log(n,t.nombre+' aterriza de forma controlada.');return n;
    }
    if(e.vuelo){
      estado(t,'vuelo','En vuelo',2,{});
      log(n,t.nombre+' alza el vuelo durante dos turnos.');
      return n;
    }
    if (e.efecto === "estado") {
      if (supera) {
        log(n, `${t.nombre} evita el estado.`);
        return n;
      }
      const tipo = e.estado_tipo || "narrativo";
      const legado = !e.estado_def && TIPOS_ESTADO_LEGADO.includes(tipo);
      let turnos = legado || !defEstado ? Math.max(1, e.duracion) : turnosIniciales(defEstado, e.duracion);
      if (permiso === 'resiste' && turnos > 1) { turnos = Math.max(1, Math.floor(turnos / 2)); log(n, `${t.nombre} resiste el estado: dura ${turnos} turno(s).`); }
      estado(
        t,
        claveEstado,
        e.estado || defEstado?.nombre || tipo,
        turnos,
        { ...bonosDefinicion(legado ? undefined : defEstado), ...(e.bonos_estado || {}) },
        {
          ...(e.estado_def ? { def: e.estado_def } : { cantidad: e.cantidad, caras: e.caras }),
          cd: e.salvacion?.cd || 12,
          atributo: e.salvacion?.atributo || "salvacion",
          fuente: a.id,
          ...(defEstado?.duracion.tipo === "hasta_su_turno" ? { inicio: true } : {}),
        },
      );
      if (defEstado && primitivas(defEstado, "cesion_control").length) log(n, `${t.nombre} pierde el control: ${primitivas(defEstado, "cesion_control")[0].controlador === "gm" ? "el GM decide sus actos" : `${a.nombre} decide sus actos`}.`);
    } else {
      let v = Math.max(
        0,
        dados(n, e.cantidad, e.caras, rng, act.nombre) + e.modificador,
      );
      if (supera && e.salvacion?.exito === "mitad") v = Math.floor(v / 2);
      if (supera && e.salvacion?.exito === "anula") v = 0;
      if (e.efecto === "curacion") curarCombatiente(t,v);
      if (e.efecto === "recuperar_ph")
        t.ph = Math.min(estadisticas(t).ph || 0, t.ph + v);
      if (e.efecto === "reducir_fatiga" && !t.agotado)
        t.fatiga = Math.max(0, t.fatiga - v);
      log(n, `${t.nombre}: ${e.efecto} ${v}.`);
    }
    secundariosTablero(n,a,t,e,centro,supera);
    normalizar(a);
    normalizar(t);
    return n;
  }
  emitirMotor(n, 'atacar', a, a, t, rng, e);
  if (a.vida <= 0) return n;
  if (a.id !== t.id) {
    // Un aliado cercano puede interponerse (solo ante ataques a un único objetivo) o proteger.
    if (!e.tablero || e.tablero.forma === "individual") {
      const objetivo = t;
      for (const w of n.miembros.filter(w=>w.id!==objetivo.id&&w.id!==a.id&&w.bando===objetivo.bando)) {
        let interpuesto = false;
        for (const previa of evaluarReacciones(n, w, "aliado_atacado", {efecto:e, cerca:objetivo})) {
          const d = disponibilidad(n, w, previa.p, previa.r);
          if (!d || !ofrecer(n, w, d, rng, "aliado_atacado")) continue;
          const seInterpone = !!d.r.principal?.interponerse;
          if (!resolverPrincipal(n, w, d, rng, {protegido: seInterpone ? w : objetivo})) continue;
          if (seInterpone) {
            log(n, `${w.nombre} se interpone y recibe el ataque dirigido a ${objetivo.nombre}.`); interpuesto = true;
            // Las reducciones ya pagadas por otros aliados viajan con el golpe: no se pierden los PH.
            if (objetivo.reduccion_reaccion?.length) { (w.reduccion_reaccion ||= []).push(...objetivo.reduccion_reaccion); delete objetivo.reduccion_reaccion; }
            n.objetivo_final = w.id;
            break;
          }
        }
        if (interpuesto) { t = w; break; }
      }
    }
    dispararReacciones(n, [t], "antes_ser_atacado", rng, {efecto:e, victima:a, protegido:()=>t, hasta:()=>a.vida<=0});
    if (a.vida <= 0) {
      log(n, `${a.nombre} cae por una reacción antes de impactar.`);
      return n;
    }
  }
  const elemento = (estadisticas(t).transmutar||0)>0 && e.naturaleza==='magica'?'hielo':elementoDe(e),
    antes = reactivas(t, e, "recibir_ataque");
  activarReglas(n, a, t, antes, rng);
  if (a.vida <= 0) {
    log(n, `${a.nombre} cae por una reacción antes de impactar.`);
    return n;
  }
  let arm =
    (estadisticas(t).armadura || 0) +
    antes.reduce((v, r) => v + (r.bonos.armadura || 0), 0) + coberturaEntre(n,a,t);
  const debil = golpeOcular(n, a, t);
  const anticipa = anticipacion(n, t, a);
  if (anticipa) { arm += anticipa; log(n, `${t.nombre} anticipa el golpe con su ojo: +${anticipa} ARM.`); }
  if (debil) log(n, `${a.nombre} ve un punto débil de ${t.nombre} (${debil.ojos.join(', ')}) y ataca desde el ${NOMBRE_DIRECCION[debil.direccion]}: ${describirRecompensa(debil.recompensa)}.`);
  if (debil?.recompensa.perforar) arm = Math.floor(arm * (100 - debil.recompensa.perforar) / 100);
  if (tiene(t, "escarcha")) arm = Math.floor(arm / 2);
  arm = Math.max(
    0,
    arm -
      Math.max(...(e.componentes?.length ? e.componentes.map(x => x.elemento) : [elemento]).map(x => definicionElemento(x, e.elemento_def)?.ignora_armadura || 0)),
  );
  if (antes.length)
    log(
      n,
      `${t.nombre}: defensas reactivas ${antes.map((r) => r.nombre).join(", ")}; ARM contra este ataque ${arm}.`,
    );
  let totalAtaque:number|undefined;
  let acierta = true,
    critico = false,
    supera = false;
  if (e.salvacion) {
    supera = salvacion(n, t, e.salvacion.cd, e.salvacion.atributo, rng);
    acierta = !(supera && e.salvacion.exito === "anula");
    n.resultado = acierta ? "Impacto" : "Fallo";
  } else if (n.regla === "impacto") {
    let d=rng(20);
    if(e.naturaleza==='magica' && a.ronda_asistida!==n.ronda){
      const apoyo=habilidadesDe(a).flatMap(h=>h.efectos||[]).find(p=>p.companero_magico)?.companero_magico;
      if(apoyo){
        const segundo=rng(20);
        log(n,apoyo+' concede ventaja: '+d+' y '+segundo);
        d=Math.max(d,segundo);
        a.ronda_asistida=n.ronda;
      }
    }
    if (debil?.recompensa.ventaja) {
      const segundo = rng(20);
      log(n, `Ventaja por el punto débil: ${d} y ${segundo}.`);
      d = Math.max(d, segundo);
    }
    const impacto = d + (s.bono_impacto || 0) + (debil?.recompensa.impacto || 0);
    totalAtaque=impacto;
    critico = d === 20 || (!!debil?.recompensa.critico && d !== 1);
    acierta = critico || (d !== 1 && impacto >= arm);
    n.resultado =
      d === 1
        ? "Fallo critico"
        : critico
          ? "Critico"
          : acierta
            ? "Impacto"
            : "Fallo";
    log(
      n,
      `${n.resultado}: d20 ${d} + impacto ${s.bono_impacto || 0} = ${impacto}, ARM ${arm}.`,
    );
    if (!acierta && a.id !== t.id)
      for (const r of evaluarReacciones(n, a, "tras_fallar_ataque", {efecto:e})) {
        if (!ofrecer(n, a, r, rng, "tras_fallar_ataque")) continue;
        const d2 = rng(20), impacto2 = d2 + (s.bono_impacto || 0) + (debil?.recompensa.impacto || 0);
        totalAtaque = impacto2;
        critico = d2 === 20 || (!!debil?.recompensa.critico && d2 !== 1);
        acierta = critico || (d2 !== 1 && impacto2 >= arm);
        n.resultado = d2 === 1 ? "Fallo critico" : critico ? "Critico" : acierta ? "Impacto" : "Fallo";
        log(n, `${a.nombre} repite la tirada: d20 ${d2} + impacto ${s.bono_impacto || 0} = ${impacto2}, ARM ${arm}: ${n.resultado}.`);
        break;
      }
  } else n.resultado = "Impacto";
  // A blind penalty is consumed by the next attempted attack, even on a miss.
  quitarEstado(a, "ciego");
  quitarEstado(t, "escarcha");
  if (!acierta) { emitirMotor(n, 'fallar', a, a, t, rng, e); return n; }
  let mitadPorEsquiva=false;
  if(a.id!==t.id&&!tiene(t,'ciego')){
    const defensas=efectosConReaccion(t).filter(p=>p.reaccion?.esquiva_opuesta).sort((p,q)=>(q.reaccion?.prioridad||0)-(p.reaccion?.prioridad||0));
    for(const p of defensas){
      const r=p.reaccion!,dadosEsquiva=r.esquiva_opuesta!,forma=t.transformacion?.definicion_id;
      if((r.forma&&r.forma!==forma)||(r.sin_forma&&r.sin_forma===forma)||(r.naturaleza&&(r.naturaleza==='magica')!==(e.naturaleza==='magica'||e.coste_ph>0)))continue;
      const disponible=disparadorDe(r)==='despues_ser_atacado'?disponibilidad(n,t,p,r):null;
      if(!disponible||!ofrecer(n,t,disponible,rng,'despues_ser_atacado',false))continue;
      const coste=disponible.coste;
      const ataque=totalAtaque??(rng(20)+(s.bono_impacto||0)),esquiva=rng(dadosEsquiva.caras);
      log(n,t.nombre+' usa '+p.nombre+' ('+coste+' PH): esquiva '+esquiva+' contra ataque '+ataque+'.');
      if(esquiva>=ataque){
        const contra=rng(dadosEsquiva.contra_caras);
        Object.assign(a,danarTransformado(a,contra).actor);
        n.resultado='Fallo';log(n,t.nombre+' esquiva y contraataca por '+contra+' de daño.');
        emitirMotor(n,'fallar',a,a,t,rng,e);return n;
      }
      mitadPorEsquiva=true;break;
    }
  }
  emitirMotor(n, 'impactar', a, a, t, rng, e);
  const permiteEstados = !(supera && e.salvacion?.exito === "solo_estado");
  let total = 0, combo = false, tipoVulnerable = "";
  const elementosGolpe: string[] = e.componentes?.length ? [...new Set(e.componentes.map(x => x.elemento))] : [elemento];
  if (e.componentes?.length) {
    if (debil?.recompensa.critico && !critico && n.regla !== "impacto") critico = true;
    ({ total, combo, tipoVulnerable } = danoPorComponentes(n, a, t, e, act, rng, { critico, permiteEstados, s, debil: debil?.recompensa }));
  } else {
  let dadosTotal = dados(n, e.cantidad, e.caras, rng, act.nombre);
  const defElemento = definicionElemento(elemento, e.elemento_def);
  if (defElemento?.dados_extra)
    dadosTotal += dados(n, defElemento.dados_extra.cantidad, defElemento.dados_extra.caras, rng, "Daño elemental " + (defElemento === e.elemento_def ? defElemento.nombre : elemento));
  // Primitiva «Vulnerabilidad elemental» (Mojado y los estados creados en el Yunque).
  const vulnerable = t.estados.map(s => ({ s, r: primitivas(definicionDe(s), "vulnerabilidad_elemental").flatMap(p => p.reacciones.filter(x => x.elemento === elemento).map(x => ({ p, x })))[0] })).find(v => v.r);
  combo = !!vulnerable; tipoVulnerable = vulnerable ? vulnerable.s.tipo || vulnerable.s.id : "";
  const reaccionElemental = vulnerable?.r.x;
  if (vulnerable?.r.p.consume) {
    quitarEstado(t, tipoVulnerable);
    log(n, `${t.nombre}: ${vulnerable.s.nombre} se consume por ${elemento}.`);
  }
  if (reaccionElemental?.dados) dadosTotal += dados(n, reaccionElemental.dados.cantidad, reaccionElemental.dados.caras, rng, reaccionElemental.nombre);
  if (permiteEstados && reaccionElemental?.aplica_estado) { const d = definicionBase(reaccionElemental.aplica_estado); if (d) aplicarDefinicion(n, t, d, a.id, undefined, {}, e); }
  if (tiene(t, "marca_luz")) {
    quitarEstado(t, "marca_luz");
    dadosTotal += dados(n, 1, 6, rng, "Estallido de Marca de Luz");
  }
  if (debil?.recompensa.dados && debil.recompensa.caras)
    dadosTotal += dados(n, debil.recompensa.dados, debil.recompensa.caras, rng, "Punto débil");
  if (debil?.recompensa.critico && !critico && n.regla !== "impacto") critico = true;
  total = Math.max(
    0,
    dadosTotal * (critico ? 2 : 1) + e.modificador + (s.dano || 0) + (debil?.recompensa.dano || 0),
  );
  log(
    n,
    `Daño: dados ${dadosTotal}${critico ? " × 2 (crítico)" : ""} + modificador ${e.modificador} + bono ${s.dano || 0} = ${total}.`,
  );
  if (reaccionElemental?.multiplicador && (!reaccionElemental.solo_corruptos || (t.corrupto ?? !!t.stats.corrupto))) {
    total *= reaccionElemental.multiplicador;
    log(n, reaccionElemental.mensaje || `${reaccionElemental.nombre}: daño × ${reaccionElemental.multiplicador}.`);
  }
  }
  if (supera && e.salvacion?.exito === "mitad") total = Math.floor(total / 2);
  if (n.regla === "reduccion") {
    total = Math.max(0, total - arm);
    log(n, `Tras ARM: ${total}.`);
  }
  const impacto = reactivas(t, e, "recibir_impacto");
  activarReglas(n, a, t, impacto, rng);
  if(mitadPorEsquiva){total=Math.floor(total/2);log(n,'Esquiva parcial: '+total+' de daño antes de otras reducciones.');}
  recibir(n, a, t, e, total, [...antes, ...impacto], rng);
  if (a.id !== t.id && t.vida > 0 && a.vida > 0) {
    const blanco = t;
    dispararReacciones(n, n.miembros.filter(w=>w.id!==a.id&&w.id!==blanco.id&&w.bando===a.bando), "aliado_ataca", rng, {efecto:e, cerca:blanco, victima:blanco, hasta:()=>blanco.vida<=0});
  }
  // Estados que añade un potenciador (se aplican si el golpe permite estados).
  if (permiteEstados) for (const id of e.estados_potenciador || []) { const d = definicionBase(id); if (d) aplicarDefinicion(n, t, d, a.id, undefined, {}, e); }
  if (permiteEstados && e.estado_impacto && t.vida > 0) aplicarDefinicion(n, t, e.estado_impacto, a.id, undefined, {}, e);
  // Elemental saves affect secondary states, never repeat the attack roll. Cada componente aplica los suyos.
  for (const elemento of elementosGolpe) {
  const eElemento: Efecto = e.componentes?.length ? { ...e, componentes: undefined, elemento: elemento as Elemento } : e;
  // Estados al impactar del elemento (lib/elementos.ts): fuego → Quemadura, agua → Mojado… o los de una variante.
  const defGolpe = definicionElemento(elemento, e.elemento_def);
  if (permiteEstados) for (const x of defGolpe?.al_impactar || []) {
    if (puedeAplicar(n, t, x.estado, x.estado_def, e) === 'no') continue;
    if (x.salvacion && salvacion(n, t, x.salvacion.cd, x.salvacion.atributo, rng)) continue;
    impactoElemental(n, a, t, x, e);
  }
  const cadena = defGolpe?.cadena;
  if (cadena && t.grupo_cercania) {
    for (const otro of n.miembros.filter(
      (m) =>
        m.id !== t.id &&
        m.id !== a.id &&
        m.bando === t.bando &&
        m.vida > 0 &&
        m.grupo_cercania === t.grupo_cercania,
    )) {
      area(n, a, otro, eElemento, cadena.dano, rng);
      log(n, `${otro.nombre}: chispa de cercanía ${cadena.dano}.`);
      if (combo && tiene(otro, tipoVulnerable)) {
        const v = dados(n, 1, 6, rng, "Superconducción cercana");
        area(n, a, otro, eElemento, v, rng);
        log(n, `${otro.nombre}: Superconducción ${v}; conserva Mojado.`);
      }
    }
  }
  }
  secundariosTablero(n,a,t,e,centro,supera);
  normalizar(a);
  normalizar(t);
  return n;
}
/** Aplica un estado elemental. Los cuatro estados históricos conservan su forma exacta de instancia. */
function impactoElemental(n: Combate, a: Combatiente, t: Combatiente, x: EfectoImpacto, e: Efecto) {
  if (!x.estado_def && x.estado === "mojado") return estado(t, "mojado", "Mojado");
  if (!x.estado_def && x.estado === "quemadura") return estado(t, "quemadura", "Quemadura", 0, {}, { cantidad: 1, caras: 4, cd: 12, atributo: "salvacion" });
  if (!x.estado_def && x.estado === "escarcha") return estado(t, "escarcha", "Escarcha: ARM a la mitad hasta el próximo ataque");
  if (!x.estado_def && x.estado === "marca_luz") return estado(t, "marca_luz", "Marcado por la Luz");
  const d = x.estado_def || definicionBase(x.estado);
  if (d) aplicarDefinicion(n, t, d, a.id, undefined, {}, e);
}
const NOMBRE_COMPONENTE: Record<string, string> = { ninguno: "físico", fuego: "fuego", agua: "agua", electricidad: "electricidad", hielo: "hielo", luz_sagrada: "luz sagrada" };
/** Daño de una técnica combinada: cada componente tira sus dados, su 1d4 elemental, su inmunidad y su combo.
 * Los combos (Mojado → Superconducción) se evalúan sobre su componente, nunca sobre el total, y no se duplican. */
function danoPorComponentes(n: Combate, a: Combatiente, t: Combatiente, e: Efecto, act: Accion, rng: RNG, o: { critico: boolean; permiteEstados: boolean; s: Record<string, number>; debil?: RecompensaPunto }) {
  let total = 0, combo = false, tipoVulnerable = "";
  const partes: string[] = [], inmunidades = inmunidadesDe(t);
  // Si varios componentes reaccionan con el mismo estado, gana la reacción que aparece primero en su definición
  // (el GM decide el orden en el Yunque). Solo reacciona un componente: el combo no se duplica.
  const elementos = new Set((e.componentes || []).map(x => x.elemento as string));
  const vul = t.estados.map(x => ({ x, r: primitivas(definicionDe(x), "vulnerabilidad_elemental").flatMap(p => p.reacciones.filter(r => elementos.has(r.elemento)).map(r => ({ p, r })))[0] })).find(v => v.r);
  let usado = false;
  for (const comp of e.componentes || []) {
    let v = dados(n, comp.cantidad, comp.caras, rng, `${act.nombre} · ${comp.nombre || NOMBRE_COMPONENTE[comp.elemento] || comp.elemento}`);
    const defComp = definicionElemento(comp.elemento, e.elemento_def);
    if (defComp?.dados_extra) v += dados(n, defComp.dados_extra.cantidad, defComp.dados_extra.caras, rng, "Daño elemental " + (defComp === e.elemento_def ? defComp.nombre : comp.elemento));
    let mult = 1, nota = "";
    if (!usado && vul?.r && vul.r.r.elemento === comp.elemento) {
      {
        usado = true; combo = true; tipoVulnerable = vul.x.tipo || vul.x.id;
        if (vul.r!.p.consume) { quitarEstado(t, tipoVulnerable); log(n, `${t.nombre}: ${vul.x.nombre} se consume por ${comp.elemento}.`); }
        const rx = vul.r!.r;
        if (rx.dados) v += dados(n, rx.dados.cantidad, rx.dados.caras, rng, rx.nombre);
        if (o.permiteEstados && rx.aplica_estado) { const d = definicionBase(rx.aplica_estado); if (d) aplicarDefinicion(n, t, d, a.id, undefined, {}, e); }
        if (rx.multiplicador && (!rx.solo_corruptos || (t.corrupto ?? !!t.stats.corrupto))) { mult = rx.multiplicador; nota = ` (${rx.nombre} ×${mult})`; }
      }
    }
    if (comp.origen === "base") {
      if (tiene(t, "marca_luz")) { quitarEstado(t, "marca_luz"); v += dados(n, 1, 6, rng, "Estallido de Marca de Luz"); }
      if (o.debil?.dados && o.debil.caras) v += dados(n, o.debil.dados, o.debil.caras, rng, "Punto débil");
    }
    v *= o.critico ? 2 : 1;
    if (comp.origen === "base") v += e.modificador + (o.s.dano || 0) + (o.debil?.dano || 0);
    v = Math.max(0, v) * mult;
    // Cada componente se juzga por SU elemento: el tipo de daño de la técnica base no se hereda (fuego ≠ rayo).
    const inm = comprobarInmunidad(inmunidades, candidatoDano({ ...e, componentes: undefined, elemento: comp.elemento, tipo_dano: comp.origen === "base" ? e.tipo_dano : comp.elemento }, comp.elemento), e.ignora);
    if (inm.bloqueado) { log(n, `${t.nombre}: ${inm.motivo} (componente ${NOMBRE_COMPONENTE[comp.elemento]}).`); v = 0; }
    else if (inm.resistido) v = Math.floor(v / 2);
    total += v;
    partes.push(`${NOMBRE_COMPONENTE[comp.elemento] || comp.elemento} ${v}${nota}`);
  }
  log(n, `Daño por componente${o.critico ? " (crítico)" : ""}: ${partes.join(" + ")} = ${total}.`);
  return { total, combo, tipoVulnerable };
}
/** Rasgos del combatiente (habilidades —incluidas las heredadas— y objetos equipados), sin duplicar por id. */
export function rasgosDe(m: Combatiente): Rasgo[] {
  const vistos = new Map<string, Rasgo>();
  for (const h of habilidadesDe(m).filter(h => !requisitosFuente(m, h).length)) for (const e of h.efectos || []) if (e.rasgo && !vistos.has(e.rasgo.id)) vistos.set(e.rasgo.id, e.rasgo);
  for (const p of Object.values(piezas(m))) for (const e of p.efectos || []) if (e.rasgo && !vistos.has(e.rasgo.id)) vistos.set(e.rasgo.id, e.rasgo);
  return [...vistos.values()];
}
export function recursosDe(m: Combatiente): DefinicionRecurso[] {
  const vistos = new Map<string, DefinicionRecurso>();
  for (const r of rasgosDe(m)) for (const d of r.recursos) if (!vistos.has(d.id)) vistos.set(d.id, d);
  return [...vistos.values()];
}
export const saldoRecurso = (m: Combatiente, d: DefinicionRecurso) => m.recursos_especiales?.[d.id] ?? d.inicial;
/** Estados para la tarjeta del combatiente: icono, duración y la misma frase que el editor del Yunque. */
/** Capa del tablero en la que está: la marca la primitiva «Capa» de sus estados (o el vuelo del motor). */
export const capaCombatiente = (m: Pick<Combatiente, 'estados'>): CapaEstado | 'suelo' => capaDeEstados(m.estados);
export function estadosVisibles(m: Pick<Combatiente, 'estados'>) {
  return m.estados.map(e => { const d = definicionDe(e); return { id: e.id, nombre: e.nombre, icono: d ? iconoEstado(d) : (e.tipo || e.id) === 'vuelo' ? 'ala' : 'libro', restantes: e.restantes, categoria: d?.categoria, frase: d ? describirEstado({ ...d, nombre: e.nombre.split(':')[0] }) : e.nombre }; });
}
/** Barra de recursos para la tarjeta y la ficha, con su nombre configurado. */
export function recursosVisibles(m: Combatiente, gm = false) {
  return recursosDe(m).filter(d => gm || d.visible !== "gm").map(d => ({ id: d.id, nombre: d.nombre, saldo: saldoRecurso(m, d), tope: topeRecurso(d, estadisticas(m)), color: d.color, visible: d.visible || "todos" }));
}
/** Genera recursos del catálogo ante un evento. Sin rasgos no hace nada (regresión). */
function eventoRecurso(c: Combate, m: Combatiente, evento: EventoRecurso, etiquetas: string[] = []) {
  const defs = recursosDe(m); if (!defs.length) return;
  const s = estadisticas(m);
  for (const d of defs) {
    const antes = saldoRecurso(m, d), despues = generarRecurso(d, antes, evento, s, etiquetas);
    if (despues !== antes || m.recursos_especiales?.[d.id] === undefined) m.recursos_especiales = { ...m.recursos_especiales, [d.id]: despues };
    if (despues !== antes) log(c, `${m.nombre}: ${d.nombre} ${antes} → ${despues}.`);
  }
}
function potenciadoresDisponibles(m: Combatiente, e: Efecto, rasgos: Rasgo[]): PotenciadorDisponible[] {
  return potenciadoresPara(rasgos, e).map(({ rasgo, potenciador: p }) => {
    const k = p.coste.recurso, d = k ? rasgo.recursos.find(x => x.id === k.id) : undefined;
    return { rasgo: rasgo.id, rasgo_nombre: rasgo.nombre, potenciador: p.id, nombre: p.nombre, ph: p.coste.ph || 0, fatiga: p.coste.fatiga || 0,
      ...(k && d ? { recurso: { id: k.id, nombre: d.nombre, min: k.min, max: k.max, saldo: saldoRecurso(m, d) } } : {}), componentes: p.componentes_anadidos };
  });
}
export function actuar(
  c: Combate,
  actorId: string,
  accionId: string,
  objetivoId: string,
  rng: RNG = dadoSeguro,
  forzar = false,
  centro?: Posicion,
  potenciadores: EleccionPotenciador[] = [],
) {
  const n=registrar(c, () => actuarInterno(c, actorId, accionId, objetivoId, rng, forzar, centro, false, potenciadores),rng,actorId);
  const actor=c.miembros.find(m=>m.id===actorId),accion=actor?acciones(actor).find(a=>a.id===accionId):undefined,efecto=accion?.efecto;
  const animado=animarAccion(c,n,actorId,efecto,accionId,objetivoId,centro);
  // El gesto del arma sale de su esqueleto (o del concepto desarmado); el nombre solo para datos antiguos.
  if(actor&&efecto?.efecto==='dano'&&animado.evento_visual&&!animado.evento_visual.arma_visual){const v=esqueletoDeAccion(actor,accion,accionId);if(v)animado.evento_visual={...animado.evento_visual,arma_visual:v,...(esqueletoVisual(efecto)?{esqueleto:esqueletoVisual(efecto)}:{})};}
  return animado;
}
// Al suspender se conserva el estado previo. Se reutilizan las tiradas y respuestas ya decididas.
function resolverGolpe(c:Combate,orden:OrdenGolpe,tiradas:SolicitudReaccion['tiradas'],respuestas:boolean[],azar:RNG):Combate{
 let dado=0,pregunta=0;
 const rng:RNG=caras=>{
  const previo=tiradas[dado++];
  if(previo){if(previo.caras!==caras)throw Error('El ataque cambió durante la reacción.');return previo.valor;}
  const valor=azar(caras);tiradas.push({caras,valor});return valor;
 };
 class Pausa extends Error{readonly pausa_reaccion=true;constructor(readonly oferta:OfertaReaccion){super();}}
 rng.consultarReaccion=oferta=>{
  if(pregunta===respuestas.length)throw new Pausa(oferta);
  return respuestas[pregunta++];
 };
 try{
  if('turno' in orden)return orden.turno==='iniciar'?iniciar(c,rng):siguiente(c,rng);
  if('objeto' in orden)return usarObjeto(c,orden.actor,orden.objeto,orden.efecto,orden.objetivo,rng);
  return actuar(c,orden.actor,orden.accion,orden.objetivo,rng,orden.forzar,orden.centro,orden.potenciadores);}
 catch(e){if(!(e instanceof Pausa))throw e;return {...c,reaccion_pendiente:{oferta:e.oferta,orden,tiradas,respuestas}};}
}
export function actuarConReacciones(c:Combate,actor:string,accion:string,objetivo:string,rng:RNG=dadoSeguro,forzar=false,centro?:Posicion,potenciadores?:EleccionPotenciador[]){
 return resolverGolpe(c,{actor,accion,objetivo,forzar,centro,...(potenciadores?.length?{potenciadores}:{})},[],[],rng);
}
export function turnoConReacciones(c:Combate,turno:'iniciar'|'siguiente',rng:RNG=dadoSeguro){
 return resolverGolpe(c,{turno},[],[],rng);
}
export function objetoConReacciones(c:Combate,actor:string,objeto:string,efecto:string,objetivo:string,rng:RNG=dadoSeguro){
 return resolverGolpe(c,{actor,objeto,efecto,objetivo},[],[],rng);
}
export function responderReaccion(c:Combate,defensor:string,aceptar:boolean,rng:RNG=dadoSeguro){
 const {reaccion_pendiente:p,...previo}=c;
 if(!p||p.oferta.defensor!==defensor)throw Error('La reacción no corresponde a ese combatiente.');
 return resolverGolpe(previo,p.orden,[...p.tiradas],[...p.respuestas,aceptar],rng);
}
function animarAccion(c:Combate,n:Combate,actorId:string,efecto:Efecto|undefined,accionId:string,objetivoId:string,centro?:Posicion):Combate {
  const pos=posicionesTablero(c);
  const propio=efecto?.efecto==='transformacion'||efecto?.tablero?.afecta==='yo'||accionId==='volver_forma'||efecto?.vision?.modo==='abrir';
  const final=n.objetivo_final;delete n.objetivo_final;
  const desde=pos[actorId],patron=efecto?.tablero?.forma==='personalizada';
  const apuntaPatron=patron&&efecto?.tablero?.patron?.orientacion==='apuntar';
  const orientacion=apuntaPatron?centro||pos[objetivoId]||desde:desde;
  const hasta=patron||propio?desde:centro||pos[final||objetivoId]||desde;
  const area=efecto?.tablero&&hasta?(patron
    ?areaDesdeFicha(c.miembros.find(m=>m.id===actorId)||{},desde,orientacion,efecto.tablero,dimensionesTablero(c),c.mapa)
    :areaDesde(desde,hasta,efecto.tablero,dimensionesTablero(c))):undefined;
  n.evento_visual={...n.evento_visual,id:n.evento_visual?.id||crypto.randomUUID(),nombre:efecto?.nombre||accionId,dados:n.evento_visual?.dados||[],animacion:efecto?.animacion||'impacto',vfx:efecto?.vfx,emisor:actorId,desde:pos[actorId],hasta,area,
    movimientos:n.evento_visual?.movimientos?.map(m=>({...m,tipo:m.id===actorId?efecto?.tablero?.movimiento_lanzador?.tipo||m.tipo:m.tipo}))};
  return n;
}
export function mover(c: Combate, id: string, bando: Bando) {
  if (c.fase !== "preparacion")
    throw Error("Los bandos se eligen en preparación.");
  const n = copia(c),
    m = n.miembros.find((v) => v.id === id);
  if (!m) throw Error("Personaje no encontrado.");
  m.bando = bando;
  return n;
}
export function retirar(c: Combate, id: string) {
  if (c.fase !== "preparacion")
    throw Error(
      "Solo se pueden retirar combatientes antes de iniciar el combate.",
    );
  const n = copia(c),
    m = n.miembros.find((m) => m.id === id);
  if (!m) throw Error("Personaje no encontrado.");
  n.miembros = n.miembros.filter((m) => m.id !== id);
  log(
    n,
    `${m.nombre} se retira del campo. Su ficha e inventario se conservan.`,
  );
  return n;
}


// Runtime serializable: se guarda junto al encuentro y participa en Deshacer.
export type EstadoMotor = {
 modificadores: {origen?:string;clave:string;nombre:string;creado:number;duracion:number;cambios:{atributo:string;operacion:'sumar'|'multiplicar'|'fijar';valor:number}[]}[];
 habilidades: {origen?:string;id:string;clave:string;creado:number;duracion:number;accion:Efecto}[];
 usos: Record<string,number>; proximos: Record<string,number>; usos_turno?:Record<string,{turno:number;cantidad:number}>;
 progreso: {id:string;atributo:string;delta:number;regla:string}[];
};
function motor(m:Combatiente):EstadoMotor {return m.motor ||= {modificadores:[],habilidades:[],usos:{},proximos:{},progreso:[]};}
function definicionEnCombate(m:Combatiente) {
 const activacion=habilidadesDe(m).flatMap(h=>h.efectos||[]).find(e=>e.transformacion?.id===m.transformacion?.definicion_id);
 return activacion?.transformacion;
}
function pasivasEtapaActiva(m:Combatiente) {
 const d=definicionEnCombate(m);
 return d?.etapas.find(e=>e.id===m.transformacion?.etapa_id)?.reglas||[];
}

export function reglasMotor(m:Combatiente) {
 const fuentes: { id: string; reglas: Regla[]; fuente?: Pick<Fuente, "id" | "forja_id" | "imagen_url"> }[] = [
  {id:'propio',reglas:m.configuracion.reglas||[]},
  ...(m.transformacion?[{id:`etapa:${m.transformacion.definicion_id}:${m.transformacion.etapa_id}`,reglas:pasivasEtapaActiva(m)}]:[]),
  ...pasivasAplicables(m).map((p,i)=>({id:`pasiva:${p.id||i}`,reglas:p.reglas_motor||[],fuente:p})),
  ...(m.configuracion.habilidades||[]).filter(p=>!requisitosFuente(m,p).length).map((p,i)=>({id:`hab:${p.id||i}`,reglas:p.reglas||[],fuente:p})),
  ...Object.entries(piezas(m)).filter(([,p])=>!requisitosFuente(m,p).length).map(([slot,p])=>({id:`equipo:${p.id||slot}`,reglas:p.reglas||[],fuente:p})),
 ];
 const vistos=new Set<string>();
 return fuentes.flatMap(f=>f.reglas.map(regla=>({clave:`${f.id}:${regla.id}`,regla,fuente:f.fuente}))).filter(r=>{if(vistos.has(r.clave))return false;vistos.add(r.clave);return true;}).sort((a,b)=>b.regla.prioridad-a.regla.prioridad||a.clave.localeCompare(b.clave));
}
type ContextoMotor = {alcanceManual?:number;c:Combate;yo:Combatiente;actor:Combatiente;objetivo:Combatiente;rng:RNG;efecto?:Efecto;cantidad:number;profundidad:number;fuente?:string;estado_terminado?:string};
function sujetoMotor(ctx:ContextoMotor,s:Sujeto) {return s==='actor'?ctx.actor:s==='objetivo'?ctx.objetivo:ctx.yo;}
function valorMotor(v:ValorRegla|undefined,ctx:ContextoMotor):number {
 if(typeof v==='number')return v;
 if(!v)return 0;
 const m=sujetoMotor(ctx,v.desde||'yo');
 const n=(v.bono||0)+(v.dados?dados(ctx.c,v.dados,v.caras||6,ctx.rng,'Regla'):0)+(v.atributo?(estadisticas(m)[v.atributo]||0):0)+(v.evento?ctx.cantidad:0);
 const total=n*(v.escala??1);
 if(!Number.isFinite(total)||Math.abs(total)>100000000)throw Error('La fórmula produjo un valor fuera de rango.');
 return total;
}
function tieneMotor(m:Combatiente,clave:string){return m.estados.some(e=>e.tipo===clave||e.nombre===clave)||!!m.motor?.modificadores.some(e=>e.clave===clave);}
function condicionMotor(c:CondicionRegla,ctx:ContextoMotor):boolean {
 if(ctx.profundidad>8)throw Error('Demasiados niveles de reglas.');
 const sub={...ctx,profundidad:ctx.profundidad+1};
 switch(c.tipo){
  case 'siempre':return true;
  case 'estado_terminado':return ctx.estado_terminado===c.clave;
  case 'todas':return c.condiciones.every(x=>condicionMotor(x,sub));
  case 'alguna':return c.condiciones.some(x=>condicionMotor(x,sub));
  case 'no':return !condicionMotor(c.condicion,sub);
  case 'estado':return tieneMotor(sujetoMotor(ctx,c.sujeto),c.estado);
  case 'elemento':return elementoDe(ctx.efecto)===c.elemento;
  case 'probabilidad':return ctx.rng(100)<=c.porcentaje;
  case 'comparar':{
   const m=sujetoMotor(ctx,c.sujeto),s=estadisticas(m);
   const actual=c.atributo==='vida_actual'?m.vida:c.atributo==='ph_actual'?m.ph:c.atributo==='fatiga_actual'?m.fatiga:s[c.atributo]||0;
   const max=c.atributo==='vida_actual'?maxVida(m):c.atributo==='ph_actual'?s.ph:c.atributo==='fatiga_actual'?s.fatiga:100;
   const a=c.porcentaje?(max?actual/max*100:0):actual;
   return c.operador==='<'?a<c.valor:c.operador==='<='?a<=c.valor:c.operador==='>'?a>c.valor:c.operador==='>='?a>=c.valor:a===c.valor;
  }
 }
}
let profundidadMotor=0;
function emitirMotor(c:Combate,evento:EventoRegla,yo:Combatiente,actor:Combatiente,objetivo:Combatiente,rng:RNG,efecto?:Efecto,cantidad=0,estadoTerminado?:string){
 if(profundidadMotor>=8){log(c,'Se detuvo una cadena de reglas al alcanzar 8 eventos.');return;}
 profundidadMotor++;
 try {for(const {clave,regla} of reglasMotor(yo))if(regla.evento===evento)ejecutarRegla(c,yo,clave,regla,actor,objetivo,rng,efecto,cantidad,false,estadoTerminado);} finally {profundidadMotor--;}
}
function ejecutarRegla(c:Combate,yo:Combatiente,clave:string,r:Regla,actor:Combatiente,objetivo:Combatiente,rng:RNG,efecto?:Efecto,cantidad=0,manual=false,estadoTerminado?:string){
 const ctx:ContextoMotor={alcanceManual:manual?conAlcance({...basico(),efecto:'estado',nombre:r.nombre,coste_ph:r.coste_ph}).tablero?.alcance:undefined,c,yo,actor,objetivo,rng,efecto,cantidad,profundidad:0,fuente:clave.startsWith('equipo:')?clave.split(':').slice(0,2).join(':'):undefined,estado_terminado:estadoTerminado},m=motor(yo);
 const cantidadEnTurno=m.usos_turno?.[clave]?.turno===yo.turnos?m.usos_turno[clave].cantidad:0;
 const error=(r.limite_por_turno||0)>0&&cantidadEnTurno>=(r.limite_por_turno||0)?'Límite de usos por turno alcanzado.':typeof r.coste_ph!=='number'||!Number.isFinite(r.coste_ph)||r.coste_ph<0?'Coste de PH inválido.':!condicionMotor(r.condicion,ctx)?'No se cumplen las condiciones.':r.usos>0&&(m.usos[clave]||0)>=r.usos?'Sin usos restantes.':(m.proximos[clave]||0)>yo.turnos?'Regla en enfriamiento.':phDisponibles(yo)<r.coste_ph?'PH insuficientes.':r.coste_fatiga>0&&(yo.agotado||yo.fatiga+r.coste_fatiga>(estadisticas(yo).fatiga||0))?'Fatiga insuficiente.':'';
 if(error){if(manual)throw Error(error);return;}
 yo.ph=phDisponibles(yo)-r.coste_ph;yo.fatiga+=r.coste_fatiga;
 if(r.coste_fatiga){yo.uso_fatiga=true;if(yo.fatiga>=(estadisticas(yo).fatiga||0))yo.agotado=true;}
 m.usos[clave]=(m.usos[clave]||0)+1;if((r.limite_por_turno||0)>0){m.usos_turno||={};m.usos_turno[clave]={turno:yo.turnos,cantidad:cantidadEnTurno+1};}m.proximos[clave]=yo.turnos+r.enfriamiento+1;
 // Sin enfriamiento, distintas muertes durante un mismo turno sí cuentan.
 if(!r.enfriamiento)m.proximos[clave]=yo.turnos;
 log(c,`${yo.nombre} · ${r.nombre}`);
 // Tras comprobar y pagar la regla, antes de que sus efectos cambien la posición o la forma.
 if(typeof r.animacion?.id==='string'&&/^[a-z0-9_-]{1,120}$/.test(r.animacion.id)){
  const p=posicionesTablero(c)[yo.id],h=huellaDe(yo);
  const activaciones=activacionesPendientes.get(c)||[];
  if(p&&activaciones.length<24){
   const escala=r.animacion.escala;
   activaciones.push({id:String(activaciones.length),animacion:r.animacion.id,posicion:{x:p.x+(h.ancho-1)/2,y:p.y+(h.alto-1)/2},
    escala:typeof escala==='number'&&Number.isFinite(escala)&&escala>=.5&&escala<=4?escala:Math.min(4,Math.max(1.5,h.ancho,h.alto)+1)});
   activacionesPendientes.set(c,activaciones);
  }
 }
 efectosMotor(r.efectos,ctx,clave);
}
function efectosMotor(efectos:EfectoRegla[],ctx:ContextoMotor,origen:string){
 if(ctx.profundidad>8)throw Error('Demasiadas ramas de efectos.');
 for(const [indice,e] of efectos.entries()){
  const destinos=['aliados','enemigos','todos'].includes(e.destino)?ctx.c.miembros.filter(m=>(m.vida>0||e.tipo==='curar'&&situacionCombatiente(m)!=='muerto')&&(e.destino==='todos'||(e.destino==='aliados'?m.bando===ctx.yo.bando:m.bando!==ctx.yo.bando))):[sujetoMotor(ctx,e.destino as Sujeto)];
  for(const t of destinos){
   if(ctx.alcanceManual!==undefined&&t.id!==ctx.yo.id&&['dano','estado','perder_accion'].includes(e.tipo)){const p=posicionesTablero(ctx.c);if(distanciaEntreFichas(ctx.yo,p[ctx.yo.id],t,p[t.id])>ctx.alcanceManual)continue;}
   const v=()=>valorMotor(e.valor,ctx),m=motor(t),clave=e.clave||`${origen}:${indice}`;
   switch(e.tipo){
    case 'salvacion':case 'condicional':{
     const exito=e.tipo==='salvacion'?salvacion(ctx.c,t,e.cd||12,e.atributo||'salvacion',ctx.rng):condicionMotor(e.condicion||{tipo:'siempre'},ctx);
     efectosMotor((exito?e.exito:e.fallo)||[],{...ctx,objetivo:t,profundidad:ctx.profundidad+1},`${origen}:${indice}:${exito}`);break;
    }
    case 'perder_accion':t.accion_usada=true;delete t.rafaga;log(ctx.c,`${t.nombre} pierde su acción del turno.`);break;
    case 'mensaje':log(ctx.c,`${t.nombre}: ${e.nombre||'Efecto activado'}`);break;
    case 'curar':curarCombatiente(t,v());break;
    case 'ph':{const limite=Math.max(0,estadisticas(t).ph||0);t.ph=Math.max(0,Math.min(limite,phDisponibles(t)+v()));break;}
    case 'fatiga':{const n=v();if(n>0||!t.agotado)t.fatiga+=n;if(t.fatiga>=(estadisticas(t).fatiga||0)&&t.fatiga>0)t.agotado=true;break;}
    case 'dano':{
     const antes=t.vida,perdido=Math.min(antes,Math.max(0,v()));Object.assign(t,danarTransformado(t,perdido).actor);log(ctx.c,`${t.nombre}: ${perdido} daño directo por regla (sin impacto ni ARM).`);
     if(perdido>0){emitirMotor(ctx.c,'recibir_dano',t,ctx.yo,t,ctx.rng,undefined,perdido);if(t.id!==ctx.yo.id)emitirMotor(ctx.c,'causar_dano',ctx.yo,ctx.yo,t,ctx.rng,undefined,perdido);}
     if(antes>0&&t.vida<=0){emitirMotor(ctx.c,'morir',t,ctx.yo,t,ctx.rng);if(t.id!==ctx.yo.id&&t.bando!==ctx.yo.bando)emitirMotor(ctx.c,'matar',ctx.yo,ctx.yo,t,ctx.rng);}break;
    }
    case 'quitar_estado':{
     const existia=tieneMotor(t,clave);
     m.modificadores=m.modificadores.filter(x=>x.clave!==clave);m.habilidades=m.habilidades.filter(x=>x.clave!==clave);t.estados=t.estados.filter(x=>x.tipo!==clave&&x.nombre!==clave);
     normalizar(t);
     if(existia)emitirMotor(ctx.c,'fin_efecto',t,ctx.yo,t,ctx.rng,undefined,0,clave);
     break;
    }
    case 'habilidad':if(e.accion){m.habilidades=m.habilidades.filter(x=>x.id!==`${origen}:${indice}`);m.habilidades.push({origen:ctx.fuente,id:`${origen}:${indice}`,clave,accion:copia(e.accion),duracion:e.duracion||0,creado:t.turnos});}break;
    case 'estado':case 'transformar':case 'atributo':{
     const cambios=e.tipo==='atributo'?[{atributo:e.atributo||'vida',operacion:e.operacion||'sumar' as const,valor:v()}]:e.tipo==='transformar'?(e.cambios||[]).map(x=>({...x,valor:valorMotor(x.valor,ctx)})):[];
     if(e.permanente){for(const cambio of cambios){let delta=cambio.valor;
      if(e.limite){const ganado=m.progreso.filter(x=>x.regla===clave&&x.atributo===cambio.atributo).reduce((a,x)=>a+x.delta,0);delta=Math.max(0,Math.min(delta,e.limite-ganado));}
      if(delta){t.stats[cambio.atributo]=(t.stats[cambio.atributo]||0)+delta;m.progreso.push({id:crypto.randomUUID(),atributo:cambio.atributo,delta,regla:clave});log(ctx.c,`${t.nombre}: ${cambio.atributo} ${delta>0?'+':''}${delta} permanente.`);}
     }}else{
      if(!e.acumular)m.modificadores=m.modificadores.filter(x=>x.clave!==clave);
      if(!e.limite||m.modificadores.filter(x=>x.clave===clave).length<e.limite)m.modificadores.push({origen:ctx.fuente,clave,nombre:e.nombre||clave,creado:t.turnos,duracion:e.duracion||0,cambios});
     }break;
    }
   }
   normalizar(t);
  }
 }
}
function caducarMotor(c:Combate,m:Combatiente,rng:RNG){if(!m.motor)return;
 const terminados:string[]=[];
 m.motor.modificadores=m.motor.modificadores.filter(x=>{if(x.duracion===0||x.creado>=m.turnos||--x.duracion>0)return true;terminados.push(x.clave);return false;});
 m.motor.habilidades=m.motor.habilidades.filter(x=>x.duracion===0||x.creado>=m.turnos||--x.duracion>0);
 for(const clave of new Set(terminados))if(!m.motor.modificadores.some(x=>x.clave===clave)){
  m.motor.habilidades=m.motor.habilidades.filter(x=>x.clave!==clave);
  normalizar(m);
  emitirMotor(c,'fin_efecto',m,m,m,rng,undefined,0,clave);
 }
}

export const ESPACIOS_EQUIPO:Record<string,{nombre:string;tipos:string[]}>= {
 casco:{nombre:'Cabeza',tipos:['casco']},pechera:{nombre:'Torso',tipos:['pechera']},pantalones:{nombre:'Piernas',tipos:['pantalones']},zapatos:{nombre:'Botas',tipos:['zapatos']},capa:{nombre:'Capa',tipos:['capa']},
 mano_der:{nombre:'Mano derecha',tipos:['mano','dos_manos']},mano_izq:{nombre:'Mano izquierda',tipos:['mano','dos_manos']},
 ...Object.fromEntries(Array.from({length:6},(_,i)=>[`acc_${i+1}`,{nombre:`Accesorio ${i+1}`,tipos:['accesorio']}])),titulo:{nombre:'Título',tipos:['titulo']}
};
export function manosLibres(m:Combatiente):number {
 if(m.arma?.efecto.arma_slot==='dos_manos')return 0;
 const equipo={...piezas(m)};
 if(Object.values(equipo).some(p=>p.slot_tipo==='dos_manos'))return 0;
 if(m.arma)equipo[m.arma.slot]={nombre:m.arma.nombre,stats:{}};
 return Number(!equipo.mano_der)+Number(!equipo.mano_izq);
}
function activarEquipo(c:Combate,m:Combatiente,rng:RNG,ids?:Set<string>){
 for(const {clave,regla} of reglasMotor(m))if(regla.evento==='equipar'&&clave.startsWith('equipo:')&&(!ids||ids.has(clave.split(':')[1])))ejecutarRegla(c,m,clave,regla,m,m,rng);
}
export function seleccionEquipo(m:Combatiente):Record<string,string>{return Object.fromEntries(Object.entries(m.configuracion.equipamiento||{}).filter(([,p])=>p.id).map(([slot,p])=>[slot,p.id!]));}
export function cambiarEquipo(c:Combate,actorId:string,seleccion:Record<string,string>,rng:RNG=dadoSeguro):Combate {
 return registrar(c,()=>{
  const n=copia(c),m=n.miembros.find(v=>v.id===actorId);
  if(!m)throw Error('Personaje inexistente.');
  if(n.fase==='finalizado')throw Error('El encuentro ha terminado.');
  if(n.fase==='en_curso'&&(n.actual!==m.id||presupuestoRestante(n,m).principal<=0||m.vida<=0))throw Error('Cambiar equipo requiere tu turno y una acción disponible.');
  const anterior=m.configuracion.equipamiento||{},reserva=new Map([...(m.configuracion.reserva||[]),...Object.values(anterior)].filter(p=>p.id).map(p=>[p.id!,p]));
  const elegido:Record<string,Fuente>={},usados=new Set<string>();
  for(const [slot,id] of Object.entries(seleccion)){
   if(!id)continue;
   const espacio=ESPACIOS_EQUIPO[slot],pieza=reserva.get(id);
   if(!espacio||!pieza||(pieza.tipo_creacion&&!['objeto','titulo'].includes(pieza.tipo_creacion))||!espacio.tipos.includes(pieza.slot_tipo||'ninguno'))throw Error('Objeto incompatible o fuera del inventario.');
   if(usados.has(id))throw Error('Una misma pieza no puede ocupar dos espacios.');usados.add(id);const faltan=requisitosFuente(m,pieza);if(faltan.length)throw Error(`${pieza.nombre}: ${faltan.join('; ')}`);elegido[slot]=pieza;
  }
  if(n.fase==='en_curso'&&n.politica?.modo!=='entrenamiento'&&(anterior.titulo?.id||'')!==(elegido.titulo?.id||''))throw Error('El título solo se puede cambiar fuera de combate.');
  if((elegido.mano_der?.slot_tipo==='dos_manos'&&elegido.mano_izq)||(elegido.mano_izq?.slot_tipo==='dos_manos'&&elegido.mano_der))throw Error('Un arma de dos manos ocupa ambas manos.');
  if(JSON.stringify(Object.entries(seleccionEquipo(m)).sort())===JSON.stringify(Object.entries(seleccion).filter(([,id])=>id).sort()))throw Error('No hay cambios de equipamiento.');
  const antiguos=new Set(Object.values(anterior).map(p=>p.id).filter(Boolean)),nuevos=new Set(Object.values(elegido).map(p=>p.id).filter(Boolean));
  for(const {clave,regla} of reglasMotor(m))if(regla.evento==='desequipar'&&clave.startsWith('equipo:')&&!nuevos.has(clave.split(':')[1]))ejecutarRegla(n,m,clave,regla,m,m,rng);
  if(m.motor){
   const retirar=(origen?:string)=>!!origen&&origen.startsWith('equipo:')&&!nuevos.has(origen.slice(7));
   m.motor.modificadores=m.motor.modificadores.filter(x=>!retirar(x.origen));
   m.motor.habilidades=m.motor.habilidades.filter(x=>!retirar(x.origen));
  }
  const bonos=(equipo:Record<string,Fuente>)=>{const b:Record<string,number>={};for(const p of Object.values(equipo))for(const [k,v] of Object.entries(p.stats||{}))if(!['peso','durabilidad','dados_dano','caras_dano','dano'].includes(k))b[k]=(b[k]||0)+v;return b;};
  const viejos=bonos(anterior),actuales=bonos(elegido);
  for(const k of new Set([...Object.keys(viejos),...Object.keys(actuales)])){
   const delta=-(viejos[k]||0)+(actuales[k]||0);m.stats[k]=(m.stats[k]||0)+delta;
   if(m.transformacion)m.transformacion.stats_originales[k]=(m.transformacion.stats_originales[k]||0)+delta;
  }
  const cambianManos=['mano_der','mano_izq'].some(k=>anterior[k]?.id!==elegido[k]?.id);
  if(cambianManos)delete m.arma;
  m.configuracion.habilidades=m.configuracion.habilidades?.filter(h=>!h.id||!reserva.has(h.id)||['habilidad','pasiva'].includes(reserva.get(h.id)?.tipo_creacion||''));
  m.configuracion.equipamiento=elegido;m.configuracion.bonos_equipamiento=actuales;m.configuracion.reserva=[...reserva.values()];
  activarEquipo(n,m,rng,new Set([...nuevos].filter((id):id is string=>!!id&&!antiguos.has(id))));
  normalizar(m);
  if(n.fase==='en_curso'){m.accion_usada=true;cerrarPrincipal(n,m);}
  log(n,`${m.nombre} cambia su equipamiento${n.fase==='en_curso'?' y consume su acción':''}. Manos libres: ${manosLibres(m)}.`);
  return n;
 });
}

export function accionesObjeto(m:Combatiente,p:Fuente):{id:string;nombre:string;coste_ph:number;coste_fatiga:number;bloqueada?:string}[]{
 if(p.tipo_creacion&&p.tipo_creacion!=='objeto')return [];
 if(requisitosFuente(m,p).length)return [];
 const equipado=Object.values(m.configuracion.equipamiento||{}).some(v=>v.id===p.id);
 if(!equipado&&!p.consumible&&p.slot_tipo&&p.slot_tipo!=='ninguno')return [];
 return [...(p.efectos||[]).filter(e=>!e.requisito_forma||(estadisticas(m)[e.requisito_forma.atributo]||0)>=e.requisito_forma.minimo).map(e=>({id:e.id,nombre:e.nombre,coste_ph:e.coste_ph||0,coste_fatiga:e.coste_fatiga||0})),...(p.reglas||[]).filter(r=>r.evento==='usar').map(r=>({id:'regla:'+r.id,nombre:r.nombre,coste_ph:r.coste_ph,coste_fatiga:r.coste_fatiga}))].map(a=>({...a,bloqueada:phDisponibles(m)<a.coste_ph?'PH insuficientes.':a.coste_fatiga>0&&(m.agotado||m.fatiga+a.coste_fatiga>(estadisticas(m).fatiga||0))?'Fatiga insuficiente.':undefined}));
}
export function usarObjeto(c:Combate,actorId:string,objetoId:string,efectoId:string,objetivoId:string,rng:RNG=dadoSeguro):Combate{
 const n=registrar(c,()=>{
  const n=copia(c),m=n.miembros.find(x=>x.id===actorId);
  // La acción disponible la decide el presupuesto (actuarInterno): un objeto adicional o legendario no exige la principal.
  if(!m||n.fase!=='en_curso'||n.actual!==m.id||m.vida<=0)throw Error('Usar un objeto requiere tu turno y una acción disponible.');
  const p=m.configuracion.reserva?.find(p=>p.id===objetoId);
  if(!p||!accionesObjeto(m,p).some(a=>a.id===efectoId))throw Error('Este objeto no está disponible o debes equiparlo primero.');
  const objetivo=n.miembros.find(v=>v.id===objetivoId);if(!objetivo||situacionCombatiente(objetivo)==='muerto')throw Error('Selecciona un objetivo vivo.');
  const slot=Object.entries(m.configuracion.equipamiento||{}).find(([,v])=>v.id===p.id)?.[0];
  const temporal='inventario-'+p.id;
  if(!slot)(m.configuracion.habilidades||=[]).push({...p,id:temporal});
  const id=efectoId.startsWith('regla:')?`regla:${slot?'equipo:'+p.id:'hab:'+temporal}:${efectoId.slice(6)}`:slot?`equipo:${slot}:${efectoId}`:`hab:${temporal}:${efectoId}`;
  // Mismo presupuesto que cualquier acción: con varias principales no se pierde la siguiente, y las adicionales no gastan la principal.
  const resultado=actuarInterno(n,m.id,id,objetivoId,rng,false,undefined,false,[]),actor=resultado.miembros.find(v=>v.id===actorId)!;
  actor.configuracion.habilidades=actor.configuracion.habilidades?.filter(h=>h.id!==temporal);
  if(p.consumible){
   actor.configuracion.reserva=actor.configuracion.reserva?.filter(v=>v.id!==p.id);
   actor.configuracion.consumidos=[...new Set([...(actor.configuracion.consumidos||[]),p.id!])];
   if(slot){
    // Solo los objetos no equipables deben marcarse consumibles.
    throw Error('Guarda el objeto antes de consumirlo.');
   }
   log(resultado,`${actor.nombre} consume ${p.nombre}.`);
  }else log(resultado,`${actor.nombre} usa ${p.nombre}.`);
  return resultado;
 });
 const efecto=c.miembros.find(m=>m.id===actorId)?.configuracion.reserva?.find(p=>p.id===objetoId)?.efectos?.find(e=>e.id===efectoId);
 return animarAccion(c,n,actorId,efecto,efectoId,objetivoId);
}

/** Prefijo de las acciones de invocar en la barra: `invocar:<id de la habilidad>`. */
export const PREFIJO_INVOCAR='invocar:';
/** Habilidades del combatiente que traen una criatura. */
export function fuentesInvocacion(m:Combatiente):Fuente[]{
 return habilidadesDe(m).filter(h=>!!h.id&&!!h.configuracion_invocacion&&typeof h.configuracion_invocacion==='object');
}
/** Criaturas en pie que `actorId` mantiene (opcionalmente, de una habilidad). */
export function invocacionesDe(c:Pick<Combate,'miembros'>,actorId:string,habilidad?:string):Combatiente[]{
 return c.miembros.filter(m=>m.invocacion?.invocador===actorId&&(!habilidad||m.invocacion.habilidad===habilidad)&&m.vida>0);
}
/** Por qué no se puede invocar con esta habilidad ahora (sin contar turno ni acción disponible). */
export function motivoNoInvocar(c:Combate,actor:Combatiente,habilidad:Fuente):string|undefined{
 const config=habilidad.configuracion_invocacion;
 if(!config)return 'Esta habilidad no invoca.';
 const faltan=requisitosFuente(actor,habilidad);if(faltan.length)return faltan.join('; ');
 const maxActivas=config.maxActivas??1;
 if(invocacionesDe(c,actor.id,habilidad.id).length>=maxActivas)return maxActivas===1?'Ya tienes esta criatura en el campo.':`Ya tienes ${maxActivas} criaturas de esta habilidad en el campo.`;
 const ph=config.costePh??0,fatiga=config.costeFatiga??0;
 if(phDisponibles(actor)<ph)return `PH insuficientes: necesitas ${ph}.`;
 if(fatiga>0&&(actor.agotado||actor.fatiga+fatiga>(estadisticas(actor).fatiga||0)))return 'Fatiga insuficiente para invocar.';
 if(c.miembros.length>=100)return 'Máximo cien participantes.';
 return undefined;
}
/** Acciones de invocar de `acciones()` con los límites que dependen del combate (criaturas activas, recursos, aforo). */
export function accionesInvocacion(c:Combate,m:Combatiente):Accion[]{
 return acciones(m).filter(a=>a.invocacion).map(a=>({...a,bloqueada:a.bloqueada||motivoNoInvocar(c,m,a.invocacion!)}));
}
/** Las acciones del combatiente para la barra, con las invocaciones ya limitadas. */
export function accionesEnCombate(c:Combate,m:Combatiente):Accion[]{
 const limitadas=new Map(accionesInvocacion(c,m).map(a=>[a.id,a]));
 return acciones(m).map(a=>limitadas.get(a.id)||a);
}
/** Las criaturas cuyo invocador cae o deja el combate se desvanecen al instante. */
function desvanecerHuerfanas(n:Combate){
 for(const m of n.miembros){
  if(!m.invocacion||m.vida<=0)continue;
  const dueno=n.miembros.find(x=>x.id===m.invocacion!.invocador);
  if(dueno&&combatienteActivo(dueno))continue;
  m.vida=0;log(n,`${m.nombre} se desvanece: ${dueno?.nombre||'quien la invocó'} ya no puede sostenerla.`);
 }
}
/** Las invocaciones caídas o terminadas dejan el campo (salvo la que aún tiene el turno, que se va al cerrarlo). */
function retirarInvocaciones(n:Combate){
 n.miembros=n.miembros.filter(m=>!(m.invocacion&&m.vida<=0&&m.id!==n.actual));
}
/** Valida forma y tamaño de lo que propone un jugador (la clase la valida la pantalla del GM). */
function propuestaSegura(p:unknown):import("./invocaciones").PropuestaInvocacion|undefined{
 if(p===undefined||p===null)return undefined;
 const x=p as Record<string,unknown>;
 const lista=(v:unknown)=>Array.isArray(v)&&v.length<=20&&v.every(i=>typeof i==='string'&&i.length<=80)?v as string[]:null;
 const stats=x.stats&&typeof x.stats==='object'&&!Array.isArray(x.stats)?Object.entries(x.stats as Record<string,unknown>):null;
 if(typeof x.nombre!=='string'||x.nombre.length>60||(x.apariencia!==undefined&&(typeof x.apariencia!=='string'||x.apariencia.length>500))||!stats||stats.length>60
  ||stats.some(([k,v])=>k.length>40||typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1000000)||!lista(x.habilidades)||!lista(x.pasivas))throw Error('Propuesta de invocación inválida.');
 return {nombre:x.nombre.trim(),...(x.apariencia?{apariencia:String(x.apariencia)}:{}),stats:Object.fromEntries(stats) as Record<string,number>,habilidades:[...x.habilidades as string[]],pasivas:[...x.pasivas as string[]]};
}
/** El jugador pide invocar en su turno: queda pendiente hasta que la pantalla del GM la valide. No paga nada todavía. */
export function solicitarInvocacion(c:Combate,actorId:string,habilidadId:string,propuesta?:unknown):Combate{
 const actor=c.miembros.find(m=>m.id===actorId);
 if(c.fase!=='en_curso'||c.actual!==actorId||!actor||!combatienteActivo(actor)||presupuestoRestante(c,actor).principal<=0)throw Error('Solo puedes invocar durante tu turno con una acción disponible.');
 if(c.reaccion_pendiente)throw Error('Hay una reacción pendiente de respuesta.');
 if(c.solicitud_invocacion)throw Error('Ya hay una invocación esperando validación.');
 const h=fuentesInvocacion(actor).find(x=>x.id===habilidadId);
 if(!h)throw Error('Esa habilidad no invoca o no la tienes.');
 const motivo=motivoNoInvocar(c,actor,h);if(motivo)throw Error(motivo);
 const p=propuestaSegura(propuesta);
 if(h.configuracion_invocacion!.modo==='jugador_en_combate'&&!p)throw Error('Diseña tu criatura antes de invocarla.');
 const n=copia(c);
 n.solicitud_invocacion={id:crypto.randomUUID(),actor:actorId,habilidad:habilidadId,ronda:c.ronda,...(p&&h.configuracion_invocacion!.modo==='jugador_en_combate'?{propuesta:p}:{})};
 if(n.invocacion_rechazada?.actor===actorId)delete n.invocacion_rechazada;
 log(n,`${actor.nombre} empieza a invocar con ${h.nombre}…`);
 return n;
}
/** Retira la solicitud pendiente: la cancela quien la pidió o la rechaza el GM (con motivo). */
export function cancelarInvocacion(c:Combate,actorId:string,motivo?:string):Combate{
 const sol=c.solicitud_invocacion;
 if(!sol||sol.actor!==actorId)throw Error('No hay una invocación pendiente.');
 const n=copia(c);delete n.solicitud_invocacion;
 const actor=n.miembros.find(m=>m.id===actorId);
 if(motivo){n.invocacion_rechazada={id:sol.id,actor:actorId,motivo};log(n,`La invocación de ${actor?.nombre||'un combatiente'} no se completa: ${motivo}`);}
 else log(n,`${actor?.nombre||'Un combatiente'} cancela su invocación.`);
 return n;
}

/** Invocar es una acción atómica: el llamador valida la propuesta antes de pagar. */
export function incorporarInvocacion(c:Combate,actorId:string,habilidad:Fuente,preparado:Parameters<typeof agregar>[1],duracion:number,maxActivas=1,rng:RNG=dadoSeguro,apariencia?:string){
 const actor=c.miembros.find(m=>m.id===actorId);
 if(c.fase!=="en_curso"||c.actual!==actorId||!actor||!combatienteActivo(actor)||presupuestoRestante(c,actor).principal<=0)throw Error("Solo puedes invocar durante tu turno con una acción disponible.");
 // La configuración sale de la habilidad que tiene equipada, nunca de la que llega del cliente.
 const equipada=fuentesInvocacion(actor).find(h=>h.id===habilidad.id);
 if(!equipada)throw Error("Habilidad no equipada.");
 const config=equipada.configuracion_invocacion;
 if(!config||!Number.isInteger(duracion)||duracion<1||!Number.isInteger(maxActivas)||maxActivas<1)throw Error("Configuración de invocación inválida.");
 if(config.duracionTurnos!=null&&duracion!==config.duracionTurnos||maxActivas!==(config.maxActivas??1))throw Error("Los límites de invocación cambiaron.");
 if(actor.rafaga?.restantes)throw Error("No puedes invocar en este momento.");
 const ph=config.costePh??0,fatiga=config.costeFatiga??0;
 if(!Number.isInteger(ph)||!Number.isInteger(fatiga)||ph<0||fatiga<0)throw Error("Costes inválidos.");
 const motivo=motivoNoInvocar(c,actor,equipada);
 if(motivo)throw Error(motivo.startsWith('PH')||motivo.startsWith('Fatiga')?"No tienes recursos suficientes para invocar.":motivo.startsWith('Ya tienes')?"Ya alcanzaste el límite de invocaciones activas.":motivo);
 return registrar(c,()=>{
  const posiciones=posicionesTablero(c);
  const temporal={...c,fase:"preparacion" as const,miembros:c.miembros.map(m=>({...m,posicion:posiciones[m.id]}))};
  const n=agregar(temporal,{...preparado,id:crypto.randomUUID()},actor.bando,rng);n.fase=c.fase;
  const criatura=n.miembros[n.miembros.length-1],p=posicionesTablero(n)[criatura.id];
  if(!p)throw Error('No hay espacio libre para la ficha invocada.');
  criatura.posicion=p;
  const a=n.miembros.find(m=>m.id===actorId)!;a.ph=phDisponibles(a)-ph;a.fatiga+=fatiga;if(fatiga)a.uso_fatiga=true;a.accion_usada=true;cerrarPrincipal(n,a);
  delete a.solicitud_invocacion;
  criatura.invocacion={invocador:actorId,habilidad:habilidad.id!,restantes:duracion,...(apariencia?{apariencia}:{})};
  if(n.solicitud_invocacion?.actor===actorId)delete n.solicitud_invocacion;
  if(n.invocacion_rechazada?.actor===actorId)delete n.invocacion_rechazada;
  log(n,`${a.nombre} invoca a ${criatura.nombre} durante ${duracion} turnos propios.`);return n;
 });
}


/** Tablero inicial sin editor de mapas. Las posiciones se guardan en el encuentro. */
export function dimensionesTablero(c: Pick<Combate, 'miembros'|'mapa'>) {
  return c.mapa ? {columnas:c.mapa.columnas,filas:c.mapa.filas} : { columnas: 12, filas: Math.max(8, Math.ceil(c.miembros.length / 8) + 2) };
}
/** Guarda espacio para volver al tamaño original incluso al moverse bajo una forma más pequeña. */
export function huellaReserva(m:FuenteHuella):FuenteHuella {
 if(!m.transformacion)return m;
 const base=huellaDe({configuracion:m.configuracion}), actual=huellaDe(m);
 // Reserva el rectángulo que contiene tanto la forma activa como la original.
 return {huella:{ancho:Math.max(base.ancho,actual.ancho),alto:Math.max(base.alto,actual.alto)}};
}
function casillasOtras(miembros:Combatiente[],pos:Record<string,Posicion>,id:string):Posicion[]{
 return miembros.filter(m=>m.id!==id).flatMap(m=>casillasHuella(huellaReserva(m),pos[m.id]));
}
export function cabeFichaEn(c:Pick<Combate,'miembros'|'mapa'>,m:Combatiente,p:Posicion|undefined,pos=posicionesTablero(c)):boolean {
 const ocupadas=new Set(casillasOtras(c.miembros,pos,m.id).map(claveHuella));
 return cabeHuella(huellaReserva(m),p,dimensionesTablero(c),q=>ocupadas.has(claveHuella(q))||c.mapa?.celdas[claveHuella(q)]==='muro');
}
/** Tamaño del participante en el encuentro actual. */
export function configurarHuellaParticipante(c:Combate,id:string,huella:Huella|undefined):Combate{
 if(c.fase!=='preparacion')throw Error('Configura el tamaño antes de iniciar el combate.');
 const fallo=validarHuella(huella);if(fallo)throw Error(fallo);
 const n=copia(c),m=n.miembros.find(a=>a.id===id);
 if(!m)throw Error('No existe ese participante.');
 const config={...m.configuracion};if(huella)config.huella={...huella};else delete config.huella;
 if(!aplicarFormaConEspacio(n,m,{...m,configuracion:config}))throw Error('No hay espacio para ese tamaño. Mueve la ficha antes de agrandarla.');
 return n;
}
export type EvolucionEnCombate={etapa_id:string;nombre:string;desde?:string|null;transicion_id?:string|null;action_id:string;persistir:boolean;habilidades:string[];pasivas:string[]};
const ID_PASIVA_ETAPA='etapa-evolutiva';
/**
 * Evolución permanente dentro del encuentro: el mismo combatiente (mismo id y mismo turno) cambia de etapa.
 * Conserva enfriamientos, estados y recursos actuales (solo se limitan al nuevo máximo salvo recuperación configurada).
 * Si hay una transformación temporal activa, su referencia pasa a ser la nueva etapa permanente.
 * Idempotente por `action_id`. En práctica (`entrenamiento`) o en una recreación histórica no se marca para guardar.
 */
export function evolucionarEnCombate(c:Combate,actorId:string,etapa:EtapaEvolutiva,opciones:{action_id:string;transicion_id?:string|null;recuperacion?:Recuperacion;catalogo?:Fuente[];rng?:RNG}):Combate{
 if(c.fase==='finalizado')throw Error('El encuentro ya terminó.');
 const previo=c.miembros.find(a=>a.id===actorId);
 if(!previo)throw Error('No existe ese participante.');
 if(previo.evolucion?.action_id===opciones.action_id)return c;
 if(previo.evolucion?.etapa_id===etapa.id)throw Error(`${previo.nombre} ya está en ${etapa.nombre}.`);
 if(previo.vida<=0)throw Error('Un combatiente caído no puede evolucionar.');
 const rng=opciones.rng||dadoSeguro;
 // Mismo registro que cualquier acción: se puede deshacer y comparte el evento visual del encuentro.
 return registrar(c,()=>{
 const n=copia(c),m=n.miembros.find(a=>a.id===actorId)!;
 const bonos=m.configuracion.bonos_equipamiento||{};
 // Sin stats_base, las estadísticas ya incluyen el equipo: se descuenta para no sumarlo dos veces.
 const origen=m.configuracion.stats_base||Object.fromEntries(Object.entries(m.stats).map(([k,v])=>[k,v-(bonos[k]||0)]));
 const base={...origen,...etapa.stats};
 if(m.stats.nivel!==undefined)base.nivel=m.stats.nivel;
 const permanentes:Record<string,number>={...base};
 for(const [k,v] of Object.entries(bonos))permanentes[k]=(permanentes[k]||0)+v;
 const maximoAntes=maxVida(m),phAntes=Math.max(0,estadisticas(m).ph||0);
 const forma:Combatiente={...m,stats:permanentes,configuracion:{...m.configuracion,stats_base:base}};
 if(m.transformacion){
  // La transformación conserva sus cambios propios y vuelve, al terminar, a la etapa nueva.
  const t=m.transformacion,propios=Object.fromEntries(Object.entries(m.stats).filter(([k,v])=>t.stats_originales[k]!==v));
  forma.stats={...permanentes,...propios};
  forma.transformacion={...t,stats_originales:permanentes,vida_original:t.tipo==='forma'?Math.min(t.vida_original,Math.max(1,Math.trunc(permanentes.vida??permanentes.hp??1))):t.vida_original};
 }
 const config=forma.configuracion;
 if(etapa.retrato||etapa.sprite)config.imagen_url=etapa.sprite||etapa.retrato;
 if(etapa.huella)config.huella={...etapa.huella};
 if(etapa.raza)config.raza=etapa.raza;
 if(etapa.inmunidades)config.inmunidades=copia(etapa.inmunidades);
 const anteriores=m.evolucion||{habilidades:[] as string[],pasivas:[] as string[]};
 const catalogo=opciones.catalogo||[];
 const fuente=(id:string)=>catalogo.find(f=>f.id===id||f.forja_id===id);
 const nuevasHab=[...new Set([...etapa.habilidades,...(etapa.habilidades_naturales||[]),...(etapa.magia||[])])].filter(fuente);
 const conocidas=(config.habilidades||[]).filter(h=>!anteriores.habilidades.includes(h.forja_id||h.id||''));
 config.habilidades=[...conocidas,...nuevasHab.filter(id=>!conocidas.some(h=>(h.forja_id||h.id)===id)).map(id=>copia(fuente(id)!))];
 const pasivasEtapa=etapa.pasivas.filter(fuente);
 config.pasivas=[...(config.pasivas||[]).filter(p=>p.id!==ID_PASIVA_ETAPA&&!anteriores.pasivas.includes(p.id||'')),
  ...pasivasEtapa.filter(id=>!(config.pasivas||[]).some(p=>p.id===id&&!anteriores.pasivas.includes(id))).map(id=>{const f=fuente(id)!;return {id,nombre:f.nombre,requisitos_uso:f.requisitos_uso,reglas:f.reglas_pasivas||[],reglas_motor:f.reglas||[]};}),
  ...(etapa.reglas?.length?[{id:ID_PASIVA_ETAPA,nombre:`Etapa · ${etapa.nombre}`,reglas:[],reglas_motor:copia(etapa.reglas)}]:[])];
 if(!aplicarFormaConEspacio(n,m,forma,rng,{cantidad:0,caras:2}))throw Error('No hay espacio en el tablero para el nuevo tamaño.');
 // Recursos: nunca curación gratuita. Solo la recuperación configurada en la transición devuelve vida o PH.
 const r=opciones.recuperacion||{modo:'ninguna'};
 const maximo=maxVida(m),phMax=Math.max(0,estadisticas(m).ph||0);
 if(r.modo==='completa'){m.vida=maximo;m.ph=phMax;}
 else if(r.modo==='proporcional'){m.vida=Math.max(1,Math.round(m.vida/maximoAntes*maximo));m.ph=Math.round(m.ph/Math.max(1,phAntes)*phMax);}
 else if(r.modo==='fija'){m.vida+=r.vida||0;m.ph+=r.ph||0;}
 m.evolucion={etapa_id:etapa.id,nombre:etapa.nombre,desde:previo.evolucion?.etapa_id??null,transicion_id:opciones.transicion_id??null,action_id:opciones.action_id,
  persistir:n.politica?.modo!=='entrenamiento'&&!!m.personaje_id&&!m.etapa_historica,habilidades:nuevasHab,pasivas:pasivasEtapa};
 normalizar(m);
 log(n,`${m.nombre} evoluciona: ${etapa.nombre}.`);
 const posicion=posicionesTablero(n)[m.id];
 if(etapa.vfx?.entrada&&posicion)activacionesPendientes.set(n,[...(activacionesPendientes.get(n)||[]),{id:m.id,animacion:etapa.vfx.entrada,posicion,escala:etapa.vfx.escala}]);
 return n;
 },rng,null);
}
/** Evoluciones que deben guardarse en el personaje real al cerrar el encuentro (nunca en práctica). */
export function evolucionesPendientes(c:Pick<Combate,'miembros'|'politica'>):{personaje_id:string;etapa_id:string;transicion_id:string|null;action_id:string}[]{
 if(c.politica?.modo==='entrenamiento')return [];
 return c.miembros.filter(m=>m.evolucion?.persistir&&m.personaje_id&&!m.etapa_historica).map(m=>({personaje_id:m.personaje_id!,etapa_id:m.evolucion!.etapa_id,transicion_id:m.evolucion!.transicion_id??null,action_id:m.evolucion!.action_id}));
}
/**
 * Recreación de una etapa histórica en un encuentro aislado: copia efímera sin vínculo con el personaje real,
 * sin equipo real (el equipo histórico es solo un registro) y sin recompensas.
 */
export function prepararEtapaHistorica<T extends {nombre:string;stats:Record<string,number>;configuracion:Config;personaje_id?:string|number|null;id?:string}>(f:T,etapa:EtapaEvolutiva):T{
 const stats={...etapa.stats};
 const {personaje_id:_omitido,...resto}=f;void _omitido;
 const configuracion:Config={...copia(f.configuracion),stats_base:{...stats},bonos_equipamiento:{},equipamiento:{},reserva:[],...(etapa.retrato?{imagen_url:etapa.retrato}:{}),...(etapa.huella?{huella:{...etapa.huella}}:{}),...(etapa.inmunidades?{inmunidades:copia(etapa.inmunidades)}:{}),
  pasivas:[...(f.configuracion.pasivas||[]),...(etapa.reglas?.length?[{id:ID_PASIVA_ETAPA,nombre:`Etapa · ${etapa.nombre}`,reglas:[],reglas_motor:copia(etapa.reglas)}]:[])]};
 return {...resto,nombre:`${f.nombre} · ${etapa.nombre}`,stats,configuracion,etapa_historica:{etapa_id:etapa.id,nombre:etapa.nombre}} as unknown as T;
}
/** Un encuentro histórico es siempre de práctica: sin EXP, sin botín y sin escribir en fichas reales. */
export function politicaHistorica(p?:PoliticaEncuentro):PoliticaEncuentro{
 return {...(p||{automatico:false,limite_rondas:0,dificultad:1,reparto:'replicar',premiar_retirados:false}),modo:'entrenamiento',exp_base:0,exp_objetivo:0};
}
/** Planifica todo sin modificar el encuentro ni tirar dados. Cada desplazamiento usa una ruta ortogonal libre. */
function planEmpujeDeForma(c:Combate,m:Combatiente,forma:Combatiente,pos:Record<string,Posicion>){
 const origen=pos[m.id],dims=dimensionesTablero(c),nueva=huellaReserva(forma);
 const muro=(q:Posicion)=>c.mapa?.celdas[claveHuella(q)]==='muro';
 if(!cabeHuella(nueva,origen,dims,muro))return null;
 const superficie=new Set(casillasHuella(nueva,origen).map(claveHuella));
 const miembros=c.miembros.filter(x=>x.id!==m.id&&pos[x.id]);
 const pendientes=miembros.filter(x=>casillasHuella(huellaReserva(x),pos[x.id]).some(q=>superficie.has(claveHuella(q))));
 const ubicacion={...pos},visitados=new Set<string>();
 const actual=huellaReserva(m);
 let pasosEvaluados=0;
 const LIMITE_PASOS=120_000;
 function salidas(t:Combatiente){
  const ficha=huellaReserva(t),inicio=ubicacion[t.id];
  const ocupadas=new Set([
   ...casillasHuella(actual,origen),
   ...miembros.filter(x=>x.id!==t.id).flatMap(x=>casillasHuella(huellaReserva(x),ubicacion[x.id])),
  ].map(claveHuella));
  const cola=[{p:inicio,d:0}],vistas=new Set([claveHuella(inicio)]),r:{p:Posicion;d:number}[]=[];
  for(let i=0;i<cola.length;i++){
   const {p,d}=cola[i];
   if(d&&casillasHuella(ficha,p).every(q=>!superficie.has(claveHuella(q))))r.push({p,d});
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    if(++pasosEvaluados>LIMITE_PASOS)return r;
    const q={x:p.x+dx,y:p.y+dy},k=claveHuella(q);
    if(vistas.has(k)||!cabeHuella(ficha,q,dims,x=>muro(x)||ocupadas.has(claveHuella(x))))continue;
    vistas.add(k);cola.push({p:q,d:d+1});
   }
  }
  return r.sort((a,b)=>a.d-b.d||distanciaEntreFichas(nueva,origen,ficha,b.p)-distanciaEntreFichas(nueva,origen,ficha,a.p)||a.p.y-b.p.y||a.p.x-b.p.x);
 }
 type Salida={t:Combatiente;desde:Posicion;hasta:Posicion};
 function buscar(restan:Combatiente[]):Salida[]|null{
  if(!restan.length)return [];
  // Limita la búsqueda en tableros llenos; se rechaza el cambio completo si no hay plan.
  if(visitados.size>=2048||pasosEvaluados>LIMITE_PASOS)return null;
  const k=pendientes.map(t=>claveHuella(ubicacion[t.id])).join(';');
  if(visitados.has(k))return null;
  visitados.add(k);
  const opciones=restan.map(t=>({t,r:salidas(t)})).filter(x=>x.r.length).sort((a,b)=>a.r.length-b.r.length||a.t.id.localeCompare(b.t.id));
  for(const {t,r} of opciones){
   const desde=ubicacion[t.id];
   for(const {p:hasta} of r){
    ubicacion[t.id]=hasta;
    const resto=buscar(restan.filter(x=>x.id!==t.id));
    if(resto)return [{t,desde,hasta},...resto];
    ubicacion[t.id]=desde;
   }
  }
  return null;
 }
 return buscar(pendientes);
}
function aplicarFormaConEspacio(c:Combate,m:Combatiente,forma:Combatiente,rng?:RNG,empuje=forma.transformacion?.empuje_huella) {
 const posiciones=posicionesTablero(c),p=posiciones[m.id];
 const plan=cabeFichaEn(c,forma,p,posiciones)?[]:rng&&empuje?planEmpujeDeForma(c,m,forma,posiciones):null;
 if(!plan)return false;
 // Fija primero todos los destinos; ninguna tirada, movimiento ni coste parcial en un plan fallido.
 for(const a of c.miembros)if(posiciones[a.id])a.posicion=posiciones[a.id];
 for(const {t,hasta} of plan)t.posicion=hasta;
 Object.assign(m,forma,{posicion:p});
 if(rng&&empuje)for(const {t} of plan){
  log(c,`${m.nombre} empuja a ${t.nombre} al crecer.`);
  if(empuje.cantidad&&t.vida>0){
   const total=dados(c,empuje.cantidad,empuje.caras,rng,`Empuje de ${m.nombre} a ${t.nombre}`);
   recibir(c,m,t,{...basico(),id:'empuje-forma',naturaleza:'fisica',efecto:'dano'},total,[],rng);
  }
 }
 return true;
}
export function posicionesTablero(c: Pick<Combate, 'miembros'|'mapa'>): Record<string, Posicion> {
  const d=dimensionesTablero(c),{columnas,filas}=d,resultado:Record<string,Posicion>={},ocupadas=new Set<string>();
  const colocar=(m:Combatiente,p:Posicion|undefined)=>{
   const ficha=huellaReserva(m);
   if(!p||!cabeHuella(ficha,p,d,q=>ocupadas.has(claveHuella(q))||c.mapa?.celdas[claveHuella(q)]==='muro'))return false;
   resultado[m.id]={...p};for(const q of casillasHuella(ficha,p))ocupadas.add(claveHuella(q));
   return true;
  };
  for(const m of c.miembros)colocar(m,m.posicion);
  for(const m of c.miembros)if(!resultado[m.id]){
   const xs=Array.from({length:columnas},(_,i)=>m.bando==='jugador'?(i+1)%columnas:(2*columnas-2-i)%columnas);
   for(const x of xs){
    for(let y=1;y<=filas;y++)if(colocar(m,{x,y:y%filas}))break;
    if(resultado[m.id])break;
   }
  }
  return resultado;
}
export function movimientoRestante(m: Combatiente) {
  const limite = movimientoPermitido(m.estados.map(definicionDe), Math.max(0, Math.min(100, Math.floor(estadisticas(m).movimiento ?? 6))));
  return Math.max(0, limite - (m.movimiento?.turno === m.turnos ? m.movimiento.gastado : 0));
}
/** Distancias ortogonales: nadie atraviesa una casilla ocupada, incluidos caídos. */
export function casillasAlcanzables(c: Combate, actorId: string, alcance?:number): Record<string, number> {
  const m = c.miembros.find(m => m.id === actorId); if (!m || tiene(m,'derribado')) return {};
  const posiciones = posicionesTablero(c), inicio = posiciones[actorId], {columnas,filas} = dimensionesTablero(c);
  return distanciasMovimiento(inicio,casillasOtras(c.miembros,posiciones,m.id),columnas,filas,c.mapa,alcance??movimientoRestante(m),tiene(m,'vuelo'),huellaReserva(m));
}
export function distanciasMovimiento(inicio:Posicion,posiciones:Posicion[],columnas:number,filas:number,mapa:MapaCombate|undefined,limite:number,vuelo:boolean,ficha:FuenteHuella={}):Record<string,number>{
  if(!inicio)return {};
  const ocupadas=new Set(posiciones.map(p=>p.x+','+p.y));
  const distancias: Record<string,number> = {[`${inicio.x},${inicio.y}`]:0}, cola = [inicio];
  for (let i=0; i<cola.length; i++) {
    const p=cola[i], d=distancias[`${p.x},${p.y}`]; if(d>=limite)continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=p.x+dx,y=p.y+dy,k=`${x},${y}`;
      // El terreno difícil cobra una sola vez por paso, al incorporar casillas nuevas.
      const anterior=new Set(casillasHuella(ficha,p).map(claveHuella));
      const destino={x,y};
      const coste=!vuelo&&casillasHuella(ficha,destino).some(q=>!anterior.has(claveHuella(q))&&mapa?.celdas[claveHuella(q)]==='dificil')?2:1;
      if(!cabeHuella(ficha,destino,{columnas,filas},q=>ocupadas.has(claveHuella(q))||mapa?.celdas[claveHuella(q)]==='muro')||d+coste>limite||(k in distancias&&distancias[k]<=d+coste))continue;
      distancias[k]=d+coste;cola.push({x,y});
    }
  }
  delete distancias[`${inicio.x},${inicio.y}`]; return distancias;
}
export function desplazar(c: Combate, actorId: string, destino: Posicion): Combate {
  return registrar(c,()=>{
    const actor=c.miembros.find(m=>m.id===actorId);
    if(c.fase!=='en_curso'||c.actual!==actorId||!actor||!combatienteActivo(actor))throw Error('Solo puedes moverte durante tu turno.');
    if(!destino||!Number.isInteger(destino.x)||!Number.isInteger(destino.y))throw Error('Casilla inválida.');
    const coste=casillasAlcanzables(c,actorId)[`${destino.x},${destino.y}`];
    if(!coste)throw Error('Casilla ocupada o fuera de tu movimiento disponible.');
    const n=copia(c), posiciones=posicionesTablero(c);
    for(const m of n.miembros)m.posicion=posiciones[m.id];
    const m=n.miembros.find(m=>m.id===actorId)!;m.posicion={...destino};
    m.movimiento={turno:m.turnos,gastado:(m.movimiento?.turno===m.turnos?m.movimiento.gastado:0)+coste};
    aplicarTerreno(n,m);
    log(n,`${m.nombre} se mueve ${coste} casillas. Movimiento restante: ${movimientoRestante(m)}.`);return n;
  });
}


export {huellaDe};
export const distanciaEntreFichas=distanciaHuellas;
export const distanciaCasillas=(a:Posicion,b:Posicion)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function validarTactica(e:Efecto):string|null {
 const t=e.tablero;if(!t)return null;
 if(typeof t!=='object'||!Number.isInteger(t.alcance)||t.alcance<0||t.alcance>60||!Number.isInteger(t.tamano)||t.tamano<0||t.tamano>12||!['individual','personalizada'].includes(t.forma)&&t.tamano<1||!['individual','circulo','cuadrado','linea','cono','cruz','personalizada'].includes(t.forma)||!['enemigos','aliados','todos','yo'].includes(t.afecta)||e.efecto==='crear_arma')return 'Configuración de tablero inválida.';
 if(t.forma==='personalizada'){
  const error=validarPatron(t.patron);if(error)return error;
  if(t.origen_area!=='lanzador'||t.alcance!==0||t.tamano!==0||t.movimiento_lanzador||e.portal||e.efecto==='desplazamiento')return 'El área personalizada nace del lanzador y no puede moverlo.';
 }
 const avance=t.movimiento_lanzador;
 if(t.origen_area&&!['objetivo','lanzador','aterrizaje','recorrido'].includes(t.origen_area))return 'Origen del efecto inválido.';
 if(t.origen_area==='lanzador'&&t.alcance!==0)return 'Los rugidos y auras deben tener alcance 0.';
 if(avance&&(!['dash','salto','teletransporte','carrera'].includes(avance.tipo)||!Number.isInteger(avance.casillas)||avance.casillas<1||avance.casillas>30||!Number.isInteger(avance.alcance_golpe)||avance.alcance_golpe<0||avance.alcance_golpe>20||(avance.ancho!==undefined&&(!Number.isInteger(avance.ancho)||avance.ancho<0||avance.ancho>2))||(t.forma!=='individual'&&!['aterrizaje','recorrido'].includes(t.origen_area||''))||e.efecto!=='dano'))return 'Configura correctamente salto, carrera o ataque móvil.';
 if(t.origen_area==='aterrizaje'&&(!avance||avance.tipo==='carrera'))return 'El impacto de aterrizaje necesita movimiento del atacante.';
 if(t.origen_area==='recorrido'&&(!avance||avance.tipo!=='carrera'))return 'El daño de recorrido necesita una carrera.';
 if(avance?.tipo==='carrera'&&t.origen_area!=='recorrido')return 'Las carreras deben atacar el recorrido.';
 const d=t.desplazamiento;
 if(d&&(!['atraer','empujar'].includes(d.tipo)||!Number.isInteger(d.casillas)||d.casillas<1||d.casillas>12||!['siempre','fallo_salvacion'].includes(d.cuando)))return 'Desplazamiento inválido.';
 if(t.derribo&&!['siempre','fallo_salvacion'].includes(t.derribo))return 'Derribo inválido.';
 if((t.derribo==='fallo_salvacion'||d?.cuando==='fallo_salvacion')&&!e.salvacion)return 'Falta la salvación de la habilidad.';
 return null;
}
export function alcanceDesde(origen:Posicion,t:AlcanceHabilidad,d:{columnas:number;filas:number}):Posicion[]{
 const resultado:Posicion[]=[];
 for(let y=0;y<d.filas;y++)for(let x=0;x<d.columnas;x++)if(distanciaCasillas(origen,{x,y})<=t.alcance)resultado.push({x,y});
 return resultado;
}
export function alcanceDesdeFicha(m:FuenteHuella,origen:Posicion,t:AlcanceHabilidad,d:{columnas:number;filas:number}):Posicion[]{
 const resultado:Posicion[]=[];
 for(let y=0;y<d.filas;y++)for(let x=0;x<d.columnas;x++)if(distanciaEntreFichas(m,origen,{},{x,y})<=t.alcance)resultado.push({x,y});
 return resultado;
}
export function areaDesdeFicha(m:FuenteHuella,origen:Posicion,centro:Posicion,t:AlcanceHabilidad,d:{columnas:number;filas:number},mapa?:MapaCombate,espejado=false):Posicion[]{
 if(t.forma==='personalizada'){
  const espejo=(p:Posicion)=>({x:d.columnas-1-p.x,y:p.y});
  // La vista espejada conserva la esquina superior izquierda como referencia de la ficha,
  // pero el origen real del dibujo se ve en el extremo derecho de su primera fila.
  const desde=espejado?{x:origen.x+huellaDe(m).ancho-1,y:origen.y}:origen;
  const celdas=espejado?areaDesde(espejo(desde),espejo(centro),t,d).map(espejo):areaDesde(desde,centro,t,d);
  return celdas.filter(p=>lineaVisible(desde,p,mapa));
 }
 if(t.origen_area!=='lanzador'||['linea','cono'].includes(t.forma))return areaDesde(origen,centro,t,d);
 return [...new Map(casillasHuella(m,origen).flatMap(q=>areaDesde(q,q,t,d)).map(q=>[claveHuella(q),q])).values()];
}
export function lineaEntreFichas(a:FuenteHuella,pa:Posicion,b:FuenteHuella,pb:Posicion,mapa?:MapaCombate,atraviesa=false):boolean{
 return casillasHuella(a,pa).some(u=>casillasHuella(b,pb).some(v=>atraviesa||lineaVisible(u,v,mapa)));
}
export function alcanceVisibleEntreFichas(a:FuenteHuella,pa:Posicion,b:FuenteHuella,pb:Posicion,alcance:number,mapa?:MapaCombate):boolean{
 return casillasHuella(a,pa).some(u=>casillasHuella(b,pb).some(v=>distanciaCasillas(u,v)<=alcance&&lineaVisible(u,v,mapa)));
}
/** Círculo/cruz usan radio; cuadrado usa lado; línea/cono usan longitud desde el lanzador. */
export function areaDesde(origen:Posicion,centro:Posicion,t:AlcanceHabilidad,d:{columnas:number;filas:number}):Posicion[]{
 if(t.forma==='personalizada')return t.patron?patronDesde(t.patron,origen,centro,d):[];
 const resultado:Posicion[]=[],n=t.tamano;
 const vx=centro.x-origen.x,vy=centro.y-origen.y;
 const horizontal=Math.abs(vx)>=Math.abs(vy),signo=Math.sign(horizontal?vx:vy)||1;
 for(let y=0;y<d.filas;y++)for(let x=0;x<d.columnas;x++){
  const dx=x-centro.x,dy=y-centro.y,dist=Math.abs(dx)+Math.abs(dy);
  const avance=(horizontal?x-origen.x:y-origen.y)*signo,lateral=Math.abs(horizontal?y-origen.y:x-origen.x);
  const dentro=t.forma==='individual'?dx===0&&dy===0:t.forma==='circulo'?dist<=n:t.forma==='cuadrado'?dx>=-Math.floor((n-1)/2)&&dx<=Math.ceil((n-1)/2)&&dy>=-Math.floor((n-1)/2)&&dy<=Math.ceil((n-1)/2):t.forma==='cruz'?(dx===0||dy===0)&&dist<=n:t.forma==='linea'?avance>=1&&avance<=n&&lateral===0:avance>=1&&avance<=n&&lateral<avance;
  if(dentro)resultado.push({x,y});
 }
 return resultado;
}
export function objetivoDelArea(a:{id:string;bando:string},t:{id:string;bando:string},e:Efecto){
 const area=e.tablero;if(!area)return false;
 if(e.efecto==='dano'&&a.id===t.id&&area.afecta_lanzador===false)return false;
 if(area.origen_area==='recorrido'&&a.id===t.id)return false;
 if(e.efecto==='dano'&&area.forma!=='individual'&&a.id===t.id)return true;
 if((a as Combatiente).transformacion?.descontrolada&&e.efecto==='dano')return a.id!==t.id;
 return area.afecta==='todos'||area.afecta==='yo'&&a.id===t.id||area.afecta==='aliados'&&a.bando===t.bando||area.afecta==='enemigos'&&a.bando!==t.bando;
}
function secundariosTablero(c:Combate,a:Combatiente,t:Combatiente,e:Efecto,centro:Posicion|undefined,supera:boolean){
 const config=e.tablero;if(!config||!centro||t.vida<=0)return;
 const d=config.desplazamiento;
 if(d&&(d.cuando==='siempre'||!supera)){
  const posiciones=posicionesTablero(c),dim=dimensionesTablero(c),origen=posiciones[t.id];let p={...origen};
  const ocupadas=new Set(casillasOtras(c.miembros,posiciones,t.id).map(claveHuella));
  for(let i=0;i<d.casillas;i++){
   let dx=centro.x-p.x,dy=centro.y-p.y;
   if(d.tipo==='atraer'&&dx===0&&dy===0)break;
   if(d.tipo==='empujar'){dx=-dx;dy=-dy;if(!dx&&!dy){dx=p.x-posiciones[a.id].x;dy=p.y-posiciones[a.id].y;}if(!dx&&!dy)break;}
   const pasos=Math.abs(dx)>=Math.abs(dy)?[{x:Math.sign(dx),y:0},{x:0,y:Math.sign(dy)}]:[{x:0,y:Math.sign(dy)},{x:Math.sign(dx),y:0}];
   const siguiente=pasos.filter(v=>v.x||v.y).map(v=>({x:p.x+v.x,y:p.y+v.y})).find(v=>cabeHuella(huellaReserva(t),v,dim,q=>ocupadas.has(claveHuella(q))||c.mapa?.celdas[claveHuella(q)]==='muro'));
   if(!siguiente)break;p=siguiente;
  }
  t.posicion=p;if(distanciaCasillas(origen,p)>0)aplicarTerreno(c,t);log(c,`${t.nombre}: ${d.tipo==='atraer'?'atraído':'empujado'} ${distanciaCasillas(origen,p)} casillas hasta (${p.x+1}, ${p.y+1}).`);
 }
 if(config.derribo&&(config.derribo==='siempre'||!supera)){
  estado(t,'derribado','Derribado: en el suelo',0,{bono_impacto:-2});
  log(c,`${t.nombre} queda en el suelo. Levantarse cuesta la mitad de su movimiento máximo.`);
 }
}
export function levantarse(c:Combate,actorId:string):Combate{
 return registrar(c,()=>{
  const n=copia(c),m=n.miembros.find(m=>m.id===actorId);
  if(n.fase!=='en_curso'||n.actual!==actorId||!m||m.vida<=0||!tiene(m,'derribado'))throw Error('Solo puedes levantarte en tu turno si estás derribado.');
  const max=Math.max(0,Math.min(100,Math.floor(estadisticas(m).movimiento??6))),coste=Math.ceil(max/2);
  if(movimientoRestante(m)<coste)throw Error('No queda movimiento suficiente para levantarte.');
  m.movimiento={turno:m.turnos,gastado:(m.movimiento?.turno===m.turnos?m.movimiento.gastado:0)+coste};quitarEstado(m,'derribado');log(n,`${m.nombre} se levanta y gasta ${coste} casillas de movimiento.`);return n;
 });
}


/** Delta real de vida, después de defensas, salvaciones y límites de curación. */
export function cambiosVida(antes:Pick<Combate,'miembros'>,despues:Pick<Combate,'miembros'>):CambioVida[]{
 const vidas=new Map(antes.miembros.map(m=>[m.id,m.vida]));
 return despues.miembros.flatMap(m=>{
  const previa=vidas.get(m.id);if(typeof previa!=='number'||!Number.isFinite(previa)||!Number.isFinite(m.vida)||m.vida===previa)return [];
  return [{id:m.id,delta:m.vida-previa}];
 });
}
export function registrarCambiosVida(antes:Combate,despues:Combate):Combate{
 const previas=posicionesTablero(antes),actuales=posicionesTablero(despues);
 const movimientos:MovimientoVisual[]=despues.miembros.flatMap(m=>{
  const desde=previas[m.id],hasta=actuales[m.id];
  return desde&&hasta&&(desde.x!==hasta.x||desde.y!==hasta.y)?[{id:m.id,desde,hasta,tipo:'forzado' as const}]:[];
 });
 const transformaciones:AparicionVisual[]=despues.miembros.flatMap(m=>{
  const previa=antes.miembros.find(x=>x.id===m.id)?.transformacion,actual=m.transformacion;
  return actual?.vfx?.entrada&&(previa?.etapa_id!==actual.etapa_id||previa?.definicion_id!==actual.definicion_id)&&actuales[m.id]?
   [{id:m.id,animacion:actual.vfx.entrada,posicion:actuales[m.id],escala:actual.vfx.escala}]:[];
 });
 for(const m of despues.miembros){
  if(m.ultima_defensa && m.ultima_defensa.id!==antes.miembros.find(p=>p.id===m.id)?.ultima_defensa?.id)
    transformaciones.push({id:m.id,animacion:m.ultima_defensa.animacion,posicion:actuales[m.id],escala:2.8});
 }
 const activaciones=activacionesPendientes.get(despues);
 activacionesPendientes.delete(despues);
 return {...despues,evento_visual:{...(activaciones?.length?{activaciones}:{}),id:crypto.randomUUID(),creado_en:Date.now(),nombre:despues.miembros.find(m=>m.id===despues.actual)?.nombre||'Combate',dados:[],resultado:despues.resultado,cambios_vida:cambiosVida(antes,despues),movimientos,transformaciones}};
}

/** Obstáculos y terrenos del encuentro; los identificadores no representan navegación mundial. */
export function configurarMapa(c:Combate,mapa:MapaCombate):Combate{
 if(c.fase!=='preparacion')throw Error('El mapa se configura antes de iniciar.');
 if(!Number.isInteger(mapa.columnas)||!Number.isInteger(mapa.filas)||mapa.columnas<8||mapa.columnas>24||mapa.filas<8||mapa.filas>24)throw Error('El mapa debe medir entre 8 y 24 casillas por lado.');
 if(Object.entries(mapa.celdas).some(([k,t])=>{const [x,y]=k.split(',').map(Number);return !/^\d+,\d+$/.test(k)||x>=mapa.columnas||y>=mapa.filas||!['muro','dificil','cobertura','peligro'].includes(t);}))throw Error('Terreno inválido.');
 const n=copia(c);n.mapa=copia(mapa);const ps=posicionesTablero(n);
 if(n.miembros.some(m=>!ps[m.id]))throw Error('No hay casillas libres para todos los participantes.');
 for(const m of n.miembros)m.posicion=ps[m.id];return n;
}
export function lineaVisible(a:Posicion,b:Posicion,mapa?:MapaCombate):boolean{
 if(!mapa)return true;
 const pasos=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y))*4;
 for(let i=1;i<=pasos;i++){const x=Math.round(a.x+(b.x-a.x)*i/pasos),y=Math.round(a.y+(b.y-a.y)*i/pasos);if(mapa.celdas[`${x},${y}`]==='muro')return false;}return true;
}
function coberturaEntre(c:Combate,a:Combatiente,t:Combatiente):number{
 if(!c.mapa)return 0;
 const p=posicionesTablero(c),fuente=casillasHuella(a,p[a.id]),objetivo=casillasHuella(t,p[t.id]);
 if(distanciaEntreFichas(a,p[a.id],t,p[t.id])<=1)return 0;
 let distancia=Infinity,cubierta=false;
 for(const q of objetivo)for(const u of fuente){
  const d=distanciaCasillas(u,q);
  if(d>distancia||!lineaVisible(u,q,c.mapa))continue;
  const protege=c.mapa.celdas[claveHuella(q)]==='cobertura';
  if(d<distancia){distancia=d;cubierta=protege;}else cubierta=cubierta&&protege;
 }
 return cubierta?2:0;
}
function aplicarTerreno(c:Combate,m:Combatiente,rng:RNG=dadoSeguro){
 const p=posicionesTablero(c)[m.id];if(!tiene(m,'vuelo')&&p&&casillasHuella(m,p).some(q=>c.mapa?.celdas[claveHuella(q)]==='peligro')&&m.vida>0){recibir(c,m,m,{...basico(),efecto:'dano'},2,[],rng);log(c,`${m.nombre}: terreno peligroso, 2 de daño.`);}
}

// ---- Primitiva «Visión»: habilidades oculares (lib/vision.ts) ----
export type VisionActiva = { clave: string; vision: Vision; restantes: number | null };
export type DetalleOcular = {
  vida?: { actual: number; max: number };
  ph?: { actual: number; max: number };
  atributos?: Record<string, number>;
  acciones?: { nombre: string; resumen: string; coste_ph: number }[];
  pasivas?: string[];
  estados?: { nombre: string; restantes: number }[];
};
export type ObjetivoOcular = { puntos?: DireccionOcular[]; recompensa?: string; detalle?: DetalleOcular; revela_oculto?: boolean };
export type VistaOcular = {
  visiones: { clave: string; nombre: string; apariencia: AparienciaOjo; restantes: number | null; alcance: number }[];
  objetivos: Record<string, ObjetivoOcular>;
  amenaza?: string[];
};
const bajoTierra = (m: Combatiente) => capaCombatiente(m) === 'subsuelo';
/** Ojos abiertos de un combatiente: los activados (estados) y los permanentes de sus habilidades y equipo. */
export function visionesActivas(m: Combatiente): VisionActiva[] {
  if (m.vida <= 0) return [];
  const lista: VisionActiva[] = m.estados.filter(e => e.vision).map(e => ({ clave: e.id, vision: e.vision!, restantes: e.vision!.duracion && e.vision!.modo !== 'permanente' ? e.restantes : null }));
  const fuentes = [...habilidadesDe(m).filter(h => !requisitosFuente(m, h).length), ...Object.values(piezas(m))];
  // El snapshot de un personaje repite sus acciones propias en `efectos`; los ojos se deduplican por `vision:<id>` abajo.
  const efectos = [...fuentes.flatMap(f => f.efectos || []), ...(m.configuracion.efectos || [])];
  // Ojo de la fase actual de una transformación: va primero para que la interfaz muestre ese ojo.
  if (m.transformacion) {
    const d = efectos.find(e => e.transformacion?.id === m.transformacion!.definicion_id)?.transformacion;
    const etapa = d?.etapas.find(x => x.id === m.transformacion!.etapa_id);
    if (d && etapa?.vision) lista.unshift({ clave: `vision:fase:${d.id}:${etapa.id}`, vision: etapa.vision, restantes: null });
  }
  for (const e of efectos) if (e.vision?.modo === 'permanente' && !lista.some(x => x.clave === 'vision:' + e.id)) lista.push({ clave: 'vision:' + e.id, vision: e.vision, restantes: null });
  return lista;
}
function activarVision(c: Combate, m: Combatiente, e: Efecto) {
  const v = e.vision!, clave = 'vision:' + e.id;
  quitarEstado(m, clave);
  m.estados.push({ id: clave, tipo: clave, nombre: v.nombre, restantes: v.modo === 'permanente' ? 0 : v.duracion, creado: m.turnos, bonos: { ...(v.bonos || {}) }, vision: v });
  normalizar(m);
  if (v.modo !== 'permanente') log(c, `${m.nombre} abre ${v.nombre}${v.duracion ? ` durante ${v.duracion} turnos` : ''}.`);
}
/** Acción de un ojo en modo «abrir»: lo abre pagando sus costes o, si ya está abierto, lo cierra gratis. */
function abrirOjo(n: Combate, a: Combatiente, act: Accion): Combate {
  const e = act.efecto, v = e.vision!, clave = 'vision:' + e.id;
  if (a.estados.some(x => x.id === clave)) { quitarEstado(a, clave); normalizar(a); log(n, `${a.nombre} cierra ${v.nombre}.`); return n; }
  if (a.accion_usada && !v.sin_accion) throw Error('Ya utilizó su acción.');
  if ((a.cooldowns[act.id] || 0) > 0) throw Error('Habilidad en enfriamiento.');
  const s = estadisticas(a), coste = e.coste_ph || 0, fatiga = e.coste_fatiga || 0;
  if (coste > 0 && (s.silencio_ph || 0) > 0) throw Error('Silencio del Núcleo impide gastar PH.');
  if (phDisponibles(a) < coste) throw Error('PH insuficientes.');
  if (fatiga && (a.agotado || a.fatiga + fatiga > (s.fatiga || 0))) throw Error('Fatiga insuficiente para abrir el ojo.');
  a.ph -= coste; a.fatiga += fatiga; if (fatiga) a.uso_fatiga = true;
  if (!v.sin_accion) a.accion_usada = true;
  if (act.enfriamiento) a.cooldowns[act.id] = act.enfriamiento + 1;
  if (coste || fatiga) log(n, `${act.nombre}: coste ${coste} PH y ${fatiga} Fatiga.`);
  activarVision(n, a, e);
  return n;
}
/** Inicio de turno: los ojos permanentes se abren solos y los demás cobran su mantenimiento. */
function mantenerVisiones(c: Combate, m: Combatiente) {
  for (const x of visionesActivas(m)) if (x.vision.modo === 'permanente' && !x.clave.startsWith('vision:fase:') && !m.estados.some(e => e.id === x.clave)) {
    const id = x.clave.slice(7);
    activarVision(c, m, { ...basico(), id, vision: x.vision });
  }
  for (const e of [...m.estados]) {
    if (!e.vision || e.vision.modo === 'permanente') continue;
    const usaFatiga = e.vision.mantenimiento_fatiga !== undefined;
    const coste = e.vision.mantenimiento_fatiga ?? e.vision.mantenimiento_ph ?? 0;
    if (coste <= 0) continue;
    const maxFatiga = estadisticas(m).fatiga || 0;
    const recurso = usaFatiga ? 'Fatiga' : 'PH';
    if (usaFatiga ? m.agotado || m.fatiga + coste > maxFatiga : phDisponibles(m) < coste) {
      quitarEstado(m, e.id);
      log(c, `${m.nombre}: sin ${recurso} para mantener ${e.nombre}; el ojo se cierra.`);
      continue;
    }
    if (usaFatiga) {
      m.fatiga += coste;
      m.uso_fatiga = true;
      if (m.fatiga >= maxFatiga) m.agotado = true;
    } else m.ph -= coste;
    log(c, `${m.nombre}: mantener ${e.nombre} cuesta ${coste} ${recurso}.`);
  }
  normalizar(m);
}
function observa(c: Combate, o: Combatiente, t: Combatiente, v: Vision, pos: Record<string, Posicion>) {
  if (t.id === o.id || t.bando === o.bando || t.vida <= 0) return false;
  const po = pos[o.id], pt = pos[t.id];
  if (!po || !pt) return false;
  if (v.atraviesa_muros ? (v.alcance && distanciaEntreFichas(o,po,t,pt) > v.alcance) : !alcanceVisibleEntreFichas(o,po,t,pt,v.alcance||Infinity,c.mapa)) return false;
  return !bajoTierra(t) || !!v.revelar?.ocultos;
}
function puntosDe(c: Combate, o: Combatiente, t: Combatiente, clave: string, v: Vision): DireccionOcular[] {
  const p = v.puntos_debiles!;
  return puntosDebiles(`${clave}:${o.id}:${t.id}:${p.cambia === 'ronda' ? c.ronda : 'combate'}`, p.cantidad);
}
/** Si `a` ataca a `t` desde uno de los puntos débiles que ven sus ojos, la recompensa combinada. */
export function golpeOcular(c: Combate, a: Combatiente, t: Combatiente): { recompensa: RecompensaPunto; ojos: string[]; direccion: DireccionOcular } | null {
  const pos = posicionesTablero(c), pa = pos[a.id], pt = pos[t.id];
  if (!pa || !pt) return null;
  const direccion = direccionAtaque(pt, pa);
  if (!direccion) return null;
  const recompensas: RecompensaPunto[] = [], ojos: string[] = [];
  for (const { clave, vision } of visionesActivas(a)) {
    if (!vision.puntos_debiles || !observa(c, a, t, vision, pos)) continue;
    if (puntosDe(c, a, t, clave, vision).includes(direccion)) { recompensas.push(vision.puntos_debiles.recompensa); ojos.push(vision.nombre); }
  }
  return recompensas.length ? { recompensa: sumarRecompensas(recompensas), ojos, direccion } : null;
}
/** Armadura extra de `t` contra un atacante que alguno de sus ojos está viendo. */
function anticipacion(c: Combate, t: Combatiente, a: Combatiente): number {
  const pos = posicionesTablero(c);
  return visionesActivas(t).reduce((total, { vision }) => total + (vision.anticipar && observa(c, t, a, vision, pos) ? vision.anticipar.armadura : 0), 0);
}
const NOMBRE_EFECTO_OCULAR: Record<string, string> = { dano: 'daño', curacion: 'curación', recuperar_ph: 'recupera PH', reducir_fatiga: 'reduce fatiga', estado: 'estado', crear_arma: 'crea un arma', transformacion: 'transformación' };
function resumenOcular(e: Efecto): string {
  const dadosTexto = e.cantidad && e.caras ? `${e.cantidad}d${e.caras}${e.modificador ? (e.modificador > 0 ? '+' : '') + e.modificador : ''}` : '';
  return [NOMBRE_EFECTO_OCULAR[e.efecto] || e.efecto, dadosTexto, e.elemento && e.elemento !== 'ninguno' ? e.elemento : '', e.tablero ? `alcance ${e.tablero.alcance}${e.tablero.forma !== 'individual' ? `, ${e.tablero.forma}` : ''}` : '', e.estado ? `«${e.estado}»` : '', e.vision ? `ojo: ${e.vision.nombre}` : ''].filter(Boolean).join(' · ');
}
/** Lo que ven los ojos abiertos de un combatiente: solo información de enemigos dentro de su mirada. */
export function vistaOcular(c: Combate, id: string): VistaOcular | null {
  const o = c.miembros.find(m => m.id === id);
  if (!o || c.fase === 'finalizado') return null;
  const activas = visionesActivas(o);
  if (!activas.length) return null;
  const pos = posicionesTablero(c), { columnas, filas } = dimensionesTablero(c);
  const objetivos: Record<string, ObjetivoOcular> = {}, recompensas: Record<string, RecompensaPunto[]> = {}, amenaza = new Set<string>();
  for (const t of c.miembros) for (const { clave, vision: v } of activas) {
    if (!observa(c, o, t, v, pos)) continue;
    const x = objetivos[t.id] ||= {};
    if (v.puntos_debiles) { x.puntos = [...new Set([...(x.puntos || []), ...puntosDe(c, o, t, clave, v)])]; (recompensas[t.id] ||= []).push(v.puntos_debiles.recompensa); }
    const r = v.revelar || {}, d: DetalleOcular = x.detalle || {};
    if (r.ocultos && bajoTierra(t)) x.revela_oculto = true;
    if (r.vida) { d.vida = { actual: t.vida, max: maxVida(t) }; d.ph = { actual: phDisponibles(t), max: estadisticas(t).ph || 0 }; }
    if (r.atributos) d.atributos = Object.fromEntries(Object.entries(estadisticas(t)).filter(([, n]) => typeof n === 'number' && Number.isFinite(n)));
    if (r.acciones) d.acciones = acciones(t).map(a => ({ nombre: a.nombre, resumen: resumenOcular(a.efecto), coste_ph: a.efecto.coste_ph || 0 }));
    if (r.pasivas) d.pasivas = [...new Set([...pasivasAplicables(t).map(p => p.nombre), ...reglas(t).map(p => p.nombre)].filter(Boolean))];
    if (r.estados) d.estados = t.estados.map(e => ({ nombre: e.nombre, restantes: e.restantes }));
    if (Object.keys(d).length) x.detalle = d;
    if (v.amenazas) {
      const sinMover = { ...c, miembros: c.miembros.map(m => m.id === t.id ? { ...m, movimiento: undefined } : m) };
      const p = pos[t.id];
      for (const k of [`${p.x},${p.y}`, ...Object.keys(casillasAlcanzables(sinMover, t.id))]) {
        const [cx, cy] = k.split(',').map(Number);
        for (const q of casillasHuella(t,{x:cx,y:cy})) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = q.x + dx, ay = q.y + dy; if (ax >= 0 && ay >= 0 && ax < columnas && ay < filas && c.mapa?.celdas[`${ax},${ay}`] !== 'muro') amenaza.add(`${ax},${ay}`); }
      }
    }
  }
  for (const [tid, lista] of Object.entries(recompensas)) objetivos[tid].recompensa = describirRecompensa(sumarRecompensas(lista));
  return {
    visiones: activas.map(({ clave, vision, restantes }) => ({ clave, nombre: vision.nombre, apariencia: vision.apariencia, restantes, alcance: vision.alcance })),
    objetivos, ...(amenaza.size ? { amenaza: [...amenaza] } : {}),
  };
}

/** Proyección del espejo mental para la vista de un jugador (la Edge Function la aplica a su respuesta). */
export {proyectarVista,desproyectar,proyectarRespuesta};
