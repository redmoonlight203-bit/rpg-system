"use client";
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from '../../../lib/supabase';
import DesignShowcase from '../../../components/ui/DesignShowcase';
import {LoadingState,ErrorState} from '../../../components/ui';
export default function Estilos(){
 const router=useRouter();const [allowed,setAllowed]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;async function check(){setError(false);try{const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user){router.replace('/login');return;}const {data:perfil,error:profileError}=await supabase.from('perfiles').select('rol').eq('id',user.id).single();if(!active)return;if(profileError){setError(true);return;}if(perfil?.rol!=='KUROI'){router.replace('/ficha');return;}setAllowed(true);}catch{if(active)setError(true);}}void check();return()=>{active=false;};},[router,attempt]);
 if(error)return <ErrorState message="No se pudo verificar tu acceso. Inténtalo de nuevo." onRetry={()=>setAttempt(n=>n+1)}/>;
 return allowed?<DesignShowcase/>:<LoadingState label="Verificando acceso del GM…"/>;
}
