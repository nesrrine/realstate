/**
 * Étape 1 de l'import des dossiers vendeurs : ANALYSE EN LECTURE SEULE.
 *
 * Parcourt le dossier (un sous-dossier par bien), déduit les informations du nom
 * du dossier et classe les fichiers (photos, documents, CIN, vidéos…).
 * Ne modifie rien, n'envoie rien : produit dans ./sortie/
 *   - biens-a-verifier.csv : une ligne par bien, à corriger dans Excel
 *   - fichiers.json        : la liste des fichiers retenus par bien (utilisée par l'import)
 *
 * Usage (depuis backend/) :
 *   npx ts-node -T scripts/import-dossiers/scan.ts "C:\\Users\\...\\DOSSIER CLIENT VENDEUR PDF 13.10"
 */
import * as fs from "fs";
import * as path from "path";
import { detectPlace, detectPrices, detectTransaction, detectType, findPhone, norm } from "../../src/ai/rules";

const ROOT = process.argv[2];
if (!ROOT || !fs.existsSync(ROOT)) {
  console.error("Indiquez le dossier à analyser, ex. : npx ts-node -T scripts/import-dossiers/scan.ts \"C:\\...\\DOSSIER\"");
  process.exit(1);
}
const OUT = path.join(__dirname, "sortie");
fs.mkdirSync(OUT, { recursive: true });

// ── Classement des fichiers ───────────────────────────────────────────

const IMAGE = /\.(jpe?g|png|webp|jfif)$/i;
const IGNORED = /\.(zip|exe|html?|css|ini|enc|one|onetoc2|docx?|url|mp4|mov|téléchargement|téléchargé)$/i;
const VIDEO = /\.(mp4|mov)$/i;
const CIN = /(^|[^a-z])(c\s*\.?\s*i\s*\.?\s*n|cin|carte d.?identite|passeport)([^a-z]|$)/;
const DOC_KEYWORDS: [string, RegExp][] = [
  ["Titre foncier", /titre|tf\b|foncier/],
  ["Plan", /plan|partage|division|3 ?d\b/],
  ["Autres", /quittance|contrat|promesse|main ?lev|certificat|autorisation|permis|description|cahier/],
];
const MARKETING = /affiche|design sans titre|chatgpt|gemini|generated|canva|logo/;

type Doc = { path: string; category: string };
interface Dossier {
  folder: string;
  relPath: string;
  photos: string[];
  marketing: string[];
  documents: Doc[];
  cin: string[];
  videos: number;
  oversized: number;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
}

/** Fichiers d'un dossier de bien, sous-dossiers compris (PHOTO/, plans/…). */
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Coordonnées depuis un raccourci Google Maps (.url) : nom « 36°52'19.1-N 10°15'59.7-E » ou URL ?q=lat,lng. */
function parseMaps(file: string): { url: string | null; lat: number | null; lng: number | null } {
  let url: string | null = null;
  try {
    url = /URL=(.+)/.exec(fs.readFileSync(file, "utf8"))?.[1]?.trim() ?? null;
  } catch {
    /* raccourci illisible : on garde les coordonnées du nom */
  }
  const dms = /(\d+)°(\d+)'([\d.]+)"?-?\s*([NS]).*?(\d+)°(\d+)'([\d.]+)"?-?\s*([EW])/.exec(path.basename(file));
  if (dms) {
    const toDec = (d: string, m: string, s: string, h: string) =>
      (Number(d) + Number(m) / 60 + Number(s) / 3600) * (h === "S" || h === "W" ? -1 : 1);
    return { url, lat: +toDec(dms[1], dms[2], dms[3], dms[4]).toFixed(6), lng: +toDec(dms[5], dms[6], dms[7], dms[8]).toFixed(6) };
  }
  const q = url ? /[@=](-?\d+\.\d+),\s*(-?\d+\.\d+)/.exec(decodeURIComponent(url)) : null;
  return { url, lat: q ? Number(q[1]) : null, lng: q ? Number(q[2]) : null };
}

