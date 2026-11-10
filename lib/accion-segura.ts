/** Coordinación de comandos, independiente de React y de la cola de animaciones. */
export type ComandoAccion=Record<string,unknown>;
export type SolicitudAccion={action_id:string;comando:ComandoAccion;etiqueta:string;inicio:number};
export type EstadoAccion={fase:'reposo'|'procesando'|'incierta';solicitud?:SolicitudAccion;mensaje?:string};
export class ErrorAccion extends Error {constructor(mensaje:string,public incierta=true){super(mensaje);this.name='ErrorAccion';}}
export function errorDeServidor(e:{message?:string;code?:string;incierta?:boolean},status?:number){
 const segura=['42501','22023','23514','23505','P0001'].includes(e.code||'')||!!status&&status>=400&&status<500&&!['57014','55P03','40P01','40001'].includes(e.code||'');
 return new ErrorAccion(e.message||'No se pudo confirmar la acción.',e.incierta===true||!segura);
}
type Opciones<T>={enviar:(comando:ComandoAccion)=>Promise<T>;consultar:(id:string)=>Promise<{confirmada?:boolean}>;descartar?:(id:string)=>Promise<{confirmada?:boolean;descartada?:boolean}>;recuperar:()=>Promise<T>;guardar?:(s:SolicitudAccion|null)=>void;cargar?:()=>SolicitudAccion|null;ahora?:()=>number};
export class AccionSegura<T> {
 estado:EstadoAccion={fase:'reposo'};
 private oyentes=new Set<(e:EstadoAccion)=>void>();
 private vuelo?:Promise<T>;
 private revision=0;
 constructor(private opciones:Opciones<T>){}
 escuchar(fn:(e:EstadoAccion)=>void){this.oyentes.add(fn);return()=>{this.oyentes.delete(fn);};}
 private emitir(e:EstadoAccion){this.estado=e;for(const fn of this.oyentes)fn(e);}
 restaurar(){if(this.estado.solicitud)return;try{const s=this.opciones.cargar?.();if(s&&/^[0-9a-f-]{36}$/i.test(s.action_id)&&s.comando&&typeof s.comando==='object')this.emitir({fase:'incierta',solicitud:s,mensaje:'Hay una acción pendiente de confirmar. Consulta su estado antes de continuar.'});}catch{/* El servidor mantiene la idempotencia aunque el almacenamiento local no esté disponible. */}}
 private guardar(s:SolicitudAccion|null){try{this.opciones.guardar?.(s);}catch{/* La solicitud se conserva en memoria. */}}
 private aceptar(id:string){if(this.estado.solicitud?.action_id===id){this.guardar(null);this.emitir({fase:'reposo'});}}
 ejecutar(comando:ComandoAccion,etiqueta='acción'):Promise<T>{
  this.restaurar();
  const pendiente=this.estado.solicitud;
  if(pendiente){
   if(this.vuelo&&JSON.stringify(pendiente.comando)===JSON.stringify(comando))return this.vuelo;
   return Promise.reject(new ErrorAccion('Confirma primero la acción pendiente.',true));
  }
  const solicitud={action_id:crypto.randomUUID(),comando:JSON.parse(JSON.stringify(comando)),etiqueta,inicio:this.opciones.ahora?.()??Date.now()};
  this.guardar(solicitud);this.emitir({fase:'procesando',solicitud});
  return this.mandar(solicitud);
 }
 private mandar(s:SolicitudAccion):Promise<T>{
  const numero=++this.revision;
  this.emitir({fase:'procesando',solicitud:s});
  const prom=Promise.resolve().then(()=>this.opciones.enviar({...s.comando,action_id:s.action_id})).then(async data=>{
   this.aceptar(s.action_id);return data;
  }).catch(async e=>{
   // Una respuesta fallida puede llegar DESPUÉS del commit o después de otro reintento.
   try{const recibo=await this.opciones.consultar(s.action_id);if(recibo.confirmada){this.aceptar(s.action_id);return await this.opciones.recuperar();}}catch{/* Sin recibo confirmado no se inventa el resultado. */}
   if(e instanceof ErrorAccion&&!e.incierta){this.aceptar(s.action_id);throw e;}
   if(this.estado.solicitud?.action_id===s.action_id)this.emitir({fase:'incierta',solicitud:s,mensaje:'No llegó la confirmación. Comprueba el estado o reintenta la misma acción; no se duplicará.'});
   throw new ErrorAccion('No llegó la confirmación. La acción queda pendiente de comprobar.',true);
  }).finally(()=>{if(this.revision===numero)this.vuelo=undefined;});
  this.vuelo=prom;return prom;
 }
 async comprobar():Promise<T|undefined>{
  const s=this.estado.solicitud;if(!s)return;
  try{const recibo=await this.opciones.consultar(s.action_id);if(recibo.confirmada){this.aceptar(s.action_id);return await this.opciones.recuperar();}
   if(this.estado.solicitud?.action_id===s.action_id)this.emitir({...this.estado,mensaje:'Todavía no consta confirmada. Puedes reintentar usando el mismo identificador.'});
  }catch{if(this.estado.solicitud?.action_id===s.action_id)this.emitir({...this.estado,mensaje:'No hay conexión para comprobar la acción. Se conserva el mismo identificador.'});}
 }
 async reintentar():Promise<T|undefined>{
  const s=this.estado.solicitud;if(!s)return;
  const confirmada=await this.comprobar();if(confirmada!==undefined||!this.estado.solicitud)return confirmada;
  // El servidor serializa este action_id y devuelve el primer recibo, incluso con dos peticiones en vuelo.
  await this.mandar(s);
  return this.opciones.recuperar();
 }
 async descartar():Promise<T|undefined>{
  const s=this.estado.solicitud;if(!s||!this.opciones.descartar)return;
  // El veto comparte el bloqueo del guardado; una consulta sin recibo no basta.
  const r=await this.opciones.descartar(s.action_id);
  if(!r.confirmada&&!r.descartada)throw new ErrorAccion('No se pudo resolver la acción pendiente.',true);
  const actual=await this.opciones.recuperar();
  this.aceptar(s.action_id);return actual;
 }
}
