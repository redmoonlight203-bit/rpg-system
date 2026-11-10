"use client";
import {useState} from 'react';
import type {Efecto,AlcanceHabilidad} from '../lib/creacion';
import {areaDesde} from '../lib/combate';
const campo='mt-1 w-full rounded-lg border border-neutral-700 bg-well p-2 text-neutral-100';
const formas:Record<AlcanceHabilidad['forma'],string>={individual:'Un objetivo',circulo:'Círculo por casillas',cuadrado:'Cuadrado',linea:'Línea desde el lanzador',cono:'Cono desde el lanzador',cruz:'Cruz'};
export default function EditorAlcance({efecto:e,onChange}:{efecto:Efecto;onChange:(p:Partial<Efecto>)=>void}){
 const t=e.tablero;
 const [centro,setCentro]=useState({x:4,y:4});
 const patch=(p:Partial<AlcanceHabilidad>)=>{if(t)onChange({tablero:{...t,...p}});};
 const salvacion=()=>e.salvacion||{cd:12,atributo:'salvacion',exito:'mitad' as const};
 const origen={x:0,y:4};
 const centroVista=t?.origen_area==='lanzador'?origen:centro;
 const area=t?.origen_area==='recorrido'?Array.from({length:Math.max(0,Math.min(9,centro.x))},(_,i)=>({x:i+1,y:4})):t?areaDesde(origen,centroVista,t,{columnas:9,filas:9}):[];
 return <section className="space-y-4 rounded-xl border border-sky-900/60 bg-sky-950/10 p-4"><h3 className="font-bold text-sky-200">Alcance y casillas afectadas</h3><label>Si no eliges pixel art<select className={campo} value={e.animacion||"impacto"} onChange={v=>onChange({animacion:v.target.value as Efecto["animacion"]})}>{["proyectil","destello","aura","impacto","trayectoria","desplazamiento","ninguna"].map(a=><option key={a}>{a}</option>)}</select><small>Esta animación básica se usa cuando no has elegido efectos pixel art. Ninguna desactiva la animación básica.</small></label><label className="flex gap-2"><input type="checkbox" checked={!!t} onChange={v=>onChange({tablero:v.target.checked?{alcance:6,forma:'individual',tamano:0,afecta:'enemigos',color:'azul'}:undefined})}/>Configurar esta acción para el tablero</label>{!t?<p className="text-xs text-neutral-400">Sin configurar: los ataques reciben alcance automático y limitado (cuerpo a cuerpo: 1, lanzas: 2, arcos: 8 y magia a distancia: 6 casillas). Actívalo para definir un alcance o un área específicos.</p>:<>
 {e.efecto==='dano'&&<div className="space-y-3 rounded-xl border border-amber-800/60 bg-amber-950/10 p-3">
  <h4 className="font-semibold text-amber-200">¿Desde dónde golpea esta habilidad?</h4>
  <label className="block text-sm">Modo de impacto
   <select className={campo} value={t.origen_area||'objetivo'} onChange={ev=>{
    const modo=ev.target.value as NonNullable<AlcanceHabilidad['origen_area']>;
    const cambios:Partial<AlcanceHabilidad>={origen_area:modo};
    if(modo==='lanzador')Object.assign(cambios,{alcance:0,forma:'circulo',tamano:2,movimiento_lanzador:undefined,afecta_lanzador:false});
    if(modo==='aterrizaje')Object.assign(cambios,{alcance:6,forma:'circulo',tamano:1,movimiento_lanzador:{tipo:'salto',casillas:6,alcance_golpe:1},afecta_lanzador:false});
    if(modo==='recorrido')Object.assign(cambios,{alcance:6,forma:'linea',tamano:6,movimiento_lanzador:{tipo:'carrera',casillas:6,alcance_golpe:0,ancho:0},afecta_lanzador:false});
    if(modo==='objetivo'&&t.movimiento_lanzador?.tipo==='carrera')Object.assign(cambios,{movimiento_lanzador:undefined});
    patch(cambios);
   }}>
    <option value="objetivo">Impacto sobre un objetivo o punto (normal)</option>
    <option value="lanzador">Rugido / aura: nace del atacante y afecta alrededor</option>
    <option value="aterrizaje">Salto: se desplaza y golpea al caer</option>
    <option value="recorrido">Carrera: golpea a todas las criaturas a su paso</option>
   </select>
  </label>
  <p className="text-xs text-neutral-400">{t.origen_area==='lanzador'?'El rugido siempre se centra en tu personaje. No debes apuntar a una casilla lejana.':t.origen_area==='aterrizaje'?'Elige dónde caer: el motor busca una casilla libre cercana y aplica el área desde el aterrizaje.':t.origen_area==='recorrido'?'Traza una carrera hacia la casilla elegida. Daña una vez a cada objetivo dentro de la franja recorrida y no atraviesa muros.':'El efecto se centra en la casilla indicada. Puedes añadir un desplazamiento al atacante antes de golpear.'}</p>
  {t.origen_area!=='lanzador'&&<label className="block text-sm">Movimiento del atacante
   <select className={campo} value={t.movimiento_lanzador?.tipo||'ninguno'} onChange={ev=>{
    const tipo=ev.target.value;
    if(tipo==='ninguno'){patch({movimiento_lanzador:undefined,origen_area:'objetivo'});return;}
    if(tipo==='carrera'){patch({origen_area:'recorrido',forma:'linea',tamano:6,alcance:6,movimiento_lanzador:{tipo:'carrera',casillas:6,alcance_golpe:0,ancho:0}});return;}
    patch({origen_area:t.origen_area==='recorrido'?'objetivo':t.origen_area,movimiento_lanzador:{tipo:tipo as 'dash'|'salto'|'teletransporte',casillas:6,alcance_golpe:1}});
   }}>
    <option value="ninguno">Sin movimiento adicional</option>
    <option value="dash">Dash: avanza por casillas libres</option>
    <option value="salto">Salto: supera criaturas, no muros</option>
    <option value="teletransporte">Teletransporte: aparece en otra casilla libre</option>
    <option value="carrera">Carrera: daño durante el recorrido</option>
   </select>
  </label>}
  {t.movimiento_lanzador&&<div className="grid gap-3 sm:grid-cols-3">
   <label className="text-sm">Casillas máximas de movimiento<input className={campo} type="number" min={1} max={30} value={t.movimiento_lanzador.casillas} onChange={ev=>patch({movimiento_lanzador:{...t.movimiento_lanzador!,casillas:Number(ev.target.value)}})}/></label>
   <label className="text-sm">Alcance de golpe final<input className={campo} type="number" min={0} max={20} value={t.movimiento_lanzador.alcance_golpe} onChange={ev=>patch({movimiento_lanzador:{...t.movimiento_lanzador!,alcance_golpe:Number(ev.target.value)}})}/></label>
   {t.movimiento_lanzador.tipo==='carrera'&&<label className="text-sm">Ancho extra del recorrido<input className={campo} type="number" min={0} max={2} value={t.movimiento_lanzador.ancho||0} onChange={ev=>patch({movimiento_lanzador:{...t.movimiento_lanzador!,ancho:Number(ev.target.value)}})}/></label>}
  </div>}
  {t.forma!=='individual'&&<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.afecta_lanzador!==false} onChange={ev=>patch({afecta_lanzador:ev.target.checked})}/>El atacante también recibe daño si está dentro del área</label>}
 </div>}
 <div className="grid gap-4 sm:grid-cols-3"><label>Distancia máxima de lanzamiento<input className={campo} type="number" min={0} max={60} value={t.alcance} onChange={v=>patch({alcance:Number(v.target.value)})}/><small>{t.origen_area==='lanzador'?'0: el efecto nace de tu propia casilla.':'Casillas horizontales y verticales desde el personaje. Se marca en blanco.'}</small></label><label>Forma del efecto<select className={campo} value={t.forma} onChange={v=>{const forma=v.target.value as AlcanceHabilidad['forma'];patch({forma,tamano:forma==='individual'?0:forma==='cuadrado'?3:2});}}>{Object.entries(formas).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{t.forma!=='individual'&&<label>{t.forma==='cuadrado'?'Lado del cuadrado':t.forma==='linea'||t.forma==='cono'?'Longitud desde el personaje':'Radio alrededor del centro'}<input className={campo} type="number" min={1} max={12} value={t.tamano} onChange={v=>patch({tamano:Number(v.target.value)})}/><small>{t.forma==='cuadrado'?`${t.tamano} × ${t.tamano} casillas`:'Casillas. La vista previa se recorta en los bordes del mapa.'}</small></label>}</div>
 <div className="grid gap-4 sm:grid-cols-2"><label>A quién afecta<select className={campo} value={t.afecta} onChange={v=>patch({afecta:v.target.value as AlcanceHabilidad['afecta']})}><option value="enemigos">Enemigos (según la casilla y el ajuste de autodaño)</option><option value="aliados">Aliados, incluido el lanzador</option><option value="todos">Todos: permite fuego amigo</option><option value="yo">Solo el lanzador</option></select></label><label>Color del área<select className={campo} value={t.color||'azul'} onChange={v=>patch({color:v.target.value as AlcanceHabilidad['color']})}>{['azul','rojo','verde','dorado','violeta'].map(v=><option key={v}>{v}</option>)}</select></label></div>
 <div className="yunque-formas" role="group" aria-label="Forma del área">{Object.entries(formas).map(([k,n])=><button type="button" key={k} aria-pressed={t.forma===k} onClick={()=>{const forma=k as AlcanceHabilidad['forma'];patch({forma,tamano:forma==='individual'?0:forma==='cuadrado'?3:2});}}><span aria-hidden="true">{{individual:'●',circulo:'◉',cuadrado:'▦',linea:'━',cono:'◀',cruz:'✚'}[k]}</span>{n}</button>)}</div>
 <div className="flex flex-wrap items-center gap-5"><div aria-label="Vista previa del área: toca una casilla para apuntar" className="yunque-area-grid">{Array.from({length:81},(_,i)=>{const x=i%9,y=Math.floor(i/9),afectada=area.some(p=>p.x===x&&p.y===y);return <button type="button" aria-label={`Apuntar a ${x+1}, ${y+1}`} aria-pressed={centro.x===x&&centro.y===y} key={i} className={x===0&&y===4?'origen':afectada?'afectada':''} onClick={()=>setCentro({x,y})}>{x===0&&y===4?'♟':centro.x===x&&centro.y===y?'◎':''}</button>;})}</div><p className="text-xs text-neutral-400">Blanco: lanzador. Azul: área afectada. Toca el mapa para ver cómo cambia el efecto. Es una vista previa, no modifica su alcance ni gasta recursos.</p></div>
 <div className="space-y-3 border-t border-neutral-800 pt-4"><h4 className="font-bold">Mover a los afectados y derribarlos</h4><label>Desplazamiento<select className={campo} value={t.desplazamiento?.tipo||'ninguno'} onChange={v=>patch({desplazamiento:v.target.value==='ninguno'?undefined:{tipo:v.target.value as 'atraer'|'empujar',casillas:2,cuando:'siempre'}})}><option value="ninguno">No mueve a los objetivos</option><option value="atraer">Atraer hacia el centro del efecto</option><option value="empujar">Empujar lejos del centro</option></select></label>{t.desplazamiento&&<div className="grid gap-3 sm:grid-cols-2"><label>Hasta cuántas casillas<input className={campo} type="number" min={1} max={12} value={t.desplazamiento.casillas} onChange={v=>patch({desplazamiento:{...t.desplazamiento!,casillas:Number(v.target.value)}})}/></label><label>Cuándo se mueve<select className={campo} value={t.desplazamiento.cuando} onChange={v=>onChange({tablero:{...t,desplazamiento:{...t.desplazamiento!,cuando:v.target.value as 'siempre'|'fallo_salvacion'}},...(v.target.value==='fallo_salvacion'?{salvacion:salvacion()}:{})})}><option value="siempre">Siempre que recibe el efecto</option><option value="fallo_salvacion">Solo si falla la salvación</option></select></label></div>}<label>Derribo<select className={campo} value={t.derribo||'ninguno'} onChange={v=>onChange({tablero:{...t,derribo:v.target.value==='ninguno'?undefined:v.target.value as 'siempre'|'fallo_salvacion'},...(v.target.value==='fallo_salvacion'?{salvacion:salvacion()}:{})})}><option value="ninguno">No derriba</option><option value="siempre">Derriba cuando recibe el efecto</option><option value="fallo_salvacion">Derriba si falla la salvación</option></select></label><p className="text-xs text-neutral-400">El desplazamiento no atraviesa participantes ni gasta el movimiento de la víctima. Derribado: -2 al ataque y debe levantarse antes de caminar; levantarse cuesta la mitad de su movimiento máximo, sin gastar su acción.</p></div>
 </>}</section>;
}
