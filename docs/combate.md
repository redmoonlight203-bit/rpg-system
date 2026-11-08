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

## Interfaz de combate

La iniciativa se muestra en una tira ordenada; pulsar un participante reproduce su tirada sin cambiar el turno. Las tarjetas distinguen el turno activo en dorado y el objetivo en rojo, con vida, PH, Fatiga y estados visibles. La biblioteca se abre desde **Personajes** o **Añadir**; conserva búsqueda, botones de incorporación y arrastre durante preparación. Escape cierra la biblioteca.

Seleccionar el nombre del objetivo **no ejecuta** la habilidad. Después de elegir habilidad y objetivo, se utiliza **Lanzar y resolver**. Los atajos Q/W/E/R seleccionan las primeras cuatro acciones disponibles; nunca lanzan ataques. Se ignoran mientras se escriben campos, se utiliza un control, está abierta la biblioteca o hay una operación pendiente. Pasar turno conserva las reglas de recuperación existentes.

Los retratos son opcionales: sin imagen o si falla su carga, se muestran iniciales. En **Equipo, pasivas y configuración** se puede introducir una URL http/https o una ruta pública como `/personajes/axel.webp`. Esas preferencias se recuerdan solo en ese navegador y se comparten entre copias del mismo personaje. Para definir imágenes comunes a todos los navegadores, completar `lib/retratos-combate.ts` con claves `jugador:<id>` o `forja:<id>`. No se modifica la ficha ni se requiere migración de base de datos.

El registro se coloca a la derecha en escritorio y debajo en pantallas estrechas. Los retratos no son necesarios para usar ninguna acción.


## Tablero táctico y barra inferior

El GM y el jugador usan el mismo tablero de casillas con retratos (o iniciales), vida, estados y marcador de turno. Toca una ficha para seleccionar un objetivo; elige una acción abajo, lee su explicación y confirma. La barra conserva Guardia, inventario y habilidades, y el GM conserva invocaciones, participantes y ajustes en el panel desplegable.

Las tiradas aparecen sobre la barra en PC y en la esquina derecha de la barra en pantallas pequeñas. En móvil el tablero se desplaza con el dedo y las acciones se recorren horizontalmente.

Mover muestra casillas alcanzables y requiere seleccionar y confirmar destino. El atributo `movimiento` define el presupuesto por turno; si no existe se usan 6 casillas (máximo 100). Cada paso horizontal o vertical cuesta una casilla. No se atraviesan participantes, incluidos caídos. Mover no consume la acción y puede hacerse antes o después de atacar. La distancia gastada, las posiciones y el historial se guardan en el encuentro y se validan también en la función del jugador con revisión optimista.

Los encuentros anteriores reciben posiciones iniciales automáticamente. Los retratos del GM se incorporan al próximo guardado para compartirlos con jugadores. No requiere migración SQL: los campos adicionales viven en `combates_yugen.datos`.

El editor de mapas y los obstáculos de terreno quedan pendientes. Las acciones antiguas sin configuración de tablero conservan su alcance anterior hasta que el GM lo configure. Publicar los cambios requiere actualizar `combate-jugador` con su `motor.js` compartido además del frontend.


## Alcance, áreas y control de posición

En el Yunque, cada acción puede habilitar «Alcance y casillas afectadas». El alcance se mide con distancia horizontal/vertical desde el lanzador y aparece en blanco. Se puede seleccionar una casilla vacía; antes de confirmar se colorea el área y se enumeran sus víctimas. La misma geometría se usa en PC, teléfono y servidor.

Formas: individual (una casilla), círculo por casillas (radio con distancia horizontal/vertical), cuadrado (lado), cruz (radio), línea y cono (longitud desde el lanzador, orientados hacia la casilla elegida). El mapa recorta las casillas fuera de sus límites. El filtro puede incluir solo enemigos, aliados, todos o el lanzador. No hay línea de visión ni obstáculos de terreno en esta fase.

La atracción y el empuje son configurables de 1 a 12 casillas, siempre o solo al fallar salvación. No atraviesan ni superponen participantes, y no gastan el movimiento de la víctima. Los objetivos se fijan antes de desplazar a ninguno; los costes se pagan una sola vez. Cada víctima resuelve su propia salvación, sin repetirla para el derribo.

Derribado aplica -2 al ataque y bloquea caminar hasta levantarse. Levantarse cuesta la mitad del movimiento máximo, redondeada hacia arriba, sin consumir la acción. Se valida en el servidor y se puede deshacer desde el GM.

`supabase/seeds/azul.sql` crea Azul en la galería: alcance 6, radio 2 (13 casillas antes de recortar bordes), 2d6 de daño, coste 2 PH, atracción hasta 2 y CD 12 para evitar derribo. Superar la salvación reduce el daño a la mitad y conserva la atracción. El movimiento de razas y monstruos se configura por herencia en Estadísticas y reglas, con valor inicial 6.

Para probar con cambios de habilidades, prepara un encuentro nuevo: los encuentros existentes guardan una instantánea de las habilidades que tenían al añadir al personaje.


## Recursos y números de vida

El recurso PH utilizable se limita a los PH actuales y al máximo efectivo. Un máximo cero, un recurso ausente o no finito no permiten pagar magias, acciones de objetos, reglas activas ni invocaciones. La barra deshabilita acciones sin PH y el servidor vuelve a comprobarlo al ejecutar. Las técnicas con coste cero conservan sus reglas de uso.

Los cambios de vida se calculan sobre el resultado real de cada operación, después de armadura, salvaciones y topes de curación. Se comparten en el evento visual: números rojos negativos para daño y verdes positivos para curación, sobre cada retrato. Un fallo no muestra daño; mover después no repite el evento. También incluye los estados al inicio del turno y la reversión de vida al deshacer.

La plantilla de Aurio Magno tenía Phoenix equipada; `supabase/seeds/reparar_equipo_aurio.sql` retira únicamente esa referencia. El equipo de las plantillas de PNJ y las copias del inventario de jugadores son independientes. Las consultas de inventario verifican la identidad del participante solicitado.

### Alcances de acciones antiguas

Los ataques sin `tablero` reciben alcance finito desde el motor compartido, incluso cuando provienen de equipo, habilidades concedidas, objetos del inventario o snapshots de encuentros anteriores. El alcance explícito siempre prevalece. Valores automáticos: cuerpo a cuerpo 1 casilla, lanza 2, arco 8 y magia a distancia 6. Se usa la distancia horizontal y vertical del tablero. Las reglas activas también limitan el daño a destinatarios dentro de alcance; las reacciones automáticas conservan su lógica.

La migración de alcances completa las acciones antiguas del catálogo y sus copias sin reemplazar las áreas ya configuradas. Añade tres objetos ordinarios y editables: Lanza normal (2 casillas, 1d6), Arco normal (8 casillas, 1d6) y Bastón normal (proyectil de 6 casillas, 1d6 y 1 PH; golpe de 1 casilla, 1d4 sin PH). No los entrega automáticamente a jugadores.
