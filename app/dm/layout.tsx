"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Hammer, Swords, Sliders, Users, Handshake, ShoppingBag, LogOut, ChevronDown, TrendingUp } from "lucide-react";
import "./gm.css";
import NavegacionMovil from "../../components/NavegacionMovil";

const principales = [
  { path: "/dm/forja", label: "La Forja", detail: "Crear y dar forma al mundo", icon: Hammer },
  { path: "/dm/combate", label: "Combate", detail: "Probar tus creaciones", icon: Swords },
  { path: "/dm/reglas", label: "Estadísticas", detail: "Definir categorías y atributos", icon: Sliders },
  { path: "/dm/experiencia", label: "Experiencia", detail: "Subidas de nivel de jugadores y monstruos", icon: TrendingUp },
];
const gestion = [
  { path: "/dm/personajes", label: "Jugadores y personajes", icon: Users },
  { path: "/dm/mercado", label: "Tiendas", icon: ShoppingBag },
  { path: "/dm/tienda-almas", label: "Tienda de almas", icon: ShoppingBag },
  { path: "/dm/deudas", label: "Pactos y deudas", icon: Handshake },
];

export default function DMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activo = (path: string) => pathname === path || pathname.startsWith(path + "/");
  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();
    if (error) { window.alert("No se pudo cerrar la sesión. Inténtalo otra vez."); return; }
    router.replace("/login");
  }
  return <div className="gm-shell">
    <a href="#gm-content" className="gm-skip">Ir al contenido</a>
    <aside className="gm-sidebar">
      <Link href="/dm/forja" className="gm-brand" aria-label="Yugen: ir a la Forja"><Hammer size={25}/><span>YUGEN<small>ESPACIO DEL GM</small></span></Link>
      <nav aria-label="Herramientas del GM" className="gm-primary">
        <p className="gm-caption">Tu mesa de creación</p>
        {principales.map(({path,label,detail,icon:Icon},i)=><Link key={path} href={path} aria-current={activo(path)?"page":undefined} className={`gm-link ${activo(path)?"is-active":""}`}><Icon size={20}/><span>{label}<small>{detail}</small></span><b>0{i+1}</b></Link>)}
      </nav>
      <details className="gm-management" key={pathname} open={gestion.some(item=>activo(item.path))}>
        <summary>Gestión de campaña <ChevronDown size={15}/></summary>
        <nav aria-label="Gestión de campaña">{gestion.map(({path,label,icon:Icon})=><Link key={path} href={path} aria-current={activo(path)?"page":undefined} className={`gm-link ${activo(path)?"is-active":""}`}><Icon size={16}/><span>{label}</span></Link>)}</nav>
      </details>
      <div className="gm-footer"><p>Todo empieza en la Forja.<br/><span>Crea. Equipa. Lleva a combate.</span></p><button onClick={()=>void cerrarSesion()}><LogOut size={16}/>Cerrar sesión</button></div>
    </aside>
    <NavegacionMovil gm/>
    <div id="gm-content" tabIndex={-1} className="gm-content">{children}</div>
  </div>;
}
