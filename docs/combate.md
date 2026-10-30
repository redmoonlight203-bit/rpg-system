# Combate

Kuroi puede abrir Combate y arrastrar personajes de La creación a los bandos Jugador o Enemigo. J/E permiten añadir sin arrastrar. Solo durante preparación se añaden, mueven y retiran participantes. Cada copia incorpora equipo, habilidades y pasivas; las mallas se resuelven dentro de sus rangos. La iniciativa es 1d20 + iniciativa efectiva, una vez por incorporación.

Cada turno permite una acción; Siguiente turno permite pasar. Los caídos se saltan. ARM se configura durante preparación: impacto (1d20 + bono ≥ ARM), reducción del daño, o daño directo. Con regla de impacto: 1 natural es Fallo crítico automático; 20 natural es Crítico y acierta automáticamente. El crítico no multiplica el daño. PH y Fatiga se consumen incluso al fallar. Fatiga empieza en cero y tiene como máximo el atributo del personaje. Curación y PH respetan máximos. Guardia da +2 ARM hasta el siguiente turno propio.

Las pasivas admiten condiciones siempre, mitad de vida o sin arma, bonos permanentes y recuperación al inicio del turno. Los textos narrativos se registran; sus consecuencias requieren reglas numéricas explícitas.

Creación de armas consume una acción: sustituye temporalmente la mano configurada (ambas para dos manos), incluyendo sus bonos y pasivas. La duración cuenta turnos propios completos posteriores al turno de creación. Después restaura el equipo anterior. No crea objetos vendibles.

Aurio Magno SSS tiene 100 vida, 8 ARM de base +12 de sus cuatro piezas SSS, PH 0 y Fatiga máxima 7. Mente de mariscal añade +4 iniciativa y +2 impacto. Última línea añade +2 ARM y +2 daño a mitad de vida. Golpe del mariscal: 3d8+4. Arremetida imperial: 2d10+6, enfriamiento 1. Creación de armas: Lanza del conquistador 3d8+6, dos manos, 3 turnos completos, 0 PH y 1 Fatiga. El bono de daño del personaje se suma a los ataques.

Cada operación guarda el encuentro en Supabase con control de versiones. Eliminar borra realmente la plantilla y retira referencias del catálogo; copias entregadas y combates guardados conservan sus datos históricos.

Pruebas: `node --test tests/*.test.mjs`. PostgreSQL aislado: `FORJA_PGLITE_MODULE=/ruta/pglite/index.js node tests/combate-database.mjs`.

## Interacción y recuperación

Todos los dados lanzados en combate usan la animación de iniciativa, con su número de caras indicado. Un resultado 1 se muestra rojo y un 20 verde. Para atacar, selecciona la acción y pulsa el nombre del objetivo; el ataque se ejecuta con ese objetivo. El selector y Ejecutar siguen disponibles. Los resultados de impacto flotan y desaparecen hacia arriba.

Al terminar un turno sin gastar Fatiga (ataque normal, Guardia u omitir acción), la Fatiga acumulada baja 1, hasta cero. Gastarla, incluso en un ataque fallido, impide recuperar ese turno. Cada participante tiene su propio registro de uso.

Retirar solo aparece durante preparación; el motor también lo impide una vez iniciado. Borrar encuentro elimina el encuentro completo tras confirmar y comprobar su versión y propietario. No borra fichas ni inventarios.
