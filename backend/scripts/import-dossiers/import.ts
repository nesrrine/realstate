/**
 * Étape 2 de l'import des dossiers vendeurs : CRÉATION DANS LE CRM VIA L'API.
 *
 * Lit sortie/biens-a-verifier.csv (corrigé dans Excel) et sortie/fichiers.json (produit par scan.ts),
 * puis crée pour chaque ligne « importer = oui » :
 *   - le propriétaire (réutilisé s'il existe déjà sous le même nom),
 *   - le bien en BROUILLON, NON PUBLIÉ,
 *   - jusqu'à 20 photos (redimensionnées en JPEG 1920 px),
 *   - les documents (titre foncier, plan, autres). Les pièces d'identité ne sont jamais envoyées.
 *
 * Par défaut : SIMULATION (rien n'est envoyé). Ajoutez --executer pour importer.
 * Reprise possible : sortie/import-etat.json mémorise ce qui est déjà importé.
 *
 * Usage (depuis backend/, avec le backend démarré) :
 *   npx ts-node -T scripts/import-dossiers/import.ts                 # simulation
 *   npx ts-node -T scripts/import-dossiers/import.ts --executer --limite 2
 *   npx ts-node -T scripts/import-dossiers/import.ts --executer
 * Identifiants : IMPORT_EMAIL / IMPORT_PASSWORD (par défaut, le compte admin de développement).
 */
import * as fs from "fs";
import * as path from "path";
// require typé : le projet n'active pas esModuleInterop (« import sharp from » donne undefined à l'exécution)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require("sharp") as typeof import("sharp").default;

const args = process.argv.slice(2);
const EXECUTE = args.includes("--executer");
const LIMIT = args.includes("--limite") ? Number(args[args.indexOf("--limite") + 1]) : Infinity;
const API = (args.includes("--api") ? args[args.indexOf("--api") + 1] : "http://localhost:3001/api").replace(/\/$/, "");
const EMAIL = process.env.IMPORT_EMAIL || "admin@agency.com";
const PASSWORD = process.env.IMPORT_PASSWORD || "Admin1234!";

const OUT = path.join(__dirname, "sortie");
const CSV_FILE = path.join(OUT, "biens-a-verifier.csv");
const FILES_FILE = path.join(OUT, "fichiers.json");
const STATE_FILE = path.join(OUT, "import-etat.json");
const REPORT_FILE = path.join(OUT, "rapport-import.csv");

const MAX_PHOTOS = 20;
const MAX_DOC_BYTES = 25 * 1024 * 1024;
const MIN_FREE_MB = 500;

/** Espace libre (Mo) sur le disque du dossier uploads du backend. */
function freeDiskMb(): number | null {
  try {
    const s = fs.statfsSync(path.join(__dirname, "..", ".."));
    return Math.round((s.bavail * s.bsize) / 1024 / 1024);
  } catch {
    return null;
  }
}

// ── Lecture des fichiers d'entrée ─────────────────────────────────────

/** CSV Excel français : « ; », guillemets, BOM UTF-8. Excel peut aussi réenregistrer en « , ». */
function readCsv(file: string): Record<string, string>[] {
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const sep = text.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim()));
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

interface FilesEntry {
  relPath: string;
  photos: string[];
  marketing: string[];
  documents: { path: string; category: string }[];
  mapsUrl: string | null;
}
interface State {
  [dossier: string]: { ownerId?: string; propertyId?: string; photos: string[]; documents: string[]; done?: boolean };
}