function classify(folderPath: string): Dossier {
  const d: Dossier = {
    folder: path.basename(folderPath),
    relPath: path.relative(ROOT, folderPath),
    photos: [], marketing: [], documents: [], cin: [], videos: 0, oversized: 0,
    mapsUrl: null, lat: null, lng: null,
  };
  for (const file of walk(folderPath)) {
    const name = norm(path.basename(file));
    if (/\.url$/i.test(file) && /google maps|maps|°/.test(name)) {
      const m = parseMaps(file);
      d.mapsUrl ??= m.url;
      d.lat ??= m.lat;
      d.lng ??= m.lng;
      continue;
    }
    if (VIDEO.test(file)) { d.videos++; continue; }
    if (CIN.test(name)) { d.cin.push(file); continue; }
    const docCat = DOC_KEYWORDS.find(([, re]) => re.test(name))?.[0];
    if (/\.pdf$/i.test(file)) { d.documents.push({ path: file, category: docCat ?? "Autres" }); continue; }
    if (IGNORED.test(file) || !IMAGE.test(file)) continue;
    if (docCat) { d.documents.push({ path: file, category: docCat }); continue; }
    if (fs.statSync(file).size > 10 * 1024 * 1024) d.oversized++;
    (MARKETING.test(name) ? d.marketing : d.photos).push(file);
  }
  return d;
}

// ── Repérage des dossiers de biens ────────────────────────────────────

/** Un dossier de bien commence par un numéro ou contient une référence AR/TN. */
const isPropertyFolder = (name: string) => /^\s*\d+/.test(name) || /\b(ar|tn)\s*\d{3,5}\b/i.test(name);

function findPropertyFolders(dir: string, depth = 0): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const p = path.join(dir, e.name);
      if (isPropertyFolder(e.name)) return [p];
      // Dossiers de catégorie (LES TERRAINS, Villas, Appartements/A VENDRE…)
      return depth < 3 ? findPropertyFolders(p, depth + 1) : [];
    });
}

// ── Lecture du nom de dossier ─────────────────────────────────────────

const STOP = new Set([
  "terrain", "terrains", "villa", "villas", "appartement", "appartemen", "app", "appart", "aapartement", "duplex", "duplexe",
  "maison", "immeuble", "batiment", "local", "locale", "commercial", "commecial", "com", "bureau", "bureaux", "depot", "entropot",
  "entrepot", "fond", "fonds", "commerce", "ferme", "lot", "residence", "res", "a", "à", "vendre", "louer", "location", "vente",
  "la", "le", "les", "de", "du", "des", "et", "rue", "avenu", "avenue", "cite", "pres", "proximite", "acote", "cote", "prix",
  "dt", "md", "m", "m2", "m²", "mme", "mr", "madame", "monsieur", "pere", "frere", "sté", "ste", "stė", "promotion",
  "immobiliere", "immo", "affiche", "gerance", "meuble", "ecole", "principal", "nord", "sud", "etage", "er", "eme", "prox",
  "carrf", "exp", "express", "carrefour", "parc", "parck", "pour", "en", "au", "s", "r", "d", "rdp", "l",
  // Mots de rangement ou de description, pas des noms de personne
  "revoir", "collaboration", "monoprix", "cloture", "divise", "sur", "kiosque", "comm", "avec", "materiel", "grand", "lux",
  "luxe", "haut", "standing", "neuf", "nouveau", "projet", "lots", "lotissement", "piscine", "jardin", "vue", "mer", "plage",
  "centre", "ville", "zone", "industrielle", "angle", "titre", "bleu", "collectif", "individuel", "hamaouiar", "app", "apps",
  "cafe", "restau", "restaurant", "relais", "gerance", "bureautique", "ancien", "occasion", "urgent", "tr", "n", "f",
  "milliard", "milliards", "million", "millions", "demi",
]);

