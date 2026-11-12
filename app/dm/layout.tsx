"use client";

import React from "react";
import LogoYugen from "../../components/LogoYugen";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Hammer, Swords, Sliders, Users, Handshake, ShoppingBag, LogOut, TrendingUp } from "lucide-react";
import "./gm.css";
import Riel, {indiceRuta} from "../../components/layout/Riel";
import MarcoRuta from "../../components/layout/MarcoRuta";
import NavegacionMovil from "../../components/NavegacionMovil";

const principales = [
  { path: "/dm/forja", label: "La Forja", detail: "Crear y dar forma al mundo", icon: Hammer },
  { path: "/dm/combate", label: "Combate", detail: "Probar tus creaciones", icon: Swords },
  { path: "/dm/reglas", label: "Estadísticas", detail: "Definir categorías y atributos", icon: Sliders },
  { path: "/dm/experiencia", label: "Experiencia", detail: "Personajes de jugador y su party", icon: TrendingUp },
  { path: "/dm/arbol", label: "Árboles de habilidades", detail: "Ramas y puntos por personaje", icon: TrendingUp },
];
const gestion = [
  { path: "/dm/estilos", label: "Guía visual de Yugen", icon: Sliders },
  { path: "/dm/recompensas", label: "Botín, logros y títulos", icon: TrendingUp },
  { path: "/dm/party", label: "Parties de jugadores", icon: Users },
  { path: "/dm/personajes", label: "Jugadores y personajes", icon: Users },
  { path: "/dm/mercado", label: "Tiendas", icon: ShoppingBag },
  { path: "/dm/tienda-almas", label: "Tienda de almas", icon: ShoppingBag },
  { path: "/dm/deudas", label: "Pactos y deudas", icon: Handshake },
];

export default function DMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();
    if (error) { window.alert("No se pudo cerrar la sesión. Inténtalo otra vez."); return; }
    router.replace("/login");
  }
  return <div className="gm-shell">
    <a href="#gm-content" className="gm-skip">Ir al contenido</a>
    <Riel gm enlaces={[...principales,...gestion].map(item=>({href:item.path,nombre:item.label,kanji:indiceRuta(item.path)}))} onSalir={()=>void cerrarSesion()}/>
    <header className="yugen-app-header"><LogoYugen size={88}/><span>El dominio de Kuroi</span><button type="button" onClick={()=>void cerrarSesion()} aria-label="Cerrar sesión"><LogOut size={18}/></button></header>
    <NavegacionMovil gm/>
    <div id="gm-content" tabIndex={-1} className="gm-content"><MarcoRuta>{children}</MarcoRuta></div>
  </div>;
}
