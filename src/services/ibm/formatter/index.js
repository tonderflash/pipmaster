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

export function formatIbmSteps(steps) {
  // Filtra steps duplicados manteniendo el orden
  const uniqueSteps = [];
  const seen = new Set();
  for (const step of steps) {
    const key = typeof step === "string" ? step.trim() : JSON.stringify(step);
    if (!seen.has(key)) {
      uniqueSteps.push(step);
      seen.add(key);
    }
  }
  // Separar y formatear cada step
  let formatted = [];
  let lastToolResultNormalized = null;
  // Utilidad para normalizar strings (quita comillas, espacios y escapes)
  function normalizeStr(str) {
    if (typeof str !== "string") return null; // Solo normaliza strings
    return str
      .replace(/^"|"$/g, "")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\s+/g, "")
      .trim();
  }
  for (let step of uniqueSteps) {
    let currentStepNormalized = normalizeStr(step);
    // Si el step actual es idéntico al último resultado de tool (normalizado), lo omitimos
    if (
      lastToolResultNormalized &&
      currentStepNormalized === lastToolResultNormalized
    ) {
      continue; // Omite este step duplicado
    }
    // Si el step contiene JSON seguido de texto, sepáralos
    const jsonTextMatch = step.match(/^(["']?{.*}["']?)([\s\S]*)$/);
    if (jsonTextMatch) {
      let jsonBlock = jsonTextMatch[1];
      let explanation = jsonTextMatch[2] ? jsonTextMatch[2].trim() : "";
      // Intenta parsear el bloque JSON (quitando comillas si es necesario)
      let jsonStr = jsonBlock.replace(/^"|"$/g, "");
      try {
        const obj = JSON.parse(jsonStr);
        formatted.push("```json\n" + JSON.stringify(obj, null, 2) + "\n```");
        lastToolResultNormalized = normalizeStr(jsonStr);
      } catch (e) {
        formatted.push(jsonBlock);
        lastToolResultNormalized = normalizeStr(jsonStr);
      }
      // Si hay explicación después del JSON, la agrego como texto limpio
      if (explanation) {
        let cleanText = explanation.replace(/\n{2,}/g, "\n").trim();
        let cleanTextNorm = normalizeStr(cleanText);
        // Asegurar que la explicación no empiece con el resultado del tool
        if (
          lastToolResultNormalized &&
          typeof lastToolResultNormalized === "string" &&
          cleanTextNorm.startsWith(lastToolResultNormalized)
        ) {
          cleanText = cleanText
            .slice(normalizeStr(lastToolResult).length)
            .trim();
        }
        if (cleanText) {
          formatted.push(cleanText);
        }
      }
      continue;
    }
    // Si es JSON puro
    if (
      typeof step === "string" &&
      step.trim().startsWith("{") &&
      step.trim().endsWith("}")
    ) {
      try {
        const obj = JSON.parse(step);
        formatted.push("```json\n" + JSON.stringify(obj, null, 2) + "\n```");
        lastToolResultNormalized = normalizeStr(step);
        continue;
      } catch (e) {}
    }
    // Si es Tool o Resultado, resalta el título
    if (step.startsWith("Tool:")) {
      formatted.push("🛠️ " + step);
      continue;
    }
    if (step.startsWith("Resultado de")) {
      // Si contiene JSON, formatea el JSON
      const resMatch = step.match(/^(Resultado de [^:]+:\n)([\s\S]*)$/);
      if (resMatch) {
        formatted.push("✅ " + resMatch[1]);
        let resultContent = resMatch[2];
        // Intenta parsear JSON si parece serlo
        if (
          resultContent.trim().startsWith("{") &&
          resultContent.trim().endsWith("}")
        ) {
          try {
            const obj = JSON.parse(resultContent);
            formatted.push(
              "```json\n" + JSON.stringify(obj, null, 2) + "\n```"
            );
            lastToolResultNormalized = normalizeStr(resultContent);
          } catch (e) {
            formatted.push(resultContent);
            lastToolResultNormalized = normalizeStr(resultContent);
          }
        } else {
          // Si es texto largo, recorta y normaliza
          if (resultContent.length > 500) {
            resultContent = resultContent.slice(0, 500) + "...";
          }
          formatted.push(resultContent);
          lastToolResultNormalized = normalizeStr(resultContent);
        }
        continue;
      }
      // Si es solo el título del resultado
      formatted.push("✅ " + step);
      // No hay contenido de resultado para normalizar aquí
      lastToolResultNormalized = null; // Reset si no hay contenido
      continue;
    }
    // Si es texto, limpia saltos de línea excesivos
    let cleanText = step.replace(/\n{2,}/g, "\n").trim();
    if (cleanText) {
      formatted.push(cleanText);
    }
  }
  // Opcional: reordenar para que el texto explicativo vaya al final
  const textSteps = formatted.filter(
    (s) =>
      !s.startsWith("```json") && !s.startsWith("🛠️") && !s.startsWith("✅")
  );
  const jsonSteps = formatted.filter((s) => s.startsWith("```json"));
  const toolSteps = formatted.filter((s) => s.startsWith("🛠️"));
  const resultSteps = formatted.filter((s) => s.startsWith("✅"));
  // Orden: tool, json, resultado, texto
  return [...toolSteps, ...jsonSteps, ...resultSteps, ...textSteps].filter(
    Boolean
  );
}
