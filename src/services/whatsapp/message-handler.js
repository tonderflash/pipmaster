// message-handler.js - Manejador de mensajes WhatsApp
import { logger } from "./baileys.config.js";
import { sendMessage } from "./connection.js";
import fetch from "node-fetch"; // Importar fetch para hacer solicitudes HTTP
import { CONFIG } from "../../config/config.js"; // Importar la configuración

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
 * Sanitiza un string para usarlo como ID en URLs (reemplaza @ y . por _)
 * @param {string} id - El string a sanitizar (ej. JID de WhatsApp)
 * @returns {string} El string sanitizado
 */
const sanitizeIdForUrl = (id) => {
  return id.replace(/[@.]/g, "_");
};

/**
 * Envía un mensaje al agente ADK y procesa la respuesta
 * @param {string} chatId - ID del chat de WhatsApp
 * @param {string} sender - Remitente del mensaje
 * @param {string} messageText - Texto del mensaje del usuario
 */
const sendToADKAgent = async (chatId, sender, messageText) => {
  const adkBaseUrl = CONFIG.ADK.BASE_URL;
  const agentName = CONFIG.ADK.AGENT_NAME;

  // Sanitizar sender y chatId para usar en las URLs del servidor ADK
  const sanitizedUserId = sanitizeIdForUrl(sender);
  const sanitizedSessionId = sanitizeIdForUrl(chatId);

  const sessionCreateUrl = `${adkBaseUrl}/apps/${agentName}/users/${sanitizedUserId}/sessions/${sanitizedSessionId}`;
  const runUrl = `${adkBaseUrl}/run`;

  try {
    // 1. Intentar crear o verificar la existencia de la sesión usando IDs sanitizados
    logger.debug(
      `Intentando crear/verificar sesión ADK para user:${sanitizedUserId}, session:${sanitizedSessionId} en: ${sessionCreateUrl}`
    );
    const createSessionResponse = await fetch(sessionCreateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state: {} }), // Puedes pasar un estado inicial si es necesario
    });

    // Manejar casos donde la respuesta NO fue exitosa
    if (!createSessionResponse.ok) {
      const errorText = await createSessionResponse.text();

      // Verificar si es el 400 Bad Request específico con detalle "Session already exists"
      const isSessionAlreadyExistsError =
        createSessionResponse.status === 400 &&
        errorText.includes(
          `"detail":"Session already exists: ${sanitizedSessionId}"`
        );

      if (!isSessionAlreadyExistsError) {
        // Si no es el error específico de sesión existente, loguear como error fatal y salir
        logger.error(
          `Error HTTP inesperado al crear/verificar sesión ADK: ${createSessionResponse.status} - ${errorText}`
        );
        await sendMessage(
          chatId,
          `❌ Error al iniciar sesión con el asistente: ${createSessionResponse.statusText}`
        );
        return; // Salir de la función en caso de error fatal no manejado
      }
      // Si es el error específico de sesión existente con status 400, simplemente continuamos
      logger.debug(
        `Sesión ADK para user:${sanitizedUserId}, session:${sanitizedSessionId} ya existe (Status 400, detalle: Session already exists). Procediendo a enviar mensaje...`
      );
    } else {
      // Si la respuesta fue 200 OK (sesión creada), loguear éxito
      const sessionInfo = await createSessionResponse.json();
      logger.info(
        `Sesión ADK creada/verificada exitosamente para user:${sanitizedUserId}, session:${sanitizedSessionId}: ${JSON.stringify(
          sessionInfo
        )}`
      );
    }

    // --- Continuar aquí para enviar el mensaje al endpoint /run ---
    // Este bloque se ejecutará si la sesión fue creada (200 OK)
    // o si ya existía (409 Conflict o 400 Bad Request con el detalle específico).

    logger.debug(`Enviando mensaje a ADK run endpoint: ${runUrl}`);
    const payload = {
      app_name: agentName,
      user_id: sanitizedUserId,
      session_id: sanitizedSessionId,
      new_message: {
        role: "user",
        parts: [
          {
            text: messageText,
          },
        ],
      },
    };

    const response = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `Error HTTP al comunicarse con el agente ADK (run): ${response.status} - ${errorText}`
      );
      await sendMessage(
        chatId,
        `❌ Error al procesar tu solicitud con el asistente: ${response.statusText}`
      );
      return;
    }

    const events = await response.json();
    logger.info(
      "Respuesta del agente ADK (eventos):\n" + JSON.stringify(events, null, 2)
    );

    // Procesar los eventos para extraer la respuesta final del agente
    // Esto puede variar dependiendo de cómo tu agente ADK estructura su respuesta final
    // Buscaremos el último evento con contenido de texto del rol 'model'
    let finalResponse = "";
    let toolCalls = []; // También recopilar llamadas a herramientas para informar al usuario
    for (const event of events) {
      if (event.content && event.content.parts) {
        for (const part of event.content.parts) {
          if (part.text) {
            finalResponse += part.text + "\n"; // Concatenar texto de todos los eventos de texto
          }
          if (part.functionCall) {
            toolCalls.push(part.functionCall);
          }
        }
      }
    }

    finalResponse = finalResponse.trim(); // Limpiar espacios extra al inicio/final

    if (finalResponse) {
      await sendMessage(chatId, finalResponse);
      logger.info(`Respuesta de texto del agente ADK enviada a ${chatId}`);
    } else if (toolCalls.length > 0) {
      // Si no hay texto final, pero hubo llamadas a herramientas
      const toolCallMessages = toolCalls
        .map(
          (call) => `\`\`\`tool_code\n${JSON.stringify(call, null, 2)}\n\`\`\``
        )
        .join("\n");
      await sendMessage(
        chatId,
        "El asistente está usando herramientas:\n" + toolCallMessages
      );
      logger.info(
        `Mensaje de llamada a herramientas del agente ADK enviado a ${chatId}`
      );
    } else {
      await sendMessage(
        chatId,
        "El asistente procesó tu solicitud, pero no generó una respuesta de texto ni llamó a herramientas."
      );
      logger.warn(
        `Agente ADK no generó respuesta de texto ni llamadas a herramientas para ${chatId}`
      );
    }
  } catch (error) {
    logger.error("Error general en sendToADKAgent:", error);
    await sendMessage(
      chatId,
      "❌ Ocurrió un error al procesar tu solicitud con el asistente."
    );
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

    const trimmedMessage = messageText.trim();

    // Verificar si el mensaje comienza con el prefijo configurado
    if (trimmedMessage.startsWith(CONFIG.PREFIX)) {
      // Remover el prefijo para obtener el resto del comando/mensaje
      const commandOrQuery = trimmedMessage
        .substring(CONFIG.PREFIX.length)
        .trim();

      // Verificar si es el comando para el agente ADK (!db)
      if (commandOrQuery.startsWith("db ")) {
        // Extraer la consulta después de "db "
        const dbQuery = commandOrQuery.substring(3).trim();
        if (dbQuery) {
          logger.info(`Enviando consulta DB a agente ADK: ${dbQuery}`);
          await sendToADKAgent(chatId, sender, dbQuery);
        } else {
          await sendMessage(
            chatId,
            `Por favor, especifica tu consulta después de \`${CONFIG.PREFIX}db\`.`
          );
        }
      } else if (commandOrQuery === "ping" || commandOrQuery === "ayuda") {
        // Manejar comandos internos que usan el prefijo
        logger.info(`Comando recibido: ${trimmedMessage}`); // Log el comando completo
        await handleCommand(chatId, sender, trimmedMessage); // Pasar el mensaje completo a handleCommand si es necesario (handleCommand lo procesa también)
      } else {
        // Ignorar otros comandos con prefijo no reconocidos
        logger.debug(
          `Comando con prefijo no reconocido, ignorando: ${trimmedMessage}`
        );
      }
    } else {
      // Ignorar mensajes que no empiezan con el prefijo
      logger.debug(`Mensaje sin prefijo, ignorando: ${trimmedMessage}`);
    }
  } catch (error) {
    logger.error("Error al procesar mensaje:", error);
  }
};

/**
 * Maneja comandos (mantener comandos como ping y ayuda, eliminar lógica de !db)
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

// Utilidad para pausar entre mensajes
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  handleMessages,
  extractMessageText,
  handleCommand,
  showHelp,
  CONFIG,
};
