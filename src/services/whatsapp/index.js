// Punto de entrada para el servicio de WhatsApp
import { startWhatsApp } from "./connection.js";
import { logger } from "./baileys.config.js";

/**
 * Inicializa el servicio de WhatsApp
 * @returns {Promise<void>}
 */
export const initializeWhatsAppService = async () => {
  try {
    // En la nueva implementación, los manejadores de mensajes están integrados
    // en la configuración del socket en connection.js

    // Inicia la conexión con WhatsApp
    const socket = await startWhatsApp();

    // En este punto, el socket ya está configurado y escuchando eventos
    logger.info("✅ Servicio de WhatsApp inicializado");
  } catch (error) {
    logger.error({ error }, "Error al inicializar el servicio de WhatsApp");
    throw error;
  }
};

export default {
  initialize: initializeWhatsAppService,
};
