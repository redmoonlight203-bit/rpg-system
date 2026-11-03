import { ICONOS_YUGEN } from '../lib/iconos-yugen';
export default function IconoYugen({ id, size = 28, className = '' }: { id?: string | null; size?: number; className?: string }) {
 const icono=ICONOS_YUGEN.find(i=>i.id===id)||ICONOS_YUGEN[ICONOS_YUGEN.length-1];
 return <svg className={`yugen-glyph ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icono.trazos.map((d,i)=><path key={i} d={d}/>)}</svg>;
}
