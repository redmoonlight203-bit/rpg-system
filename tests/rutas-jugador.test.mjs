import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Regresión del 16-11: «Pactos con Kuroi» estaba en el menú pero AccesoReencarnado no permitía /ficha/deudas
// y devolvía al jugador al Nexo. Todo enlace de los menús del jugador debe ser una ruta permitida.
const leer=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const acceso=leer('components/AccesoReencarnado.tsx');
const permitidas=new Set([...acceso.match(/const rutas=new Set\(\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));

test('cada enlace del menú lateral del jugador es una ruta permitida',()=>{
 const enlaces=[...acceso.match(/const enlaces=\[([\s\S]*?)\];/)[1].matchAll(/href:'([^']+)'/g)].map(m=>m[1]);
 assert.ok(enlaces.length>=10);
 for(const e of enlaces)assert.ok(permitidas.has(e),`El menú lateral enlaza ${e}, que AccesoReencarnado no permite`);
});

test('cada enlace del menú móvil del jugador es una ruta permitida',()=>{
 const movil=leer('components/NavegacionMovil.tsx');
 const jugador=movil.slice(movil.indexOf('] : ['),movil.indexOf('const activo'));
 const enlaces=[...jugador.matchAll(/href: "(\/ficha[^"]*)"/g)].map(m=>m[1]);
 assert.ok(enlaces.length>=8);
 for(const e of enlaces)assert.ok(permitidas.has(e),`El menú móvil enlaza ${e}, que AccesoReencarnado no permite`);
});
