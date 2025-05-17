export function formatIbmResponse(raw) {
  let text = raw;
  let formatted = "";

  // Intenta detectar y desescapar JSON doblemente escapado
  function tryParseDeepJson(str) {
    let val = str;
    let lastVal;
    let count = 0;
    // Intenta parsear recursivamente hasta que no cambie
    while (typeof val === "string" && count < 5) {
      try {
        lastVal = val;
        val = JSON.parse(val);
        count++;
      } catch (e) {
        break;
      }
    }
    return typeof val === "object" ? val : null;
  }

  // Busca todos los posibles bloques JSON (escapados o no)
  const regex = /("{.*?}")|({.*?})/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    let jsonStr = match[0];
    let jsonObj = tryParseDeepJson(jsonStr);
    if (jsonObj) {
      // Recorta campos largos
      if (
        jsonObj.content &&
        typeof jsonObj.content === "string" &&
        jsonObj.content.length > 500
      ) {
        jsonObj.content = jsonObj.content.slice(0, 500) + "...";
      }
      formatted += "```json\n" + JSON.stringify(jsonObj, null, 2) + "\n```\n";
      text = text.replace(match[0], "").trim();
    }
  }

  // Limpia saltos de línea y espacios extra
  text = text.replace(/\n{2,}/g, "\n").replace(/^\s+|\s+$/g, "");

  // Si no hay nada de texto, pero sí JSON, solo muestra el JSON
  if (!text && formatted) return formatted.trim();
  // Si hay ambos, muestra JSON y texto limpio
  if (formatted) return (formatted + "\n" + text).trim();
  // Si solo hay texto, muestra el texto limpio
  return text || "[sin respuesta]";
}
