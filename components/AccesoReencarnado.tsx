"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {Swords,Users,ShoppingBag,Sparkles,Dices,Home,LogOut,Handshake} from 'lucide-react';
import Riel, {indiceRuta} from './layout/Riel';
import MarcoRuta from './layout/MarcoRuta';
import LogoYugen from './LogoYugen';
import ProgresoJugador from './ProgresoJugador';
import NavegacionMovil from './NavegacionMovil';
import {supabase} from '../lib/supabase';
import {useDialogo} from "../components/Dialogo";
const rutas=new Set(['/ficha','/ficha/personajes','/ficha/personaje','/ficha/equipamiento','/ficha/inventario','/ficha/habilidades','/ficha/alma','/ficha/tienda','/ficha/tienda-almas','/ficha/combate','/ficha/tiradas','/ficha/experiencia','/ficha/party','/ficha/logros','/ficha/arena','/ficha/deudas']);
export default function AccesoReencarnado({children}:{children:ReactNode}){
  const {avisar}=useDialogo();
 const ruta=usePathname(),router=useRouter();const[aprobado,setAprobado]=useState(false);
 useEffect(()=>{let vivo=true;async function cargar(){const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/login');return;}const {data,error}=await supabase.from('perfiles').select('rol,estado').eq('id',user.id).single();if(!vivo)return;if(error||!data||data.estado!=='aprobado'){router.replace('/login');return;}if(data.rol==='KUROI'){router.replace('/dm');return;}setAprobado(true);}void cargar();const t=setInterval(()=>void cargar(),15000);return()=>{vivo=false;clearInterval(t);};},[router]);
 useEffect(()=>{if(!aprobado||!['/ficha/personaje','/ficha/equipamiento','/ficha/inventario','/ficha/habilidades','/ficha/experiencia'].includes(ruta))return;let activo=true;const revisar=async()=>{const id=localStorage.getItem('personaje_activo_id');if(!id){router.replace('/ficha/personajes');return;}const {data,error}=await supabase.from('personajes').select('id').eq('id',id).eq('estado_vida','vivo').eq('estado_aprobacion','aprobado').maybeSingle();if(activo&&!error&&!data){localStorage.removeItem('personaje_activo_id');router.replace('/ficha/personajes');}};void revisar();const t=setInterval(()=>void revisar(),10000);return()=>{activo=false;clearInterval(t);};},[aprobado,ruta,router]);
 const permitido=rutas.has(ruta);
 useEffect(()=>{if(aprobado&&!permitido)router.replace('/ficha');},[aprobado,permitido,router]);
 if(!aprobado||!permitido)return <p className="p-6 text-neutral-400">Cargando tu Nexo…</p>;
 // Orden del recorrido del jugador (docs/ciclo-juego.md): entrar → personaje → sesión → recompensas → tienda.
 const enlaces=[{href:'/ficha',nombre:'El Nexo',detalle:'Tu lugar en Yugen',icon:Home},{href:'/ficha/personajes',nombre:'Personajes',detalle:'Cuerpo, poder y pertenencias',icon:Users},{href:'/ficha/party',nombre:'Mi party',detalle:'Compañeros, equipo y gestión',icon:Users},{href:'/ficha/combate',nombre:'Combates',detalle:'Cuando llegue tu turno',icon:Swords},{href:'/ficha/tiradas',nombre:'Mesa de dados',detalle:'Deja hablar al destino',icon:Dices},{href:'/ficha/experiencia',nombre:'Árbol de habilidades',detalle:'Traza el camino de cada cuerpo',icon:Sparkles},{href:'/ficha/alma',nombre:'Baúl del alma',detalle:'Pertenencias de tu cuenta',icon:Sparkles},{href:'/ficha/tienda',nombre:'Tienda',detalle:'Intercambios con Kuroi',icon:ShoppingBag},{href:'/ficha/deudas',nombre:'Pactos con Kuroi',detalle:'Lo que Kuroi te prometió',icon:Handshake},{href:'/ficha/logros',nombre:'Logros y títulos',detalle:'Tu progreso y recompensas',icon:Sparkles},{href:'/ficha/arena',nombre:'Arena',detalle:'Duelos y entrenamiento',icon:Swords},{href:'/ficha/tienda-almas',nombre:'Tienda de almas',detalle:'Cuerpos y compañeros NPC',icon:Sparkles}];
 return <div className="y-player y-player-shell"><Riel enlaces={enlaces.map(e=>({href:e.href,nombre:e.nombre,kanji:indiceRuta(e.href)}))} onSalir={()=>{void supabase.auth.signOut().then(({error})=>{if(error){void avisar({titulo:'Sesión abierta',mensaje:'No se pudo cerrar la sesión. Inténtalo otra vez.'});return;}router.replace('/login');});}}/><div className="y-player-content"><header className="y-player-top"><LogoYugen size={88}/><span>Santuario del alma</span><b>REENCARNADO</b><ProgresoJugador/><button type="button" className="yugen-player-exit" aria-label="Cerrar sesión" onClick={()=>{void supabase.auth.signOut().then(({error})=>{if(!error)router.replace('/login');});}}><LogOut size={18}/></button></header><MarcoRuta>{children}</MarcoRuta></div><NavegacionMovil/></div>;
}
