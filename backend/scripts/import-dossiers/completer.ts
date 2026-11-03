/**
 * Étape 3 : COMPLÉTER LES FICHES IMPORTÉES à partir des fichiers « DESCRIPTION »
 * (captures WhatsApp en image ou en PDF), par reconnaissance de texte (OCR) gratuite et locale.
 *
 * Ne remplit que ce qui est vide : prix à 0, surface à 1 m², ville « À compléter »,
 * téléphone du propriétaire « À compléter ». Rien de déjà saisi n'est écrasé.
 * Le texte lu est ajouté à la description du bien, marqué « à vérifier ».
 *
 * Par défaut : SIMULATION (lecture des descriptions + sortie/complements.csv, rien n'est envoyé).
 *   npx ts-node -T scripts/import-dossiers/completer.ts [--limite N]
 *   npx ts-node -T scripts/import-dossiers/completer.ts --executer
 */
import * as fs from "fs";
import * as path from "path";
import { detectPlace, detectPrices, detectTransaction, findPhone, norm } from "../../src/ai/rules";

// require typé : pas d'esModuleInterop dans ce projet
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp") as typeof import("sharp").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createWorker } = require("tesseract.js") as typeof import("tesseract.js");

const args = process.argv.slice(2);
const EXECUTE = args.includes("--executer");
const LIMIT = args.includes("--limite") ? Number(args[args.indexOf("--limite") + 1]) : Infinity;
const API = "http://localhost:3001/api";
const EMAIL = process.env.IMPORT_EMAIL || "admin@agency.com";
const PASSWORD = process.env.IMPORT_PASSWORD || "Admin1234!";

const OUT = path.join(__dirname, "sortie");
const FILES_FILE = path.join(OUT, "fichiers.json");
const STATE_FILE = path.join(OUT, "import-etat.json");
const OCR_CACHE = path.join(OUT, "ocr-cache.json");
const REPORT = path.join(OUT, "complements.csv");
const DONE_FILE = path.join(OUT, "complements-etat.json");

const DESCRIPTION = /descri/i;
const IMAGE = /\.(jpe?g|png|webp|jfif)$/i;

// ── Lecture des images ────────────────────────────────────────────────

/** Captures embarquées dans un PDF (images JPEG « DCTDecode »), sans dépendance supplémentaire. */
function jpegsFromPdf(file: string): Buffer[] {
  const buf = fs.readFileSync(file);
  const out: Buffer[] = [];
  let pos = 0;
  while ((pos = buf.indexOf("/DCTDecode", pos)) !== -1) {
    const start = buf.indexOf("stream", pos);
    if (start === -1) break;
    let dataStart = start + "stream".length;
    if (buf[dataStart] === 0x0d) dataStart++;
    if (buf[dataStart] === 0x0a) dataStart++;
    const end = buf.indexOf("endstream", dataStart);
    if (end === -1) break;
    const jpeg = buf.subarray(dataStart, end);
    if (jpeg[0] === 0xff && jpeg[1] === 0xd8) out.push(Buffer.from(jpeg));
    pos = end;
  }
  return out;
}

/** Préparation pour l'OCR : gris, texte clair sur fond sombre inversé (mode sombre WhatsApp), agrandi. */
async function prepare(input: string | Buffer): Promise<Buffer> {
  const img = sharp(input, { failOn: "none" }).rotate().grayscale();
  const { width = 0 } = await img.metadata();
  const stats = await img.clone().stats();
  const dark = stats.channels[0].mean < 120;
  let pipe = img.clone();
  if (dark) pipe = pipe.negate({ alpha: false });
  if (width < 1400) pipe = pipe.resize({ width: 1600 });
  return pipe.normalize().png().toBuffer();
}

// ── Lecture du texte ──────────────────────────────────────────────────

interface Extracted {
  surface: number | null;
  price: number | null;
  pricePerSqm: number | null;
  phone: string | null;
  name: string | null;
  address: string | null;
  transaction: "SALE" | "RENTAL" | null;
}

const LABEL = /^(adresse|adress|lieu|emplacement|situe|nom|proprietaire|propriétaire)\s*:?\s*/i;

/** Valeur d'une ligne « Libellé : valeur » (ou « Libellé valeur » sans deux-points). */
const lineAfter = (lines: string[], re: RegExp) => {
  const l = lines.find((x) => re.test(norm(x)));
  if (!l) return null;
  const value = (l.includes(":") ? l.replace(/^[^:]*:\s*/, "") : l.replace(LABEL, "")).trim();
  return value || null;
};

