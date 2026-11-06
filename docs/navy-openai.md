# NAVY × OpenAI — puesta en marcha

NAVY, la compañera del Yunque, conversa con un modelo de OpenAI a través de la **Supabase Edge Function `navy-chat`**. Nunca se llama a OpenAI desde el navegador.

## Activación segura (producción)

1. Entra a [OpenAI Platform — API keys](https://platform.openai.com/api-keys). Crea un proyecto de API dedicado a YUGEN y una clave de proyecto (para una aplicación estable, preferiblemente de cuenta de servicio), con permisos mínimos. **La suscripción a ChatGPT no cubre el uso de la API**.
2. Entra a [Supabase — proyecto RealYugen](https://supabase.com/dashboard/project/yzvpahcjbuotnqjmbkeu/functions). En la sección **Edge Functions → Secrets**, crea:
   - **Key:** `OPENAI_API_KEY`
   - **Value:** la clave creada en el paso 1.
   - Pulsa **Save**. No necesitas pegar esta clave en el chat ni volver a desplegar la función.
3. Opcional: crea el secreto `NAVY_OPENAI_MODEL` con un identificador de modelo habilitado en tu proyecto. Por defecto utiliza `gpt-6-luna`.
4. Entra en YUGEN con la cuenta **KUROI**, abre **La Forja → El Yunque**, pulsa el icono de NAVY y envía «Hola, ¿puedes ayudarme a crear un goblin?».
5. Controla el consumo en [OpenAI Platform — Usage](https://platform.openai.com/usage) y configura límites de presupuesto en el proyecto de API.

**No** guardes `OPENAI_API_KEY` en GitHub, archivos `NEXT_PUBLIC_*`, valores del navegador, hojas de cálculo, capturas ni mensajes de chat.

## Desarrollo local

La función se encuentra en `supabase/functions/navy-chat/index.ts`. Para desarrollarla localmente, crea el archivo no versionado `supabase/functions/.env`:

```dotenv
OPENAI_API_KEY=tu_clave_real_aqui
NAVY_OPENAI_MODEL=gpt-6-luna
```

El `.gitignore` ignora `.env*`. Para producción, usa exclusivamente **Supabase Secrets**, nunca el archivo local.

## Seguridad y alcance

- NAVY solo responde a sesiones válidas con `perfiles.rol = 'KUROI'`. Se verifica la identidad en Supabase Auth y el rol en Postgres.
- `navy_reservar_cupo()` aplica 8 consultas/minuto y 80 al día por usuario. El seguimiento reside en el esquema `private` y no es editable desde el cliente.
- El mensaje (máximo 1800 caracteres), hasta ocho turnos anteriores, un resumen del editor, hasta 20 creaciones aprobadas recientes y 60 categorías se comparten con OpenAI para responder. No se envían contraseñas, inventarios ni expedientes de otros jugadores.
- Se usa la API `POST /v1/responses` con `store:false`. Esto desactiva el almacenamiento de respuestas por la API; siguen aplicándose las políticas de tratamiento de datos y controles de abuso del proveedor.
- Esta versión es **solo lectura**. NAVY puede proponer estadísticas o reglas, pero **no puede editar el Yunque**, ejecutar comandos ni gastar la experiencia de nadie. La aprobación y el guardado siguen siendo acciones explícitas del GM.
- La clave de OpenAI existe únicamente en los secretos del servicio; el código del cliente nunca la solicita.
- Si falta la clave, la interfaz muestra «falta configurar OPENAI_API_KEY» en lugar de inventar una respuesta.

## Solución de problemas

- **401**: inicia sesión nuevamente; la sesión de Supabase no es válida.
- **403**: la cuenta debe tener el rol `KUROI`.
- **429**: se alcanzó el límite de NAVY o el límite de la API de OpenAI; revisa el panel de uso.
- **503 NAVY_NO_CONFIGURADA**: agrega `OPENAI_API_KEY` a Edge Functions → Secrets.
- **502**: comprueba que el proyecto OpenAI tenga acceso al modelo seleccionado; de ser necesario configura `NAVY_OPENAI_MODEL`.

La URL pública de la Edge Function es `https://yzvpahcjbuotnqjmbkeu.supabase.co/functions/v1/navy-chat`. **No sirve como chat anónimo:** requiere una sesión válida y permisos KUROI.
