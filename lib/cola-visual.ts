/** Cola solo visual. Nunca participa en confirmar, validar o desbloquear comandos. */
export class ColaVisual<T extends {id:string}> {
 private cola:T[]=[];private activo?:T;private timer?:ReturnType<typeof setTimeout>;private vistos=new Set<string>();
 constructor(private mostrar:(lote:T|undefined)=>void,private duracion:(lote:T)=>number,private limite=6){}
 agregar(lote:T){
  if(this.vistos.has(lote.id))return;
  this.vistos.add(lote.id);if(this.vistos.size>250)this.vistos.delete(this.vistos.values().next().value!);
  if(this.cola.length>=this.limite)this.cola.shift();
  this.cola.push(lote);if(!this.activo)this.siguiente();
 }
 private siguiente(){
  this.activo=this.cola.shift();this.mostrar(this.activo);if(!this.activo)return;
  this.timer=setTimeout(()=>{this.activo=undefined;this.siguiente();},Math.max(1,Math.min(2600,this.duracion(this.activo))));
 }
 cerrar(){clearTimeout(this.timer);this.cola=[];this.activo=undefined;this.vistos.clear();}
}
