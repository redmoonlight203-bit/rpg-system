"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Swords,Users,ShoppingBag,Dices,Sparkles,ArrowUpRight,TrendingUp} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import IconoYugen from '../../components/IconoYugen';
import {Billetera} from '../../components/Billetera';
import {Marco} from '../../components/ui/Juego';
export default function NexoReencarnado(){
 const[colmena,setColmena]=useState(false);
 useEffect(()=>{let vivo=true;void(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from('perfiles').select('mente_colmena').eq('id',user.id).single();if(vivo)setColmena(!!data?.mente_colmena);})();return()=>{vivo=false;};},[]);
 const opciones=[{titulo:'Mi party',descripcion:'Gestiona a tus compañeros, su equipo y sus habilidades. Entran contigo al combate.',icon:Users,ruta:'/ficha/party'},{titulo:'Baúl del alma',descripcion:'Objetos, habilidades y personajes de tu cuenta. Envíalos a tus cuerpos y recupéralos cuando caigan.',icon:Sparkles,ruta:'/ficha/alma'},{titulo:'Experiencia y evolución',descripcion:'Sube de nivel, mejora tus atributos y descubre nuevas habilidades.',icon:TrendingUp,ruta:'/ficha/experiencia'},{titulo:'Tus personajes',descripcion:'Una mirada a tus cuerpos, sus habilidades y todo lo que llevan consigo.',icon:Users,ruta:'/ficha/personajes'},{titulo:'El campo de batalla',descripcion:'Entra al encuentro de tus personajes. Tu próxima decisión puede cambiarlo todo.',icon:Swords,ruta:'/ficha/combate'},{titulo:'Mesa de dados',descripcion:'Reúne tus dados, hazlos rodar y deja que el destino hable.',icon:Dices,ruta:'/ficha/tiradas'},{titulo:'La tienda de Kuroi',descripcion:'Objetos, poderes y acuerdos. Descubre qué tiene preparado el GM.',icon:ShoppingBag,ruta:'/ficha/tienda'},...(colmena?[{titulo:'Tienda de almas',descripcion:'Otros cuerpos, nuevas posibilidades. Un privilegio de la Mente colmena.',icon:Sparkles,ruta:'/ficha/tienda-almas'}]:[])];
 return <main className="y3-hub">
  <Marco brillo className="y3-hub-portal">
   <div className="y3-hub-texto">
    <p className="y3-carta-linaje">Bienvenido de vuelta, reencarnado</p>
    <h1 className="y3-display y3-hub-titulo">Un alma.<br/>Infinitas historias.</h1>
    <p className="y3-hub-lema">El cuerpo cambia. Lo que eres permanece. Prepara tu personaje y vuelve a escribir tu destino.</p>
    <Link href="/ficha/personajes" className="y3-boton-principal">Entrar con mis personajes <ArrowUpRight size={16} aria-hidden="true"/></Link>
   </div>
   <div className="y3-hub-sello" aria-hidden="true"><span className="y3-halo y3-hub-orbe"><IconoYugen id="alma" size={96}/></span></div>
  </Marco>
  <h2 className="y3-display y3-seccion-titulo">Lugares del Nexo</h2>
  <nav aria-label="Lugares del Nexo" className="y3-lugares y3-lugares--hub">{opciones.map(o=><Link key={o.ruta} href={o.ruta} className="y3-lugar"><span className="y3-lugar-icono" aria-hidden="true"><o.icon size={30}/></span><span className="y3-lugar-texto"><strong>{o.titulo}</strong><small>{o.descripcion}</small></span></Link>)}</nav>
  <section style={{marginTop:48}}><Billetera/></section>
 </main>;
}
