import pkg from '@whiskeysockets/baileys';
const { useMultiFileAuthState } = pkg;
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

// Configuración básica del logger
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Estado de autenticación
let authState = null;

/**
 * Inicializa el estado de autenticación
 */
export const initAuthState = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    authState = { state, saveCreds };
    logger.info('Estado de autenticación inicializado');
    return authState;
  } catch (error) {
    logger.error({ error }, 'Error al inicializar el estado de autenticación');
    throw error;
  }
}

// Opciones de conexión
export const socketConfig = {
  printQRInTerminal: true,
  auth: authState?.state || {},
  logger: logger.child({ service: 'whatsapp' }),
  browser: ['PipMaster', 'Chrome', '1.0.0'],
  markOnlineOnConnect: true,
  syncFullHistory: false,
  connectTimeoutMs: 20000,
  keepAliveIntervalMs: 15000,
  qrTimeout: 30000,
};

/**
 * Obtiene el estado de autenticación
 * @returns {Object} Estado de autenticación
 */
export const getAuthState = () => {
  if (!authState) {
    throw new Error('El estado de autenticación no ha sido inicializado');
  }
  return authState;
};

/**
 * Obtiene la función para guardar credenciales
 * @returns {Function} Función para guardar credenciales
 */
export const getSaveCreds = () => {
  if (!authState) {
    throw new Error('El estado de autenticación no ha sido inicializado');
  }
  return authState.saveCreds;
};

/**
 * Limpieza de recursos
 * @param {Object} sock - Socket de WhatsApp a cerrar (opcional)
 */
export const cleanup = async (sock = null) => {
  try {
    logger.info('Cleaning up resources...');
    
    // Si hay un socket activo, intentar desconectarlo correctamente
    if (sock) {
      try {
        // Cerrar la conexión si existe
        if (typeof sock.logout === 'function') {
          logger.info('Cerrando sesión de WhatsApp...');
          await sock.logout();
        } else if (typeof sock.end === 'function') {
          logger.info('Finalizando conexión...');
          await sock.end();
        } else if (typeof sock.close === 'function') {
          logger.info('Cerrando conexión...');
          await sock.close();
        }
      } catch (socketError) {
        logger.warn({ error: socketError }, 'Error al cerrar el socket');
      }
    }
    
    // Guardar estado final de autenticación si existe
    if (authState && typeof authState.saveCreds === 'function') {
      try {
        await authState.saveCreds();
        logger.info('Credenciales guardadas correctamente');
      } catch (credError) {
        logger.warn({ error: credError }, 'Error al guardar credenciales');
      }
    }
    
    logger.info('Cleanup completed');
  } catch (error) {
    logger.error({ error }, 'Error during cleanup');
    throw error;
  }
};

export default {
  getAuthState,
  socketConfig,
  logger,
  cleanup,
};
