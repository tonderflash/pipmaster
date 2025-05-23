/**
 * IBM Watson Service
 */
import axios from "axios";
import { CONFIG, HEADERS } from "../../config/config.js";
import "dotenv/config";

// Token cache
let ibmToken = "";

/**
 * Gets an IBM authentication token
 * @returns {Promise<string>} Authentication token
 */
async function getIBMToken() {
  try {
    if (!process.env.IBM_API_KEY) {
      console.error(
        "ERROR: La variable de entorno IBM_API_KEY no está definida."
      );
      throw new Error("La variable de entorno IBM_API_KEY no está definida.");
    }
    console.log("Obteniendo token de IBM...");
    const response = await axios({
      method: "post",
      url: CONFIG.IBM.AUTH_URL,
      data: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${process.env.IBM_API_KEY}`,
      headers: HEADERS.FORM,
      timeout: 10000, // 10 seconds
    });

    if (!response.data || !response.data.access_token) {
      throw new Error("No se recibió un token válido de IBM");
    }

    ibmToken = response.data.access_token;
    return ibmToken;
  } catch (error) {
    console.error("Error al obtener token de IBM:", error.message);
    if (error.response) {
      console.error("Detalles del error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    throw error;
  }
}

/**
 * Parses Server-Sent Events (SSE) response
 * @param {string} responseText - Raw SSE response text
 * @returns {Array} Processed events
 */
function parseSSE(responseText) {
  const lines = responseText.split("\n").filter((line) => line.trim() !== "");
  const events = [];
  let currentEvent = {};

  for (const line of lines) {
    if (line.startsWith("id:")) {
      if (currentEvent.id || currentEvent.event || currentEvent.data) {
        events.push({ ...currentEvent });
        currentEvent = {};
      }
      currentEvent.id = line.substring(3).trim();
    } else if (line.startsWith("event:")) {
      currentEvent.event = line.substring(6).trim();
    } else if (line.startsWith("data:")) {
      const data = line.substring(5).trim();
      try {
        currentEvent.data = JSON.parse(data);
      } catch (e) {
        currentEvent.data = data;
      }
    }
  }

  if (currentEvent.id || currentEvent.event || currentEvent.data) {
    events.push(currentEvent);
  }

  return events;
}

/**
 * Extracts content from IBM response events
 * @param {Array} events - Parsed SSE events
 * @returns {Object} Processed content
 */
function extractContent(events) {
  let fullContent = "";
  let toolCalls = [];
  let toolResults = [];

  for (const event of events) {
    if (event.data && event.data.choices && event.data.choices[0].delta) {
      const delta = event.data.choices[0].delta;

      if (delta.content) fullContent += delta.content;
      if (delta.tool_calls) toolCalls = delta.tool_calls;
      if (delta.tool_results) toolResults = delta.tool_results;
    }
  }

  // Process tool calls
  const processedToolCalls = toolCalls
    .map((tc) => {
      try {
        return tc.function
          ? {
              name: tc.function.name,
              arguments: tc.function.arguments
                ? JSON.parse(tc.function.arguments)
                : {},
            }
          : null;
      } catch (e) {
        console.error("Error al procesar tool_call:", e);
        return null;
      }
    })
    .filter(Boolean);

  return {
    content: fullContent,
    toolCalls: processedToolCalls,
    toolResults: toolResults,
    rawEvents: events,
  };
}

/**
 * Sends a prompt to IBM Watson
 * @param {string} prompt - User prompt to send to IBM
 * @returns {Promise<Object>} IBM Watson response
 */
export async function sendToIBM(prompt) {
  try {
    // Get token if not available
    if (!ibmToken) {
      ibmToken = await getIBMToken();
    }

    // Prepare request payload
    const payload = {
      messages: [
        {
          content: prompt,
          role: "user",
        },
      ],
      stream: false,
    };

    // Send request to IBM Watson
    const response = await axios({
      method: "post",
      url: CONFIG.IBM.SCORING_URL,
      data: payload,
      headers: {
        ...HEADERS.STREAM,
        Authorization: `Bearer ${ibmToken}`,
      },
      timeout: CONFIG.IBM.TIMEOUT,
    });

    // Procesa la respuesta normal (no streaming)
    const result = response.data;
    // Si la respuesta tiene choices y content, devuélvelo en el mismo formato que antes
    if (
      result &&
      result.choices &&
      result.choices[0] &&
      result.choices[0].message
    ) {
      return { content: result.choices[0].message.content };
    }
    // Si no, devuelve todo el objeto
    return { content: JSON.stringify(result) };
  } catch (error) {
    console.error("Error en sendToIBM:", error.message);

    // Token refresh if unauthorized
    if (error.response && error.response.status === 401) {
      try {
        ibmToken = await getIBMToken();
        if (ibmToken) return sendToIBM(prompt);
      } catch (refreshError) {
        console.error("Error al renovar el token:", refreshError);
      }
    }

    throw error;
  }
}

/**
 * Parsea la respuesta cruda de IBM (SSE o JSON) y devuelve un array de steps/mensajes.
 * @param {string|object} raw - Respuesta cruda de IBM
 * @returns {Array} Array de steps/mensajes
 */
export function parseIbmSteps(raw) {
  // Si es un objeto, intenta extraer el mensaje principal
  if (typeof raw === "object") {
    if (
      raw.choices &&
      raw.choices[0] &&
      raw.choices[0].message &&
      raw.choices[0].message.content
    ) {
      return [raw.choices[0].message.content];
    }
    return [JSON.stringify(raw, null, 2)];
  }
  // Si es string JSON escapado, desescapa recursivamente
  let s = raw;
  let count = 0;
  while (
    typeof s === "string" &&
    s.trim().startsWith('"') &&
    s.trim().endsWith('"') &&
    count < 3
  ) {
    try {
      s = JSON.parse(s);
      count++;
    } catch (e) {
      break;
    }
  }
  // Si es string y parece SSE
  if (typeof s === "string" && s.includes("id:") && s.includes("event:")) {
    const events = parseSSE(s);
    // Agrupa todos los fragmentos de texto en uno solo
    let textContent = "";
    const steps = [];
    for (const ev of events) {
      if (
        ev.data &&
        ev.data.choices &&
        ev.data.choices[0] &&
        ev.data.choices[0].delta
      ) {
        const delta = ev.data.choices[0].delta;
        if (delta.content) textContent += delta.content;
        // Si es tool call, muestra el nombre y argumentos
        if (delta.tool_calls) {
          for (const tool of delta.tool_calls) {
            if (tool.function) {
              steps.push(
                `Tool: ${tool.function.name}\nArgs: ` +
                  JSON.stringify(
                    tool.function.arguments
                      ? JSON.parse(tool.function.arguments)
                      : {},
                    null,
                    2
                  )
              );
            }
          }
        }
        // Si es resultado de tool
        if (delta.name && delta.content) {
          steps.push(`Resultado de ${delta.name}:\n` + delta.content);
        }
      }
    }
    // Si hay texto, lo agrego como primer mensaje
    if (textContent.trim()) steps.unshift(textContent.trim());
    return steps;
  }
  // Si no, devuelve el string limpio
  return [typeof s === "string" ? s : raw];
}
