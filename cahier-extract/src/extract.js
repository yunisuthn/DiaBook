// Extraction d'une photo de cahier via l'API Claude (vision + sortie structurée forcée).
// Usage : node src/extract.js photo1.jpg [photo2.jpg ...]  → écrit out/<nom>.json
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { SYSTEM_PROMPT, userPrompt } from "./prompt.js";
import { extractionTool } from "./schema.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const client = new Anthropic(); // lit ANTHROPIC_API_KEY

// Pré-traitement : orientation EXIF, taille max 1600 px, léger contraste, JPEG.
export async function preparerImage(fichier) {
  const buf = await sharp(fichier)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .normalize()
    .jpeg({ quality: 85 })
    .toBuffer();
  return buf.toString("base64");
}

export async function extrairePage(fichier, meta = {}) {
  const data = await preparerImage(fichier);
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [extractionTool],
    tool_choice: { type: "tool", name: extractionTool.name },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
          { type: "text", text: userPrompt(meta) },
        ],
      },
    ],
  });
  const bloc = res.content.find((b) => b.type === "tool_use");
  if (!bloc) throw new Error(`Pas de sortie structurée pour ${fichier}`);
  return { photo: path.basename(fichier), modele: MODEL, ...bloc.input };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fichiers = process.argv.slice(2);
  await fs.mkdir("out", { recursive: true });
  for (const f of fichiers) {
    const page = await extrairePage(f);
    const sortie = path.join("out", path.basename(f).replace(/\.\w+$/, ".json"));
    await fs.writeFile(sortie, JSON.stringify(page, null, 2));
    console.log("✓", f, "→", sortie);
  }
}
