"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import NavegacionMovil from './NavegacionMovil';
import {supabase} from '../lib/supabase';
const rutas=new Set(['/ficha','/ficha/personajes','/ficha/personaje','/ficha/equipamiento','/ficha/inventario','/ficha/habilidades','/ficha/alma','/ficha/tienda','/ficha/tienda-almas','/ficha/combate']);
export default function AccesoReencarnado({children}:{children:ReactNode}){
 const ruta=usePathname(),router=useRouter();const[perfil,setPerfil]=useState<{mente_colmena:boolean}|null>(null);
 useEffect(()=>{let vivo=true;async function cargar(){const {data:{user}}=await supabase.auth.getUser();if(!user){router.replace('/login');return;}const {data,error}=await supabase.from('perfiles').select('rol,estado,mente_colmena').eq('id',user.id).single();if(!vivo)return;if(error||!data||data.estado!=='aprobado'){router.replace('/login');return;}if(data.rol==='KUROI'){router.replace('/dm');return;}setPerfil(data);}void cargar();const t=setInterval(()=>void cargar(),15000);return()=>{vivo=false;clearInterval(t);};},[router]);
 const permitido=rutas.has(ruta)&&!(ruta==='/ficha/tienda-almas'&&!perfil?.mente_colmena);
 useEffect(()=>{if(perfil&&!permitido)router.replace('/ficha');},[perfil,permitido,router]);
 if(!perfil||!permitido)return <p className="p-6 text-neutral-400">Cargando tu Nexo…</p>;
 return <><nav aria-label="Navegación del reencarnado" className="sticky top-0 z-40 hidden md:flex flex-wrap gap-3 border-b border-neutral-800 bg-black p-3 text-sm text-neutral-200"><Link href="/ficha">Nexo</Link><Link href="/ficha/combate">Combates</Link><Link href="/ficha/personajes">Personajes</Link><Link href="/ficha/tienda">Tienda</Link>{perfil.mente_colmena&&<Link href="/ficha/tienda-almas">Tienda de almas</Link>}</nav>{children}<NavegacionMovil colmena={perfil.mente_colmena}/></>;
}