/** Une ligne de prix contient un vrai montant (au moins 100) : « S+2 » ou « RDC 1 » ne comptent pas. */
const hasAmount = (l: string) => /\d{3,}|\d+\s*(md|mdt|mille|milliards?|millions?)\b/i.test(l.replace(/\s(?=\d{3}\b)/g, ""));

export function parseDescription(text: string): Extracted {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const t = norm(text);

  const surfaceLine = lines.find((l) => /(superficie|surface|sup\b|terrain de|lot de)/.test(norm(l)) && /\d/.test(l));
  const surfaceMatch = surfaceLine ? /(\d+(?:[.,]\d+)?)\s*(?:m|metre|mètre)/i.exec(surfaceLine.replace(/\s(?=\d{3}\b)/g, "")) : null;
  const surface = surfaceMatch ? Number(surfaceMatch[1].replace(",", ".")) : null;

  // Prix affiché en priorité, sinon la ligne « prix » ; « le m2 » = prix au mètre carré
  const priceLine =
    lines.find((l) => /prix\s*affich/.test(norm(l)) && hasAmount(l)) ??
    lines.find((l) => /\b(prix|loyer)\b|\ba (vendre|louer) a\b/.test(norm(l)) && hasAmount(l) && !/proprietaire/.test(norm(l))) ??
    lines.find((l) => /\b(prix|loyer)\b/.test(norm(l)) && hasAmount(l));
  let price: number | null = null;
  let pricePerSqm: number | null = null;
  if (priceLine) {
    const raw = norm(priceLine);
    // « Prix demandé m2 870dt » : l'unité est retirée AVANT de lire le montant (sinon « m2 870 » devient 2870)
    const perSqm = /(m2|m²|metres? carres?|metre|mètre)/.test(raw);
    const n = raw.replace(/m2|m²|metres? carres?|metres?|mètres?/g, " ");
    const amounts = detectPrices(n.replace(/(\d)\s+(\d{3})\b/g, "$1$2"));
    const plain = /(\d[\d\s.]*\d|\d)\s*(?:dinars?|dt|d\b)?/.exec(n.replace(/^[^\d]*/, ""));
    const value = amounts.length ? Math.max(...amounts) : plain ? Number(plain[1].replace(/[\s.]/g, "")) : null;
    if (value && perSqm) {
      pricePerSqm = value;
      price = surface ? Math.round(value * surface) : null;
    } else price = value && value > 0 ? value : null;
  }

  const phoneLine = lines.find((l) => /(tel|tél|num|numero|whatsapp|contact|portable)/.test(norm(l)) && /\d{2}/.test(l));
  const phone = findPhone(phoneLine ?? "") ?? findPhone(text);
  const name = lineAfter(lines, /^(nom|proprietaire|propriétaire)\b/);
  const address = lineAfter(lines, /^(adresse|adress|lieu|emplacement|situe)/);
  return { surface, price, pricePerSqm, phone, name, address, transaction: detectTransaction(t) };
}

// ── API du CRM ────────────────────────────────────────────────────────

let token = "";
async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} : ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

// ── Programme principal ───────────────────────────────────────────────

