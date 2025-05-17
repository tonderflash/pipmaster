/**
 * WhatsApp Bot con Baileys
 * Archivo principal de la aplicación
 */
import { logger } from './services/whatsapp/baileys.config.js';
import whatsappService from './services/whatsapp/index.js';

/**
 * Inicializa la aplicación
 */
async function init() {
  try {
    logger.info('🚀 Iniciando aplicación...');
    
    // Inicializar servicio de WhatsApp (incluye autenticación y conexión)
    logger.info('📱 Inicializando servicio de WhatsApp...');
    await whatsappService.initialize();
    
    logger.info('✅ Servicio de WhatsApp inicializado correctamente');
    logger.info('🤖 Bot en ejecución. Presiona Ctrl+C para detener.');
    logger.info('🔔 Escanea el código QR cuando aparezca en la terminal.');
  } catch (error) {
    logger.fatal({ error }, 'Error crítico en la aplicación');
    process.exit(1);
  }
}

// Manejo de señales de terminación
const handleShutdown = async (signal) => {
  logger.info(`Recibida señal ${signal}. Cerrando la aplicación...`);
  process.exit(0);
};

// Manejadores de eventos de terminación
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => handleShutdown(signal));
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Iniciar la aplicación
init().catch(error => {
  logger.fatal({ error }, 'Error al iniciar la aplicación');
  process.exit(1);
});
