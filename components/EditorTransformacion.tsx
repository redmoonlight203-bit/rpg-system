"use client";

import {useState} from "react";
import type {Efecto} from "../lib/creacion";
import type {DefinicionTransformacion, EtapaTransformacion, TipoTransformacion} from "../lib/transformaciones";

const campo = "mt-1 w-full rounded-lg border border-neutral-700 bg-black p-2 text-neutral-100";
const boton = "rounded-lg border border-neutral-600 px-3 py-2 text-sm hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-40";
const atributos = [
  {clave:"vida", nombre:"Vida máxima", ayuda:"Solo para formas con barra de vida independiente."},
  {clave:"armadura", nombre:"Armadura", ayuda:"Protección total durante esta etapa."},
  {clave:"ph", nombre:"PH máximos", ayuda:"Capacidad de PH; no recupera PH al cambiar de etapa."},
  {clave:"fatiga", nombre:"Límite de Fatiga", ayuda:"Resistencia máxima a la Fatiga."},
  {clave:"movimiento", nombre:"Movimiento", ayuda:"Casillas que puede recorrer por turno."},
  {clave:"dano", nombre:"Daño adicional", ayuda:"Bono total de daño."},
  {clave:"bono_impacto", nombre:"Precisión", ayuda:"Bono total al impacto."},
  {clave:"salvacion", nombre:"Salvación", ayuda:"Bono total a salvaciones."},
  {clave:"iniciativa", nombre:"Iniciativa", ayuda:"Bono total de iniciativa."}
];
const nombreAtributo = Object.fromEntries(atributos.map(a=>[a.clave,a.nombre])) as Record<string,string>;

type PropEtapa = {
  etapa: EtapaTransformacion;
  numero: number;
  tipo: TipoTransformacion;
  acciones: Efecto[];
  total: number;
  onChange: (etapa:EtapaTransformacion)=>void;
  onEliminar: ()=>void;
};

