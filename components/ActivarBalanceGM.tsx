'use client';
import {useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {clasificarForja} from '../app/dm/forja/clasificar';
import {atributosEfectivos} from '../lib/estadisticas';
import {efectosDe,tipoDe} from '../lib/creacion';
import {Button} from './ui';

export function ActivarBalanceGM(){
  const [mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
  const bloqueo=useRef(false);
  async function aplicar(){
    if(bloqueo.current)return;
    bloqueo.current=true;setOcupado(true);setMensaje('Aplicando definiciones…');
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)throw Error('Inicia sesión como Kuroi.');
      for(const fn of ['forja_activar_bases_ipe','forja_activar_escamas_ipe']){
        const {error}=await supabase.rpc(fn);if(error)throw Error(error.message);
      }
      const [categorias,atributos]=await Promise.all([supabase.from('categorias_forja').select('*'),supabase.from('config_estadisticas').select('*')]);
      if(!categorias.data||!atributos.data)throw Error('No se pudieron consultar las definiciones.');
      let guardadas=0,pendientes=0,cursor='';
      for(;;){
        let consulta=supabase.from('forja_maestra').select('*').is('balance_ipe',null).order('id').limit(25);
        if(cursor)consulta=consulta.gt('id',cursor);
        const {data,error}=await consulta;if(error)throw Error(error.message);
        if(!data.length)break;
        for(const f of data){
          cursor=f.id;
          try{
            const stats={...f.stats};
            for(const a of atributosEfectivos(categorias.data,atributos.data,f.tipo))stats[a.clave]??=a.valor_defecto??0;
            if(f.es_grupo)for(const [k,r] of Object.entries(f.stats_rango||{}) as [string,{min:number;max:number}][])stats[k]=(r.min+r.max)/2;
            const perfil={id:f.id,nombre:f.nombre,clasificacion:f.tipo,tipo:tipoDe(f,categorias.data),slot:f.slot_tipo,stats,efectos:efectosDe(f),reglas:f.reglas||[],reglas_pasivas:f.reglas_pasivas||[],habilidades:f.habilidades||[],pasivas:f.pasivas||[],equipamiento:f.equipamiento||{},consumible:!!f.consumible};
            const ids=[...new Set([...perfil.habilidades,...perfil.pasivas,...Object.values(perfil.equipamiento)])];
            const vinculadas=ids.length?await supabase.from('forja_maestra').select('*').in('id',ids):{data:[],error:null};
            if(vinculadas.error)throw Error(vinculadas.error.message);
            const {balance_ipe}=await clasificarForja(session.access_token,perfil);
            const resultado=await supabase.rpc('forja_reconciliar_ipe',{p_original:f,p_ipe:balance_ipe,p_vinculos:vinculadas.data});
            if(resultado.error||!resultado.data)pendientes++;else guardadas++;
          }catch{pendientes++;}
          setMensaje(`Reclasificadas: ${guardadas}. Pendientes: ${pendientes}.`);
        }
      }
      setMensaje(`Reglas aplicadas. Reclasificadas: ${guardadas}. Pendientes de esta ejecución: ${pendientes}.`);
    }catch(e){setMensaje(e instanceof Error?e.message:'No se pudo activar el balance.');}
    finally{bloqueo.current=false;setOcupado(false);}
  }
  return <details><summary>Activación del balance de campaña</summary><p>Aplica las bases raciales y clasifica las creaciones pendientes del catálogo.</p><Button disabled={ocupado} onClick={aplicar}>Aplicar reglas y reclasificar</Button><p role="status">{mensaje}</p></details>;
}
