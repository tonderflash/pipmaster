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
- Python 3.x
- El framework ADK (probablemente instalado globalmente o accesible)

## Instalación

1. Clona este repositorio:

   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd [NOMBRE_DEL_REPOSITORIO]
   ```

2. Instala las dependencias de Node.js:

   ```bash
   npm install
   ```

   o con yarn:

   ```bash
   yarn
   ```

3. Navega al directorio del agente de Python:

   ```bash
   cd my_whatsapp_agent
   ```

4. Instala las dependencias de Python:
   ```bash
   pip install -r requirements.txt
   ```

## Uso

Para ejecutar el bot, necesitas iniciar tanto el bot de WhatsApp (Node.js) como el agente de Python (ADK).

### Ejecutar el Bot de WhatsApp (Node.js)

Para ejecutar la parte que interactúa con WhatsApp, tienes dos opciones desde el directorio raíz del proyecto:

1.  **Modo de producción:**
    Inicia el bot con el siguiente comando:

    ```bash
    npm start
    ```

    Este comando ejecuta el bot de forma normal.

2.  **Modo de desarrollo:**
    Inicia el bot con recarga automática (usando nodemon):
    ```bash
    npm run dev
    ```
    Este modo es útil durante el desarrollo, ya que el bot se reiniciará automáticamente al detectar cambios en los archivos.

Después de iniciar el bot, deberás escanear el código QR que aparecerá en la terminal con tu teléfono. Sigue estos pasos: WhatsApp > Menú de los tres puntos > Dispositivos vinculados > Vincular un dispositivo.

Una vez escaneado el código, el bot estará listo para recibir comandos (procesados por el agente ADK).

### Ejecutar el Agente de Python (ADK)

El agente de Python `@my_whatsapp_agent` es responsable de procesar las consultas utilizando las herramientas configuradas (como IBM Watson, búsquedas web, etc.). Para ejecutarlo, navega al directorio `my_whatsapp_agent` y utiliza el comando ADK:

```bash
cd my_whatsapp_agent
adk run .
```

Asegúrate de que el framework ADK esté instalado y accesible en tu entorno.

## Estructura del proyecto

La arquitectura del proyecto sigue un diseño modular para separar las responsabilidades. Los componentes clave incluyen:

- `src/`: Contiene el código fuente principal del bot de WhatsApp (Node.js).
  - `index.js`: Es el punto de entrada de la aplicación donde se inicializa el bot.
  - `config/`: Almacena archivos de configuración global (`config.js`), incluyendo ajustes para la conexión ADK.
  - `services/`: Contiene la lógica de negocio y la integración con servicios externos.
    - `whatsapp/`: Maneja la conexión con WhatsApp utilizando Baileys, la autenticación y el manejo de mensajes entrantes.
    - `ibm/`: Contiene el cliente para interactuar con la API de IBM Watson.
  - `utils/`: Incluye utilidades generales, como el manejo de variables de entorno.
- `my_whatsapp_agent/`: Directorio que contiene el código del agente de Python basado en el framework ADK.
  - `agent.py`: Implementación principal del agente ADK.
  - `tools/`: Contiene las definiciones de las herramientas que utiliza el agente.
  - `requirements.txt`: Lista de dependencias de Python para el agente.
- `auth_info_baileys/`: Directorio generado automáticamente para almacenar las credenciales de sesión de WhatsApp de forma segura.
- `.env`: Archivo para configurar variables de entorno sensibles, como la API Key de IBM Watson y potencialmente configuraciones para el agente ADK.
- `package.json`: Define las dependencias de Node.js del proyecto y los scripts para ejecutar el bot de WhatsApp.

Esta estructura facilita la organización del código, la mantenibilidad y la escalabilidad del proyecto.

## Resolución de problemas comunes

### Error al ejecutar el agente de Python (comando `adk run .`)

Si encuentras un error indicando que no se encuentra el módulo `my_whatsapp_agent` o alguna de sus dependencias, es probable que tu intérprete de Python o el entorno virtual no estén configurados correctamente en tu PATH, o que el framework ADK no pueda localizar las dependencias.

Para solucionarlo, asegúrate de:

1.  Estar en el directorio `my_whatsapp_agent` cuando ejecutes `adk run .`.
2.  Haber activado el entorno virtual de Python si estás utilizando uno (`source .venv/bin/activate` o similar, dependiendo de tu sistema operativo y shell).
3.  Que el directorio que contiene el ejecutable `adk` esté en tu PATH.
4.  Que las dependencias de Python listadas en `requirements.txt` estén correctamente instaladas en el entorno que está utilizando ADK.

Exportar el directorio actual al `PYTHONPATH` _a veces_ puede ayudar en ciertos entornos, aunque no es la solución estándar y puede variar dependiendo de cómo esté configurado ADK:

```bash
export PYTHONPATH=$PYTHONPATH:.
adk run .
```

Sin embargo, la forma recomendada es asegurarse de que ADK se ejecute en un entorno donde las dependencias del proyecto estén disponibles y el agente sea reconocible (usualmente manejado por el propio framework ADK al ejecutar `adk run .` en el directorio del agente).

## Seguridad

- Las credenciales de sesión se almacenan localmente en el directorio `auth_info_baileys/`.
- Las API keys de IBM Watson se guardan en el archivo `.env`.
- No compartas el contenido de estos archivos con nadie.
- Asegúrate de incluir `.env` en tu `.gitignore` para evitar compartir credenciales.

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Nota:** Este proyecto no está afiliado a WhatsApp ni a Meta. Úsalo bajo tu propio riesgo y asegúrate de cumplir con los Términos de Servicio de WhatsApp.
