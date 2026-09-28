export type Rol = "REENCARNADO" | "KUROI";

export interface Atributos {
  fisico: number;
  magico: number;
  resistencia: number;
  inteligencia: number;
  agilidad: number;
}

export interface Recursos {
  vidaActual: number;
  vidaMaxima: number;
  energiaActual: number;
  energiaMaxima: number;
  hambre: number;
  exp: number;
  nivel: number;
  puntosKuro: number;
}

export interface Equipamiento {
  casco?: string;
  pechera?: string;
  pantalones?: string;
  botas?: string;
  manoPrincipal?: string;
  manoSecundaria?: string;
  accesorios: (string | null)[];
}

export interface HabilidadO {
  nombre: string;
  desbloqueada: boolean;
  efecto: string;
}

export interface Personaje {
  id: string;
  nombre: string;
  raza: string;
  titulos: string[];
  pasiva: string;
  usuarioDelSistema: boolean;
  habilidadO: HabilidadO;
  atributos: Atributos;
  recursos: Recursos;
  equipamiento: Equipamiento;
}