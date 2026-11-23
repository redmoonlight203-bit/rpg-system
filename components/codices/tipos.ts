import type { ReactNode, RefObject } from "react";
import type { PiezaGaleria, PropsGaleria } from "../GaleriaCreacion";
import type { Codice } from "../../lib/codices";
import type { TipoCreacion } from "../../lib/creacion";

export type ContextoCodice<T extends PiezaGaleria> = {
  item: T;
  props: PropsGaleria<T>;
  codice: Codice;
  tipo: TipoCreacion;
  monstruo: boolean;
  imagenVisible?: string;
  iconoVisible: string;
  ocupado: boolean;
  forma?: NonNullable<PiezaGaleria["formas_historia"]>[number];
  abrir: (id: string) => void;
  navegar: (fn: () => void) => void;
  titulo: RefObject<HTMLHeadingElement | null>;
  ranuras: { acciones: ReactNode; presentacion: ReactNode; peligro: ReactNode; formas: ReactNode; estado: ReactNode };
};
