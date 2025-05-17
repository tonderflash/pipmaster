/**
 * Application configuration
 */

export const CONFIG = {
  // Prefix for WhatsApp commands
  PREFIX: "!",

  // IBM Watson configuration
  IBM: {
    SCORING_URL:
      "https://us-south.ml.cloud.ibm.com/ml/v4/deployments/c91cf438-c9f0-4682-9663-fd06220cfb77/ai_service_stream?version=2021-05-01",
    AUTH_URL: "https://iam.cloud.ibm.com/identity/token",
    TIMEOUT: 60000, // 60 seconds
  },

  // Configuración de conexión y reconexión
  CONNECTION: {
    MAX_RECONNECTION_ATTEMPTS: 3,
    RECONNECTION_DELAY: 5000, // 5 segundos
    AUTO_RECONNECT: true,
    TIMEOUT: 60000, // 60 segundos
  },
};

// Common HTTP headers
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

// Response messages
export const MESSAGES = {
  CONNECTED: "✅ ¡Conectado a WhatsApp exitosamente!",
  PING: "¡Pong! 🏓",
};
