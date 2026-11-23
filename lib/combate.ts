import type {ConfiguracionVFX} from "./vfx";
import {activarTransformacion,cambiarEtapaTransformacion,terminarTransformacion,avanzarTurnoTransformacion,danarTransformado,forzarPosesion,type TransformacionActiva} from "./transformaciones";
import type { Regla, EventoRegla, CondicionRegla, EfectoRegla, ValorRegla, Sujeto } from "./reglas";
import { type Efecto, type Elemento, type AlcanceHabilidad, type Reaccion, type ResultadoReaccion, type ContraataqueReaccion } from "./creacion";
import {proyectarVista,desproyectar,proyectarRespuesta,type OpcionesEspejo} from "./espejo-mental";
import {activarVoz,avanzarVoz,vozNiega,type ConfigVoces,type EstadoVoz} from "./artefactos-voces";
import {normalizarReaccion,disparadorDe,lineaCosteReaccion,CON_ALCANCE,type DisparadorReaccion} from "./reacciones";
import { type ReglaPasiva } from "./pasivas";
import {comprobarInmunidad,norm,type Inmunidad,type CandidatoInmunidad} from "./inmunidades";
import {describirEstado,definicionDe,definicionBase,primitivas,bonosDefinicion,turnosIniciales,movimientoPermitido,permiteReacciones,type DefinicionEstado,type Primitiva} from "./estados";
import {potenciar,potenciadoresPara,etiquetasDe,type Rasgo,type EleccionPotenciador} from "./rasgos";
import {generarRecurso,gastarRecurso,topeRecurso,type DefinicionRecurso,type EventoRecurso} from "./recursos";
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
  stats_base?: Record<string, number>;
  rangos_malla?:Record<string,{min:number;max:number}>;nivel_maximo?:number;
  equipamiento?: Record<string, Fuente>;
  habilidades?: Fuente[];
  pasivas?: { requisitos_uso?:RequisitosUso; id?: string; nombre: string; reglas: ReglaPasiva[]; reglas_motor?: Regla[]; inmunidades?: Inmunidad[] }[];
  reglas?: Regla[];
  reglas_pasivas?: ReglaPasiva[];
  reserva?: Fuente[];
  consumidos?: string[];
  /** Inmunidades propias de la creación (además de las de habilidades, pasivas, estados y equipo). */
  inmunidades?: Inmunidad[];
};
export type Terreno = "muro"|"dificil"|"cobertura"|"peligro";
export type MapaCombate = {id:string;version:1;nombre:string;columnas:number;filas:number;celdas:Record<string,Terreno>;procedural?:import('./mapas-procedurales').ProcedenciaMapa};
export type Posicion = { x: number; y: number };
export type Combatiente = {
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
export type EventoVisual = {action_id?:string;secuencia?:number;recibido_en?:number;creado_en?:number;vfx?:ConfiguracionVFX;movimientos?:MovimientoVisual[];transformaciones?:AparicionVisual[];area?:Posicion[];id:string;nombre:string;dados:{caras:number;valor:number}[];resultado?:string;cambios_vida?:CambioVida[];animacion?:Efecto["animacion"];arma_visual?:import('./animaciones-armas').TipoAnimacionArma;desde?:Posicion;hasta?:Posicion};
export type Combate = {
  reaccion_pendiente?:SolicitudReaccion;
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
  regla_detalle?: Regla;
  bloqueada?: string;
  id: string;
  nombre: string;
  efecto: Efecto;
  enfriamiento: number;
  regla?: string;
  /** Potenciadores de rasgos compatibles con la técnica (Apéndice C). */
  potenciadores?: PotenciadorDisponible[];
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
  for (const h of (m.configuracion.habilidades || []).filter(h => !requisitosFuente(m, h).length)) for (const e of h.efectos || []) sumar(e.inmunidades, h.nombre);
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
function efectosConReaccion(m:Combatiente):Efecto[]{return (m.configuracion.habilidades||[]).flatMap(h=>h.efectos||[]).map(normalizarReaccion);}
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
    .filter(({r})=>!pos||!contexto.cerca||(!!pos[dueno.id]&&!!pos[contexto.cerca.id]&&distanciaCasillas(pos[dueno.id],pos[contexto.cerca.id])<=(r.alcance||1)))
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
    const activaciones=(m.configuracion.habilidades||[]).flatMap(h=>h.efectos||[]).filter(e=>!!e.transformacion?.posesion);
    for(const e of activaciones){
      const d=e.transformacion!,p=d.posesion!;
      if(m.transformacion&&m.transformacion.definicion_id!==d.id)continue;
      if(m.vida*100>maxVida(m)*p.umbral_pct)continue;
      // Ruta especial: solo una inmunidad configurada a la posesión la bloquea (sin decisión por defecto).
      if(puedeAplicar(c,m,'posesion',{id:'posesion',nombre:'la posesión',categoria:'mental',subcategoria:'posesion',duracion:{tipo:'combate'},efectos:[]})==='no')break;
      if(!salvacion(c,m,p.cd,'salvacion',rng)){
        Object.assign(m,forzarPosesion(m,d,p.etapa_id));
        log(c,`${m.nombre} pierde el control: se manifiesta ${d.etapas.find(et=>et.id===p.etapa_id)?.nombre||d.nombre}.`);
      }else log(c,`${m.nombre} resiste la posesión por este turno.`);
      break;
    }
  }
  m.accion_usada = false;
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
  const ocupadas = new Set(Object.entries(pos).filter(([id]) => id !== m.id).map(([, q]) => q.x + ',' + q.y));
  let actual = desde, pasos = 0;
  while (pasos < p.max) {
    const d0 = distanciaCasillas(actual, origen);
    const opciones = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: actual.x + dx, y: actual.y + dy }))
      .filter(q => q.x >= 0 && q.y >= 0 && q.x < dims.columnas && q.y < dims.filas && c.mapa?.celdas[q.x + ',' + q.y] !== 'muro' && !ocupadas.has(q.x + ',' + q.y))
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
  n.fase = "en_curso";
  for (const m of n.miembros) emitirMotor(n, 'inicio_combate', m, m, m, rng);
  for (const m of n.miembros) eventoRecurso(n, m, 'inicio_combate');
  for (const m of n.miembros) if (combatienteActivo(m)) mantenerVisiones(n, m);
  const vivo = orden(n).find(combatienteActivo);
  if (!vivo) { cerrarEncuentro(n,'Sin combatientes activos',null); return n; }
  entrar(n, vivo, rng);
  return n;
}
function siguienteInterno(c: Combate, rng: RNG) {
  if (c.fase !== "en_curso") throw Error("Inicia el combate.");
  const n = copia(c),
    a = n.miembros.find((m) => m.id === n.actual);
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
  for(const m of n.miembros)if(m.invocacion&&m.vida<=0)m.configuracion={tipo_creacion:"personaje"};
  const lista = orden(n),
    idx = lista.findIndex((m) => m.id === n.actual);
  for (let p = 1; p <= lista.length; p++) {
    const i = (Math.max(0, idx) + p) % lista.length;
    if (i === 0) n.ronda++;
    if (combatienteActivo(lista[i])) {
      entrar(n, lista[i], rng);
      if (combatienteActivo(lista[i])) return n;
    }
  }
  cerrarEncuentro(n,'Sin combatientes activos',null);
  return n;
}
function registrar(c: Combate, fn: () => Combate, rng:RNG=dadoSeguro) {
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
        if(!(n.eventos||[]).some(e=>e.id===id))(n.eventos||=[]).push({id,tipo:'enemigo_derrotado',actor:c.actual||undefined,objetivo:m.id,ronda:n.ronda});
      }
    }
    const a=n.miembros.find(m=>m.id===c.actual);
    if(a)a.contribucion=(a.contribucion||0)+n.miembros.reduce((t,m)=>{const antes=c.miembros.find(v=>v.id===m.id);return t+(antes?Math.max(0,m.bando!==a.bando?antes.vida-m.vida:m.vida-antes.vida):0);},0);
  }
  evaluarCierre(n);
  if(n.fase==='en_curso'&&n.actual&&!n.miembros.some(m=>m.id===n.actual&&combatienteActivo(m))){n=siguienteInterno(n,rng);evaluarCierre(n);}
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
  return registrarCambiosVida(c,{ ...copia(previo), historial: h });
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
function limpiarFinal(n:Combate){n.miembros=n.miembros.filter(m=>!m.invocacion);for(const m of n.miembros){if(m.transformacion)Object.assign(m,terminarTransformacion(m));m.transformaciones_usadas=[];emitirMotor(n,'fin_combate',m,m,m,dadoSeguro);for(const d of recursosDe(m)){if(d.recuperacion==='vaciar')m.recursos_especiales={...m.recursos_especiales,[d.id]:0};else if(d.recuperacion!=='conservar'&&m.recursos_especiales)delete m.recursos_especiales[d.id];}m.estados=[];delete m.percepcion_alterada;if(m.motor){m.motor.modificadores=[];m.motor.habilidades=[];}delete m.arma;normalizar(m);}log(n,'Combate terminado: los estados temporales y armas efímeras desaparecen.');}
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
  const lista: Accion[] = [];
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
    else if (manosLibres(m)>0) lista.push({id:'ataque',nombre:'Ataque desarmado',efecto:basico(),enfriamiento:0});
  }
  if ((m.arma || lista.some(a=>a.id==='ataque'&&a.efecto.id!=='basico')) && manosLibres(m)>0)
    lista.push({id:'desarmado',nombre:'Ataque desarmado · mano libre',efecto:basico(),enfriamiento:0});
  for (const h of (m.configuracion.habilidades || []).filter(h=>!requisitosFuente(m,h).length))
    for (const e of h.efectos || [])
      lista.push({
        id: `hab:${h.id}:${e.id}`,
        nombre: `${h.nombre} · ${e.nombre}`,
        ilustracion: ilustracionFuente(h),
        efecto: e,
        enfriamiento: Math.max(
          0,
          h.stats.enfriamiento || h.stats.cooldown || 0,
        ),
      });
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
  return lista.filter(a=>!a.efecto.solo_pasivo).filter(a=>!reaccionDe(normalizarReaccion(a.efecto))).filter(a=>!(a.efecto.vision?.modo==='permanente'&&!(a.efecto.cantidad>0))).filter(a=>!exclusivos.has(a.efecto.id)||permitidos.has(a.efecto.id)).filter(a=>!a.efecto.requisito_forma || (estadisticas(m)[a.efecto.requisito_forma.atributo]||0)>=a.efecto.requisito_forma.minimo).map(a=>{
   const d=a.efecto.transformacion;
   if(d&&m.transformacion?.definicion_id===d.id){const i=d.etapas.findIndex(e=>e.id===m.transformacion?.etapa_id);return {...a,nombre:i<d.etapas.length-1?'Avanzar a '+d.etapas[i+1].nombre:a.nombre,efecto:{...a.efecto,coste_ph:0,coste_fatiga:0},bloqueada:i===d.etapas.length-1?'Ya está en la última etapa.':d.etapas[i+1]?.descontrolada?'Esta fase requiere fallar la salvación de posesión.':undefined};}
   if(d&&(m.transformacion||m.transformaciones_usadas?.includes(d.id)))return {...a,bloqueada:m.transformacion?'Otra transformación está activa.':'Ya utilizada en este encuentro.'};
   const efecto=m.transformacion?.definicion_id==='limitless' && a.efecto.ley_limitless
     ? {...a.efecto,coste_ph:0} : a.efecto;
   if(vozNiega(m.voz_artefacto,a))return {...a,efecto:conAlcance(efecto,a.nombre),bloqueada:'La voz del artefacto te lo niega.'};
   const conTablero=conAlcance(efecto,a.nombre),pots=rasgos.length&&efecto.efecto==='dano'?potenciadoresDisponibles(m,conTablero,rasgos):[];
   return {...a,efecto:conTablero,...(pots.length?{potenciadores:pots}:{})};
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
   if(!area||(area.origen_area==='lanzador'?distanciaCasillas(p[actorId],p[t.id])>area.tamano:distanciaCasillas(p[actorId],p[t.id])>area.alcance)||!lineaVisible(p[actorId],p[t.id],c.mapa))continue;
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
    return {p,coste,d:distanciaCasillas(p,blanco)};
  }).filter(x=>x.d<distanciaCasillas(origen,blanco))
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
 if(distanciaCasillas(origen,blanco)<=m.alcance_golpe)return {...origen};
 const ocupadas=new Set(Object.entries(posiciones).filter(([id])=>id!==a.id).map(([,p])=>p.x+','+p.y));
 const libres=(p:Posicion)=>p.x>=0&&p.y>=0&&p.x<dim.columnas&&p.y<dim.filas&&!ocupadas.has(p.x+','+p.y)&&c.mapa?.celdas[p.x+','+p.y]!=='muro';
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
 for(let dy=-m.alcance_golpe;dy<=m.alcance_golpe;dy++)for(let dx=-m.alcance_golpe;dx<=m.alcance_golpe;dx++){
  const p={x:blanco.x+dx,y:blanco.y+dy};
  if(!libres(p)||distanciaCasillas(p,blanco)>m.alcance_golpe)continue;
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
 const ocupados=new Set(Object.entries(posiciones).filter(([id])=>id!==a.id).map(([,p])=>clave(p)));
 const suelo=(p:Posicion)=>p.x>=0&&p.y>=0&&p.x<dim.columnas&&p.y<dim.filas&&c.mapa?.celdas[clave(p)]!=='muro';
 const libre=(p:Posicion)=>suelo(p)&&!ocupados.has(clave(p));
 if(m.tipo==='carrera'){
  const dx=punto.x-origen.x,dy=punto.y-origen.y,pasos=Math.max(Math.abs(dx),Math.abs(dy));
  if(!pasos)throw Error('Elige hacia dónde correr.');
  const trayecto:Posicion[]=[];let anterior=origen,coste=0,destino=origen;
  for(let i=1;i<=Math.max(pasos,m.casillas);i++){
   const p={x:Math.round(origen.x+dx*i/pasos),y:Math.round(origen.y+dy*i/pasos)};
   if(!suelo(p)||!lineaVisible(anterior,p,c.mapa))break;
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
  const n = copia(c),
    a = n.miembros.find((m) => m.id === actorId);
  delete n.resultado;
  if (n.fase !== "en_curso" || n.actual !== actorId || !a || !combatienteActivo(a))
    throw Error("Solo puede actuar el personaje de turno.");
  if(a.transformacion?.descontrolada&&!autonomo)throw Error('La criatura está fuera de control: su turno es automático.');
  const ojo=accionId.startsWith('hab:')||accionId.startsWith('equipo:')?acciones(a).find(v=>v.id===accionId):undefined;
  if(ojo?.efecto.vision?.modo==='abrir')return abrirOjo(n,a,ojo);
  if (a.accion_usada) throw Error("Ya utilizó su acción.");
  if (accionId.startsWith('regla:')) {
    const clave = accionId.slice(6), entrada = reglasMotor(a).find(r=>r.clave===clave);
    if (!entrada || entrada.regla.evento !== 'usar') throw Error('La regla activa no existe.');
    const t = n.miembros.find(m=>m.id===objetivoId) || a;
    if(phDisponibles(a)<entrada.regla.coste_ph)throw Error('PH insuficientes.');
    const alcance=acciones(a).find(v=>v.id===accionId)?.efecto.tablero;
    const posiciones=posicionesTablero(n);
    if(alcance&&distanciaCasillas(posiciones[a.id],posiciones[t.id])>alcance.alcance)throw Error('El destino está fuera del alcance de la habilidad.');
    if(!lineaVisible(posiciones[a.id],posiciones[t.id],n.mapa))throw Error('Un muro bloquea la trayectoria.');
    ejecutarRegla(n,a,entrada.clave,entrada.regla,a,t,rng,undefined,0,true);
    a.accion_usada=true;
    return n;
  }
  if(accionId==='volver_forma'){if(!a.transformacion)throw Error('No hay transformación activa.');Object.assign(a,terminarTransformacion(a));normalizar(a);a.accion_usada=true;log(n,`${a.nombre} vuelve a su cuerpo original.`);return n;}
  if (accionId === "guardia") {
    estado(a, "guardia", "Guardia", 1, { armadura: 2 }, { inicio: true });
    a.accion_usada = true;
    return n;
  }
  const act = acciones(a).find((v) => v.id === accionId);
  if (act && vozNiega(a.voz_artefacto, act)) throw Error('La voz del artefacto te lo niega.');
  if (!act) throw Error("La acción no existe.");
  if ((a.cooldowns[act.id] || 0) > 0) throw Error("Habilidad en enfriamiento.");
  if(act.efecto.efecto==="transformacion"){
    const d=act.efecto.transformacion;
    if(!d)throw Error("Transformación sin configurar.");
    if(!a.transformacion){const fatiga=act.efecto.coste_fatiga||0;if(fatiga&&(a.agotado||a.fatiga+fatiga>(estadisticas(a).fatiga||0)))throw Error("Fatiga insuficiente para transformarse.");a.fatiga+=fatiga;a.uso_fatiga=fatiga>0;}
    if(a.transformacion){if(a.transformacion.definicion_id!==d.id)throw Error("Otra transformación está activa.");const indice=d.etapas.findIndex(x=>x.id===a.transformacion?.etapa_id);if(indice<0||indice===d.etapas.length-1)throw Error("No hay otra etapa.");if(d.etapas[indice+1].descontrolada)throw Error('Esta etapa solo puede activarse tras fallar la salvación de posesión.');Object.assign(a,cambiarEtapaTransformacion(a,d,d.etapas[indice+1].id));log(n,`${a.nombre} avanza a ${d.etapas[indice+1].nombre}.`);}
    else{if(a.transformaciones_usadas?.includes(d.id))throw Error("Transformación ya utilizada en esta partida.");if(phDisponibles(a)<(act.efecto.coste_ph||0))throw Error("PH insuficientes.");Object.assign(a,activarTransformacion(a,{...d,coste_ph:act.efecto.coste_ph,duracion_turnos:act.efecto.duracion||d.duracion_turnos}));log(n,`${a.nombre} activa ${d.nombre}.`);}
    if(a.transformacion&&!a.transformacion.creado_turno)a.transformacion.creado_turno=a.turnos;
    if(!a.transformacion)throw Error('No se pudo activar la forma.');
    if(!a.transformacion.etapa_id)throw Error('Etapa inválida.');
    if(act.enfriamiento)a.cooldowns[act.id]=act.enfriamiento+1;
    a.accion_usada=true;normalizar(a);return n;
  }
  let e = act.efecto;
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
    coste = (e.coste_ph || 0) + extra.ph,
    fatiga = (e.coste_fatiga || 0) + extra.fatiga,
    t = n.miembros.find((m) => m.id === objetivoId);
  if(coste>0 && (s.silencio_ph||0)>0)throw Error('Silencio del Núcleo impide gastar PH.');
  const tactica=e.tablero;
  if(tactica){const fallo=validarTactica(e);if(fallo)throw Error(fallo);}
  const posiciones=posicionesTablero(n), origen=posiciones[a.id];
  const apuntado=tactica?.origen_area==='lanzador'?origen:centro || (t?posiciones[t.id]:undefined);
  const dimensiones=dimensionesTablero(n);
  const requiereAreaMovil=tactica?.origen_area==='aterrizaje'||tactica?.origen_area==='recorrido';
  const plan=requiereAreaMovil&&tactica?.movimiento_lanzador&&apuntado?planearAtaqueDeArea(n,a,apuntado,tactica.movimiento_lanzador):undefined;
  const punto=tactica?.origen_area==='aterrizaje'&&plan?plan.destino:apuntado;
  let objetivos=t?[t]:[];
  if(e.portal && tactica && apuntado){
    if(!alcanceDesde(origen,tactica,dimensiones).some(p=>p.x===apuntado.x&&p.y===apuntado.y)||!lineaVisible(origen,apuntado,n.mapa)||n.mapa?.celdas[apuntado.x+','+apuntado.y]==='muro'||Object.values(posiciones).some(p=>p.x===apuntado.x&&p.y===apuntado.y))throw Error('El umbral necesita una casilla libre visible dentro del alcance.');
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
    if(!apuntado||!alcanceDesde(origen,tactica,dimensiones).some(p=>p.x===apuntado.x&&p.y===apuntado.y))throw Error('El destino está fuera del alcance de la habilidad.');
    if(!lineaVisible(origen,apuntado,n.mapa))throw Error('Un muro bloquea la trayectoria.');
    if(!punto||requiereAreaMovil&&!plan)throw Error('No hay un destino válido para el movimiento ofensivo.');
    const area=tactica.origen_area==='recorrido'&&plan
      ?[...areaDeRecorrido(plan.trayecto,tactica.movimiento_lanzador?.ancho||0,dimensiones),...(distanciaCasillas(plan.trayecto[plan.trayecto.length-1],apuntado)<=(tactica.movimiento_lanzador?.alcance_golpe||0)?[apuntado]:[])]
      :areaDesde(origen,punto,tactica,dimensiones);
    objetivos=n.miembros.filter(m=>{
      const p=m.id===a.id&&plan?plan.destino:posiciones[m.id];
      return !(e.suelo&&tiene(m,'vuelo'))&&(m.vida>0||e.efecto==='curacion'&&situacionCombatiente(m)!=='muerto')
        &&objetivoDelArea(a,m,e)&&area.some(v=>v.x===p.x&&v.y===p.y);
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
  if(e.recurso){
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
  a.uso_fatiga = fatiga > 0;
  a.accion_usada = true;
  if (fatiga && a.fatiga >= (s.fatiga || 0)) a.agotado = true;
  if (act.enfriamiento) a.cooldowns[act.id] = act.enfriamiento + 1;
  if (forzando) {
    const v = dados(n, 1, 4, rng, "Daño por agotamiento");
    Object.assign(a,danarTransformado(a,v).actor);
    if (!a.vida) {
      log(n, `${a.nombre} cae por agotamiento antes de ejecutar la habilidad.`);
      return n;
    }
  }
  log(n, `${act.nombre}: coste ${coste} PH y ${fatiga} Fatiga.`);
  if (potenciadores.length) log(n, `${act.nombre} potenciada: ${(e.componentes || []).map(x => `${x.cantidad}d${x.caras} ${x.elemento}`).join(" + ")}.`);
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
  const magia=(a.configuracion.habilidades||[]).find(h=>accionId==='hab:'+h.id+':'+e.id);
  const claveMagia=magia?.forja_id||magia?.id;
  if(claveMagia&&(e.naturaleza==='magica'||coste>0)&&!normalizarReaccion(e).reaccion){
    for(const testigo of n.miembros){
      if(testigo.id===a.id||!combatienteActivo(testigo)||tiene(testigo,'ciego')||!testigo.configuracion.habilidades?.some(h=>h.efectos?.some(ef=>ef.aprendizaje)))continue;
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
  if(tactica&&punto)log(n,`${act.nombre}: ${tactica.origen_area==='recorrido'?'recorrido':'centro'} (${punto.x+1}, ${punto.y+1}), ${objetivos.length} objetivos afectados.`);
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
      const legado = !e.estado_def && ["narrativo", "veneno", "regeneracion", "aturdido", "quemadura"].includes(tipo);
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
    antes.reduce((v, r) => v + (r.bonos.armadura || 0), 0) + (n.mapa?.celdas[`${posicionesTablero(n)[t.id].x},${posicionesTablero(n)[t.id].y}`]==='cobertura'&&distanciaCasillas(posicionesTablero(n)[a.id],posicionesTablero(n)[t.id])>1?2:0);
  const debil = golpeOcular(n, a, t);
  const anticipa = anticipacion(n, t, a);
  if (anticipa) { arm += anticipa; log(n, `${t.nombre} anticipa el golpe con su ojo: +${anticipa} ARM.`); }
  if (debil) log(n, `${a.nombre} ve un punto débil de ${t.nombre} (${debil.ojos.join(', ')}) y ataca desde el ${NOMBRE_DIRECCION[debil.direccion]}: ${describirRecompensa(debil.recompensa)}.`);
  if (debil?.recompensa.perforar) arm = Math.floor(arm * (100 - debil.recompensa.perforar) / 100);
  if (tiene(t, "escarcha")) arm = Math.floor(arm / 2);
  arm = Math.max(
    0,
    arm -
      Math.max(...(e.componentes?.length ? e.componentes.map(x => x.elemento) : [elemento]).map(x => x === "electricidad" ? 3 : x === "luz_sagrada" ? 5 : 0)),
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
      const apoyo=a.configuracion.habilidades?.flatMap(h=>h.efectos||[]).find(p=>p.companero_magico)?.companero_magico;
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
  if (elemento !== "ninguno")
    dadosTotal += dados(n, 1, 4, rng, "Daño elemental " + elemento);
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
  // Elemental saves affect secondary states, never repeat the attack roll. Cada componente aplica los suyos.
  for (const elemento of elementosGolpe) {
  const eElemento: Efecto = e.componentes?.length ? { ...e, componentes: undefined, elemento: elemento as Elemento } : e;
  if (permiteEstados && elemento === "agua" && puedeAplicar(n, t, "mojado", undefined, e) !== 'no') estado(t, "mojado", "Mojado");
  if (
    permiteEstados &&
    elemento === "fuego" &&
    puedeAplicar(n, t, "quemadura", undefined, e) !== 'no' &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(
      t,
      "quemadura",
      "Quemadura",
      0,
      {},
      { cantidad: 1, caras: 4, cd: 12, atributo: "salvacion" },
    );
  if (
    permiteEstados &&
    elemento === "hielo" &&
    puedeAplicar(n, t, "escarcha", undefined, e) !== 'no' &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(t, "escarcha", "Escarcha: ARM a la mitad hasta el próximo ataque");
  if (
    permiteEstados &&
    elemento === "luz_sagrada" &&
    puedeAplicar(n, t, "marca_luz", undefined, e) !== 'no' &&
    !salvacion(n, t, 12, "salvacion", rng)
  )
    estado(t, "marca_luz", "Marcado por la Luz");
  if (elemento === "electricidad" && t.grupo_cercania) {
    for (const otro of n.miembros.filter(
      (m) =>
        m.id !== t.id &&
        m.id !== a.id &&
        m.bando === t.bando &&
        m.vida > 0 &&
        m.grupo_cercania === t.grupo_cercania,
    )) {
      area(n, a, otro, eElemento, 3, rng);
      log(n, `${otro.nombre}: chispa de cercanía 3.`);
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
    if (comp.elemento !== "ninguno") v += dados(n, 1, 4, rng, "Daño elemental " + comp.elemento);
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
    const inm = comprobarInmunidad(inmunidades, candidatoDano({ ...e, componentes: undefined, elemento: comp.elemento }, comp.elemento), e.ignora);
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
  for (const h of (m.configuracion.habilidades || []).filter(h => !requisitosFuente(m, h).length)) for (const e of h.efectos || []) if (e.rasgo && !vistos.has(e.rasgo.id)) vistos.set(e.rasgo.id, e.rasgo);
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
export function estadosVisibles(m: Pick<Combatiente, 'estados'>) {
  return m.estados.map(e => { const d = definicionDe(e); return { id: e.id, nombre: e.nombre, icono: d?.icono || 'yugen', restantes: e.restantes, categoria: d?.categoria, frase: d ? describirEstado({ ...d, nombre: e.nombre.split(':')[0] }) : e.nombre }; });
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
  const n=registrar(c, () => actuarInterno(c, actorId, accionId, objetivoId, rng, forzar, centro, false, potenciadores),rng);
  const actor=c.miembros.find(m=>m.id===actorId),efecto=actor?acciones(actor).find(a=>a.id===accionId)?.efecto:undefined;
  return animarAccion(c,n,actorId,efecto,accionId,objetivoId,centro);
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
  const hasta=propio?pos[actorId]:centro||pos[final||objetivoId]||pos[actorId];
  const area=efecto?.tablero&&hasta?areaDesde(pos[actorId],hasta,efecto.tablero,dimensionesTablero(c)):undefined;
  n.evento_visual={...n.evento_visual,id:n.evento_visual?.id||crypto.randomUUID(),nombre:efecto?.nombre||accionId,dados:n.evento_visual?.dados||[],animacion:efecto?.animacion||'impacto',vfx:efecto?.vfx,desde:pos[actorId],hasta,area,
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
 const activacion=(m.configuracion.habilidades||[]).flatMap(h=>h.efectos||[]).find(e=>e.transformacion?.id===m.transformacion?.definicion_id);
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
 efectosMotor(r.efectos,ctx,clave);
}
function efectosMotor(efectos:EfectoRegla[],ctx:ContextoMotor,origen:string){
 if(ctx.profundidad>8)throw Error('Demasiadas ramas de efectos.');
 for(const [indice,e] of efectos.entries()){
  const destinos=['aliados','enemigos','todos'].includes(e.destino)?ctx.c.miembros.filter(m=>(m.vida>0||e.tipo==='curar'&&situacionCombatiente(m)!=='muerto')&&(e.destino==='todos'||(e.destino==='aliados'?m.bando===ctx.yo.bando:m.bando!==ctx.yo.bando))):[sujetoMotor(ctx,e.destino as Sujeto)];
  for(const t of destinos){
   if(ctx.alcanceManual!==undefined&&t.id!==ctx.yo.id&&['dano','estado','perder_accion'].includes(e.tipo)){const p=posicionesTablero(ctx.c);if(distanciaCasillas(p[ctx.yo.id],p[t.id])>ctx.alcanceManual)continue;}
   const v=()=>valorMotor(e.valor,ctx),m=motor(t),clave=e.clave||`${origen}:${indice}`;
   switch(e.tipo){
    case 'salvacion':case 'condicional':{
     const exito=e.tipo==='salvacion'?salvacion(ctx.c,t,e.cd||12,e.atributo||'salvacion',ctx.rng):condicionMotor(e.condicion||{tipo:'siempre'},ctx);
     efectosMotor((exito?e.exito:e.fallo)||[],{...ctx,objetivo:t,profundidad:ctx.profundidad+1},`${origen}:${indice}:${exito}`);break;
    }
    case 'perder_accion':t.accion_usada=true;log(ctx.c,`${t.nombre} pierde su acción del turno.`);break;
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
  if(n.fase==='en_curso'&&(n.actual!==m.id||m.accion_usada||m.vida<=0))throw Error('Cambiar equipo requiere tu turno y una acción disponible.');
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
  if(n.fase==='en_curso')m.accion_usada=true;
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
  if(!m||n.fase!=='en_curso'||n.actual!==m.id||m.accion_usada||m.vida<=0)throw Error('Usar un objeto requiere tu turno y una acción disponible.');
  const p=m.configuracion.reserva?.find(p=>p.id===objetoId);
  if(!p||!accionesObjeto(m,p).some(a=>a.id===efectoId))throw Error('Este objeto no está disponible o debes equiparlo primero.');
  const objetivo=n.miembros.find(v=>v.id===objetivoId);if(!objetivo||situacionCombatiente(objetivo)==='muerto')throw Error('Selecciona un objetivo vivo.');
  const slot=Object.entries(m.configuracion.equipamiento||{}).find(([,v])=>v.id===p.id)?.[0];
  const temporal='inventario-'+p.id;
  if(!slot)(m.configuracion.habilidades||=[]).push({...p,id:temporal});
  const id=efectoId.startsWith('regla:')?`regla:${slot?'equipo:'+p.id:'hab:'+temporal}:${efectoId.slice(6)}`:slot?`equipo:${slot}:${efectoId}`:`hab:${temporal}:${efectoId}`;
  const resultado=actuarInterno(n,m.id,id,objetivoId,rng,false),actor=resultado.miembros.find(v=>v.id===actorId)!;
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

/** Invocar es una acción atómica: el llamador valida la propuesta antes de pagar. */
export function incorporarInvocacion(c:Combate,actorId:string,habilidad:Fuente,preparado:Parameters<typeof agregar>[1],duracion:number,maxActivas=1,rng:RNG=dadoSeguro){
 const actor=c.miembros.find(m=>m.id===actorId);
 if(c.fase!=="en_curso"||c.actual!==actorId||!actor||actor.vida<=0||actor.accion_usada)throw Error("Solo puedes invocar durante tu turno con una acción disponible.");
 if(!actor.configuracion.habilidades?.some(h=>h.id===habilidad.id))throw Error("Habilidad no equipada.");
 const config=habilidad.configuracion_invocacion;
 if(!config||!Number.isInteger(duracion)||duracion<1||!Number.isInteger(maxActivas)||maxActivas<1)throw Error("Configuración de invocación inválida.");
 const faltan=requisitosFuente(actor,habilidad);if(faltan.length)throw Error(faltan.join("; "));
 if(c.miembros.filter(m=>m.invocacion?.invocador===actorId&&m.invocacion.habilidad===habilidad.id&&m.vida>0).length>=maxActivas)throw Error("Ya alcanzaste el límite de invocaciones activas.");
 const ph=config.costePh??0,fatiga=config.costeFatiga??0;
 if(!Number.isInteger(ph)||!Number.isInteger(fatiga)||ph<0||fatiga<0)throw Error("Costes inválidos.");
 if(phDisponibles(actor)<ph||fatiga>0&&actor.fatiga+fatiga>(estadisticas(actor).fatiga||0))throw Error("No tienes recursos suficientes para invocar.");
 if(c.miembros.length>=100)throw Error("Máximo cien participantes.");
 return registrar(c,()=>{
  const temporal={...c,fase:"preparacion" as const};
  const n=agregar(temporal,{...preparado,id:crypto.randomUUID()},actor.bando,rng);n.fase=c.fase;
  const a=n.miembros.find(m=>m.id===actorId)!;a.ph=phDisponibles(a)-ph;a.fatiga+=fatiga;a.uso_fatiga=fatiga>0;a.accion_usada=true;
  const criatura=n.miembros[n.miembros.length-1];criatura.invocacion={invocador:actorId,habilidad:habilidad.id!,restantes:duracion};
  log(n,`${a.nombre} invoca a ${criatura.nombre} durante ${duracion} turnos propios.`);return n;
 });
}


/** Tablero inicial sin editor de mapas. Las posiciones se guardan en el encuentro. */
export function dimensionesTablero(c: Pick<Combate, 'miembros'|'mapa'>) {
  return c.mapa ? {columnas:c.mapa.columnas,filas:c.mapa.filas} : { columnas: 12, filas: Math.max(8, Math.ceil(c.miembros.length / 8) + 2) };
}
export function posicionesTablero(c: Pick<Combate, 'miembros'|'mapa'>): Record<string, Posicion> {
  const {columnas, filas} = dimensionesTablero(c), resultado: Record<string, Posicion> = {}, ocupadas = new Set<string>();
  const valida = (p: Posicion) => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < columnas && p.y < filas;
  for (const m of c.miembros) if (m.posicion && valida(m.posicion) && !ocupadas.has(`${m.posicion.x},${m.posicion.y}`) && c.mapa?.celdas[`${m.posicion.x},${m.posicion.y}`]!=="muro") {
    resultado[m.id] = {...m.posicion}; ocupadas.add(`${m.posicion.x},${m.posicion.y}`);
  }
  for (const m of c.miembros) if (!resultado[m.id]) {
    const xs=Array.from({length:columnas},(_,i)=>(i+1)%columnas);const columnasBando=m.bando==='jugador'?xs:Array.from({length:columnas},(_,i)=>(columnas-2-i+columnas)%columnas);
    for (const x of columnasBando) {
      for (let y = 1; y <= filas; y++) { const fila = y % filas;
        if (!ocupadas.has(`${x},${fila}`)&&c.mapa?.celdas[`${x},${fila}`]!=="muro") {resultado[m.id] = {x,y:fila}; ocupadas.add(`${x},${fila}`); break;}
      }
      if (resultado[m.id]) break;
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
  return distanciasMovimiento(inicio,Object.values(posiciones),columnas,filas,c.mapa,alcance??movimientoRestante(m),tiene(m,'vuelo'));
}
export function distanciasMovimiento(inicio:Posicion,posiciones:Posicion[],columnas:number,filas:number,mapa:MapaCombate|undefined,limite:number,vuelo:boolean):Record<string,number>{
  const ocupadas=new Set(posiciones.map(p=>p.x+','+p.y));
  const distancias: Record<string,number> = {[`${inicio.x},${inicio.y}`]:0}, cola = [inicio];
  for (let i=0; i<cola.length; i++) {
    const p=cola[i], d=distancias[`${p.x},${p.y}`]; if(d>=limite)continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=p.x+dx,y=p.y+dy,k=`${x},${y}`;
      const coste=!vuelo&&mapa?.celdas[k]==='dificil'?2:1;
      if(x<0||y<0||x>=columnas||y>=filas||ocupadas.has(k)||mapa?.celdas[k]==='muro'||d+coste>limite||(k in distancias&&distancias[k]<=d+coste))continue;
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


export const distanciaCasillas=(a:Posicion,b:Posicion)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function validarTactica(e:Efecto):string|null {
 const t=e.tablero;if(!t)return null;
 if(typeof t!=='object'||!Number.isInteger(t.alcance)||t.alcance<0||t.alcance>60||!Number.isInteger(t.tamano)||t.tamano<0||t.tamano>12||t.forma!=='individual'&&t.tamano<1||!['individual','circulo','cuadrado','linea','cono','cruz'].includes(t.forma)||!['enemigos','aliados','todos','yo'].includes(t.afecta)||e.efecto==='crear_arma')return 'Configuración de tablero inválida.';
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
/** Círculo/cruz usan radio; cuadrado usa lado; línea/cono usan longitud desde el lanzador. */
export function areaDesde(origen:Posicion,centro:Posicion,t:AlcanceHabilidad,d:{columnas:number;filas:number}):Posicion[]{
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
  const ocupadas=new Set(Object.entries(posiciones).filter(([id])=>id!==t.id).map(([,p])=>`${p.x},${p.y}`));
  for(let i=0;i<d.casillas;i++){
   let dx=centro.x-p.x,dy=centro.y-p.y;
   if(d.tipo==='atraer'&&dx===0&&dy===0)break;
   if(d.tipo==='empujar'){dx=-dx;dy=-dy;if(!dx&&!dy){dx=p.x-posiciones[a.id].x;dy=p.y-posiciones[a.id].y;}if(!dx&&!dy)break;}
   const pasos=Math.abs(dx)>=Math.abs(dy)?[{x:Math.sign(dx),y:0},{x:0,y:Math.sign(dy)}]:[{x:0,y:Math.sign(dy)},{x:Math.sign(dx),y:0}];
   const siguiente=pasos.filter(v=>v.x||v.y).map(v=>({x:p.x+v.x,y:p.y+v.y})).find(v=>v.x>=0&&v.y>=0&&v.x<dim.columnas&&v.y<dim.filas&&!ocupadas.has(`${v.x},${v.y}`)&&c.mapa?.celdas[`${v.x},${v.y}`]!=='muro');
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
 return {...despues,evento_visual:{id:crypto.randomUUID(),creado_en:Date.now(),nombre:despues.miembros.find(m=>m.id===despues.actual)?.nombre||'Combate',dados:[],resultado:despues.resultado,cambios_vida:cambiosVida(antes,despues),movimientos,transformaciones}};
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
function aplicarTerreno(c:Combate,m:Combatiente,rng:RNG=dadoSeguro){
 const p=posicionesTablero(c)[m.id];if(!tiene(m,'vuelo')&&p&&c.mapa?.celdas[`${p.x},${p.y}`]==='peligro'&&m.vida>0){recibir(c,m,m,{...basico(),efecto:'dano'},2,[],rng);log(c,`${m.nombre}: terreno peligroso, 2 de daño.`);}
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
const BAJO_TIERRA = /\b(bajo tierra|enterrad[oa]|excavando|subsuelo)\b/i;
const bajoTierra = (m: Combatiente) => m.estados.some(e => BAJO_TIERRA.test(e.nombre || '') || BAJO_TIERRA.test(e.tipo || ''));
/** Ojos abiertos de un combatiente: los activados (estados) y los permanentes de sus habilidades y equipo. */
export function visionesActivas(m: Combatiente): VisionActiva[] {
  if (m.vida <= 0) return [];
  const lista: VisionActiva[] = m.estados.filter(e => e.vision).map(e => ({ clave: e.id, vision: e.vision!, restantes: e.vision!.duracion && e.vision!.modo !== 'permanente' ? e.restantes : null }));
  const fuentes = [...(m.configuracion.habilidades || []).filter(h => !requisitosFuente(m, h).length), ...Object.values(piezas(m))];
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
    const coste = e.vision && e.vision.modo !== 'permanente' ? e.vision.mantenimiento_ph || 0 : 0;
    if (!coste) continue;
    if (phDisponibles(m) >= coste) { m.ph -= coste; log(c, `${m.nombre}: mantener ${e.nombre} cuesta ${coste} PH.`); }
    else { quitarEstado(m, e.id); log(c, `${m.nombre}: sin PH para mantener ${e.nombre}; el ojo se cierra.`); }
  }
  normalizar(m);
}
function observa(c: Combate, o: Combatiente, t: Combatiente, v: Vision, pos: Record<string, Posicion>) {
  if (t.id === o.id || t.bando === o.bando || t.vida <= 0) return false;
  const po = pos[o.id], pt = pos[t.id];
  if (!po || !pt) return false;
  if (v.alcance && distanciaCasillas(po, pt) > v.alcance) return false;
  if (!v.atraviesa_muros && !lineaVisible(po, pt, c.mapa)) return false;
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
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = cx + dx, ay = cy + dy; if (ax >= 0 && ay >= 0 && ax < columnas && ay < filas && c.mapa?.celdas[`${ax},${ay}`] !== 'muro') amenaza.add(`${ax},${ay}`); }
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
