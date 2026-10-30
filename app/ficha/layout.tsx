import type{ReactNode}from'react';
import AlertaTurnoJugador from'../../components/AlertaTurnoJugador';
export default function FichaLayout({children}:{children:ReactNode}){return <>{children}<AlertaTurnoJugador/></>;}
