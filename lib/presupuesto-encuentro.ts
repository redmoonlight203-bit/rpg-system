import type { Bando, Combatiente } from './combate';

type Perfil = { id:string; origen:string; balance_ipe?:number|null };

export function presupuestoEncuentro(miembros:Pick<Combatiente,'bando'|'forja_id'|'personaje_id'>[],catalogo:Perfil[]) {
  const indices = new Map(catalogo.filter(f=>f.origen==='forja').map(f=>[f.id,f.balance_ipe]));
  const nuevo = ()=>({ipe:0,participantes:0,medidos:0});
  const porBando:Record<Bando,ReturnType<typeof nuevo>>={jugador:nuevo(),enemigo:nuevo()};
  for(const m of miembros){
    const b=porBando[m.bando];
    b.participantes++;
    const ipe=m.forja_id&&!m.personaje_id ? indices.get(m.forja_id) : undefined;
    if(typeof ipe==='number'&&Number.isFinite(ipe)&&ipe>=0){b.medidos++;b.ipe+=ipe;}
  }
  return porBando;
}
