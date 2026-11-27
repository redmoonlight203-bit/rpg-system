/** Escalona arranques visuales sin esperar que termine el efecto anterior. */
export class ColaVisual<T extends {id:string}> {
 private pendientes:T[]=[];
 private activos=new Map<string,{lote:T;timer:ReturnType<typeof setTimeout>}>();
 private vistos=new Set<string>();
 private intervalo?:ReturnType<typeof setTimeout>;

 constructor(private mostrar:(lotes:T[])=>void,private duracion:(lote:T)=>number,private pausa=110){}

 tiene(id:string){
  return this.vistos.has(id)||this.activos.has(id)||this.pendientes.some(p=>p.id===id);
 }

 agregar(lote:T){
  if(this.tiene(lote.id))return;
  this.vistos.add(lote.id);
  if(this.vistos.size>250)this.vistos.delete(this.vistos.values().next().value!);
  this.pendientes.push(lote);
  if(this.intervalo===undefined)this.siguiente();
 }

 private emitir(){
  this.mostrar(Array.from(this.activos.values(),({lote})=>lote));
 }

 private siguiente(){
  const lote=this.pendientes.shift();
  if(!lote)return;
  const timer=setTimeout(()=>{
   this.activos.delete(lote.id);
   this.emitir();
  },Math.max(1,this.duracion(lote)));
  this.activos.set(lote.id,{lote,timer});
  this.intervalo=setTimeout(()=>{
   this.intervalo=undefined;
   this.siguiente();
  },this.pausa);
  this.emitir();
 }

 cerrar(){
  clearTimeout(this.intervalo);
  this.intervalo=undefined;
  for(const {timer} of this.activos.values())clearTimeout(timer);
  this.activos.clear();
  this.pendientes=[];
  this.vistos.clear();
 }
}
