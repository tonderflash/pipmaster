// message-handler.js - Manejador de mensajes WhatsApp
import { logger } from "./baileys.config.js";
import { sendMessage } from "./connection.js";
import { sendToIBM } from "../ibm/ibm.service.js";
import { formatIbmResponse } from "../ibm/formatter/index.js";

// Configuración
const CONFIG = {
  PREFIX: "!", // Prefijo para comandos
  MAX_MESSAGES: 1000, // Máximo de mensajes a mantener en caché
  CLEANUP_THRESHOLD: 100, // Cantidad de mensajes a limpiar cuando se alcanza el máximo
};

// Almacenamiento en memoria de mensajes procesados
const processedMessages = new Set();

/**
 * Extrae el texto de un mensaje
 * @param {Object} message - Objeto de mensaje de WhatsApp
 * @returns {string} Texto del mensaje o cadena vacía si no es de texto
 */
export const extractMessageText = (message) => {
  try {
    // Primero intentar obtener el texto del mensaje
    if (message.message?.conversation) {
      return message.message.conversation;
    }
    if (message.message?.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }

    // Si no se pudo obtener el texto directamente, intentar con messageStubParameters
    if (Array.isArray(message.messageStubParameters)) {
      return message.messageStubParameters.join(" ");
    }

    // Si aún no se pudo obtener el texto, intentar con pushName
    if (message.pushName) {
      return `[Mensaje de ${message.pushName}]`;
    }

    // Último recurso: convertir el mensaje a string
    return JSON.stringify(message);
  } catch (error) {
    logger.error("Error al extraer texto del mensaje:", error);
    return "";
  }
};

/**
 * Manejador principal de mensajes
 * @param {Object} messagesData - Datos de mensajes de WhatsApp
 */
export const handleMessages = async (messagesData) => {
  try {
    if (
      !messagesData ||
      !messagesData.messages ||
      !messagesData.messages.length
    ) {
      logger.debug("No hay mensajes para procesar");
      return;
    }

    const message = messagesData.messages[0];
    const { key } = message;
    const chatId = key.remoteJid;
    const messageId = key.id;
    const sender = key.participant || key.remoteJid;
    const isGroup = chatId.endsWith("@g.us");

    // Evitar procesar mensajes duplicados
    if (processedMessages.has(messageId)) {
      return;
    }

    // Registrar mensaje para no procesarlo de nuevo
    processedMessages.add(messageId);

    // Limpiar mensajes antiguos si se alcanza el límite
    if (processedMessages.size > CONFIG.MAX_MESSAGES) {
      const messagesToRemove = Array.from(processedMessages).slice(
        0,
        CONFIG.CLEANUP_THRESHOLD
      );
      messagesToRemove.forEach((msg) => processedMessages.delete(msg));
    }

    // Extraer el texto del mensaje
    const messageText = extractMessageText(message);
    logger.debug("Mensaje recibido:", { chatId, sender, text: messageText });

    // Procesar el comando
    if (messageText.trim().startsWith(CONFIG.PREFIX)) {
      logger.info(`Comando recibido: ${messageText.trim().split(" ")[0]}`);
      await handleCommand(chatId, sender, messageText);
    }
  } catch (error) {
    logger.error("Error al procesar mensaje:", error);
  }
};

/**
 * Maneja comandos
 * @param {string} chatId - ID del chat
 * @param {string} sender - Remitente del mensaje
 * @param {string} text - Texto del comando
 */
const handleCommand = async (chatId, sender, text) => {
  try {
    if (text.toLowerCase().startsWith("!ping")) {
      await sendMessage(chatId, "🏓 Pong!");
      logger.info(`Respondido a ${sender} en ${chatId}`);
    }
    if (text.toLowerCase().startsWith("!db")) {
      const prompt = text.slice(3).trim();
      if (!prompt) {
        await sendMessage(chatId, "Usa: !db <tu pregunta>");
        return;
      }
      try {
        const ibmResult = await sendToIBM(prompt);
        const respuesta = formatIbmResponse(ibmResult.content || "[no hay na]");
        await sendMessage(chatId, respuesta);
      } catch (err) {
        logger.error("Error al consultar IBM:", err);
        logger.info(`IBM_API_KEY: ${process.env.IBM_API_KEY}`);

        await sendMessage(
          chatId,
          "❌ Error al consultar IBM: " + (err.message || err)
        );
      }
      logger.info(`Comando DB respondido a ${sender} en ${chatId}`);
    }
    if (text.toLowerCase().startsWith("!ayuda")) {
      await showHelp(chatId);
      logger.info(`Ayuda enviada a ${sender} en ${chatId}`);
    }
  } catch (error) {
    logger.error("Error al manejar comando:", error);
  }
};

/**
 * Muestra el mensaje de ayuda
 * @param {string} chatId - ID del chat
 */
async function showHelp(chatId) {
  const helpText = `
🤖 *Comandos disponibles* 🤖\n
*${CONFIG.PREFIX}ping* - Comprueba si el bot está activo
*${CONFIG.PREFIX}ayuda* - Muestra este mensaje de ayuda
`;

  await sendMessage(chatId, helpText);
}

export default {
  handleMessages,
  extractMessageText,
  handleCommand,
  showHelp,
  CONFIG,
};