/** Nom probable du propriétaire : mots restants après retrait des types, lieux, nombres et références. */
function guessOwner(name: string, place: string | null): string | null {
  let t = norm(name)
    .replace(/^\s*\d+\s*/, "")
    .replace(/\b(ar|tn)\s*\d{2,5}\b/g, " ")
    .replace(/\bs\s*\+\s*\d\b/g, " ")
    // Unités les plus longues d'abord (« 14 milliards » ne doit pas laisser « illiards »)
    .replace(/[\d.,]+\s*(milliards?|millions?|milles?|mdt|md|dt|m²|m2|m\b)?/g, " ")
    .replace(/[^a-z\s]/g, " ");
  if (place) t = t.replace(new RegExp(norm(place).replace(/[^a-z ]/g, " "), "g"), " ");
  const placeWords = ["sidi", "fraj", "frej", "soukra", "aouina", "laouina", "chotrana", "bhar", "lazreg", "lazrek", "marsa",
    "ennasr", "ennaser", "gammarth", "borj", "louzir", "ghazela", "dar", "fadhal", "yakout", "hamaoui", "el", "ain", "zagh",
    "mourouj", "kram", "relais", "sabkhet", "sebkhet", "firma", "elfirma", "khalig", "mala", "ika", "nahj", "matar", "sofien",
    "factory", "clinique", "patio", "joumarya", "donia", "donya", "baya", "stade", "wahat", "hay", "salah", "behi", "ladghem",
    "masmoudi", "patisserie", "touil", "ettouil", "abou", "nawress", "maghep", "maghreb", "anouwayri"];
  const words = t.split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w) && !placeWords.includes(w));
  if (!words.length) return null;
  return words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function parseFolderName(name: string) {
  const t = norm(name);
  // Formulations des noms de dossiers d'abord (« immeuble dar fadhal » n'est pas une maison)
  const type =
    /(immeuble|batiment)/.test(t) ? "OTHER"
    : /fonds? de? ?comm?\b|fonds? de comm/.test(t) ? "BUSINESS"
    : /local\s*com|(^|[^a-z])depot|entr?opot|entrepot|hangar|kiosque/.test(t) ? "COMMERCIAL"
    : /ferme/.test(t) ? "VILLA"
    : detectType(t);
  const { city, district } = detectPlace(t);
  const prices = detectPrices(t);
  const surface = (() => {
    const m = /(\d+(?:[.,]\d+)?)\s*(?:m²|m2|m\b)/.exec(t);
    return m ? Number(m[1].replace(",", ".")) : null;
  })();
  const sPlus = /\bs\s*\+\s*(\d)/.exec(t);
  const reference = /\b((?:ar|tn)\s*\d{3,5})\b/i.exec(name)?.[1]?.replace(/\s+/g, "").toUpperCase() ?? null;
  let transaction = detectTransaction(t);
  let price = prices.length ? Math.max(...prices) : null;
  const notes: string[] = [];

  // Terrain : « 1400 dt » = prix au m² (1628 m² à 1400 dt)
  let pricePerSqm: number | null = null;
  if (type === "LAND" && price !== null && price < 10000 && surface) {
    pricePerSqm = price;
    price = Math.round(price * surface);
    notes.push(`prix au m² (${pricePerSqm} DT) × surface`);
  }
  transaction ??= price === null ? (type === "LAND" ? "SALE" : null) : price < 15000 ? "RENTAL" : "SALE";
  if (prices.length > 1) notes.push(`plusieurs montants dans le nom (${prices.join(" / ")})`);

  return {
    numero: /^\s*(\d+)/.exec(name)?.[1] ?? "",
    reference,
    type,
    transaction,
    price,
    pricePerSqm,
    surface,
    bedrooms: sPlus ? Number(sPlus[1]) : null,
    city,
    district,
    owner: guessOwner(name, district),
    phone: findPhone(name),
    notes,
  };
}

// ── Analyse ───────────────────────────────────────────────────────────

const LABEL: Record<string, string> = {
  APARTMENT: "Appartement", VILLA: "Villa", HOUSE: "Maison", LAND: "Terrain", COMMERCIAL: "Local commercial",
  OFFICE: "Bureau", BUSINESS: "Fonds de commerce", OTHER: "Immeuble / autre",
};

const folders = findPropertyFolders(ROOT);

