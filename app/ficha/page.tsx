"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Swords,Users,ShoppingBag,Dices,Sparkles,ArrowUpRight,TrendingUp} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import IconoYugen from '../../components/IconoYugen';
import {Billetera} from '../../components/Billetera';
export default function NexoReencarnado(){
 const[colmena,setColmena]=useState(false);
 useEffect(()=>{let vivo=true;void(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {data}=await supabase.from('perfiles').select('mente_colmena').eq('id',user.id).single();if(vivo)setColmena(!!data?.mente_colmena);})();return()=>{vivo=false;};},[]);
 const opciones=[{titulo:'Experiencia y evolución',descripcion:'Sube de nivel, mejora tus atributos y descubre nuevas habilidades.',icon:TrendingUp,ruta:'/ficha/experiencia'},{titulo:'Tus personajes',descripcion:'Una mirada a tus cuerpos, sus habilidades y todo lo que llevan consigo.',icon:Users,ruta:'/ficha/personajes'},{titulo:'El campo de batalla',descripcion:'Entra al encuentro de tus personajes. Tu próxima decisión puede cambiarlo todo.',icon:Swords,ruta:'/ficha/combate'},{titulo:'Mesa de dados',descripcion:'Reúne tus dados, hazlos rodar y deja que el destino hable.',icon:Dices,ruta:'/ficha/tiradas'},{titulo:'La tienda de Kuroi',descripcion:'Objetos, poderes y acuerdos. Descubre qué tiene preparado el GM.',icon:ShoppingBag,ruta:'/ficha/tienda'},...(colmena?[{titulo:'Tienda de almas',descripcion:'Otros cuerpos, nuevas posibilidades. Un privilegio de la Mente colmena.',icon:Sparkles,ruta:'/ficha/tienda-almas'}]:[])];
 return <main className="y-page"><section className="y-home-hero"><div><span className="y-eyebrow">Bienvenido de vuelta, reencarnado</span><h1>Un alma.<br/>Infinitas historias.</h1><p>El cuerpo cambia. Lo que eres permanece.<br/>Prepara tu personaje y vuelve a escribir tu destino.</p><Link href="/ficha/personajes" className="y-button" style={{marginTop:20}}>Gestionar personajes <ArrowUpRight size={16}/></Link></div><div className="y-home-seal"><IconoYugen id="alma" size={110}/></div></section><div className="y-home-cards">{opciones.map((o,i)=><Link key={o.ruta} href={o.ruta} className="y-home-card"><o.icon size={30}/><div><small className="y-home-number">0{i+1} / EL NEXO</small><h2>{o.titulo}</h2><p>{o.descripcion}</p></div><span>↗</span></Link>)}</div><section style={{marginTop:26}}><Billetera/></section></main>;
}
