# RALL Turbo Laser — CULTURA EDITION 3.0

## El de los peñonazos musicales · Barranquilla, Colombia

Este proyecto contiene la **página pública**, la **zona RALL TV de emisión propia**, una **cabina privada con login protegido por servidor**, una **API para distribuir permisos de LiveKit** y el diseño optimizado para computadora y teléfono.

**La señal todavía depende del despliegue:** ya se dispone de un proyecto LiveKit Cloud, pero para emitir entre dispositivos debes configurar sus tres variables en **el proyecto de Vercel** y volver a desplegar. Las credenciales privadas no vienen en este ZIP. No hay espectadores simulados; la web dice «fuera del aire» hasta que Ronald realmente transmita.

## Archivos importantes

- `index.html`, `styles.css`, `app.js`: sitio público, fotos, agenda, enlaces a redes, galerías.
- `live-web.js`, `livekit-loader.js`: RALL TV, reproductor WebRTC, estado y contador de espectadores.
- `admin.html`, `admin.css`, `admin.js`: login + cabina de Ronald.
- `api/auth.js`: autenticación, sesión firmada con cookie `HttpOnly`, caducidad de 8 h.
- `api/live.js`: tokens de emisor y de espectador, consulta de estado, título en directo.
- `api/_lib`: firma de tokens y consultas seguras al servicio LiveKit.
- `site.config.js`: enlaces de Facebook y TikTok ya conectados; otros perfiles/eventos se editan aquí.
- `.env.example`: nombres de las variables. **No contiene claves.**
- `scripts/setup.mjs`: genera claves/hashes nuevos para otros administradores o para rotación de contraseña.

## Paso 1: configura la cuenta de LiveKit Cloud

1. Ya se creó el proyecto de LiveKit con URL `wss://rllturbo-khctqfyw.livekit.cloud`.
2. **Antes de publicarlo, genera una clave nueva en LiveKit y revoca la anterior**, porque el antiguo secreto se compartió en una conversación. Mantén el nuevo secreto exclusivamente en Vercel.
3. En Vercel → **Settings → Environment Variables**, configura las siguientes variables de servidor:

| Variable | Qué se pone |
| --- | --- |
| `ADMIN_USERNAME` | `RonaldRall` |
| `ADMIN_PASSWORD_HASH` | Hash incluido en el **archivo privado de configuración entregado por separado**. No pongas la clave en texto. |
| `SESSION_SECRET` | Valor aleatorio del archivo privado. No publicarlo. |
| `LIVEKIT_URL` | `wss://rllturbo-khctqfyw.livekit.cloud` |
| `LIVEKIT_API_KEY` | API Key que genera LiveKit |
| `LIVEKIT_API_SECRET` | API Secret que genera LiveKit |

**MUY IMPORTANTE:** el archivo de configuración privada **NO** está dentro de este ZIP. Nunca debes subirlo a GitHub ni enviarlo a otras personas. En Vercel se colocan **las seis variables, una por una**, en Settings → Environment Variables. Luego usa **Redeploy** para que se apliquen. No agregues prefijos `NEXT_PUBLIC_` ni copies esas variables en archivos `.js` públicos.

Si no tienes el archivo privado o quieres modificar la contraseña, ejecuta `npm run setup` desde el proyecto en tu PC: crea `.env.local` con un nuevo hash y clave de sesión, y te pedirá la nueva contraseña. `.env.local` se excluye con `.gitignore`.

## Paso 2: subir la página a Vercel

1. Extrae el ZIP y sube **su contenido** a un repositorio privado de GitHub; no publiques archivos `.env`.
2. En https://vercel.com/ crea un nuevo proyecto, importa ese repositorio.
3. Elige **Framework Preset: Other** (es una web HTML con funciones `/api` de Node.js). No uses Next.js. No se necesita un comando de compilación; la carpeta de salida es la raíz del proyecto.
4. Antes de usar el dominio, configura todas las variables en el panel Environment Variables de Vercel (en `Production` y, si deseas, `Preview`).
5. Publica / vuelve a desplegar. Vercel ejecuta las funciones dentro de `/api`.
6. La web pública estará en `https://tu-sitio.vercel.app/` y el login en `https://tu-sitio.vercel.app/admin`.

**Nota:** abrir `index.html` localmente funciona para ver el diseño, fotos y enlaces, pero NO activa el servidor de login ni la transmisión. Necesitas Vercel o un servidor compatible con funciones API. El acceso a cámara y pantalla requiere HTTPS (Vercel lo incluye).

## Paso 3: transmitir y ver el directo

1. Abre `/admin` con el usuario RonaldRall y la contraseña que configuraste (la solicitada en el proyecto).
2. Escribe el título del peñonazo musical y pulsa **INICIAR TRANSMISIÓN**.
3. Autoriza el uso de cámara y micrófono. Para conectar el audio de la consola / mezclador, conecta una interfaz USB y escógela en **ENTRADA DE SONIDO**. La cabina inicia en **modo música**, sin supresión de ruido, cancelación de eco ni ajuste automático de ganancia; usa audífonos para evitar retroalimentación acústica.
4. Desde el panel puedes silenciar/activar micrófono, apagar/encender cámara y compartir tu pantalla.
5. Los visitantes van a `/` → **EN VIVO** → **RALL TV** → **ENTRAR A LA SEÑAL** para mirar la transmisión en el propio sitio.
6. Para cerrar, pulsa **FINALIZAR**, luego **CERRAR SESIÓN**.

El indicador y contador se consultan al servidor. El estado del directo se deriva de que el presentador esté conectado y publique al menos una pista. Puede tardar unos segundos en actualizarse en otras pestañas.

## Seguridad