function EditorEtapa({etapa,numero,tipo,acciones,total,onChange,onEliminar}:PropEtapa) {
  const [nuevoAtributo,setNuevoAtributo]=useState("");
  const [error,setError]=useState("");
  const valorDe=(clave:string)=>clave==="vida"?(etapa.stats.vida??etapa.stats.hp):etapa.stats[clave];
  const cambiarValor=(clave:string,valor?:number)=>{
    const stats={...etapa.stats};
    if(clave==="vida")delete stats.hp;
    if(valor===undefined)delete stats[clave];
    else stats[clave]=valor;
    onChange({...etapa,stats});
  };
  const agregarAtributo=()=>{
    const clave=nuevoAtributo.trim().toLowerCase();
    if(!/^[a-z_][a-z0-9_]{0,63}$/.test(clave)){setError("Usa letras minúsculas, números o guiones bajos; empieza con una letra.");return;}
    if(clave==="hp"){setError("Usa vida en lugar de hp.");return;}
    if(clave==="vida"&&tipo==="poder"){setError("La vida real no se modifica en una transformación de poder.");return;}
    if(valorDe(clave)!==undefined){setError("Ese atributo ya está configurado.");return;}
    cambiarValor(clave,0);
    setNuevoAtributo("");
    setError("");
  };
  const claves = [
    ...atributos.filter(a=>tipo==="forma"||a.clave!=="vida").map(a=>a.clave),
    ...Object.keys(etapa.stats).filter(k=>k!=="hp"&&(tipo==="forma"||k!=="vida")&&!Object.hasOwn(nombreAtributo,k))
  ];
  const poderes = acciones.filter(a=>a.efecto!=="transformacion");
  return (
    <fieldset className="space-y-4 rounded-xl border border-neutral-700 bg-black/20 p-3 sm:p-4">
      <legend className="px-2 font-semibold text-violet-200">Etapa {numero}</legend>
      <label className="block text-sm">Nombre de la etapa
        <input className={campo} value={etapa.nombre} maxLength={120} onChange={e=>onChange({...etapa,nombre:e.target.value})} placeholder="Ej.: Manifestación parcial"/>
      </label>

      <div className="space-y-2">
        <h4 className="font-semibold">Estadísticas de esta etapa</h4>
        <p className="text-xs text-neutral-400">
          Pulsa Modificar para establecer el valor total de un atributo. Si dice Se conserva, seguirá usando el valor original del personaje.
          Para deshacer un cambio, pulsa Conservar. Un valor de 0 es un cambio real, no significa conservar.
        </p>
        <div className="overflow-x-auto rounded-lg border border-neutral-700">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-300">
              <tr><th className="px-3 py-2">Atributo</th><th className="px-3 py-2">Valor durante la etapa</th><th className="px-3 py-2">Control</th></tr>
            </thead>
            <tbody>
              {claves.map(clave=>{
                const valor=valorDe(clave);
                const definido=valor!==undefined;
                return (
                  <tr key={clave} className="border-t border-neutral-800">
                    <th scope="row" className="px-3 py-2 font-medium">
                      {nombreAtributo[clave]||clave.replaceAll("_"," ")}
                    </th>
                    <td className="px-3 py-2">
                      {definido?
                        <input aria-label={"Valor de "+(nombreAtributo[clave]||clave)} className={campo+" mt-0 min-w-[90px]"} type="number" min={0} max={1000000} step={1} value={valor} onChange={e=>cambiarValor(clave,Math.max(0,Math.min(1000000,Number(e.target.value))))}/>
                        :<span className="text-neutral-400">Se conserva</span>}
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" className={boton} onClick={()=>cambiarValor(clave,definido?undefined:clave==="vida"?20:0)}>{definido?"Conservar":"Modificar"}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tipo==="forma"&&!(valorDe("vida")>0)&&<p className="text-sm text-amber-300">Para una forma necesitas definir Vida máxima con un valor mayor que 0.</p>}
        {tipo==="poder"&&<p className="text-xs text-neutral-400">Las transformaciones de poder conservan los HP actuales y el máximo de vida del cuerpo original.</p>}
        <div className="rounded-lg border border-dashed border-neutral-700 p-3">
          <label className="block text-sm">Añadir otro atributo de Estadísticas y reglas</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className={campo+" mt-0 min-w-[160px] flex-1"} value={nuevoAtributo} onChange={e=>{setNuevoAtributo(e.target.value);setError("");}} placeholder="Ej.: resistencia_magica" aria-label="Clave de atributo personalizado"/>
            <button type="button" className={boton} onClick={agregarAtributo}>+ Añadir atributo</button>
          </div>
          {error&&<p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>

      <fieldset className="space-y-2 rounded-lg border border-neutral-700 p-3">
        <legend className="px-2 font-semibold">Poderes exclusivos de esta etapa</legend>
        {poderes.length? poderes.map(accion=>
          <label key={accion.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-900">
            <input type="checkbox" checked={etapa.habilidades?.includes(accion.id)||false} onChange={e=>onChange({...etapa,habilidades:e.target.checked?[...new Set([...(etapa.habilidades||[]),accion.id])]:(etapa.habilidades||[]).filter(id=>id!==accion.id)})}/>
            {accion.nombre}
          </label>
        ):<p className="text-sm text-neutral-400">Añade otras acciones a esta habilidad para seleccionarlas aquí. Las que marques solo estarán disponibles en las etapas elegidas.</p>}
      </fieldset>
      <div className="flex justify-end">
        <button type="button" className={boton+" text-red-200"} disabled={total===1} onClick={onEliminar}>Eliminar etapa</button>
      </div>
    </fieldset>
  );
}

export function EditorTransformacion({efecto,acciones,onChange}:{efecto:Efecto;acciones:Efecto[];onChange:(d:DefinicionTransformacion)=>void}) {
  const d=efecto.transformacion!;
  const tipo=(nuevo:TipoTransformacion)=>{
    onChange({...d,tipo:nuevo,etapas:d.etapas.map(et=>{
      const stats={...et.stats};
      if(nuevo==="poder"){delete stats.hp;delete stats.vida;}
      else if(stats.vida===undefined&&stats.hp===undefined)stats.vida=20;
      return {...et,stats};
    })});
  };
  const actualizar=(id:string,etapa:EtapaTransformacion)=>onChange({...d,etapas:d.etapas.map(e=>e.id===id?etapa:e)});
  const agregar=()=>{
    if(d.etapas.length>=12)return;
    const anterior=d.etapas[d.etapas.length-1];
    const stats={...anterior?.stats};
    if(d.tipo==="forma"&&stats.vida===undefined&&stats.hp===undefined)stats.vida=20;
    onChange({...d,etapas:[...d.etapas,{id:crypto.randomUUID(),nombre:"Etapa "+(d.etapas.length+1),stats,habilidades:[]}]});
  };
  return (
    <div className="space-y-4 rounded-xl border border-violet-700 p-3 sm:p-4">
      <div className="space-y-2">
        <label className="block text-sm font-semibold">Tipo de transformación
          <select className={campo} value={d.tipo} onChange={e=>tipo(e.target.value as TipoTransformacion)}>
            <option value="forma">Forma: barra de vida independiente</option>
            <option value="poder">Poder: conserva su vida real</option>
          </select>
        </label>
        <p className="text-xs text-neutral-400">Forma: al agotar sus HP vuelve al cuerpo original. Poder: los HP no se restauran y puede morir. Solo una activación por encuentro; avanzar de etapa consume una acción, sin pagar de nuevo la activación.</p>
      </div>
      {d.etapas.map((etapa,i)=>
        <EditorEtapa key={etapa.id} etapa={etapa} numero={i+1} tipo={d.tipo} acciones={acciones} total={d.etapas.length}
          onChange={siguiente=>actualizar(etapa.id,siguiente)}
          onEliminar={()=>onChange({...d,etapas:d.etapas.filter(e=>e.id!==etapa.id)})}/>
      )}
      <button type="button" className={boton+" w-full"} disabled={d.etapas.length>=12} onClick={agregar}>+ Añadir etapa (copiar atributos de la anterior)</button>
      <p className="text-xs text-neutral-400">Máximo 12 etapas. Cada una tiene sus propios atributos y poderes; los cambios en una etapa no modifican las demás.</p>
    </div>
  );
}
