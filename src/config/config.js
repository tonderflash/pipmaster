/**
 * Application configuration
 */

export const CONFIG = {
  // Prefix for WhatsApp commands
  PREFIX: "!",
  // Máximo de mensajes a mantener en caché
  MAX_MESSAGES: 1000,
  // Cantidad de mensajes a limpiar cuando se alcanza el máximo
  CLEANUP_THRESHOLD: 100,

  // IBM Watson configuration (mantener por ahora, se eliminará después de la migración)
  IBM: {
    SCORING_URL:
      "https://us-south.ml.cloud.ibm.com/ml/v4/deployments/e92c5985-f54c-4dc9-9a90-49001d1e8c13/ai_service_stream?version=2021-05-01",
    AUTH_URL: "https://iam.cloud.ibm.com/identity/token",
    TIMEOUT: 60000, // 60 seconds
  },

  // Configuración del agente ADK
  ADK: {
    BASE_URL: "http://0.0.0.0:8000", // URL base del servidor ADK local
    AGENT_NAME: "my_whatsapp_agent", // Nombre de tu agente ADK (nombre del directorio)
  },

  // Configuración de conexión y reconexión
  CONNECTION: {
    MAX_RECONNECTION_ATTEMPTS: 3,
    RECONNECTION_DELAY: 5000, // 5 segundos
    AUTO_RECONNECT: true,
    TIMEOUT: 60000, // 60 segundos
  },
};

// Common HTTP headers (mantener por ahora)
export const HEADERS = {
  JSON: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  STREAM: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
  FORM: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  },
};

// Response messages (mantener por ahora)
export const MESSAGES = {
  CONNECTED: "✅ ¡Conectado a WhatsApp exitosamente!",
  PING: "¡Pong! 🏓",
};
