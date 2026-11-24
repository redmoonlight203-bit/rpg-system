import type {ReactNode} from "react";
import type {TipoCreacion} from "../../lib/creacion";
import type {Codice,ConfiguracionCodices} from "../../lib/codices";
import type {FormaHistoria} from "../FormasHistoria";
import type {PiezaGaleria,PropsGaleria} from "../GaleriaCreacion";
import type {EstadoPresentacion} from "./EditorPresentacion";

/** Todo lo que una vista de códice necesita para dibujar una creación. Lo construye VistaCodice. */
export type ContextoCodice<T extends PiezaGaleria=PiezaGaleria>={
  item:T;
  props:PropsGaleria<T>;
  config:ConfiguracionCodices;
  codice:Codice;
  tipo:TipoCreacion;
  monstruo:boolean;
  /** Imagen e icono ya resueltos con la forma activa y la edición en curso. */
  imagenVisible:string|undefined;
  iconoVisible:string;
  forma:FormaHistoria|undefined;
  presentacion:EstadoPresentacion;
  ocupado:boolean;
  /** Marcadores para las plantillas de texto: {nombre}, {clasificacion}, {tipo}, {rango}, {rango_nombre}, {romano}. */
  vars:Record<string,string|number>;
  /** Abre una creación enlazada; ya pasa por `navegar`. */
  abrir:(id:string)=>void;
  /** Ejecuta `fn` si no hay cambios de presentación sin guardar, o tras confirmarlo. */
  navegar:(fn:()=>void)=>void;
  /** id del título h2 que recibe el foco al abrir el códice. */
  idTitulo:string;
  /** Piezas obligatorias: cada vista decide dónde, pero las coloca todas. */
  ranuras:{acciones:ReactNode;presentacion:ReactNode;peligro:ReactNode;formas:ReactNode;estado:ReactNode;verComo:ReactNode};
};

export type VistaProps<T extends PiezaGaleria=PiezaGaleria>={ctx:ContextoCodice<T>};
