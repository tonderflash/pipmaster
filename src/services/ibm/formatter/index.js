// ibm/formatter/index.js
export function formatIbmSteps(steps) {
  const toolBlocks = []; // aquí acumularemos ```Tool+Args```
  let textBuffer = []; // aquí las piezas de explicación

  // --- 1) Fallback único paso SSE ---------------------------------
  if (
    steps.length === 1 &&
    typeof steps[0] === "string" &&
    /^".+"$/.test(steps[0].trim()) &&
    steps[0].includes("delta")
  ) {
    // 1️⃣ Desescapamos la cadena
    let s = steps[0].slice(1, -1).replace(/\\\\n/g, "\n").replace(/\\"/g, '"');

    // 2️⃣ Extraer tool_calls
    const callRe =
      /"tool_calls":\s*\[\s*{[\s\S]*?"function":\s*{[\s\S]*?"name":"([^"]+)"[\s\S]*?"arguments":"([^"]+)"/g;
    let m;
    while ((m = callRe.exec(s))) {
      const name = m[1];
      let args;
      try {
        args = JSON.parse(m[2]);
      } catch {
        args = m[2];
      }
      toolBlocks.push(
        "```\n" +
          "Tool: " +
          name +
          "\n" +
          "Args: " +
          JSON.stringify(args, null, 2) +
          "\n```"
      );
    }

    // 3️⃣ Extraer los delta.content sucesivos
    const contentRe = /"delta":\s*{[^}]*?"content":"([^"]*)"/g;
    while ((m = contentRe.exec(s))) {
      textBuffer.push(m[1]);
    }

    const explanation = textBuffer.join("").trim();
    return explanation ? [...toolBlocks, explanation] : toolBlocks;
  }

  // --- 2) Camino “normal” (ya vienen pasos separados) -------------
  let buf = null; // acumula Tool+Args
  let skip = false; // para saltar JSON crudo tras un Tool

  const flushBuf = () => {
    if (buf) {
      toolBlocks.push("```\n" + buf.join("\n") + "\n```");
      buf = null;
    }
  };

  for (const raw of steps) {
    if (typeof raw !== "string") continue;
    let line = raw.trim();
    if (!line) continue;

    // a) Tool
    if (line.startsWith("🛠️ Tool:") || line.startsWith("Tool:")) {
      flushBuf();
      buf = [line.replace("🛠️ ", "")];
      skip = true;
      continue;
    }
    // b) Args
    if (buf && line.startsWith("Args:")) {
      buf.push(line);
      continue;
    }
    // c) Salta un JSON/texto crudo tras Tool
    if (skip) {
      skip = false;
      continue;
    }
    // d) Encabezado vacío
    if (line.startsWith("Resultado de")) continue;
    // e) JSON + texto en misma línea → quita solo el JSON
    const mix = line.match(/(["']?{[\s\S]*}["']?)([\s\S]*)$/);
    if (mix) {
      line = mix[2].trim();
      if (!line) continue;
    }
    // f) JSON/HTML puro → descartar
    if (
      line.startsWith("{") ||
      line.startsWith("{\\") ||
      line.startsWith('"{') ||
      line.toLowerCase().startsWith("json {")
    ) {
      continue;
    }

    // g) Texto humano limpio
    flushBuf();
    textBuffer.push(line);
  }

  flushBuf();
  const explanation = textBuffer.join(" ").trim();
  return explanation ? [...toolBlocks, explanation] : toolBlocks;
}