const TYPES: Record<string, string> = {
  appartement: "APARTMENT", villa: "VILLA", maison: "HOUSE", terrain: "LAND", "local commercial": "COMMERCIAL",
  bureau: "OFFICE", "fonds de commerce": "BUSINESS", "immeuble / autre": "OTHER", immeuble: "OTHER", autre: "OTHER",
};
const LABELS: Record<string, string> = {
  APARTMENT: "Appartement", VILLA: "Villa", HOUSE: "Maison", LAND: "Terrain", COMMERCIAL: "Local commercial",
  OFFICE: "Bureau", BUSINESS: "Fonds de commerce", OTHER: "Bien",
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const num = (s: string) => {
  const v = Number(String(s).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : null;
};

// ── API du CRM ────────────────────────────────────────────────────────

let token = "";

async function api<T>(method: string, url: string, body?: unknown, form?: FormData): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(form ? {} : { "Content-Type": "application/json" }),
    },
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = Array.isArray(j.message) ? j.message.join(", ") : j.message ?? text;
    } catch { /* réponse non JSON */ }
    throw new Error(`${method} ${url} → ${res.status} : ${msg}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Connexion au CRM impossible (${res.status}). Le backend est-il démarré ?`);
  token = (await res.json()).accessToken;
}

/** Tous les propriétaires existants, indexés par nom normalisé (pour ne pas créer de doublons). */
async function loadOwners(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let page = 1; ; page++) {
    const r = await api<{ data: { id: string; firstName: string; lastName: string }[]; meta: { totalPages: number } }>(
      "GET", `/owners?limit=100&page=${page}`,
    );
    r.data.forEach((o) => map.set(norm(`${o.firstName} ${o.lastName}`), o.id));
    if (page >= (r.meta.totalPages || 1)) break;
  }
  return map;
}

// ── Préparation des fichiers ──────────────────────────────────────────

const unreadable: string[] = [];

