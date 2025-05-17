/* ==============================================================
 *  ibmFormatters.js  – Limpieza y formateo de pasos Watsonx
 * ============================================================ */

import crypto from "crypto";

/* ---------- configuración ----------------------------------- */
const MAX_TOOL_FIELD_CHARS = 400; // por campo dentro del JSON del tool
const MAX_TOOL_RAW_WORDS = 60; // si el tool devuelve texto plano
const MAX_DEEP = 5; // profundidad de des-escape JSON

/* ---------- utilidades -------------------------------------- */
const hash = (s) => crypto.createHash("sha1").update(s).digest("hex");

function tryParseDeepJson(str) {
  let v = str,
    i = 0;
  while (typeof v === "string" && i++ < MAX_DEEP) {
    try {
      v = JSON.parse(v);
    } catch {
      break;
    }
  }
  return typeof v === "object" ? v : null;
}

/* Recorta strings muy largos dentro de un objeto JSON */
function truncateJsonStrings(obj) {
  if (Array.isArray(obj)) {
    return obj.map(truncateJsonStrings);
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] =
        typeof v === "string" && v.length > MAX_TOOL_FIELD_CHARS
          ? v.slice(0, MAX_TOOL_FIELD_CHARS) + "…"
          : truncateJsonStrings(v);
    }
    return out;
  }
  return obj;
}

function truncateRawText(text) {
  const words = text.trim().split(/\s+/);
  return words.length > MAX_TOOL_RAW_WORDS
    ? words.slice(0, MAX_TOOL_RAW_WORDS).join(" ") + "…"
    : text;
}

function normalize(s) {
  return typeof s === "string"
    ? s
        .replace(/^"|"$/g, "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\s+/g, "")
        .trim()
    : null;
}

function looksLikeJsonDecorator(txt = "") {
  return /^`*json`*$/i.test(txt.replace(/[\u202F\u00A0\s]+/g, ""));
}

/* ---------- formatIbmSteps ---------------------------------- */
export function formatIbmSteps(steps) {
  /* deduplicar */
  const uniq = [];
  const seen = new Set();
  for (const s of steps) {
    const k = typeof s === "string" ? s.trim() : JSON.stringify(s);
    if (!seen.has(k)) {
      uniq.push(s);
      seen.add(k);
    }
  }

  const out = [];
  const emitted = new Set();
  let lastTool = null;

  for (let i = 0; i < uniq.length; i++) {
    let step = uniq[i];

    /* Tool */
    if (step.startsWith("Tool:")) {
      out.push("🛠️ " + step);
      lastTool = step.match(/^Tool:\s+([^\s]+)$/)?.[1] || null;
      continue;
    }

    /* Resultado sin cuerpo → fusionar con siguiente */
    if (step.startsWith("Resultado de") && !step.includes(":\n")) {
      step = step + "\n" + (uniq[i + 1] ?? "");
      i++;
    }

    /* JSON presente */
    const jMatch = step.match(/(["']?{[\s\S]*}["']?)/);
    if (jMatch) {
      let raw = jMatch[1].replace(/^"|"$/g, "");
      let obj = tryParseDeepJson(raw);

      let pretty;
      if (obj) {
        // recortamos campos largos
        obj = truncateJsonStrings(obj);
        pretty = "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
      } else {
        // JSON mal formado → texto plano
        raw = truncateRawText(raw);
        pretty = raw;
      }

      const h = hash(normalize(pretty));
      if (emitted.has(h)) continue;
      emitted.add(h);

      let before = step.slice(0, jMatch.index).trim();
      const after = step.slice(jMatch.index + jMatch[1].length).trim();
      if (looksLikeJsonDecorator(before)) before = "";

      if (lastTool && !step.includes("✅ Resultado de")) {
        out.push(`✅ Resultado de ${lastTool}:`);
      }
      if (before) out.push(before);
      out.push(pretty);
      if (after) out.push(after); // explicación completa, sin recorte
      continue;
    }

    /* Texto plano (explicación, no se recorta) */
    const clean = step.replace(/\n{2,}/g, "\n").trim();
    if (clean) {
      const h = hash(normalize(clean));
      if (!emitted.has(h)) {
        emitted.add(h);
        out.push(clean);
      }
    }
  }

  /* orden final */
  return [
    ...out.filter((s) => s.startsWith("🛠️")),
    ...out.filter((s) => s.startsWith("✅")),
    ...out.filter((s) => s.startsWith("```json")),
    ...out.filter(
      (s) =>
        !s.startsWith("🛠️") && !s.startsWith("✅") && !s.startsWith("```json")
    ),
  ];
}
