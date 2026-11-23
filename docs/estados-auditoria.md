# Auditoría de estados (plan maestro, Apéndice B · paso 1) · 23-11-2026

Inventario de cada estado que el motor (`lib/combate.ts` en `main`, commit 0e52653) creaba, consultaba o consumía
con `estado(…)`, `tiene(…)`, `quitarEstado(…)` o `tipo === '…'`, y qué es ahora.

| Estado | Antes (código fijo) | Ahora |
|---|---|---|
| Congelado | `entrar`: pierde el turno y se consume (junto con Aturdido). Lo aplica el combo Mojado + hielo. | Definición `congelado`: primitiva «Perder turno» con `consumir`. Lo aplica la reacción elemental de Mojado. |
| Aturdido | Igual que Congelado; lo aplica una acción con `estado_tipo: aturdido`. | Definición `aturdido` (misma primitiva). |
| Mojado | Lo aplica el agua; se consume con fuego, hielo, rayo o luz; activa vapor, congelación, Superconducción y agua bendita. | Definición `mojado`: primitiva «Vulnerabilidad elemental» con cuatro reacciones (datos). Mismos dados, mismo orden. |
| Quemadura | Daño 1d4 al inicio del turno; salvación para apagarla. | Definición `quemadura`: «Daño periódico» de **fuego** con `salvacion_termina`. La inmunidad al fuego lo reconoce. |
| Veneno | Daño periódico con los dados de la acción. | Definición `veneno` (Envenenado): «Daño periódico» de **veneno**. |
| Regeneración | Curación periódica con los dados de la acción. | Definición `regeneracion`: «Curación periódica». |
| Dominado | El GM decide; el jugador no actúa (`estaDominado`). | Definición `dominado`: «Cesión de control» con controlador GM, categoría mental/control. |
| Guardia | `accionId === 'guardia'`: armadura +2 hasta su turno. | Definición `guardia` («Bonos», hasta su turno). El valor sale del concepto básico (Apéndice D). |
| Ciego | Combo vapor; −4 al próximo ataque; se consume al atacar. | Definición `ciego` («Bonos»). El consumo al atacar sigue en el motor. |
| Escarcha | Hielo; ARM a la mitad contra el próximo ataque. | Definición `escarcha` (sin primitivas: su efecto sigue en el motor, como regla elemental). |
| Marca de luz | Luz sagrada; el próximo golpe suma 1d6. | Definición `marca_luz` (efecto en el motor). |
| Vuelo | Capa de vuelo de dos turnos. | Sin cambios: no es un estado de control, es la capa de vuelo. |
| Derribado | Derribo del tablero. | Sin cambios. |
| Narrativo (`estado:<id>`) | Solo texto y bonos. | Sin cambios. |
| Asustado, Control mental, Hipnotizado, Dormido, Paralizado, En trance | Solo existían como texto. | Definiciones nuevas del catálogo (ver `lib/estados.ts`). |

Pantallas: `app/dm/combate/page.tsx` y `app/ficha/combate/page.tsx` solo leen `estados[].nombre/restantes` para mostrarlos;
el GM alterna Dominado con `dominar`. Ninguna pantalla decide reglas de estados.

Excepciones documentadas (siguen en el motor por ser reglas elementales, no estados de control): el consumo de Ciego al
atacar, la mitad de ARM de Escarcha y el estallido de Marca de luz.
