import './jugador.css';
import type {ReactNode} from 'react';
import AccesoReencarnado from '../../components/AccesoReencarnado';
import AlertaTurnoJugador from '../../components/AlertaTurnoJugador';
export default function FichaLayout({children}:{children:ReactNode}){return <AccesoReencarnado><div className="player-mobile-content">{children}</div><AlertaTurnoJugador/></AccesoReencarnado>;}
