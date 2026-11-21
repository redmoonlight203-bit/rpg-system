'use client';
// Editor del módulo «Visión» del Yunque: cualquier ojo se compone combinando apariencia, activación,
// mirada, revelación, puntos débiles, anticipación, amenazas y bonos. La vista previa se dibuja con los mismos datos
// que verá el jugador en combate.
import OjoVisual from '../../OjoVisual';
import {Fichas,Interruptor,Rueda,Texto,type Opcion} from '../Controles';
import {ATRIBUTOS_BONO_OCULAR,PATRONES_OJO,describirVision,validarVision,type ModoVision,type RecompensaPunto,type RevelarOcular,type Vision} from '../../../lib/vision';
import type {Efecto} from '../../../lib/creacion';

const MODOS:Opcion<ModoVision>[]=[
 {valor:'abrir',nombre:'Se abre con la acción',icono:'ojo',ayuda:'La acción abre el ojo; usarla otra vez lo cierra'},
 {valor:'con_accion',nombre:'Al usar la acción',icono:'espada',ayuda:'La acción hace su efecto y además abre el ojo'},
 {valor:'permanente',nombre:'Siempre abierto',icono:'alma',ayuda:'Funciona solo, como una pasiva'},
];
const VELOS:Opcion<number>[]=[{valor:0,nombre:'Sin velo'},{valor:1,nombre:'Suave'},{valor:2,nombre:'Marcado'},{valor:3,nombre:'Intenso'}];
const CAMBIOS:Opcion<'ronda'|'combate'>[]=[{valor:'ronda',nombre:'Cambian cada ronda',icono:'yugen'},{valor:'combate',nombre:'Fijos todo el combate',icono:'escudo'}];
const REVELAR:[keyof RevelarOcular,string,string][]=[
 ['vida','Vida y PH','Cifras exactas'],['estados','Estados','Con turnos restantes'],['acciones','Acciones','Todo lo que puede usar'],
 ['pasivas','Pasivas','Sus efectos pasivos'],['atributos','Atributos','Armadura, daño, salvación…'],['ocultos','Lo oculto','Ve bajo tierra'],
];
const CARAS=[2,3,4,6,8,10,12,20];
const limpio=<T extends object>(o:T):T=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined&&v!==false&&!(typeof v==='object'&&v!==null&&!Array.isArray(v)&&!Object.keys(v).length))) as T;

