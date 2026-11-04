import type{ReactNode}from'react';
import AlertaTurnoJugador from'../../components/AlertaTurnoJugador';
import NavegacionMovil from '../../components/NavegacionMovil';
export default function FichaLayout({children}:{children:ReactNode}){return <><div className="player-mobile-content">{children}</div><NavegacionMovil/><AlertaTurnoJugador/></>;}
