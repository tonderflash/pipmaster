import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { fileURLToPath } from "url";

// Obtener directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FOLDER = path.join(__dirname, "auth_info_baileys");

// Asegurar que existe el directorio de auth
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

// Logger
const logger = pino({
  level: process.env.NODE_ENV === "production" ? "warn" : "info",
});

// Variables
let sock = null;
let authState = null;
let saveCreds = null;

// Función para iniciar WhatsApp
export async function startWhatsApp() {
  try {
    // Obtener estado de autenticación
    const { state, saveCreds: saveCredsFunc } = await useMultiFileAuthState(
      AUTH_FOLDER
    );
    authState = state;
    saveCreds = saveCredsFunc;

    // Obtener la última versión de Baileys
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Usando versión de Baileys: ${version.join(".")}`);

    try {
      // Crear el socket con configuración actualizada
      sock = makeWASocket({
        version,
        auth: state,
        browser: ["PipMaster", "Chrome", "1.0.0"],
        logger,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
        connectTimeoutMs: 60000,
        qrTimeout: 60000,
        defaultQueryTimeoutMs: 30000,
        generateHighQualityLinkPreview: true,
      });

      // Manejar eventos de credenciales
      sock.ev.on("creds.update", saveCreds);

      // Manejar cambios de conexión
      sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Mostrar QR code cuando esté disponible
        if (qr) {
          console.log("\n🔑 Escanea este código QR con WhatsApp:");
          qrcode.generate(qr, { small: false });
          console.log(
            "\n📱 Abre WhatsApp > Dispositivos vinculados > Vincular un dispositivo"
          );
        }

        // Estado de conexión
        if (connection) {
          console.log(`Estado de conexión: ${connection}`);
        }

        // Manejar desconexión
        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`Conexión cerrada. Código: ${statusCode}`);

          if (shouldReconnect) {
            console.log("Intentando reconectar...");
            // Si hay error de autenticación, limpiar archivos
            if (statusCode === 401) {
              console.log("Error de autenticación. Limpiando credenciales...");
              try {
                // Eliminar archivos de autenticación para forzar QR nuevo
                const authFiles = fs.readdirSync(AUTH_FOLDER);
                authFiles.forEach((file) => {
                  try {
                    fs.unlinkSync(path.join(AUTH_FOLDER, file));
                  } catch (e) {}
                });
              } catch (e) {
                console.error("Error al limpiar credenciales:", e);
              }
            }

            // Reconectar después de un breve retraso
            setTimeout(startWhatsApp, 5000);
          } else {
            console.log("Sesión cerrada. No se reconectará.");
          }
        } else if (connection === "open") {
          console.log("✅ Conexión establecida con WhatsApp!");
        }
      });

      // Manejar mensajes entrantes
      sock.ev.on("messages.upsert", async (m) => {
        // Solo mostrar información esencial
        console.log(
          `\n[WhatsApp] Evento: ${m.type} | Mensajes: ${
            m.messages?.length || 0
          }`
        );

        if (m.type === "notify") {
          try {
            // Procesar mensajes normalmente, sin logs extra
            const { handleMessages } = await import("./message-handler.js");
            await handleMessages(m);
          } catch (error) {
            console.error("Error al procesar mensaje:", error);
          }
        }
      });

      return sock;
    } catch (error) {
      logger.error({ error }, "Error al crear el socket de WhatsApp");
      throw error;
    }
  } catch (error) {
    console.error("Error al iniciar WhatsApp:", error);
    throw error;
  }
}

// Enviar mensaje
export async function sendMessage(jid, text, options = {}) {
  if (!sock) {
    throw new Error("No hay conexión activa con WhatsApp");
  }

  try {
    return await sock.sendMessage(jid, { text, ...options });
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
    throw error;
  }
}

// Cerrar conexión
export async function closeConnection() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      console.warn("Error al cerrar sesión:", e);
    }
    sock = null;
  }
}

// Exportar todo lo necesario
export default {
  startWhatsApp,
  sendMessage,
  closeConnection,
};
