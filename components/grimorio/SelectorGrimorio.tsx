import Link from 'next/link';
/** Interruptor entre las dos páginas del grimorio. */
export default function SelectorGrimorio({actual}:{actual:'estados'|'elementos'}){
 return <nav className="ge-selector" aria-label="Grimorio">
  <Link href="/dm/estados" aria-current={actual==='estados'?'page':undefined}><span aria-hidden="true">状</span>Estados</Link>
  <Link href="/dm/elementos" aria-current={actual==='elementos'?'page':undefined}><span aria-hidden="true">元</span>Elementos</Link>
 </nav>;
}