/** Photo redimensionnée : JPEG, côté max 1920 px, orientation EXIF corrigée. */
async function photoBlob(file: string): Promise<Blob | null> {
  try {
    const buf = await sharp(file, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return new Blob([new Uint8Array(buf)], { type: "image/jpeg" });
  } catch (e) {
    // Image illisible ou corrompue : ignorée, mais signalée (jamais en silence)
    unreadable.push(`${file} — ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function documentBlob(file: string): Promise<{ blob: Blob; name: string } | null> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") {
    const size = fs.statSync(file).size;
    if (size > MAX_DOC_BYTES) {
      unreadable.push(`${file} — PDF trop lourd (${Math.round(size / 1024 / 1024)} Mo > 25 Mo), à compresser puis ajouter à la main`);
      return null;
    }
    return { blob: new Blob([new Uint8Array(fs.readFileSync(file))], { type: "application/pdf" }), name: path.basename(file) };
  }
  const blob = await photoBlob(file);
  return blob ? { blob, name: path.basename(file, ext) + ".jpg" } : null;
}

// ── Construction d'un bien à partir d'une ligne ───────────────────────

function buildProperty(row: Record<string, string>, entry: FilesEntry | undefined) {
  const type = TYPES[norm(row.type)] ?? "OTHER";
  const transaction = norm(row.transaction).startsWith("loc") ? "RENTAL" : "SALE";
  const price = num(row.prix_dt);
  const surface = num(row.surface_m2);
  const bedrooms = num(row.chambres);
  const city = row.gouvernorat || null;
  const district = row.quartier || null;

  const missing = [
    !row.type && "type",
    !row.transaction && "vente ou location",
    !price && "prix",
    !surface && "surface",
    !city && "gouvernorat",
    !row.telephone_proprietaire && "téléphone du propriétaire",
  ].filter(Boolean) as string[];

  const base = [
    LABELS[type],
    type === "APARTMENT" && bedrooms ? `S+${bedrooms}` : null,
    surface && (type === "LAND" || type === "VILLA") ? `${surface} m²` : null,
    district || city ? `à ${district || city}` : null,
    row.reference_agence ? `(${row.reference_agence})` : null,
  ].filter(Boolean).join(" ");
  // Les champs essentiels manquants sont signalés dans le titre pour les retrouver par la recherche
  const essentialsMissing = !price || !surface || !city;

  const description = [
    `Fiche importée automatiquement depuis le dossier « ${row.dossier} ».`,
    row.reference_agence ? `Référence agence : ${row.reference_agence}.` : null,
    missing.length ? `À compléter : ${missing.join(", ")}.` : null,
    !surface ? "Surface provisoire : 1 m² (à corriger)." : null,
    row.prix_m2_dt ? `Prix calculé à partir de ${row.prix_m2_dt} DT/m².` : null,
  ].filter(Boolean).join("\n");

  return {
    payload: {
      title: (essentialsMissing ? "[À compléter] " : "") + base,
      description,
      type,
      transactionType: transaction,
      status: "DRAFT",
      isPublished: false,
      address: district || city || "À compléter",
      city: city || "À compléter",
      ...(district && { district }),
      country: "TN",
      surface: surface ?? 1,
      price: price ?? 0,
      ...(bedrooms && { bedrooms, rooms: type === "APARTMENT" ? bedrooms + 1 : undefined }),
      ...(num(row.latitude) && num(row.longitude) && { latitude: Number(row.latitude), longitude: Number(row.longitude) }),
      ...(entry?.mapsUrl && { googleMapsUrl: entry.mapsUrl }),
    },
    missing,
  };
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1
    ? { firstName: parts[0], lastName: parts.slice(1).join(" ") }
    : { firstName: parts[0], lastName: "(à compléter)" };
}

// ── Programme principal ───────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CSV_FILE) || !fs.existsSync(FILES_FILE)) {
    throw new Error("Lancez d'abord scan.ts : biens-a-verifier.csv et fichiers.json sont introuvables.");
  }
  const rows = readCsv(CSV_FILE).filter((r) => norm(r.importer || "oui") !== "non");
  const { root, dossiers } = JSON.parse(fs.readFileSync(FILES_FILE, "utf8")) as {
    root: string;
    dossiers: Record<string, FilesEntry>;
  };
  const state: State = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : {};
  const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");

  const todo = rows.filter((r) => !state[r.dossier]?.done).slice(0, LIMIT);
  console.log(`${EXECUTE ? "IMPORT" : "SIMULATION (ajoutez --executer pour importer)"} — ${todo.length} bien(s) à traiter, ${rows.length - rows.filter((r) => !state[r.dossier]?.done).length} déjà importé(s).`);

  if (EXECUTE) await login();
  const owners = EXECUTE ? await loadOwners() : new Map<string, string>();
  const report: string[][] = [["dossier", "resultat", "bien_id", "photos", "documents", "a_completer", "erreur"]];

  for (const [i, row] of todo.entries()) {
    const entry = dossiers[row.dossier];
    const { payload, missing } = buildProperty(row, entry);
    const photos = entry ? [...entry.photos, ...entry.marketing].slice(0, MAX_PHOTOS) : [];
    const docs = entry?.documents ?? [];
    const label = `[${i + 1}/${todo.length}] ${row.dossier}`;

    if (!EXECUTE) {
      console.log(`${label}\n   → ${payload.title} | ${payload.price} DT | ${payload.surface} m² | ${photos.length} photo(s), ${docs.length} document(s)${missing.length ? ` | à compléter : ${missing.join(", ")}` : ""}`);
      report.push([row.dossier, "simulation", "", String(photos.length), String(docs.length), missing.join(", "), ""]);
      continue;
    }

    // Sécurité : un disque plein peut bloquer Windows et endommager PostgreSQL
    const freeMb = freeDiskMb();
    if (freeMb !== null && freeMb < MIN_FREE_MB) {
      console.error(`\n⛔ Arrêt : il ne reste que ${freeMb} Mo sur le disque (minimum ${MIN_FREE_MB} Mo). Libérez de l'espace puis relancez : l'import reprendra ici.`);
      break;
    }

    const s = (state[row.dossier] ??= { photos: [], documents: [] });
    try {
      // 1. Propriétaire (réutilisé s'il existe déjà)
      if (!s.ownerId) {
        const name = row.proprietaire || "Propriétaire à identifier";
        const key = norm(name.includes(" ") ? name : `${name} (à compléter)`);
        s.ownerId = owners.get(key) ?? owners.get(norm(name));
        if (!s.ownerId) {
          const created = await api<{ id: string }>("POST", "/owners", {
            ...splitName(name),
            phone: row.telephone_proprietaire || "À compléter",
            country: "TN",
            notes: `Créé par l'import du dossier « ${row.dossier} ».`,
          });
          s.ownerId = created.id;
          owners.set(key, created.id);
        }
        saveState();
      }

      // 2. Bien en brouillon
      if (!s.propertyId) {
        const created = await api<{ id: string }>("POST", "/properties", { ...payload, ownerId: s.ownerId });
        s.propertyId = created.id;
        saveState();
      }

      // 3. Photos, par lots de 10 (limite de l'API)
      const pending = photos.filter((p) => !s.photos.includes(p));
      for (let k = 0; k < pending.length; k += 10) {
        const batch = pending.slice(k, k + 10);
        const form = new FormData();
        const sent: string[] = [];
        for (const rel of batch) {
          const blob = await photoBlob(path.join(root, rel));
          if (blob) { form.append("files", blob, path.basename(rel, path.extname(rel)) + ".jpg"); sent.push(rel); }
        }
        if (sent.length) await api("POST", `/properties/${s.propertyId}/images/upload`, undefined, form);
        s.photos.push(...batch); // les illisibles sont aussi marquées pour ne pas réessayer en boucle
        saveState();
      }

      // 4. Documents (jamais de pièce d'identité : déjà écartées par scan.ts)
      for (const doc of docs.filter((d) => !s.documents.includes(d.path))) {
        const file = await documentBlob(path.join(root, doc.path));
        if (file) {
          const form = new FormData();
          form.append("file", file.blob, file.name);
          form.append("title", path.basename(doc.path, path.extname(doc.path)).slice(0, 120));
          form.append("category", doc.category === "Autres" ? "Autre" : doc.category);
          await api("POST", `/properties/${s.propertyId}/documents`, undefined, form);
        }
        s.documents.push(doc.path);
        saveState();
      }

      s.done = true;
      saveState();
      console.log(`${label}\n   ✓ ${payload.title} — ${s.photos.length} photo(s), ${s.documents.length} document(s)`);
      report.push([row.dossier, "importé", s.propertyId!, String(s.photos.length), String(s.documents.length), missing.join(", "), ""]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${label}\n   ✗ ${msg}`);
      report.push([row.dossier, "erreur", s.propertyId ?? "", String(s.photos.length), String(s.documents.length), missing.join(", "), msg]);
      if (/Connexion|ECONNREFUSED|fetch failed/.test(msg)) break; // backend arrêté : inutile de continuer
    }
  }

  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(REPORT_FILE, "﻿" + report.map((r) => r.map(cell).join(";")).join("\r\n"), "utf8");
  if (unreadable.length) {
    fs.writeFileSync(path.join(OUT, "fichiers-ignores.txt"), unreadable.join("\r\n"), "utf8");
    console.warn(`\n⚠ ${unreadable.length} fichier(s) ignoré(s) (illisibles ou trop lourds) — liste : sortie/fichiers-ignores.txt`);
    // Sécurité : si TOUTES les images échouent, c'est un problème de configuration, pas de fichiers
    if (EXECUTE && unreadable.length > 0 && report.every((r, i) => i === 0 || r[3] === "0")) {
      console.error("Aucune image n'a pu être lue : vérifiez l'installation de sharp avant de continuer.");
    }
  }
  const ok = report.filter((r) => r[1] === "importé").length;
  const ko = report.filter((r) => r[1] === "erreur").length;
  console.log(`\n${EXECUTE ? `Importés : ${ok} — Erreurs : ${ko}` : "Simulation terminée"} — rapport : ${REPORT_FILE}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