- **Ninguna contraseña ni API secret está en HTML/JS público**. La contraseña se compara mediante `scrypt` con sal y se guarda como hash solo en variables del servidor.
- Las sesiones son cookies `HttpOnly`, `SameSite=Strict` y `Secure` cuando está en HTTPS; caducan a las 8 horas y la firma se valida en cada solicitud sensible.
- Las operaciones `POST` comprueban el origen del navegador.
- El endpoint de presentación exige la sesión. Los espectadores reciben permisos de suscripción, sin permisos para publicar audio o video.
- El login tiene una limitación básica de intentos por instancia de proceso. **Vercel puede ejecutar varias instancias**, así que para un despliegue público conviene añadir protección distribuida de intentos / rate limiting mediante Vercel Firewall u otro almacén compartido; esta implementación básica **no equivale a un control global**.
- Recomendado: contraseña robusta, 2FA en cuentas Vercel/GitHub/LiveKit, rotación de secretos y métricas del proveedor.

## Alcance y límites reales

- Este MVP emite **WebRTC** directamente dentro de tu página usando LiveKit Cloud. Las personas que miran generan tráfico / uso del servicio según su plan. Para eventos con miles de espectadores, planifica **CDN + HLS / salida de LiveKit Egress** o una plataforma de difusión a gran escala; el código actual no incluye ese escalamiento.
- **NO** transmite automáticamente al mismo tiempo a TikTok y Facebook. Esos son enlaces sociales oficiales y una pestaña alternativa. La retransmisión simultánea requiere cumplir los métodos/condiciones de cada plataforma e incorporar un servidor o servicio de restream.
- Las transmisiones de música grabada pueden exigir autorizaciones/licencias de difusión, aparte de los permisos para presentaciones presenciales.
- El título es modificable durante una emisión y se guarda como metadatos de la sala de LiveKit mientras exista. No hay base de datos ni edición persistente de eventos/galería desde el panel en esta fase.
- La sección de videos públicos de YouTube y Facebook conserva el sistema anterior. El RALL TV es distinto y tiene su propia infraestructura.

## Ejecutar pruebas

La carpeta `tests/` contiene pruebas automáticas de autenticación, sesión, permisos y simulación controlada de estado de LiveKit. Con Node 20+:

```bash
npm test
```

**Redes oficiales incluidas**

- TikTok: https://www.tiktok.com/@rallturbolaser07
- Facebook: https://www.facebook.com/profile.php?id=61586975919776&sk=directory_links

Hecho con sabor costeño. ✳


## Lo nuevo en RALL Turbo Laser 3.0

- Seis **fotografías auténticas adicionales**, convertidas a WebP y miniaturas para cargar rápido.
- Álbum de **9 fotografías** con filtros (todo / DJ / picó / identidad), vista ampliada y navegación mediante flechas del teclado.
- Sección **La cabina / DJs** con cuatro momentos de los DJ y sus tornamesas. Los nombres artísticos no fueron proporcionados: las tarjetas tienen títulos de sesión en vez de inventar identidades.
- Una nueva portada con fotografía real de la cabina y sección editorial de pantalla completa sobre el picó.
- **Cabina LiveKit:** instrucciones dentro del panel para conectar LiveKit en Vercel, sin exponer claves.

### Personalizar los DJ y las fotografías

1. Abre `site.config.js`.
2. Para nombrar a un DJ, cambia los campos `name`, `subtitle` y `label` de `djs`. No modifiques la contraseña aquí.
3. Para agregar otra foto, convierte a `.webp` y súbela a `assets/`; agrega un elemento a `gallery` con `image`, `title`, `category` (`djs`, `pico` o `cultura`) y `alt`. Opcionalmente `thumb` para una miniatura.
4. Guarda, sube los cambios a GitHub y Vercel actualizará la página.

**No hay todavía un editor de archivos multimedia en la cabina**: el administrador controla la transmisión, pero las fotografías/nombres se publican desde `site.config.js` en este MVP. Un panel de edición persistente requeriría almacenamiento (p. ej., Vercel Blob + base de datos) y protección de subida.

### LiveKit paso a paso (qué significa el error)

Si aparece «Falta conectar LiveKit en las variables de Vercel», la web funciona visualmente, pero no tiene todavía un proveedor de audio/video en tiempo real.

1. Abre tu proyecto en https://cloud.livekit.io/. Por seguridad, **revoca el par de credenciales anterior y emite uno nuevo**, porque el API Secret se compartió en un chat.
2. Mantén la URL del proyecto `wss://rllturbo-khctqfyw.livekit.cloud`. Copia la **nueva** API Key y el **nuevo** API Secret desde LiveKit.
3. En Vercel abre **tu proyecto → Settings → Environment Variables**, añade **LIVEKIT_URL**, **LIVEKIT_API_KEY** y **LIVEKIT_API_SECRET** en Production; además conserva **ADMIN_USERNAME**, **ADMIN_PASSWORD_HASH** y **SESSION_SECRET** de la versión 2.0.
4. Usa **Deployments → Redeploy** para aplicar las variables y vuelve a entrar a `/admin`.
5. Comprueba `https://TU-DOMINIO/api/live`: debe indicar `"configured":true` cuando estén presentes las tres variables. `"live":false` es normal antes de iniciar la emisión.
6. Pulsa *INICIAR TRANSMISIÓN* con cámara/micrófono autorizados. Comprueba la señal en otro dispositivo entrando a `/#en-vivo`.

¡No publiques el API Secret en GitHub, en HTML/JS, ni en mensajes! Las credenciales privadas de LiveKit **no vienen en el ZIP**, porque deben configurarse exclusivamente en el servidor. Tampoco hay una emisión real verificada sin esas claves. Los DJ deben disponer de derechos suficientes sobre la música que emitan.
