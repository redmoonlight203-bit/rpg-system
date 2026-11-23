/**
 * Cola de diálogos en pantalla (sustituye a window.confirm / alert / prompt).
 * Lógica pura: el componente `components/Dialogo.tsx` la pinta y le pasa las teclas.
 */
export type OpcionesConfirmar = {titulo:string;mensaje:string;aceptar?:string;cancelar?:string;peligro?:boolean};
export type OpcionesAvisar = {titulo:string;mensaje:string;aceptar?:string};
export type PeticionDialogo = {id:number;tipo:'confirmar'|'avisar';titulo:string;mensaje:string;aceptar:string;cancelar:string;peligro:boolean};
type Pendiente = {peticion:PeticionDialogo;resolver:(v:boolean)=>void};

export function crearColaDialogos(){
  const cola:Pendiente[]=[];
  const oyentes=new Set<()=>void>();
  let siguiente=1;
  const avisarCambio=()=>{for(const f of oyentes)f();};
  const encolar=(peticion:Omit<PeticionDialogo,'id'>)=>new Promise<boolean>(resolver=>{
    cola.push({peticion:{...peticion,id:siguiente++},resolver});
    avisarCambio();
  });
  const responder=(valor:boolean)=>{
    const p=cola.shift();
    if(!p)return;
    p.resolver(valor);
    avisarCambio();
  };
  return {
    confirmar:(o:OpcionesConfirmar)=>encolar({tipo:'confirmar',titulo:o.titulo,mensaje:o.mensaje,aceptar:o.aceptar||'Aceptar',cancelar:o.cancelar||'Cancelar',peligro:!!o.peligro}),
    avisar:(o:OpcionesAvisar)=>encolar({tipo:'avisar',titulo:o.titulo,mensaje:o.mensaje,aceptar:o.aceptar||'Entendido',cancelar:'',peligro:false}).then(()=>undefined),
    actual:():PeticionDialogo|null=>cola[0]?.peticion||null,
    responder,
    /** Devuelve true si la tecla se consumió (Esc cancela). */
    tecla(clave:string){
      if(clave!=='Escape'||!cola.length)return false;
      responder(false);
      return true;
    },
    suscribir(f:()=>void){oyentes.add(f);return ()=>{oyentes.delete(f);};},
  };
}
export type ColaDialogos = ReturnType<typeof crearColaDialogos>;
