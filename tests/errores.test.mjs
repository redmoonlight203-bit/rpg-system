import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cargarDependencia} from './helpers/cargar-ts.mjs';
const {mensajeError}=cargarDependencia('errores');

test('conserva los mensajes en español escritos por el servidor o la aplicación',()=>{
 for(const m of ['Este combate pertenece a otro director.','Revisión inválida.','Restablece primero la copia ligada al alma.','Máximo 40 reglas y 200 KB por creación.','Error al guardar el personaje.','Solo Kuroi puede borrar encuentros.','El combate cambió en otra sesión. Recárgalo antes de continuar.','Selecciona primero uno de tus personajes.','Las recompensas ya fueron aprobadas; el encuentro es inmutable.'])
  assert.equal(mensajeError(new Error(m),'respaldo'),m);
 assert.equal(mensajeError({message:'Inicia sesión.',code:'42501'},'x'),'Inicia sesión.');
});

test('traduce fallos de red, sesión, bloqueo y permisos',()=>{
 for(const m of ['Failed to fetch','TypeError: NetworkError when attempting to fetch resource.','Load failed','fetch failed'])
  assert.match(mensajeError(new Error(m),'x'),/conexión/);
 for(const m of ['JWT expired','invalid JWT: unable to parse or verify signature','Invalid Refresh Token: Refresh Token Not Found','Auth session missing!'])
  assert.match(mensajeError(new Error(m),'x'),/sesión/);
 assert.match(mensajeError(new Error('canceling statement due to lock timeout'),'x'),/Otra acción/);
 assert.match(mensajeError({message:'could not obtain lock on row',code:'55P03'},'x'),/Otra acción/);
 assert.match(mensajeError(new Error('canceling statement due to statement timeout'),'x'),/tardó demasiado/);
 assert.match(mensajeError(new Error('new row violates row-level security policy for table "personajes"'),'x'),/permiso/);
 assert.match(mensajeError(new Error('permission denied for table combates_yugen'),'x'),/permiso/);
 assert.match(mensajeError({message:'duplicate key value violates unique constraint "x_pkey"',code:'23505'},'x'),/ya existe/);
 assert.match(mensajeError({message:'update or delete on table "a" violates foreign key constraint "b"',code:'23503'},'x'),/depende/);
 assert.match(mensajeError({message:'JSON object requested, multiple (or no) rows returned',code:'PGRST116'},'x'),/No se encontró/);
});

test('cualquier otro mensaje técnico en inglés usa el texto de respaldo de la pantalla',()=>{
 for(const m of ['Edge Function returned a non-2xx status code','column personajes.foo does not exist','invalid input syntax for type uuid: "abc"','null value in column "nombre" violates not-null constraint','Unexpected token < in JSON at position 0','Something went wrong','Internal Server Error','Bad Request','Cannot read properties of undefined (reading \'id\')'])
  assert.equal(mensajeError(new Error(m),'No se pudo cargar tu equipo.'),'No se pudo cargar tu equipo.');
});

test('acepta cadenas, objetos sin mensaje y valores vacíos',()=>{
 assert.equal(mensajeError('El encuentro ya no existe.','x'),'El encuentro ya no existe.');
 assert.equal(mensajeError(null,'No se pudo guardar.'),'No se pudo guardar.');
 assert.equal(mensajeError({},'No se pudo guardar.'),'No se pudo guardar.');
 assert.equal(mensajeError(new Error('   '),'No se pudo guardar.'),'No se pudo guardar.');
 assert.equal(mensajeError(new Error('Internal Server Error')),'Algo salió mal. Vuelve a intentarlo.');
});