async function main() {
  const { root, dossiers } = JSON.parse(fs.readFileSync(FILES_FILE, "utf8")) as {
    root: string;
    dossiers: Record<string, { photos: string[]; marketing: string[]; documents: { path: string }[] }>;
  };
  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as Record<string, { propertyId?: string; ownerId?: string; done?: boolean }>;
  const cache: Record<string, string> = fs.existsSync(OCR_CACHE) ? JSON.parse(fs.readFileSync(OCR_CACHE, "utf8")) : {};
  const done: Record<string, boolean> = fs.existsSync(DONE_FILE) ? JSON.parse(fs.readFileSync(DONE_FILE, "utf8")) : {};

  const targets = Object.entries(state)
    .filter(([, s]) => s.done && s.propertyId && !done[s.propertyId])
    .slice(0, LIMIT);
  console.log(`${EXECUTE ? "COMPLÉTION" : "SIMULATION (ajoutez --executer pour mettre à jour le CRM)"} — ${targets.length} bien(s) importé(s) à examiner.`);

  if (EXECUTE) {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!r.ok) throw new Error("Connexion au CRM impossible : le backend est-il démarré ?");
    token = (await r.json()).accessToken;
  }

  // Langue française téléchargée une seule fois, puis conservée dans sortie/tessdata
  const worker = await createWorker("fra", 1, { cachePath: path.join(OUT, "tessdata"), logger: () => undefined });
  const rows: string[][] = [["dossier", "fichier", "surface", "prix", "prix_m2", "telephone", "nom", "adresse", "mis_a_jour", "texte_lu"]];
  let updated = 0;

  for (const [i, [dossier, s]] of targets.entries()) {
    const entry = dossiers[dossier];
    const files = [...(entry?.documents.map((d) => d.path) ?? []), ...(entry?.photos ?? []), ...(entry?.marketing ?? [])]
      .filter((f) => DESCRIPTION.test(path.basename(f)));
    if (!files.length) continue;

    // OCR de chaque description (résultat mis en cache pour pouvoir relancer sans tout relire)
    let text = "";
    let source = "";
    for (const rel of files) {
      if (cache[rel] === undefined) {
        try {
          const abs = path.join(root, rel);
          const images = /\.pdf$/i.test(rel) ? jpegsFromPdf(abs) : IMAGE.test(rel) ? [fs.readFileSync(abs)] : [];
          let t = "";
          for (const img of images) t += (await worker.recognize(await prepare(img))).data.text + "\n";
          cache[rel] = t.trim();
        } catch (e) {
          cache[rel] = "";
          console.warn(`   ⚠ lecture impossible : ${rel} (${e instanceof Error ? e.message : e})`);
        }
        fs.writeFileSync(OCR_CACHE, JSON.stringify(cache, null, 1), "utf8");
      }
      if (cache[rel]) { text += cache[rel] + "\n"; source ||= path.basename(rel); }
    }
    if (!text.trim()) continue;

    const x = parseDescription(text);
    const changes: string[] = [];

    if (EXECUTE) {
      const p = await api<{
        title: string; description: string | null; price: string; surface: number; city: string; district: string | null;
        transactionType: string; owner: { id: string; phone: string };
      }>("GET", `/properties/${s.propertyId}`);
      const patch: Record<string, unknown> = {};
      if (Number(p.price) === 0 && x.price) { patch.price = x.price; changes.push(`prix ${x.price}`); }
      if (p.surface <= 1 && x.surface) { patch.surface = x.surface; changes.push(`surface ${x.surface}`); }
      if (p.city === "À compléter" && x.address) {
        const place = detectPlace(norm(x.address));
        if (place.city) { patch.city = place.city; patch.address = x.address; if (place.district) patch.district = place.district; changes.push(`lieu ${place.city}`); }
      }
      const price = (patch.price as number) ?? Number(p.price);
      const surface = (patch.surface as number) ?? p.surface;
      const city = (patch.city as string) ?? p.city;
      if (p.title.startsWith("[À compléter] ") && price > 0 && surface > 1 && city !== "À compléter") {
        patch.title = p.title.replace("[À compléter] ", "");
      }
      if (!(p.description ?? "").includes("Extrait automatiquement")) {
        patch.description = `${p.description ?? ""}\n\nExtrait automatiquement de « ${source} » (à vérifier) :\n${text.trim().slice(0, 1500)}`;
      }
      if (Object.keys(patch).length) await api("PUT", `/properties/${s.propertyId}`, patch);
      if (x.phone && (!p.owner.phone || p.owner.phone === "À compléter")) {
        await api("PUT", `/owners/${p.owner.id}`, { phone: x.phone });
        changes.push(`téléphone ${x.phone}`);
      }
      done[s.propertyId!] = true;
      fs.writeFileSync(DONE_FILE, JSON.stringify(done, null, 1), "utf8");
      if (changes.length) updated++;
    }

    rows.push([
      dossier, source, String(x.surface ?? ""), String(x.price ?? ""), String(x.pricePerSqm ?? ""), x.phone ?? "",
      x.name ?? "", x.address ?? "", changes.join(", "), text.replace(/\s+/g, " ").slice(0, 300),
    ]);
    console.log(`[${i + 1}/${targets.length}] ${dossier.slice(0, 50)} → surface ${x.surface ?? "?"} | prix ${x.price ?? "?"} | tél ${x.phone ?? "?"}${changes.length ? ` | MAJ : ${changes.join(", ")}` : ""}`);
  }
  await worker.terminate();

  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(REPORT, "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n"), "utf8");
  console.log(`\n${rows.length - 1} description(s) lue(s)${EXECUTE ? `, ${updated} bien(s) complété(s)` : ""} — détail : ${REPORT}`);
}

// Lancé directement seulement : l'import du fichier (tests) ne déclenche pas d'OCR
if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
