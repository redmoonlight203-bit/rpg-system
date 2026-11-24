import type {Huella} from './huellas-combate';
import type {FormaHistoria} from "../components/FormasHistoria";
import type {LineaEvolutiva} from "./evolucion";
import type {InvocacionEditor} from "../components/EditorInvocacion";
import type {ConfiguracionMonstruo} from "./monstruos";
import type {ConfiguracionArtefacto} from "./artefactos";
import type {RequisitosUso} from "./combate";
import type {Regla} from "./reglas";
import type {ReglaPasiva} from "./pasivas";
import type {Rango} from "./forja";
import type {Efecto,TipoCreacion} from "./creacion";
import type {RegistroEstado} from "./registro-estados";
export type VinculoNaturaleza={naturaleza_id:string;origen:string;bestia:string;sello:string;notas:string;huella?:Huella};
export const vinculoVacio=():VinculoNaturaleza=>({naturaleza_id:"",origen:"",bestia:"",sello:"",notas:""});
export type Creacion={/** Línea de evolución y legado de la plantilla. */linea_evolutiva?:LineaEvolutiva|null;configuracion_artefacto?:ConfiguracionArtefacto|null;personal_de?:string|null;formas_historia?:FormaHistoria[];alma_en_uso?:boolean;naturaleza_vinculo?:VinculoNaturaleza;configuracion_monstruo?:ConfiguracionMonstruo|null;nivel?:number;nivel_maximo?:number;configuracion_invocacion?:InvocacionEditor|null;requisitos_uso?:RequisitosUso;consumible?:boolean;icono?:string|null;id:string;nombre:string;tipo:string;tipo_creacion?:TipoCreacion;descripcion:string;historia:string;requisitos:string;defectos:string;imagen_url:string;clase:string;stats:Record<string,number>;stats_rango:Record<string,Rango>;es_grupo:boolean;slot_tipo:string;estado:string;ligado_al_alma:boolean;es_vendible:boolean;precio_sugerido:string;habilidades:string[];pasivas:string[];reglas:Regla[];reglas_pasivas:ReglaPasiva[];equipamiento:Record<string,string>;configuracion_dados:Efecto[]};
export type Peticion={id:string;nombre:string;descripcion:string;user_id:string};
export type Borrador={/** Estados y formas creados en el Yunque que aún no usa ninguna regla. Solo en memoria: los usados se recuperan de las reglas al abrir. */estados?:RegistroEstado[];/** Evolución y legado: etapas de vida y evoluciones (solo personajes y criaturas). */linea?:LineaEvolutiva|null;huella?:Huella;/** Artefacto con niveles (solo objetos). */artefacto?:ConfiguracionArtefacto|null;/** Id del personaje dueño si es una creación personal; '' si es general. */personal_de?:string;formas:FormaHistoria[];icono:string;naturalezaVinculo:VinculoNaturaleza;ramaMonstruo:boolean;monstruo:ConfiguracionMonstruo|null;nivelMaximo:number;invocacion:InvocacionEditor|null;requisitos_uso:RequisitosUso;consumible:boolean;id?:string;peticion?:Peticion;nombre:string;tipo:TipoCreacion;clasificacion:string;descripcion:string;historia:string;requisitos:string;defectos:string;imagen:string;clase:string;malla:boolean;slot:string;stats:Record<string,number>;rangos:Record<string,Rango>;efectos:Efecto[];habilidades:string[];pasivas:string[];reglas:Regla[];reglas_pasivas:ReglaPasiva[];equipamiento:Record<string,string>;alma:boolean;venta:boolean;precio:string};
export const vacio=():Borrador=>({formas:[],icono:"",naturalezaVinculo:vinculoVacio(),ramaMonstruo:false,monstruo:null,nivelMaximo:20,invocacion:null,requisitos_uso:{},consumible:false,nombre:"",tipo:"objeto",clasificacion:"",descripcion:"",historia:"",requisitos:"",defectos:"",imagen:"",clase:"D",malla:false,slot:"ninguno",stats:{},rangos:{},efectos:[],habilidades:[],pasivas:[],reglas:[],reglas_pasivas:[],equipamiento:{},alma:false,venta:false,precio:""});


/** La huella se guarda en el JSON existente aunque la plantilla no tenga naturaleza adquirida. */
export function serializarVinculoNaturaleza(b:Pick<Borrador,'tipo'|'naturalezaVinculo'|'huella'>):Partial<VinculoNaturaleza>{
 if(b.tipo!=='personaje')return {};
 const {naturaleza_id,origen,bestia,sello,notas}=b.naturalezaVinculo;
 return {...(naturaleza_id?{naturaleza_id,origen,bestia,sello,notas}:{}),...(b.huella?{huella:b.huella}:{})};
}
