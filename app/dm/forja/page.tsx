"use client";
import {Cabecera} from "../../../components/layout/Cabecera";
import {mensajeError} from '../../../lib/errores';
import {useTiempoReal} from "../../../lib/useTiempoReal";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {Swords,Layers} from "lucide-react";
import MigradorRetratos from "../../../components/MigradorRetratos";
import {clasificarForja} from "./clasificar";
import {faltantesRequisitos,validarRequisitos} from "../../../lib/combate";
import {validarReglas} from "../../../lib/reglas";
import {validarPasivas} from "../../../lib/pasivas";
import "./forja.css";
import {supabase} from "../../../lib/supabase";
import {atributosEfectivos,linaje,type CategoriaBase} from "../../../lib/estadisticas";
import {validarValoresForja} from "../../../lib/forja";
import {SLOTS,tipoDe,subcategorias,clasificacionesPara,efectosDe,validarEfectos,validarEquipamiento,type TipoCreacion} from "../../../lib/creacion";
import {ForjaOperacion,ForjaInstancias} from "../../../components/ForjaOperacion";
import {validarMonstruo,type FuenteMonstruo} from "../../../lib/monstruos";
import GaleriaCreacion from "../../../components/GaleriaCreacion";
import {evaluarInvocacion} from "../../../lib/invocaciones";
import NavyCompanera from "../../../components/NavyCompanera";
import TallerYunque from "../../../components/yunque/TallerYunque";
import LimiteYunque from "../../../components/yunque/LimiteYunque";
import {iconoCreacion,iconoValido} from "../../../lib/iconos-yugen";
import {validarPortada} from "../../../lib/imagenes-creacion";
import {esMonstruo} from "../../../lib/progresion";
import {vacio,vinculoVacio,type Borrador,type Creacion,type Peticion} from "../../../lib/yunque-borrador";
import type {AtributoForja,ContextoTaller,NaturalezaCatalogo} from "../../../components/yunque/contexto";

