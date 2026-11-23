# Rutas especiales de control y posesión (plan maestro, Apéndice A · paso 4.4) · 24-11-2026

Cada ruta que aplica control, ilusión o posesión pasa ahora por `comprobarInmunidad` **antes** de su salvación. Sin
inmunidades configuradas el resultado no cambia (pruebas `mente-inquebrantable` y regresión completa).

| Ruta | Dónde | Candidato que se comprueba |
|---|---|---|
| Acción que aplica un estado (cualquier `estado_tipo` o estado del Yunque) | `resolverEfecto` | estado + categoría/subcategoría del efecto o de su definición + origen |
| Estados elementales (Mojado, Quemadura, Escarcha, Marca de luz, Ceguera y Congelado por combo) | `resolverEfecto` | estado del catálogo con su origen elemental |
| Dominado por el GM | `dominar` | `dominado`, mental/control |
| Control mental de un rival | acción con `control_mental` | `control_mental`, mental/control |
| Espejo mental | `lanzarEspejo` | `espejo_mental`, mental/ilusión |
| Voz del artefacto | `tomarArtefacto` | `voz_artefacto`, mental/posesión |
| Posesión de una transformación | `entrar` | `posesion`, mental/posesión |

**Pregunta abierta (no decidida aquí):** qué posesiones son bloqueables por defecto y qué estados mentales bloquea
Mente Inquebrantable en las reglas oficiales de YUGEN. El motor solo ofrece la mecánica: nada queda bloqueado si el GM
no configura la inmunidad.