export default function EditorVision({efecto,onChange}:{efecto:Efecto;onChange:(v:Vision)=>void}){
 const v=efecto.vision!;
 const set=(p:Partial<Vision>)=>onChange(limpio({...v,...p}) as Vision);
 const ap=(p:Partial<Vision['apariencia']>)=>set({apariencia:limpio({...v.apariencia,...p})});
 const rev=(k:keyof RevelarOcular,x:boolean)=>set({revelar:limpio({...v.revelar,[k]:x||undefined})});
 const pd=v.puntos_debiles;
 const premio=(p:Partial<RecompensaPunto>)=>pd&&set({puntos_debiles:{...pd,recompensa:limpio({...pd.recompensa,...p})}});
 const error=validarVision(v);
 const ayuda=(()=>{try{return describirVision(v);}catch{return null;}})();
 return <div className="yq-editor yq-vision">
  <section className="yq-vision-cabecera">
   <OjoVisual apariencia={v.apariencia} nombre={v.nombre||'Ojo'} size={112}/>
   <div className="yq-vision-identidad">
    <Texto etiqueta="Nombre del ojo" valor={v.nombre} max={80} placeholder="Ojo del Eclipse…" onChange={nombre=>set({nombre})}/>
    <div className="yq-vision-colores">
     <label className="yq-campo"><span>Iris</span><input type="color" value={v.apariencia.color} onChange={e=>ap({color:e.target.value})} aria-label="Color del iris"/></label>
     <label className="yq-campo"><span>Marcas</span><input type="color" value={v.apariencia.secundario||'#111111'} onChange={e=>ap({secundario:e.target.value})} aria-label="Color de las marcas"/></label>
     <label className="yq-campo"><span>Nº de marcas</span><Rueda nombre="marcas" etiqueta="Número de marcas del iris" valor={v.apariencia.marcas} min={0} max={9} onChange={marcas=>ap({marcas:Math.round(marcas)})} compacta/></label>
    </div>
   </div>
  </section>
  <Fichas etiqueta="Patrón del iris" opciones={PATRONES_OJO.map(p=>({valor:p.valor,nombre:p.nombre}))} valor={v.apariencia.patron} onChange={patron=>ap({patron})} columnas={4}/>
  <Fichas etiqueta="Velo sobre el tablero en tu turno" opciones={VELOS} valor={v.apariencia.velo} onChange={velo=>ap({velo})}/>
  <Texto etiqueta="Imagen propia del ojo (opcional)" valor={v.apariencia.imagen_url||''} max={2048} placeholder="https://…" ayuda="Si la pones, sustituye al dibujo generado." onChange={imagen_url=>ap({imagen_url:imagen_url.trim()||undefined})}/>

  <Fichas etiqueta="Cómo se activa" opciones={MODOS} valor={v.modo} onChange={modo=>set({modo,sin_accion:modo==='abrir'?v.sin_accion:undefined})} grandes tono="arcano"/>
  {v.modo==='abrir'&&<p className="yq-nota">Esta acción solo abre o cierra el ojo; su daño o efecto propio no se usa. Abrirlo cuesta los PH y la Fatiga de la acción. Cerrarlo es gratis.</p>}
  {v.modo==='permanente'&&!(efecto.cantidad>0)&&<p className="yq-nota">Un ojo siempre abierto sin dados propios no aparece en la barra de acciones: funciona solo.</p>}
  {v.modo==='abrir'&&<Interruptor etiqueta="Abrirlo no gasta la acción del turno" valor={!!v.sin_accion} onChange={x=>set({sin_accion:x||undefined})}/>}
  {v.modo!=='permanente'&&<div className="yq-costes">
   <label><span>Turnos abierto (0 = todo el combate)</span><Rueda nombre="duracion" etiqueta="Turnos que permanece abierto" valor={v.duracion} min={0} max={99} onChange={duracion=>set({duracion:Math.round(duracion)})} compacta/></label>
   <label><span>PH por turno para mantenerlo</span><Rueda nombre="mantenimiento" etiqueta="PH por turno de mantenimiento" valor={v.mantenimiento_ph||0} min={0} max={100} onChange={x=>set({mantenimiento_ph:Math.round(x)||undefined})} compacta/></label>
  </div>}

  <fieldset className="yq-vision-grupo"><legend>Mirada</legend>
   <div className="yq-costes"><label><span>Alcance en casillas (0 = todo el tablero)</span><Rueda nombre="alcance" etiqueta="Casillas que alcanza la mirada" valor={v.alcance} min={0} max={100} onChange={alcance=>set({alcance:Math.round(alcance)})} compacta/></label></div>
   <Interruptor etiqueta="Ve a través de muros" valor={!!v.atraviesa_muros} onChange={x=>set({atraviesa_muros:x||undefined})}/>
  </fieldset>

  <fieldset className="yq-vision-revelar"><legend>Qué revela de los enemigos que mira</legend>
   {REVELAR.map(([k,n,a])=><Interruptor key={k} etiqueta={<>{n} <small>· {a}</small></>} valor={!!v.revelar?.[k]} onChange={x=>rev(k,x)}/>)}
  </fieldset>

  <fieldset className="yq-vision-grupo"><legend>Puntos débiles</legend>
   <Interruptor etiqueta="Ve puntos débiles en cada enemigo" valor={!!pd} onChange={x=>set({puntos_debiles:x?{cantidad:1,cambia:'ronda',recompensa:{ventaja:true}}:undefined})}/>
   {pd&&<>
    <p className="yq-nota">Cada enemigo mostrará direcciones brillantes. Atacar desde esa dirección (estar en ese lado de la ficha) da la recompensa.</p>
    <div className="yq-costes"><label><span>Direcciones por enemigo</span><Rueda nombre="cantidad" etiqueta="Direcciones débiles por enemigo" valor={pd.cantidad} min={1} max={4} onChange={cantidad=>set({puntos_debiles:{...pd,cantidad:Math.round(cantidad)}})} compacta/></label></div>
    <Fichas etiqueta="Cuándo cambian" opciones={CAMBIOS} valor={pd.cambia} onChange={cambia=>set({puntos_debiles:{...pd,cambia}})}/>
    <div className="yq-vision-revelar">
     <Interruptor etiqueta="Ventaja (dos d20, el mayor)" valor={!!pd.recompensa.ventaja} onChange={x=>premio({ventaja:x||undefined})}/>
     <Interruptor etiqueta="Crítico seguro (salvo un 1 natural)" valor={!!pd.recompensa.critico} onChange={x=>premio({critico:x||undefined})}/>
    </div>
    <fieldset className="yq-bonos"><legend>Además</legend>
     <label><span>Impacto</span><Rueda nombre="impacto" etiqueta="Bono al impacto en el punto débil" valor={pd.recompensa.impacto||0} min={-50} max={50} onChange={x=>premio({impacto:Math.round(x)||undefined})} compacta/></label>
     <label><span>Daño fijo</span><Rueda nombre="dano" etiqueta="Daño extra en el punto débil" valor={pd.recompensa.dano||0} min={-1000} max={1000} onChange={x=>premio({dano:Math.round(x)||undefined})} compacta/></label>
     <label><span>Dados extra</span><Rueda nombre="dados" etiqueta="Dados de daño extra" valor={pd.recompensa.dados||0} min={0} max={20} onChange={x=>{const d=Math.round(x);premio(d?{dados:d,caras:pd.recompensa.caras||6}:{dados:undefined,caras:undefined});}} compacta/></label>
     {!!pd.recompensa.dados&&<label><span>Caras</span><Rueda nombre="caras" etiqueta="Caras de los dados extra" valor={pd.recompensa.caras||6} valores={CARAS} onChange={caras=>premio({caras})} compacta/></label>}
     <label><span>Perfora ARM %</span><Rueda nombre="perforar" etiqueta="Porcentaje de armadura ignorada" valor={pd.recompensa.perforar||0} min={0} max={100} paso={10} onChange={x=>premio({perforar:Math.round(x)||undefined})} compacta/></label>
    </fieldset>
   </>}
  </fieldset>

  <fieldset className="yq-vision-grupo"><legend>Defensa y lectura</legend>
   <div className="yq-costes"><label><span>Anticipar: + armadura contra quien ve</span><Rueda nombre="anticipar" etiqueta="Armadura contra atacantes que ve" valor={v.anticipar?.armadura||0} min={0} max={50} onChange={x=>set({anticipar:Math.round(x)?{armadura:Math.round(x)}:undefined})} compacta/></label></div>
   <Interruptor etiqueta="Ver hasta dónde llegan los enemigos" valor={!!v.amenazas} onChange={x=>set({amenazas:x||undefined})}/>
  </fieldset>

  <fieldset className="yq-bonos"><legend>Mientras está abierto</legend>
   {ATRIBUTOS_BONO_OCULAR.map(([k,n])=><label key={k} className={v.bonos?.[k]?'is-activo':undefined}><span>{n}</span><Rueda nombre={'ojo_'+k} etiqueta={`${n} mientras el ojo está abierto`} valor={v.bonos?.[k]||0} min={-999} max={999} onChange={x=>{const b={...v.bonos};if(x)b[k]=Math.round(x);else delete b[k];set({bonos:Object.keys(b).length?b:undefined});}} compacta/></label>)}
  </fieldset>

  {error?<p className="yq-error" role="alert">{error}</p>:ayuda&&<ul className="yq-vision-resumen" aria-label="Así funcionará el ojo">{ayuda.detalles.map((d,i)=><li key={i}>{d}</li>)}</ul>}
 </div>;
}
