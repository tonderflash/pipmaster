# WhatsApp Bot con Baileys e IBM Watson

Un bot de WhatsApp sencillo construido con la biblioteca Baileys que se integra con IBM Watson para procesar consultas.

## Características

- Conexión segura a WhatsApp Web usando Baileys
- Sistema de comandos con prefijo `!`
- Comandos incluidos:
  - `!ping` - Responde con "Pong! 🏓"
  - `!ibm [consulta]` - Envía una consulta a IBM Watson
- Integración con IBM Watson para procesamiento de lenguaje natural
- Almacenamiento seguro de credenciales
- Reconexión automática
- Arquitectura limpia, modular y escalable

## Requisitos

- Node.js 16.x o superior
- npm o yarn
- Teléfono móvil con WhatsApp
- API Key de IBM Watson (configurable en el archivo `.env`)

## Instalación

1. Clona este repositorio:
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd [NOMBRE_DEL_REPOSITORIO]
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```
   o con yarn:
   ```bash
   yarn
   ```

## Uso

1. Inicia el bot:
   ```bash
   npm start
   ```
   o en modo desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

2. Escanea el código QR que aparece en la terminal con tu teléfono (WhatsApp > Menú de los tres puntos > Dispositivos vinculados > Vincular un dispositivo).

3. Una vez escaneado el código, el bot estará listo para recibir comandos.

## Comandos

- `!ping` - El bot responde con "Pong! 🏓"
- `!ibm [consulta]` - Envía una consulta a IBM Watson y devuelve su respuesta

## Estructura del proyecto

- `src/` - Código fuente principal
  - `index.js` - Punto de entrada de la aplicación
  - `config/` - Archivos de configuración
    - `config.js` - Configuración general de la aplicación
  - `services/` - Servicios de la aplicación
    - `whatsapp/` - Servicios relacionados con WhatsApp
      - `baileys.config.js` - Configuración de Baileys
      - `connection.js` - Manejo de conexión con WhatsApp
      - `message-handler.js` - Manejador de mensajes entrantes
    - `ibm/` - Servicios relacionados con IBM Watson
      - `ibm.service.js` - Cliente para comunicación con IBM Watson
  - `utils/` - Utilidades
    - `env.js` - Utilidades para manejo de variables de entorno
- `auth_info_baileys/` - Directorio donde se guardan las credenciales de sesión (se crea automáticamente)
- `.env` - Archivo de variables de entorno
- `package.json` - Configuración del proyecto y dependencias

## Seguridad

- Las credenciales de sesión se almacenan localmente en el directorio `auth_info_baileys/`.
- Las API keys de IBM Watson se guardan en el archivo `.env`.
- No compartas el contenido de estos archivos con nadie.
- Asegúrate de incluir `.env` en tu `.gitignore` para evitar compartir credenciales.

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Nota:** Este proyecto no está afiliado a WhatsApp ni a Meta. Úsalo bajo tu propio riesgo y asegúrate de cumplir con los Términos de Servicio de WhatsApp.
