import type {Efecto} from './creacion';
// Orden del Diario lector; KUROI es el máximo indicado por el GM.
export const CLASES_YUGEN=['F','D','C','B','A','S','Z','KUROI'] as const;
export const UMBRALES_CLASE=[0,10,25,50,100,200,500,1000] as const;
export const PESOS_CLASE:Record<string,number>={vida:.1,hp:.1,ph:.2,energia:.01,resistencia:.01,peso:0,durabilidad:0,dados_dano:0,caras_dano:0,enfriamiento:0,cooldown:0};
export function calcularClase(stats:Record<string,number>,efectos:Efecto[]=[],bonos:Record<string,number>={},efectosRegla=0){
 const atributos=Object.entries(stats).reduce((n,[k,v])=>n+(k==='hp'&&'vida' in stats?0:Math.max(0,v)*(PESOS_CLASE[k]??1)),0);
 const accion=(e:Pick<Efecto,'cantidad'|'caras'|'modificador'>)=>Math.max(0,e.cantidad*(e.caras+1)/2+e.modificador);
 const acciones=Math.max(0,...efectos.map(e=>e.tabla_armas?Math.max(0,...e.tabla_armas.resultados.map(accion)):accion(e)));
 const pasivas=Object.values(bonos).reduce((n,v)=>n+Math.max(0,v),0),reglas=efectosRegla*2;
 const puntuacion=Math.round((atributos+acciones+pasivas+reglas)*100)/100;
 return {clase:CLASES_YUGEN[UMBRALES_CLASE.reduce<number>((n,v,i)=>puntuacion>=v?i:n,0)],puntuacion,atributos,acciones,pasivas,reglas};
}
