# Validación real de la guía v2

Estado: **sin ejecutar**. Se necesita un GM y dos jugadores autenticados en una campaña de prueba, además de dos teléfonos reales. No tocar personajes oficiales para ensayar.

Antes de cada pasada, anotar fecha, commit de `/api/version`, migraciones aplicadas, despliegue y dispositivos. Abrir Rendimiento del combate en cada cliente y pulsar Empezar nueva medición. Ejecutar 30 acciones correctas y descargar el informe al terminar; conservar también las muestras con error. El p95 corresponde al tramo Confirmación completa. Los tamaños de respuesta son JSON UTF-8 descomprimido, no transferencia comprimida de Network.

| Paso | Verificación |
| --- | --- |
| Acceso | GM y dos jugadores ven únicamente sus funciones y personajes |
| Creación | Raza, herencias, atributos y recursos coinciden |
| Preparación | Inventario, equipo y compañero disponibles |
| Encuentro | La party entra una sola vez |
| Rondas | Movimiento, ataque, habilidad, poción, equipo y fin de turno |
| Resiliencia | Repetir action_id, perder respuesta y reconectar sin duplicar |
| Reglas | 0 HP inconsciente; curación activa; muerte solo por GM, alma y cementerio una vez |
| Cierre | Sin acción pendiente bloqueante; historial técnico eliminado |
| Recompensas | EXP y botín una vez, incluso después de repetir aprobación |
| Retorno | Salir y volver conserva recursos, objetos y progreso |

Repetir todo tres veces seguidas y conservar capturas pertinentes e informes con fecha y commit en docs/metricas. Registrar errores como pendientes; no rellenar resultados antes de ejecutar.

| Repetición | Fecha y commit | GM y dos jugadores | Errores y duplicados | Informes y capturas | Resultado |
| --- | --- | --- | --- | --- | --- |
| 1 | Pendiente | Pendiente | Sin comprobar | Pendiente | Sin ejecutar |
| 2 | Pendiente | Pendiente | Sin comprobar | Pendiente | Sin ejecutar |
| 3 | Pendiente | Pendiente | Sin comprobar | Pendiente | Sin ejecutar |

Móvil: identificar teléfono, sistema y navegador de ambos dispositivos; recorrer creación, equipo, combate y recompensas, con controles táctiles y orientación vertical/horizontal. Un viewport emulado no acredita esta prueba.
