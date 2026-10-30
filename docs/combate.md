# Combate de Yugen

## Preparar y dirigir

Kuroi arrastra personajes de La creación o jugadores aprobados y vivos a los bandos. Cada incorporación conserva equipo, habilidades y pasivas, resuelve mallas y tira iniciativa una vez. Los personajes antiguos sin vida de combate permiten configurar sus valores antes de entrar. Solo en preparación se añaden, retiran o cambian bandos.

Cada turno tiene una acción. Mayor iniciativa primero; empates por orden de incorporación; los caídos se saltan. Un personaje congelado/aturdido inicia su turno con la acción bloqueada: pulsa Siguiente turno. Terminar combate permite cerrar el encuentro sin borrar su historial. Descanso fuera de combate elimina Fatiga y agotamiento.

Cada cambio guarda una versión en Supabase. Deshacer restaura hasta diez operaciones: vida, PH, Fatiga, estados, equipo temporal, turno, ronda, enfriamientos y registro. Después de deshacer una tirada, repetir la acción vuelve a tirar. Eliminar encuentro requiere confirmación, rol Kuroi, propietario y versión vigente. Las fichas e inventarios originales se conservan.

## Ataques y salvaciones

ARM puede funcionar como dificultad de impacto (predeterminado), reducción de daño o daño directo. En impacto, 1 natural es fallo crítico y 20 natural acierta y duplica todos los dados de daño de ese golpe, incluidos dados elementales/combos/marca. Los modificadores se suman una sola vez. Ejemplo: dados 8, modificador +3 → crítico 19.

Una acción con salvación configurada sustituye el impacto por 1d20 del objetivo + la clave de bono elegida, contra su CD. Superarla puede anular, reducir a mitad o evitar el estado sin reducir daño. No hay críticos en salvaciones: se compara el total con la CD. Las salvaciones secundarias de los elementos usan CD 12 y el atributo `salvacion`, cero si no está definido.

Orden: defensas reactivas y penetración → impacto/salvación → dados → crítico → modificadores → multiplicadores de combo → salvación que reduce daño → ARM si se eligió reducción → mayor reducción pasiva → vida → efectos y salvaciones elementales. Todas las mitades se redondean hacia abajo.

La naturaleza es independiente del tipo de daño y del elemento. Una magia puede hacer daño cortante. Según la definición de Yugen, consumir PH identifica un ataque mágico; las naturales no gastan PH y pueden generar Fatiga. Las acciones antiguas detectan el elemento si su tipo de daño es fuego, agua, eléctrico, hielo/frío o luz sagrada. Seleccionar explícitamente Ninguno desactiva esa detección.

## Elementos

Cada ataque elemental que impacta añade 1d4 de base. Los efectos secundarios solo se aplican al impactar, incluso si la defensa reduce el daño a cero.

| Elemento     | Regla                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Fuego        | Salvación CD 12 al impactar. Fallo: Quemadura. Cada inicio propio recibe 1d4 y después salva CD 12 para apagarla.           |
| Agua         | Mojado sin salvación. Dura hasta el final del encuentro o hasta ser consumido por un combo.                                 |
| Electricidad | Ignora 3 ARM. Los otros enemigos del mismo grupo de cercanía sufren una chispa de 3 de daño automático.                     |
| Hielo        | Salvación CD 12. Fallo: Escarcha divide la ARM del siguiente ataque entre dos; después desaparece, aunque ese ataque falle. |
| Luz Sagrada  | Ignora 5 ARM. Salvación CD 12. Fallo: Marca de Luz; el siguiente golpe añade 1d6 y consume la marca.                        |

Mojado se consume solo en el objetivo principal de un golpe combinado:

| Combo        | Resultado                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fuego        | Onda de vapor: +1d4 y Ceguera (-4 al próximo intento de ataque, acierte o falle).                                                                                               |
| Hielo        | Congelación: pierde el siguiente turno. La salvación normal de Escarcha sigue aplicándose.                                                                                      |
| Electricidad | Superconducción: duplica el daño principal y añade 1d6 a otros enemigos mojados del mismo grupo de cercanía. Estos también reciben la chispa ordinaria de 3 y conservan Mojado. |
| Luz Sagrada  | Agua bendita: +1d6. Si el objetivo es oscuro/corrupto, duplica el daño principal sagrado.                                                                                       |

Los grupos A/B/C/D representan cercanía sin tablero. Separado no participa en efectos cercanos. En Equipo y pasivas de cada participante, Kuroi configura cercanía y oscuridad/corrupción. El atributo `corrupto=1` permite marcarlo desde las estadísticas de una creación. Las chispas y daños de área no hacen nuevas tiradas de impacto ni vuelven a generar chispas o combos; las defensas reactivas siguen protegiendo esos daños.

## Pasivas, estados y acumulación

La Forja permite bonos permanentes, recuperación al inicio, antes de recibir un ataque, cuando impacta y cuando recibe daño. Las condiciones incluyen PH, natural y elemento concreto. ARM reactiva se configura en Antes del impacto. Reducción porcentual puede configurarse en los tres eventos reactivos. Curación/recuperación y represalias se ejecutan cuando sucede el evento. Las represalias no disparan nuevas represalias.

Escamas de dragón ya existe como plantilla: evento Recibir ataque, condición Consume PH, ARM +5 y reducción 50 %. Se asigna al personaje como cualquier pasiva. El botón de ejemplo del editor ayuda a crear variantes.

Veneno y regeneración configuran dados por inicio de turno y duración; Quemadura añade salvación para terminar. Aturdimiento/congelación pierden una acción. Los estados narrativos solo muestran su descripción y bonos explícitos.

No se acumula el mismo estado: se renueva la mayor duración y se conserva la potencia mayor. Mojado, Quemadura, Escarcha y Marca tienen una sola instancia. Reglas idénticas duplicadas no se suman. Bonos de reglas distintas sí se suman; reducciones porcentuales usan la mayor, nunca se multiplican. La represalia no causa ciclos. Los daños periódicos no cuentan como nuevos ataques, aunque pueden activar reglas de Recibir daño.

## Fatiga

Empieza en cero. Si el personaje termina un turno sin usar Fatiga, baja 1 hasta cero. Gastarla incluso al fallar impide recuperar ese turno. Llegar al máximo produce agotamiento: pasar turno o recuperar Fatiga mediante una técnica no elimina ese bloqueo. Requiere descanso fuera del combate.

Forzar natural permite actuar cuando no cabe su coste o ya hay agotamiento; causa 1d4 al usuario antes de resolver la habilidad. Si cae por ese daño, no ejecuta la habilidad; PH y acción ya consumidos. Este 1d4 es la regla provisional explícita de daño por agotamiento; no aplica críticos ni combos.

## Armas temporales

Sustituyen la mano o ambas manos, incluidos bonos y pasivas. La duración cuenta turnos propios completos posteriores al de creación. Al expirar vuelve el equipo original; no crean objetos permanentes vendibles.

## Verificación

`node --test tests/*.test.mjs`

`FORJA_PGLITE_MODULE=/ruta/pglite/index.js node tests/elementos-database.mjs`
