# Animación de una regla de transformación

Cada regla del motor puede tener un efecto visual opcional. No es un efecto de daño ni un aura: se reproduce una sola vez, en el centro de la ficha portadora, después de que la regla pase sus condiciones, usos, costes y enfriamiento. El tamaño automático toma en cuenta el ancho y alto de la ficha que existe al activarse.

## Probar la Onda carmesí del Rey Lobo

1. Abre **Rey lobo** en la Forja y edita **Seguir tus instintos**.
2. Abre la etapa **Rey lobo** (3 × 3), luego **Pasivas exclusivas de esta etapa > Que empieze la caceria > Qué sucede después > Animación**.
3. Busca **Onda carmesí** y elígela. Deja el tamaño en **según la ficha**.
4. Abre la Arena del borrador, sin guardar si solo vas a probar. Mueve el saco fuera de las 3 × 3 casillas que va a ocupar el personaje, transfórmalo y termina su turno.
5. Al volverle a tocar, la onda debe salir del centro de la ficha. La animación de entrada no cambia. Con la configuración de la habilidad de referencia cada enemigo sigue recibiendo 10 de daño y la regla vuelve a activarse al pasar su enfriamiento de 3 turnos.

La animación dura 960 ms. La galería tiene una vista previa en bucle; en el tablero no se repite hasta que la regla vuelva a activarse. La vista previa en Arena no requiere publicar la función Edge ni guardar cambios en el catálogo. Para utilizarla en partidas online, hay que actualizar el motor de las funciones de combate y guardar la selección en la creación correspondiente; abrir el PR no realiza ninguno de estos pasos.

El recurso original se puede regenerar desde el repositorio con `python scripts/generar-onda-carmesi.py` (Python 3 y Pillow).
