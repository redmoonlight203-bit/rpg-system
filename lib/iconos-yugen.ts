/** Original Yugen glyphs. Stable IDs are stored, never arbitrary SVG markup. */
export const ICONOS_YUGEN = [
 { id:'humano', nombre:'Humano', grupo:'Razas', trazos:['M16 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','M9 27v-5a7 7 0 0 1 14 0v5M12 20l4 4 4-4'] },
 { id:'enano', nombre:'Enano', grupo:'Razas', trazos:['M7 12 10 5h12l3 7H7Z','M9 14v7l7 7 7-7v-7M12 17l4 2 4-2M13 21l3 3 3-3M16 5v7'] },
 { id:'elfo', nombre:'Elfo', grupo:'Razas', trazos:['M16 4c-6 4-7 10-5 15l5 9 5-9c2-5 1-11-5-15Z','M11 15 4 10l3 10 6 3M21 15l7-5-3 10-6 3M16 10v11'] },
 { id:'dragon', nombre:'Dragón', grupo:'Razas', trazos:['M6 26 8 15l8-9 1 6 9-3-3 8-6 3-1 8-5-4-5 2Z','M10 14 5 7l10 2M20 15h1M11 21l4-4'] },
 { id:'orco', nombre:'Orco', grupo:'Razas', trazos:['M8 9 16 5l8 4 2 10-5 8H11l-5-8 2-10Z','M10 14l4 2M22 14l-4 2M10 21l1-5 3 7h4l3-7 1 5'] },
 { id:'alada', nombre:'Alado', grupo:'Razas', trazos:['M14 26C5 24 3 14 4 6l10 10M18 26c9-2 11-12 10-20L18 16','M6 13l7 7M9 21l4 3M26 13l-7 7M23 21l-4 3M16 13v15'] },
 { id:'bestia', nombre:'Bestia', grupo:'Razas', trazos:['M8 13 5 5l9 4h4l9-4-3 8 1 10-9 6-9-6 1-10Z','M10 16l4 2M22 16l-4 2M13 22l3 3 3-3'] },
 { id:'espectro', nombre:'Espectro', grupo:'Razas', trazos:['M7 27V13a9 9 0 0 1 18 0v14l-5-3-4 4-4-4-5 3Z','M12 13v4M20 13v4M14 21h4'] },
 { id:'linaje', nombre:'Linaje', grupo:'Razas', trazos:['M16 3 28 16 16 29 4 16 16 3Z','M16 9v14M10 13l6 4 6-4M10 20l6-3 6 3'] },
 { id:'espada', nombre:'Espada', grupo:'Equipo', trazos:['M19 4h9v9L14 25l-7-7L19 4Z','M12 15l5 5M5 17l10 10M5 27l5-5M4 28l3-1'] },
 { id:'escudo', nombre:'Escudo', grupo:'Equipo', trazos:['M16 3 27 8v8c0 6-6 11-11 13C11 27 5 22 5 16V8l11-5Z','M16 8v15M10 14h12'] },
 { id:'armadura', nombre:'Armadura', grupo:'Equipo', trazos:['M11 4c0 5 10 5 10 0l7 5-4 6-2-1v14H10V14l-2 1-4-6 7-5Z','M12 17h8M12 22h8'] },
 { id:'arco', nombre:'Arco', grupo:'Equipo', trazos:['M7 4c22 2 22 22 0 24l11-12L7 4Z','M4 16h24M23 12l5 4-5 4'] },
 { id:'baston', nombre:'Bastón', grupo:'Equipo', trazos:['M19 4l7 6-7 6-7-6 7-6Z','M16 14 6 28M8 22l5 3M19 7v6'] },
 { id:'anillo', nombre:'Anillo', grupo:'Equipo', trazos:['M11 10 8 5h16l-3 5H11Z','M11 10l5 4 5-4M10 14a9 9 0 1 0 12 0M13 5l3 9 3-9'] },
 { id:'pocion', nombre:'Poción', grupo:'Equipo', trazos:['M12 4h8M13 4v8L6 23c-2 4 2 5 10 5s12-1 10-5l-7-11V4','M9 20h14M13 23h2'] },
 { id:'fuego', nombre:'Fuego', grupo:'Poderes', trazos:['M17 3c3 8-4 9 1 14 2-1 3-3 3-5 10 10 2 18-6 17C3 27 3 18 10 11c-1 4 1 6 3 7-2-7 5-8 4-15Z'] },
 { id:'agua', nombre:'Agua', grupo:'Poderes', trazos:['M16 3C13 10 5 16 6 22c1 9 19 9 20 0 1-6-7-12-10-19Z','M10 21c0 4 4 5 6 5'] },
 { id:'hielo', nombre:'Hielo', grupo:'Poderes', trazos:['M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l6-1-1-6M22 25l-1-6 6-1'] },
 { id:'rayo', nombre:'Rayo', grupo:'Poderes', trazos:['M18 3 5 19h10l-1 10 13-17H17l1-9Z'] },
 { id:'alma', nombre:'Alma', grupo:'Poderes', trazos:['M16 3 25 13l-3 10-6 6-6-6-3-10 9-10Z','M16 9l4 7-4 7-4-7 4-7Z'] },
 { id:'ojo', nombre:'Ojo arcano', grupo:'Poderes', trazos:['M3 16c7-12 19-12 26 0-7 12-19 12-26 0Z','M16 11a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM16 3v3M16 26v3'] },
 { id:'corona', nombre:'Corona', grupo:'Símbolos', trazos:['M5 10l7 5 4-11 4 11 7-5-3 16H8L5 10Z','M9 21h14M12 26v2M20 26v2'] },
 { id:'vida', nombre:'Vida', grupo:'Símbolos', trazos:['M16 28 5 17C-2 6 11 2 16 11 21 2 34 6 27 17L16 28Z','M8 17h5l2-4 3 8 2-4h5'] },
 { id:'libro', nombre:'Grimorio', grupo:'Símbolos', trazos:['M16 8C11 4 6 4 3 6v21c5-3 9-2 13 1 4-3 8-4 13-1V6c-3-2-8-2-13 2v20','M7 11l5 1M7 17l5 1M20 12l5-1M20 18l5-1'] },
 { id:'yugen', nombre:'Sello de Yugen', grupo:'Símbolos', trazos:['M16 2 29 16 16 30 3 16 16 2Z','M10 10l6 6 6-6M16 16v8M8 19l8-3 8 3'] },
] as const;
export type IconoYugenId = typeof ICONOS_YUGEN[number]['id'];
export const iconoValido = (id: unknown): id is IconoYugenId => ICONOS_YUGEN.some(i => i.id === id);
type CategoriaIcono = {id:string;clave:string;nombre?:string;parent_id?:string|null;icono?:string|null};
const normal = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function iconoCategoria(categorias: CategoriaIcono[], clave: string): IconoYugenId {
 let c = categorias.find(c => c.clave === clave); const vistos = new Set<string>();
 while(c && !vistos.has(c.id)) {
  vistos.add(c.id);
  if(iconoValido(c.icono)) return c.icono;
  const n=normal(`${c.clave} ${c.nombre || ''}`);
  const aliases: [RegExp,IconoYugenId][] = [[/human|personajes/,'humano'],[/enan/,'enano'],[/elf/,'elfo'],[/dragon|kuro/,'dragon'],[/orc/,'orco'],[/hada|alado|arpia/,'alada'],[/bestia/,'bestia'],[/razas/,'linaje'],[/armadura|casco/,'armadura'],[/arma/,'espada'],[/pasiva/,'escudo'],[/habilidad/,'alma'],[/titulo/,'corona'],[/objeto/,'anillo']];
  const match=aliases.find(([r])=>r.test(n)); if(match) return match[1];
  c=categorias.find(p=>p.id===c?.parent_id);
 }
 return 'yugen';
}
export function iconoCreacion(categorias: CategoriaIcono[], item: {icono?:string|null;tipo:string}): IconoYugenId {
 return iconoValido(item.icono) ? item.icono : iconoCategoria(categorias,item.tipo);
}
