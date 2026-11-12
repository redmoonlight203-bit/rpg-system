# YUGEN | Paquete de revision (rama main, 12-11-2026)

Esta es una copia de los archivos necesarios para revisar el codigo de YUGEN y configurar una instancia de desarrollo. No incluye los respaldos de la base de datos, archivos internos de planificacion ni variables de entorno privadas.

## Contenido
- app, components, lib, src, types: interfaz y logica de la aplicacion.
- public: logos, tilesets y efectos visuales.
- supabase: migraciones y configuracion versionada.
- scripts, tests: herramientas y pruebas automatizadas.
- package.json y package-lock.json: dependencias y comandos.

## Requisitos
- Node.js compatible con Next.js 16 (recomendado Node.js 20.9 o superior).
- Una instancia de Supabase configurada y autorizada, o credenciales de pruebas proporcionadas por el propietario.
- Conexion a Internet para instalar dependencias.

## Inicio
1. Extraer el ZIP y abrir una terminal en la carpeta extraida.
2. Ejecutar `npm install`.
3. Crear el archivo `.env.local` con las variables publicas correspondientes a una instancia autorizada:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON
```

4. Ejecutar `npm run dev`.
5. Abrir `http://localhost:3000`.

**IMPORTANTE:** este paquete NO contiene acceso a la base de datos de produccion; sin configurar Supabase, las pantallas que requieren autenticacion o datos pueden no funcionar. El codigo descargado no equivale a una demo independiente. Para solo mirar una instancia ya desplegada, se recomienda el enlace de Vercel y una cuenta de pruebas separada.

## Seguridad y origen
Fuente: `redmoonlight203-bit/rpg-system`, rama `main`, revision `0d82f4f5b0bc5c4daedff845ff11e93af157c5aa` (12-11-2026).
Se excluyen `respaldos/`, `docs/`, `codigo_completo_app.txt`, `design.md` y archivos auxiliares no necesarios.
Nunca agregues claves `service_role`, claves privadas ni contrasenas a este paquete.
