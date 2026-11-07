"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Hammer, Swords, ShoppingBag, Sliders, MoreHorizontal, Dices, X, BookOpen, Handshake, Sparkles, Shield, TrendingUp } from "lucide-react";

export default function NavegacionMovil({ gm = false, colmena = false }: { gm?: boolean; colmena?: boolean }) {
  const pathname = usePathname();
  const [rutaMenu, setRutaMenu] = useState<string | null>(null);
  const abierto = rutaMenu === pathname;
  const setAbierto = (valor: boolean) => setRutaMenu(valor ? pathname : null);
  const boton = useRef<HTMLButtonElement>(null);
  const enlaces = gm ? [
    { href: "/dm/forja", label: "Forja", icon: Hammer },
    { href: "/dm/combate", label: "Combate", icon: Swords },
    { href: "/dm/personajes", label: "Personajes", icon: Users },
    { href: "/dm/mercado", label: "Tiendas", icon: ShoppingBag },
  ] : [
    { href: "/ficha", label: "Inicio", icon: Home },
    { href: "/ficha/personajes", label: "Personajes", icon: Users },
    { href: "/ficha/combate", label: "Combates", icon: Swords },
    { href: "/ficha/tienda", label: "Tienda", icon: ShoppingBag },
  ];
  const extras = gm ? [
    { href: "/dm/reglas", label: "Estadísticas y reglas", icon: Sliders },
    { href: "/dm/experiencia", label: "Experiencia", icon: TrendingUp },
    { href: "/dm/tienda-almas", label: "Tienda de almas", icon: Users },
    { href: "/dm/deudas", label: "Pactos y deudas", icon: Handshake },
  ] : [
    { href: "/ficha/tiradas", label: "Mesa de dados", icon: Dices },
    { href: "/ficha/experiencia", label: "Experiencia", icon: TrendingUp },
    { href: "/ficha/alma", label: "Baúl del alma", icon: Sparkles },
    ...(colmena ? [{ href: "/ficha/tienda-almas", label: "Tienda de almas", icon: Users }] : []),
  ];
  const activo = (href: string) => pathname === href || (href !== "/ficha" && pathname.startsWith(href + "/"));
  return <div className="mobile-navigation" onKeyDown={e => { if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); } }}>
    {abierto && <>
      <button className="mobile-menu-backdrop" aria-label="Cerrar más opciones" onClick={() => setAbierto(false)} />
      <nav id="mobile-more" className="mobile-more" aria-label="Más secciones">
        <div><strong>Tu campaña</strong><button aria-label="Cerrar menú" onClick={() => { setAbierto(false); boton.current?.focus(); }}><X size={20}/></button></div>
        {extras.map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-current={activo(href) ? "page" : undefined}><Icon size={20}/>{label}</Link>)}
      </nav>
    </>}
    <nav className="mobile-tabs" aria-label={gm ? "Navegación móvil del GM" : "Navegación móvil del jugador"}>
      {enlaces.map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-current={activo(href) ? "page" : undefined}><Icon size={21}/><span>{label}</span></Link>)}
      <button ref={boton} aria-controls="mobile-more" aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className={extras.some(e => activo(e.href)) ? "is-active" : ""}><MoreHorizontal size={21}/><span>Más</span></button>
    </nav>
  </div>;
}