type Atributo=AtributoForja;
const boton="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-orange-600 disabled:cursor-not-allowed disabled:opacity-40";
const panel="forja-panel space-y-5 rounded-xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6";
export default function Forja(){
 const [naturalezasCatalogo,setNaturalezasCatalogo]=useState<NaturalezaCatalogo[]>([]);
 const [categorias,setCategorias]=useState<CategoriaBase[]>([]),[atributos,setAtributos]=useState<Atributo[]>([]),[creaciones,setCreaciones]=useState<Creacion[]>([]),[peticiones,setPeticiones]=useState<Peticion[]>([]);
 const [pestana,setPestana]=useState<"creacion"|"yunque">("creacion"),[b,setB]=useState<Borrador>(vacio),[cargando,setCargando]=useState(true),[guardando,setGuardando]=useState(false),[error,setError]=useState(""),[aviso,setAviso]=useState("");
 const [imagenProcesando,setImagenProcesando]=useState(false);
 const [padre,setPadre]=useState<{b:Borrador;tipo:"objeto"|"titulo"|"habilidad"|"pasiva";slot?:string}|null>(null);
 const [revision,setRevision]=useState(0),[preparados,setPreparados]=useState(false),[verPeticiones,setVerPeticiones]=useState(false);
 const [operacion,setOperacion]=useState<{item:Creacion;modo:"inventario"|"batalla"}|null>(null);const bloqueo=useRef(false);
 // Sesión del borrador: cambia cada vez que se empieza otro borrador (nuevo, editar, petición, pieza hija, «Monstruos»).
 // Un guardado solo da su `id` al borrador si sigue siendo la misma sesión que se guardó.
 const sesion=useRef(0);const nuevaSesion=()=>{sesion.current++;};
 const yunque=useRef<HTMLDivElement>(null);
 async function cargar(inicial=true){if(inicial)setCargando(true);setError("");try{
  const [c,a,f,p,n,al]=await Promise.all([supabase.from("categorias_forja").select("*").order("created_at"),supabase.from("config_estadisticas").select("*"),supabase.from("forja_maestra").select("*").order("created_at",{ascending:false}),supabase.from("creaciones_forja").select("id,nombre,descripcion,user_id").eq("estado","pendiente"),supabase.from("naturalezas").select("id,nombre,descripcion,clave").order("nombre"),supabase.from("forja_almas_unicas").select("forja_id")]);
  const fallo=c.error||a.error||f.error||p.error||n.error||al.error;if(fallo)throw new Error(fallo.message);
  setNaturalezasCatalogo(n.data||[]);setCategorias(c.data||[]);setAtributos(a.data||[]);const ocupadas=new Set((al.data||[]).map(x=>x.forja_id));setCreaciones((f.data||[]).map(f=>({...f,alma_en_uso:ocupadas.has(f.id)})) as Creacion[]);setPeticiones(p.data||[]);
 }catch{setError("No se pudo cargar la Forja. Revisa tu conexión y vuelve a intentarlo.");}finally{setCargando(false);}}
 useTiempoReal(()=>cargar(false));
 useEffect(()=>{void cargar();},[]);
 const clasificaciones=subcategorias(categorias),activas=creaciones.filter(f=>f.estado==="aprobado");
 const opcionesClasificacion=clasificacionesPara(b.tipo,categorias).filter(c=>b.tipo!=="personaje"||esMonstruo(categorias,c.clave)===b.ramaMonstruo);
 const disponibles=atributosEfectivos(categorias,atributos,b.clasificacion);
 const monstruo=b.tipo==="personaje"&&esMonstruo(categorias,b.clasificacion);
 const mallaActiva=monstruo||b.malla;
 const tecnicos=["dados_dano","caras_dano"];
 const pasivasDisponibles=activas.filter(f=>tipoDe(f,categorias)==="pasiva");
 const habilidades=activas.filter(f=>tipoDe(f,categorias)==="habilidad");
 // El taller recibe el catálogo de la Forja; el mismo objeto mientras no cambie, para no recalcular el grafo.
 const ctxTaller=useMemo<ContextoTaller>(()=>({categorias,atributos,creaciones,naturalezas:naturalezasCatalogo,onProcesandoImagen:setImagenProcesando}),[categorias,atributos,creaciones,naturalezasCatalogo]);
 // Al entrar en «El yunque», el taller ocupa la ventana.
 useEffect(()=>{if(pestana==="yunque"&&!cargando)yunque.current?.scrollIntoView({block:"start"});},[pestana,cargando]);
 function nuevo(tipo:TipoCreacion=b.tipo){nuevaSesion();setB({...vacio(),tipo});setError("");setAviso("");setPestana("yunque");}
 function editar(f:Creacion){nuevaSesion();setB({formas:f.formas_historia||[],icono:f.icono||"",naturalezaVinculo:{...vinculoVacio(),...(f.naturaleza_vinculo||{})},ramaMonstruo:esMonstruo(categorias,f.tipo),monstruo:f.configuracion_monstruo||null,invocacion:f.configuracion_invocacion||null,requisitos_uso:f.requisitos_uso||{},consumible:!!f.consumible,id:f.id,nombre:f.nombre,tipo:tipoDe(f,categorias),clasificacion:f.tipo,descripcion:f.descripcion||"",historia:f.historia||"",requisitos:f.requisitos||"",defectos:f.defectos||"",imagen:f.imagen_url||"",clase:f.clase||"D",malla:!!f.es_grupo||esMonstruo(categorias,f.tipo),nivelMaximo:f.nivel_maximo||20,slot:f.slot_tipo||"ninguno",stats:f.stats||{},rangos:f.stats_rango||{},efectos:efectosDe(f),pasivas:f.pasivas||[],reglas:f.reglas||[],reglas_pasivas:f.reglas_pasivas||[],habilidades:Array.isArray(f.habilidades)?f.habilidades.filter(h=>typeof h==="string"):[],equipamiento:f.equipamiento||{},alma:!!f.ligado_al_alma,venta:!!f.es_vendible,precio:f.precio_sugerido||""});setError("");setPestana("yunque");}
 function valoresBorrador(p:Borrador,medio=false){const s={...p.stats};for(const a of atributosEfectivos(categorias,atributos,p.clasificacion)){s[a.clave]=(p.malla||p.tipo==="personaje"&&esMonstruo(categorias,p.clasificacion))?(p.rangos[a.clave]?medio?(p.rangos[a.clave].min+p.rangos[a.clave].max)/2:p.rangos[a.clave].min:a.valor_defecto??0):p.stats[a.clave]??a.valor_defecto??0;}return s;}
 function faltantes(id:string,personaje=b){const item=creaciones.find(f=>f.id===id);return item?faltantesRequisitos(item.requisitos_uso,linaje(categorias,personaje.clasificacion).flatMap(c=>[c.clave,c.nombre]),{...valoresBorrador(personaje),nivel:(personaje.malla||esMonstruo(categorias,personaje.clasificacion))?personaje.nivelMaximo:1},personaje.habilidades):['Creación no disponible.'];}
 function crearDentro(tipo:"objeto"|"titulo"|"habilidad"|"pasiva",slot?:string){nuevaSesion();setPadre({b:structuredClone(b),tipo,slot});const opciones=clasificacionesPara(tipo,categorias);const ranura=SLOTS.find(s=>s.clave===slot);setB({...vacio(),tipo,clasificacion:opciones.length===1?opciones[0].clave:'',slot:tipo==='titulo'?'titulo':ranura?.tipos[0]||'ninguno'});setError('');setAviso('');}
 function volverPadre(){if(padre){nuevaSesion();setB(padre.b);setPadre(null);setError('');}}
 /**
  * Guarda el borrador en La creación. Resuelve `true` solo si la fila quedó guardada; si la validación o el
  * guardado fallan, deja el motivo en `error` y resuelve `false` (nunca rechaza).
  * Una creación nueva se queda abierta en el yunque con su `id`; si se creaba para un personaje, se le asigna y se vuelve a él.
  */
 async function guardar():Promise<boolean>{
  const falla=(mensaje:string)=>{setError(mensaje);return false;};
  if(bloqueo.current)return false;if(imagenProcesando)return falla("Espera a que termine de prepararse la imagen.");setError("");
  if(!b.nombre.trim()||!opcionesClasificacion.some(c=>c.clave===b.clasificacion))return falla("Escribe un nombre y selecciona una subcategoría. Puedes crearlas en Estadísticas.");
  if(padre&&b.tipo!==padre.tipo)return falla(`Esta creación es para ${padre.b.nombre||"el personaje"}: debe ser ${padre.tipo==="titulo"?"un título":padre.tipo==="objeto"?"un objeto":`una ${padre.tipo}`}.`);
  const falloMonstruo=validarMonstruo(monstruo?b.monstruo:null,activas as FuenteMonstruo[]);if(falloMonstruo)return falla(falloMonstruo);
  const stats={...b.stats},rangos={...b.rangos};for(const a of disponibles){if(!(a.clave in stats))stats[a.clave]=a.valor_defecto??0;if(!(a.clave in rangos))rangos[a.clave]={min:a.valor_defecto??0,max:a.valor_defecto??0};}
  if(["objeto","habilidad"].includes(b.tipo))for(const clave of tecnicos){delete stats[clave];delete rangos[clave];}
  const fallo=validarPortada(b.imagen)||(b.icono&&!iconoValido(b.icono)?"Elige un emblema disponible.":null)||validarRequisitos(b.requisitos_uso)||validarReglas(b.reglas)||validarPasivas(b.reglas_pasivas)||validarValoresForja(stats,mallaActiva?rangos:undefined)||validarEfectos(b.efectos)||(b.tipo==="personaje"?validarEquipamiento(b.equipamiento,creaciones,categorias):null);
  if(fallo)return falla(fallo);
   if(!Number.isInteger(b.nivelMaximo)||b.nivelMaximo<1||b.nivelMaximo>100)return falla("El nivel máximo de la malla debe estar entre 1 y 100.");
  if(b.tipo==="personaje"&&b.naturalezaVinculo.naturaleza_id){const n=naturalezasCatalogo.find(n=>n.id===b.naturalezaVinculo.naturaleza_id);if(!n)return falla("La naturaleza seleccionada ya no existe.");if(n.clave==="kemono"&&!b.naturalezaVinculo.bestia.trim())return falla("Indica la bestia sellada del Kemono.");}
  if(b.tipo==="personaje"&&b.habilidades.some(id=>!habilidades.some(h=>h.id===id)))return falla("Quita las habilidades que ya no están disponibles.");
  if(b.tipo==="personaje"&&b.pasivas.some(id=>!pasivasDisponibles.some(p=>p.id===id)))return falla("Quita las pasivas no disponibles.");
  if(b.tipo==='personaje'){for(const id of [...b.habilidades,...b.pasivas,...Object.values(b.equipamiento)]){const errores=faltantes(id);if(errores.length)return falla(`${creaciones.find(f=>f.id===id)?.nombre||id}: ${errores.join('; ')}`);}}
  if(padre){const errores=faltantesRequisitos(b.requisitos_uso,linaje(categorias,padre.b.clasificacion).flatMap(c=>[c.clave,c.nombre]),valoresBorrador(padre.b),padre.b.habilidades);if(errores.length)return falla('El personaje no cumple los requisitos: '+errores.join('; '));if(padre.slot&&!SLOTS.find(s=>s.clave===padre.slot)?.tipos.includes(b.slot))return falla('Elige un espacio compatible con el destino del personaje.');}
  if(b.invocacion){const i=b.invocacion;if(b.tipo!=="habilidad")return falla("Solo las habilidades pueden configurar invocaciones.");if(i.maxHabilidades<0||i.maxHabilidades>20||!Number.isInteger(i.maxHabilidades)||!Number.isInteger(i.duracionTurnos)||i.duracionTurnos<1)return falla("Configura duración y máximo de habilidades válidos.");if(i.modo==="existente"&&!activas.some(c=>c.id===i.origenId&&tipoDe(c,categorias)==="personaje"&&evaluarInvocacion(i,{nombre:c.nombre,stats:c.es_grupo?Object.fromEntries(Object.entries(c.stats_rango||{}).map(([k,r])=>[k,r.min])):c.stats||{},habilidades:c.habilidades||[],pasivas:c.pasivas||[]},activas,categorias).valida))return falla("La criatura elegida supera el límite o no existe.");if(i.modo==="plantilla_temporal"){const e=evaluarInvocacion(i,{nombre:i.plantilla?.nombre||"",stats:i.plantilla?.stats||{},habilidades:i.plantilla?.habilidades||[],pasivas:[]},activas);if(!e.valida)return falla(e.errores.join(" "));}}
  bloqueo.current=true;setGuardando(true);const sesionGuardada=sesion.current;
  try{
   if(b.tipo==="personaje" && b.formas.some(f=>!f.nombre.trim()||validarPortada(f.imagen)))throw Error("Revisa el nombre y la imagen de cada forma.");
   const payload={formas_historia:b.tipo==="personaje"?b.formas:[],icono:b.icono||null,naturaleza_vinculo:b.tipo==="personaje"&&b.naturalezaVinculo.naturaleza_id?b.naturalezaVinculo:{},configuracion_monstruo:monstruo?b.monstruo:null,configuracion_invocacion:b.tipo==="habilidad"?b.invocacion:null,requisitos_uso:b.requisitos_uso,consumible:b.tipo==="objeto"&&b.consumible,nombre:b.nombre.trim(),tipo:b.clasificacion,tipo_creacion:b.tipo,descripcion:b.descripcion,historia:b.historia,requisitos:b.requisitos,defectos:b.defectos,imagen_url:b.imagen,es_grupo:mallaActiva,nivel_maximo:b.nivelMaximo,slot_tipo:b.tipo==="objeto"?b.slot:b.tipo==="titulo"?"titulo":"ninguno",stats:mallaActiva?{}:stats,stats_rango:mallaActiva?rangos:{},configuracion_dados:b.tipo==="personaje"?[]:b.efectos,habilidades:b.tipo==="personaje"?b.habilidades:[],pasivas:b.tipo==="personaje"?b.pasivas:[],reglas:b.reglas,reglas_pasivas:b.reglas_pasivas,equipamiento:b.tipo==="personaje"?b.equipamiento:{},ligado_al_alma:b.alma,es_vendible:b.venta,precio_sugerido:b.venta?b.precio:null,ubicacion:b.venta?"mercado":"forja"};
   const {data:{session}}=await supabase.auth.getSession();
   if(!session)throw Error("Inicia sesión para guardar.");
   const resultado=await clasificarForja(session.access_token,{tipo:b.tipo,clasificacion:b.clasificacion,stats:valoresBorrador(b,true),efectos:payload.configuracion_dados,reglas:b.reglas,reglas_pasivas:b.reglas_pasivas,habilidades:payload.habilidades,pasivas:payload.pasivas,equipamiento:payload.equipamiento,slot:b.slot,consumible:b.consumible,id:b.id,nombre:b.nombre});
   const clasificado={...payload,...resultado};
   const r=b.id?await supabase.from("forja_maestra").update(clasificado).eq("id",b.id).select("*").single():await supabase.from("forja_maestra").insert({...clasificado,estado:"aprobado",creador_id:b.peticion?.user_id||null}).select("*").single();
   if(r.error)throw new Error(r.error.message);if(!r.data)throw new Error("No se confirmó el guardado.");
   if(b.peticion){const p=await supabase.from("creaciones_forja").update({estado:"aprobada"}).eq("id",b.peticion.id);if(p.error)setAviso("La creación se guardó, pero no se pudo marcar la petición como aprobada.");else setAviso("Creación y petición guardadas.");}else setAviso("Creación guardada. Las copias existentes conservan sus valores.");
   if(padre){const vuelta=structuredClone(padre.b),id=r.data.id as string;
    if(padre.tipo==='habilidad')vuelta.habilidades=[...new Set([...vuelta.habilidades,id])];else if(padre.tipo==='pasiva')vuelta.pasivas=[...new Set([...vuelta.pasivas,id])];else {const slot=padre.slot||SLOTS.find(s=>s.tipos.includes(b.slot)&&!vuelta.equipamiento[s.clave]&&(b.slot!=='dos_manos'||(!vuelta.equipamiento.mano_der&&!vuelta.equipamiento.mano_izq)))?.clave;if(slot){vuelta.equipamiento[slot]=id;if(b.slot==='dos_manos')delete vuelta.equipamiento[slot==='mano_der'?'mano_izq':'mano_der'];}}
    setB(vuelta);setPadre(null);setPestana('yunque');setAviso(vuelta.habilidades.includes(id)||vuelta.pasivas.includes(id)||Object.values(vuelta.equipamiento).includes(id)?'Creación guardada y asignada al personaje.':'Creación guardada. Ya está disponible en la colección para asignarla.');
   }else if(sesion.current===sesionGuardada){const id=r.data.id as string;setB(actual=>actual.id===id?actual:{...actual,id});}
   await cargar(false);
   return true;
  }catch(e){return falla(mensajeError(e,"No se pudo guardar."));}finally{bloqueo.current=false;setGuardando(false);}
 }
 async function guardarImagen(id:string,imagen:string,icono:string){
  if(bloqueo.current)throw new Error("Hay otra operación en curso. Inténtalo de nuevo.");
  const fallo=validarPortada(imagen);if(fallo)throw new Error(fallo);
  if(icono&&!iconoValido(icono))throw new Error("Selecciona un icono válido de Yugen.");
  bloqueo.current=true;
  try{
   const r=await supabase.from("forja_maestra").update({imagen_url:imagen,icono:icono||null}).eq("id",id).select("id,imagen_url,icono").single();
   if(r.error)throw new Error(r.error.message);
   if(!r.data)throw new Error("No se confirmó el guardado de la imagen.");
   setCreaciones(prev=>prev.map(f=>f.id===id?{...f,imagen_url:r.data.imagen_url||"",icono:r.data.icono}:f));
  }finally{bloqueo.current=false;}
 }
 async function restablecer(f:Creacion){
  if(bloqueo.current||!window.confirm(`¿Restablecer «${f.nombre}»? Se retirará de los baúles y personajes y quedará únicamente en La creación, lista para una nueva entrega. Los recuerdos del cementerio se conservan. Si está en un encuentro activo, debes terminarlo primero.`))return;
  bloqueo.current=true;
  try{const r=await supabase.rpc('forja_restablecer_alma',{p_forja:f.id});if(r.error)throw Error(r.error.message);setAviso('Creación restablecida. Ya no está vinculada a ninguna cuenta.');setRevision(v=>v+1);await cargar(false);}catch(e){setError(mensajeError(e,'No se pudo restablecer.'));}finally{bloqueo.current=false;}
 }
 async function eliminar(f:Creacion){if(!window.confirm(`¿Eliminar definitivamente «${f.nombre}»? Se quitará de las plantillas que lo usan. Las copias y combates guardados se conservarán.`))return;const r=await supabase.rpc("forja_eliminar",{p_id:f.id});if(r.error)setError(mensajeError(r.error,'No se pudo eliminar.'));else await cargar();}

 const etiquetaClasificacion=(c:CategoriaBase)=>categorias.filter(v=>v.parent_id&&v.nombre===c.nombre).length>1?`${c.nombre} (${categorias.find(p=>p.id===c.parent_id)?.nombre||""})`:c.nombre;
 const nombreClasificacion=(clave:string)=>categorias.find(c=>c.clave===clave)?.nombre||`Sin clasificación (${clave})`;
 return <main className={`forja-theme min-h-full bg-well p-4 text-neutral-100 sm:p-8${pestana==="yunque"?" is-yunque":""}`}><div className="mx-auto max-w-6xl space-y-6">
 <Cabecera kanji="鍛" migas="Kuroi · Preparar el mundo" titulo="La Forja" subtitulo="El origen de tu mundo. Crea sus personajes, habilidades, pasivas y objetos." acciones={<><Link className={boton} href="/dm/combate"><Swords size={14} aria-hidden="true"/>Combate</Link><Link className={boton} href="/dm/reglas"><Layers size={14} aria-hidden="true"/>Estadísticas</Link></>}/>

 <a href="/dm/recompensas" className="inline-block text-amber-300 underline mb-3">Crear tablas de botín, logros y títulos</a><nav className="forja-tabs flex flex-wrap gap-2" aria-label="Secciones de la Forja"><button className={`${boton} ${pestana==="creacion"?"border-orange-600 bg-orange-950":""}`} disabled={!!padre} aria-pressed={pestana==="creacion"} onClick={()=>setPestana("creacion")}>La creación ({activas.length})</button><button className={`${boton} ${pestana==="yunque"?"border-orange-600 bg-orange-950":""}`} aria-pressed={pestana==="yunque"} onClick={()=>setPestana("yunque")}>El yunque</button><button disabled={!!padre} className={boton} aria-expanded={preparados} onClick={()=>setPreparados(!preparados)}>Preparados para batalla</button><button disabled={!!padre} className={boton} aria-expanded={verPeticiones} onClick={()=>setVerPeticiones(!verPeticiones)}>Peticiones ({peticiones.length})</button></nav>
 <details className="yugen-maintenance"><summary>Herramientas de imágenes</summary><MigradorRetratos onMigrado={()=>cargar(false)}/></details>
 {error&&pestana!=="yunque"&&<p role="alert" className="text-sm text-red-300">{error} <button onClick={()=>void cargar()} className="underline">Actualizar</button></p>}{aviso&&<p role="status" className="text-sm text-emerald-300">{aviso}</p>}
 {preparados&&<ForjaInstancias revision={revision}/>}
 {verPeticiones&&<section className={panel}><h2 className="text-lg">Peticiones pendientes</h2>{peticiones.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 pt-3"><div><h3>{p.nombre}</h3><p className="text-sm text-neutral-400">{p.descripcion}</p></div><button disabled={!!padre} className={boton} onClick={()=>{nuevaSesion();setB({...vacio(),nombre:p.nombre,descripcion:p.descripcion,peticion:p});setPestana("yunque");}}>Abrir en el yunque</button></div>)}{!peticiones.length&&<p className="text-sm text-neutral-500">No hay peticiones pendientes.</p>}</section>}
 {operacion&&<ForjaOperacion item={operacion.item} modo={operacion.modo} onClose={()=>setOperacion(null)} onDone={()=>{if(operacion.modo==="batalla")setPreparados(true);setAviso(operacion.modo==="batalla"?"Instancias preparadas con su equipo y habilidades.":operacion.item.ligado_al_alma?"Pertenencia única entregada al baúl del alma de la cuenta.":"Copias entregadas al personaje.");setOperacion(null);setRevision(v=>v+1);}}/>}
 {pestana==="creacion"?<GaleriaCreacion
 esMonstruo={f=>esMonstruo(categorias,f.tipo)}
 items={activas} cargando={cargando} iconoDe={f=>iconoCreacion(categorias,f)} tipoDe={f=>tipoDe(f,categorias)}
 clasificacion={nombreClasificacion} clasificaciones={clasificaciones.map(c=>({clave:c.clave,nombre:etiquetaClasificacion(c)}))}
 etiqueta={(f,clave)=>atributosEfectivos(categorias,atributos,f.tipo).find(a=>a.clave===clave)?.etiqueta||clave}
 onNueva={()=>nuevo()} onEditar={editar} onEntregar={f=>setOperacion({item:f,modo:"inventario"})}
 onBatalla={f=>setOperacion({item:f,modo:"batalla"})} onEliminar={eliminar} onRestablecer={restablecer} onImagen={guardarImagen}
 />:<div ref={yunque} className="forja-yunque">{padre&&<aside className="yunque-resumen"><p>Creando para {padre.b.nombre||"el personaje"}. Su borrador está conservado.</p><button type="button" disabled={guardando} onClick={volverPadre}>Cancelar y volver al personaje</button></aside>}
 <LimiteYunque onVolver={()=>{volverPadre();setPestana("creacion");}}><TallerYunque b={b} setB={setB} ctx={ctxTaller} onGuardar={guardar} guardando={guardando||imagenProcesando} error={error} crearDentro={crearDentro} hijo={!!padre} onNuevaSesion={nuevaSesion}/></LimiteYunque>
 </div>}
 <NavyCompanera activo={pestana==="yunque"} contexto={{nombre:b.nombre,tipo:b.tipo,clasificacion:b.clasificacion,descripcion:b.descripcion,efectos:b.efectos.length,reglas:b.reglas.length,pasivas:b.reglas_pasivas.length,requisitos:Object.keys(b.requisitos_uso||{}).length>0,guardando}}/>
 </div></main>;
}