// Doublons (même bien rangé aussi dans un dossier de catégorie) : on garde la copie la plus complète
const byKey = new Map<string, Dossier>();
for (const f of folders) {
  const d = classify(f);
  const key = norm(d.folder).replace(/[^a-z0-9]/g, "");
  const prev = byKey.get(key);
  const size = (x: Dossier) => x.photos.length + x.documents.length + x.marketing.length;
  if (!prev || size(d) > size(prev)) byKey.set(key, d);
}
const dossiers = [...byKey.values()].sort((a, b) => {
  const na = Number(/^\s*(\d+)/.exec(a.folder)?.[1] ?? 1e9);
  const nb = Number(/^\s*(\d+)/.exec(b.folder)?.[1] ?? 1e9);
  return na - nb || a.folder.localeCompare(b.folder);
});

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const HEADER = [
  "importer", "numero", "dossier", "reference_agence", "proprietaire", "telephone_proprietaire", "type", "transaction",
  "prix_dt", "prix_m2_dt", "surface_m2", "chambres", "gouvernorat", "quartier", "latitude", "longitude",
  "photos", "photos_pub", "documents", "cin_exclues", "videos_ignorees", "photos_trop_lourdes", "a_verifier",
];
const rows: string[][] = [];
const files: Record<string, unknown> = {};
const stats = { biens: 0, photos: 0, documents: 0, cin: 0, sansPhoto: 0, sansPrix: 0, sansType: 0 };

for (const d of dossiers) {
  const p = parseFolderName(d.folder);
  const check = [...p.notes];
  if (!p.type) check.push("type");
  if (!p.price) check.push("prix");
  if (!p.surface) check.push("surface");
  if (!p.city) check.push("lieu");
  if (!p.owner) check.push("propriétaire");
  if (!d.photos.length && !d.marketing.length) check.push("aucune photo");

  stats.biens++;
  stats.photos += d.photos.length;
  stats.documents += d.documents.length;
  stats.cin += d.cin.length;
  if (!d.photos.length && !d.marketing.length) stats.sansPhoto++;
  if (!p.price) stats.sansPrix++;
  if (!p.type) stats.sansType++;

  rows.push([
    "oui", p.numero, d.folder, p.reference ?? "", p.owner ?? "", p.phone ?? "",
    p.type ? LABEL[p.type] : "", p.transaction === "RENTAL" ? "Location" : p.transaction === "SALE" ? "Vente" : "",
    p.price ?? "", p.pricePerSqm ?? "", p.surface ?? "", p.bedrooms ?? "", p.city ?? "", p.district ?? "",
    d.lat ?? "", d.lng ?? "", d.photos.length, d.marketing.length,
    d.documents.map((x) => x.category).join(", "), d.cin.length, d.videos, d.oversized, check.join(", "),
  ].map(String));

  files[d.folder] = {
    relPath: d.relPath,
    photos: d.photos.map((f) => path.relative(ROOT, f)),
    marketing: d.marketing.map((f) => path.relative(ROOT, f)),
    documents: d.documents.map((x) => ({ path: path.relative(ROOT, x.path), category: x.category })),
    mapsUrl: d.mapsUrl,
  };
}

// CSV au format Excel français : séparateur « ; », encodage UTF-8 avec BOM
const csv = "\uFEFF" + [HEADER, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
fs.writeFileSync(path.join(OUT, "biens-a-verifier.csv"), csv, "utf8");
fs.writeFileSync(path.join(OUT, "fichiers.json"), JSON.stringify({ root: ROOT, generatedAt: new Date().toISOString(), dossiers: files }, null, 2), "utf8");

console.log(`Dossiers de biens trouvés : ${folders.length} (dont ${folders.length - dossiers.length} en double)`);
console.log(`Biens uniques             : ${stats.biens}`);
console.log(`Photos retenues           : ${stats.photos} (+ affiches/visuels séparés)`);
console.log(`Documents (titre, plan…)  : ${stats.documents}`);
console.log(`Pièces d'identité exclues : ${stats.cin}`);
console.log(`Sans photo / sans prix / sans type : ${stats.sansPhoto} / ${stats.sansPrix} / ${stats.sansType}`);
console.log(`\nRésultat : ${path.join(OUT, "biens-a-verifier.csv")}`);
