/**
 * Moteur « intelligent sans IA » : règles, expressions régulières et calculs.
 * Gratuit, hors ligne, instantané. Utilisé quand aucune clé IA n'est configurée.
 * Fonctions pures (sans base de données) pour pouvoir les tester facilement.
 */

export type PropertyType = "APARTMENT" | "VILLA" | "HOUSE" | "LAND" | "COMMERCIAL" | "OFFICE" | "BUSINESS" | "OTHER";
export type TransactionType = "SALE" | "RENTAL";
export type TitleType = "INDIVIDUAL" | "COLLECTIVE" | "IN_PROGRESS" | "NONE";
export type Lang = "fr" | "ar" | "tn";

// ── Normalisation ─────────────────────────────────────────────────────

/** Minuscules, sans accents, espaces simples (les lettres arabes sont conservées). */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ٕͯٔ]/g, "") // accents latins + hamza décomposée (ألف → الف)
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (t: string, ...words: (string | RegExp)[]) =>
  words.some((w) => (typeof w === "string" ? t.includes(w) : w.test(t)));

const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

// ── Référentiels ──────────────────────────────────────────────────────

export const GOVERNORATES = [
  "Ariana", "Ben Arous", "Bizerte", "Béja", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine",
  "Kebili", "Le Kef", "Mahdia", "Manouba", "Medenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

/** Quartiers et villes fréquents → gouvernorat. */
const DISTRICTS: [string, string, string][] = [
  // [mot-clé normalisé, quartier affiché, gouvernorat]
  ["aouina", "L'Aouina", "Tunis"], ["la marsa", "La Marsa", "Tunis"], ["marsa", "La Marsa", "Tunis"],
  ["gammarth", "Gammarth", "Tunis"], ["carthage", "Carthage", "Tunis"], ["sidi bou said", "Sidi Bou Saïd", "Tunis"],
  ["les berges du lac", "Les Berges du Lac", "Tunis"], ["lac 2", "Les Berges du Lac 2", "Tunis"], ["lac", "Les Berges du Lac", "Tunis"],
  ["el manar", "El Manar", "Tunis"], ["manar", "El Manar", "Tunis"], ["el menzah", "El Menzah", "Tunis"], ["menzah", "El Menzah", "Tunis"],
  ["mutuelleville", "Mutuelleville", "Tunis"], ["bardo", "Le Bardo", "Tunis"], ["kram", "Le Kram", "Tunis"],
  ["ain zaghouan", "Aïn Zaghouan", "Tunis"], ["centre ville", "Centre-ville", "Tunis"], ["lafayette", "Lafayette", "Tunis"],
  ["ennasr", "Ennasr", "Ariana"], ["ennaser", "Ennasr", "Ariana"], ["nasr", "Ennasr", "Ariana"],
  // Secteur La Soukra / Aouina (dossiers vendeurs de l'agence)
  ["sidi fraj", "Sidi Frej", "Ariana"], ["sidi frej", "Sidi Frej", "Ariana"], ["dar fadhal", "Dar Fadhal", "Ariana"],
  ["rue de parc", "Rue du Parc", "Ariana"], ["rue du parc", "Rue du Parc", "Ariana"], ["rue parck", "Rue du Parc", "Ariana"], ["yakout", "Yakout El Hamaoui", "Ariana"],
  ["sabkhet", "Sebkhet Ariana", "Ariana"], ["soukra", "La Soukra", "Ariana"],
  ["bhar lazreg", "Bhar Lazreg", "Tunis"], ["bhar lazrek", "Bhar Lazreg", "Tunis"], ["laouina", "L'Aouina", "Tunis"],
  ["ain zagh", "Aïn Zaghouan", "Tunis"], ["relais", "Le Relais", "Tunis"],
  ["raoued", "Raoued", "Ariana"], ["chotrana", "Chotrana", "Ariana"], ["borj louzir", "Borj Louzir", "Ariana"],
  ["ghazela", "El Ghazala", "Ariana"], ["mnihla", "Mnihla", "Ariana"],
  ["mourouj", "El Mourouj", "Ben Arous"], ["megrine", "Mégrine", "Ben Arous"], ["rades", "Radès", "Ben Arous"],
  ["ezzahra", "Ezzahra", "Ben Arous"], ["hammam lif", "Hammam-Lif", "Ben Arous"], ["boumhel", "Boumhel", "Ben Arous"],
  ["manouba", "Manouba", "Manouba"], ["denden", "Denden", "Manouba"],
  ["hammamet", "Hammamet", "Nabeul"], ["yasmine", "Yasmine Hammamet", "Nabeul"], ["mrezga", "Mrezga", "Nabeul"],
  ["kelibia", "Kélibia", "Nabeul"], ["korba", "Korba", "Nabeul"],
  ["sahloul", "Sahloul", "Sousse"], ["khezama", "Khezama", "Sousse"], ["kantaoui", "Port El Kantaoui", "Sousse"],
  ["skanes", "Skanès", "Monastir"], ["djerba", "Djerba", "Medenine"], ["zarzis", "Zarzis", "Medenine"],
  // Arabe (écrit sans hamza, comme après normalisation)
  ["المنار", "El Manar", "Tunis"], ["المرسى", "La Marsa", "Tunis"], ["النصر", "Ennasr", "Ariana"],
  ["العوينة", "L'Aouina", "Tunis"], ["الحمامات", "Hammamet", "Nabeul"], ["المنزه", "El Menzah", "Tunis"],
  ["تونس", "", "Tunis"], ["اريانة", "", "Ariana"], ["بن عروس", "", "Ben Arous"], ["منوبة", "", "Manouba"],
  ["نابل", "", "Nabeul"], ["سوسة", "", "Sousse"], ["صفاقس", "", "Sfax"], ["المنستير", "", "Monastir"],
  ["بنزرت", "", "Bizerte"], ["المهدية", "", "Mahdia"], ["جربة", "Djerba", "Medenine"],
];

const TYPE_WORDS: [PropertyType, (string | RegExp)[]][] = [
  ["BUSINESS", ["fonds de commerce", "fond de commerce", "fonds commerce"]],
  ["COMMERCIAL", ["local commercial", "magasin", "boutique", "hanout", "showroom", "depot", "محل"]],
  ["OFFICE", ["bureau", "plateau bureau", "مكتب"]],
  ["LAND", ["terrain", "lot ", "lotissement", "ard ", "ارض", "أرض"]],
  ["VILLA", ["villa", "فيلا"]],
  ["HOUSE", ["maison", "houch", "dar ", "duplex", "rez de chaussee", "دار", "منزل"]],
  ["APARTMENT", ["appartement", "appart", "studio", /\bs\s*\+\s*\d/, "شقة"]],
];

const LABEL: Record<PropertyType, string> = {
  APARTMENT: "Appartement", VILLA: "Villa", HOUSE: "Maison", LAND: "Terrain",
  COMMERCIAL: "Local commercial", OFFICE: "Bureau", BUSINESS: "Fonds de commerce", OTHER: "Bien",
};
const LABEL_AR: Record<PropertyType, string> = {
  APARTMENT: "شقة", VILLA: "فيلا", HOUSE: "منزل", LAND: "قطعة أرض",
  COMMERCIAL: "محل تجاري", OFFICE: "مكتب", BUSINESS: "أصل تجاري", OTHER: "عقار",
};

// ── Analyse d'un texte libre ──────────────────────────────────────────

/** Téléphone tunisien (8 chiffres, avec ou sans +216) ; retiré du texte avant de chercher les prix. */
const PHONE_RE = /(?:\+|00)?(?:216[\s.-]?)?\b([2-9]\d)[\s.-]?(\d{3})[\s.-]?(\d{3})\b/g;

export function findPhone(text: string): string | null {
  const m = new RegExp(PHONE_RE.source).exec(text);
  return m ? `${m[1]}${m[2]}${m[3]}` : null;
}

export function detectType(t: string): PropertyType | null {
  for (const [type, words] of TYPE_WORDS) if (has(t, ...words)) return type;
  return null;
}

export function detectTransaction(t: string): TransactionType | null {
  // « kra » en mot entier : « soukra » ne doit pas être lu comme une location
  if (has(t, "a louer", "location", "louer", "loyer", "par mois", "/mois", "mensuel", /(^|[^a-z])kra([^a-z]|$)/, "كراء", "للكراء")) return "RENTAL";
  if (has(t, "a vendre", "vente", "vendre", "achat", "acheter", "bi3", "للبيع", "بيع")) return "SALE";
  return null;
}

/** Montant seul : un loyer se compte en centaines ou milliers de DT, une vente en dizaines de milliers. */
export const inferTransaction = (price: number | null): TransactionType | null =>
  price === null ? null : price < 15000 ? "RENTAL" : "SALE";

export function detectPlace(t: string): { city: string | null; district: string | null } {
  for (const [key, district, city] of DISTRICTS) {
    if (new RegExp(`(^|[^a-z؀-ۿ])${key}([^a-z؀-ۿ]|$)`).test(t)) {
      return { city, district: district || null };
    }
  }
  for (const g of GOVERNORATES) {
    if (new RegExp(`(^|[^a-z])${norm(g)}([^a-z]|$)`).test(t)) return { city: g, district: null };
  }
  return { city: null, district: null };
}

/** Montants : « 320 mille », « 1,2 million », « 1500 dt », « prix 250000 ». */
export function detectPrices(t: string): number[] {
  const out: number[] = [];
  const clean = t.replace(PHONE_RE, " ");
  for (const m of clean.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:millions?|mlns?|مليون)/g)) out.push(num(m[1]) * 1_000_000);
  // « milliard » à la tunisienne (en millimes) = 1 000 000 DT : « 14 milliards » = 14 MDT
  for (const m of clean.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:milliards?|مليار)/g)) out.push(num(m[1]) * 1_000_000);
  // « MD » / « MDT » = mille dinars (385MD = 385 000 DT)
  for (const m of clean.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:milles?|mil\b|k\b|mdt?\b|alf|ألف|الف)/g)) out.push(num(m[1]) * 1000);
  for (const m of clean.matchAll(/(\d[\d\s.]{0,9}\d|\d)\s*(?:dt|tnd|dinars?|د\.?ت)/g)) out.push(num(m[1].replace(/\./g, "")));
  for (const m of clean.matchAll(/\b(?:prix|loyer|budget|a)\s*:?\s*(\d{3,9})(?!\s*(?:m2|m²|m\b|metres|e\b|eme|er\b))/g)) out.push(num(m[1]));
  return out.filter((v) => v > 0);
}

const pickNumber = (t: string, re: RegExp) => {
  const m = re.exec(t);
  return m ? num(m[1]) : null;
};

export interface ParsedProperty {
  title: string;
  type: PropertyType | null;
  transactionType: TransactionType | null;
  price: number | null;
  surface: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  city: string | null;
  district: string | null;
  address: string | null;
  parking: boolean | null;
  furnished: boolean | null;
  elevator: boolean | null;
  balcony: boolean | null;
  garden: boolean | null;
  cellar: boolean | null;
  titleType: TitleType | null;
  charges: number | null;
  landFrontage: number | null;
  landDepth: number | null;
  businessActivity: string | null;
  businessDailyRevenue: number | null;
  commercialMonthlyRevenue: number | null;
  ownerName: string | null;
  ownerPhone: string | null;
  missing: string[];
}

/** Oui / non / non mentionné pour un équipement (« sans ascenseur » → false). */
const feature = (t: string, words: string[]): boolean | null => {
  for (const w of words) {
    if (new RegExp(`(sans|pas de|pas d|non)\\s+${w}`).test(t)) return false;
    if (t.includes(w)) return true;
  }
  return null;
};

export function parsePropertyText(raw: string): ParsedProperty {
  const t = norm(raw);
  const type = detectType(t);
  const transactionType = detectTransaction(t) ?? (type === "LAND" ? "SALE" : null);
  const { city, district } = detectPlace(t);
  const prices = detectPrices(t);
  const sPlus = /\bs\s*\+\s*(\d)/.exec(t);
  const bedrooms = sPlus ? Number(sPlus[1]) : pickNumber(t, /(\d+)\s*chambres?/);
  const surface =
    pickNumber(t, /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metres? carres?|metres?\b|m\b)/) ??
    pickNumber(t, /(\d+(?:[.,]\d+)?)\s*(?:م²|م2|متر|م(?=\s|$))/);
  let floor = pickNumber(t, /(\d+)\s*(?:e|eme|er|ere)\s*etage/);
  if (floor === null && has(t, "rez de chaussee", "rdc")) floor = 0;

  let titleType: TitleType | null = null;
  if (has(t, "titre bleu", "titre individuel", "titre foncier individuel")) titleType = "INDIVIDUAL";
  else if (has(t, "titre collectif", "indivision", "titre commun")) titleType = "COLLECTIVE";
  else if (has(t, "titre en cours", "en cours d immatriculation")) titleType = "IN_PROGRESS";
  else if (has(t, "sans titre", "contrat seulement", "acte seulement")) titleType = "NONE";

  const phone = findPhone(raw);
  // Mots entiers seulement : « commerce » contient « mme »
  const ownerMatch = /(?:^|[^a-z])(?:proprietaire|proprio|mr|mme|monsieur|madame)\s*:?\s*([a-z؀-ۿ]+(?:\s[a-z؀-ۿ]+)?)/.exec(t);
  const ownerName = ownerMatch
    ? ownerMatch[1].replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s(\d.*)$/, "")
    : null;

  const daily = pickNumber(t, /recettes?\s*(?:par jour|\/jour|journalieres?|quotidiennes?)?\s*:?\s*(\d+)/);
  const monthly = pickNumber(t, /(?:revenus?|loue a|loyer actuel)\s*(?:mensuels?|par mois)?\s*:?\s*(\d+)/);
  const activityRaw =
    /activite\s*:?\s*([a-z]+(?:\s[a-z]+)?)/.exec(t)?.[1] ??
    /fonds? (?:de )?commerce\s+(?:de\s+|d\s+)?(?!a\b|en\b|au\b)([a-z]{3,})/.exec(t)?.[1] ??
    null;
  const activity =
    type === "BUSINESS" && activityRaw ? activityRaw.charAt(0).toUpperCase() + activityRaw.slice(1) : null;

  const typeLabel = type ? LABEL[type] : "Bien";
  const title = [
    typeLabel,
    type === "APARTMENT" && bedrooms ? `S+${bedrooms}` : null,
    surface && (type === "LAND" || type === "COMMERCIAL") ? `${surface} m²` : null,
    district || city ? `à ${district ?? city}` : null,
  ].filter(Boolean).join(" ");

  // Prix : le plus grand montant cohérent avec le type d'opération
  const price = prices.length ? Math.max(...prices) : null;

  const result: ParsedProperty = {
    title,
    type,
    transactionType: transactionType ?? inferTransaction(price),
    price,
    surface,
    rooms: bedrooms !== null && type === "APARTMENT" ? bedrooms + 1 : pickNumber(t, /(\d+)\s*pieces?/),
    bedrooms,
    bathrooms: pickNumber(t, /(\d+)\s*(?:salles? de bains?|sdb|salles? d eau)/),
    floor,
    totalFloors: pickNumber(t, /immeuble\s*(?:de)?\s*(\d+)\s*etages?/) ?? pickNumber(t, /r\s*\+\s*(\d)/),
    city,
    district,
    address: null,
    parking: feature(t, ["parking", "garage", "box"]),
    furnished: feature(t, ["meuble", "equipe"]),
    elevator: feature(t, ["ascenseur"]),
    balcony: feature(t, ["balcon", "terrasse"]),
    garden: feature(t, ["jardin"]),
    cellar: feature(t, ["cave", "sous sol"]),
    titleType,
    charges: pickNumber(t, /charges?\s*(?:mensuelles?|syndic)?\s*:?\s*(\d+)/),
    landFrontage: pickNumber(t, /facade\s*(?:de)?\s*:?\s*(\d+(?:[.,]\d+)?)/),
    landDepth: pickNumber(t, /profondeur\s*(?:de)?\s*:?\s*(\d+(?:[.,]\d+)?)/),
    businessActivity: activity,
    businessDailyRevenue: daily,
    commercialMonthlyRevenue: monthly,
    ownerName,
    ownerPhone: phone,
    missing: [],
  };
  if (!type) result.missing.push("type de bien");
  if (!result.transactionType) result.missing.push("vente ou location");
  if (!price) result.missing.push("prix");
  if (!surface) result.missing.push("surface");
  if (!city) result.missing.push("gouvernorat");
  return result;
}

// ── Recherche en langage naturel ──────────────────────────────────────

export interface ParsedSearch {
  type: PropertyType | null;
  transactionType: TransactionType | null;
  city: string | null;
  district: string | null;
  priceMin: number | null;
  priceMax: number | null;
  surfaceMin: number | null;
  surfaceMax: number | null;
  search: string | null;
}

export function parseSearch(raw: string): ParsedSearch {
  const t = norm(raw);
  const prices = detectPrices(t);
  const surface = pickNumber(t, /(\d+(?:[.,]\d+)?)\s*(?:m2|m²|metres?\b|m\b)/);
  const max = has(t, "moins de", "max", "maximum", "jusqu a", "budget", "pas plus", "<");
  const min = has(t, "plus de", "minimum", "au moins", ">");
  const price = prices.length ? Math.max(...prices) : null;
  const { city, district } = detectPlace(t);
  const keywords = ["meuble", "piscine", "vue mer", "jardin", "parking", "ascenseur", "terrasse"].filter((k) => t.includes(k));
  return {
    type: detectType(t),
    transactionType: detectTransaction(t) ?? inferTransaction(price),
    city,
    district,
    priceMin: price && min && !max ? price : null,
    priceMax: price && (max || !min) ? price : null,
    surfaceMin: surface && !has(t, "moins de " + surface) ? surface : null,
    surfaceMax: surface && has(t, "moins de " + surface) ? surface : null,
    search: keywords.length ? keywords[0] : null,
  };
}

/** Le message contient-il au moins un critère de recherche ? */
export const hasCriteria = (s: ParsedSearch) =>
  !!(s.type || s.transactionType || s.city || s.priceMax || s.priceMin || s.surfaceMin);

// ── Matching client ↔ bien ────────────────────────────────────────────

export interface MatchClient {
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredZones: string[];
  preferredPropertyTypes: string[];
  minSurface?: number | null;
  bedrooms?: number | null;
  transactionType?: string | null;
}
export interface MatchProperty {
  type: string;
  transactionType: string;
  price: number;
  surface: number;
  bedrooms?: number | null;
  city?: string | null;
  district?: string | null;
}

/** Score sur 100 + explication. Chaque critère absent chez le client compte à moitié. */
export function scoreMatch(c: MatchClient, p: MatchProperty): { score: number; reason: string } {
  const pros: string[] = [];
  const cons: string[] = [];
  let score = 0;

  // Budget (35)
  if (c.budgetMax) {
    if (p.price <= c.budgetMax) {
      score += c.budgetMin && p.price < c.budgetMin * 0.7 ? 25 : 35;
      pros.push("dans le budget");
    } else {
      const over = Math.round(((p.price - c.budgetMax) / c.budgetMax) * 100);
      score += over <= 10 ? 20 : over <= 25 ? 8 : 0;
      cons.push(`${over} % au-dessus du budget`);
    }
  } else score += 17;

  // Type (20)
  if (c.preferredPropertyTypes.length) {
    if (c.preferredPropertyTypes.includes(p.type)) { score += 20; pros.push("type recherché"); }
    else cons.push("type différent");
  } else score += 10;

  // Zone (25)
  if (c.preferredZones.length) {
    const place = norm(`${p.district ?? ""} ${p.city ?? ""}`);
    const zone = c.preferredZones.find((z) => z && (place.includes(norm(z)) || norm(z).includes(norm(p.city ?? "~"))));
    if (zone) { score += 25; pros.push(`zone souhaitée (${zone})`); }
    else cons.push("hors des zones souhaitées");
  } else score += 12;

  // Surface (10)
  if (c.minSurface) {
    if (p.surface >= c.minSurface) { score += 10; pros.push(`${p.surface} m² ≥ ${c.minSurface} m²`); }
    else { score += p.surface >= c.minSurface * 0.85 ? 5 : 0; cons.push(`surface un peu juste (${p.surface} m²)`); }
  } else score += 5;

  // Chambres (10)
  if (c.bedrooms) {
    if ((p.bedrooms ?? 0) >= c.bedrooms) { score += 10; pros.push(`${p.bedrooms} chambre(s)`); }
    else { score += (p.bedrooms ?? 0) === c.bedrooms - 1 ? 4 : 0; cons.push(`${p.bedrooms ?? 0} chambre(s) au lieu de ${c.bedrooms}`); }
  } else score += 5;

  const reason = [
    pros.length ? `Atouts : ${pros.join(", ")}` : null,
    cons.length ? `Écarts : ${cons.join(", ")}` : null,
  ].filter(Boolean).join(". ");
  return { score: Math.min(100, Math.round(score)), reason: reason || "Critères du client peu précis." };
}

// ── Estimation de prix ────────────────────────────────────────────────

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};
const round = (v: number, step: number) => Math.round(v / step) * step;

export function estimatePrice(
  target: { surface: number; city?: string | null; transactionType: string },
  comparables: { price: number; surface: number; city?: string | null }[],
) {
  const sameCity = comparables.filter((c) => c.city && norm(c.city) === norm(target.city ?? ""));
  const pool = sameCity.length >= 3 ? sameCity : comparables;
  const perSqm = pool.map((c) => c.price / c.surface).sort((a, b) => a - b);
  const step = target.transactionType === "RENTAL" ? 10 : 1000;

  if (perSqm.length === 0) {
    return {
      low: 0, high: 0, recommended: 0, confidence: "LOW" as const, medianPricePerSqm: null,
      explanation: "Aucun bien comparable (même type, même opération) dans l'agence : estimation impossible pour l'instant.",
    };
  }
  const median = quantile(perSqm, 0.5);
  const low = round(quantile(perSqm, 0.25) * target.surface, step);
  const high = round(quantile(perSqm, 0.75) * target.surface, step);
  const recommended = round(median * target.surface, step);
  const confidence = pool.length >= 8 && sameCity.length >= 3 ? "HIGH" : pool.length >= 3 ? "MEDIUM" : "LOW";
  const where = sameCity.length >= 3 ? `dans la même ville (${target.city})` : "toutes villes confondues";
  return {
    low: Math.min(low, recommended),
    high: Math.max(high, recommended),
    recommended,
    confidence: confidence as "HIGH" | "MEDIUM" | "LOW",
    medianPricePerSqm: Math.round(median),
    explanation:
      `Calcul sur ${pool.length} bien(s) comparable(s) ${where} : prix médian ${Math.round(median)} DT/m² ` +
      `× ${target.surface} m². La fourchette correspond au quart le moins cher et au quart le plus cher des comparables. ` +
      `Ce sont des prix affichés, pas des prix de vente conclus.`,
  };
}

// ── Compte rendu de visite ────────────────────────────────────────────

export function analyzeVisitNotes(notes: string) {
  const t = norm(notes);
  const won = has(t, "veut reserver", "reservation", "acompte", "avance", "signer", "compromis", "ok pour acheter", "ok pour louer", "accepte l offre");
  const negative = has(t, "pas interesse", "n aime pas", "naime pas", "decu", "ne convient pas", "trop petit", "trop loin", "refuse", "pas pour lui", "pas pour elle", "ma 3ajbouch", "ma ajbouch", "ما عجبوش", "ما عجبهاش");
  const price = has(t, "cher", "prix eleve", "trop eleve", "negoci", "offre", "baisser", "ghali", "غالي", "remise");
  // Les tournures négatives (« pas intéressé ») sont retirées avant de chercher les positives
  const tPos = t.replace(/(pas|plus|peu|non)\s+(interesse|aime|plait)\w*|n\s?aime pas|ne (lui )?plait pas|ما عجب\S*/g, " ");
  const positive = has(tPos, "aime", "adore", "plait", "interesse", "coup de coeur", "revenir", "contre visite", "deuxieme visite", "3ajbou", "ajbou", "عجبو", "عجبها", "ممتاز");
  const hesitant = has(t, "hesite", "reflechir", "en parler", "sa femme", "son mari", "sa famille", "comparer", "rappeler", "mratou", "rajelha", "3ayltou", "يفكر");

  let interest: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  let followUpStatus: "TO_CONTACT" | "CONTACTED" | "NEGOTIATION" | "WON" | "LOST";
  let days: number | null;
  let nextStep: string;
  if (won) {
    interest = "HIGH"; followUpStatus = "WON"; days = 1;
    nextStep = "Préparer la réservation (acompte, documents) et prévenir le propriétaire.";
  } else if (negative && !positive) {
    interest = "NONE"; followUpStatus = "LOST"; days = 14;
    nextStep = "Proposer d'autres biens plus adaptés à ses critères.";
  } else if (price) {
    interest = positive ? "HIGH" : "MEDIUM"; followUpStatus = "NEGOTIATION"; days = 2;
    nextStep = "Recueillir son offre de prix et la transmettre au propriétaire.";
  } else if (positive) {
    interest = hesitant ? "MEDIUM" : "HIGH"; followUpStatus = "CONTACTED"; days = hesitant ? 3 : 2;
    nextStep = hesitant ? "Le rappeler après sa réflexion et proposer une contre-visite." : "Proposer une contre-visite ou passer à l'offre.";
  } else if (hesitant) {
    interest = "MEDIUM"; followUpStatus = "CONTACTED"; days = 3;
    nextStep = "Le rappeler pour connaître sa décision.";
  } else {
    interest = "LOW"; followUpStatus = "CONTACTED"; days = 7;
    nextStep = "Faire un point avec le client et lui proposer d'autres biens si besoin.";
  }
  return { interest, followUpStatus, nextFollowUpInDays: days, nextStep };
}

const INTEREST_FR = { HIGH: "très intéressé", MEDIUM: "intéressé mais hésitant", LOW: "peu intéressé", NONE: "pas intéressé" };

export function visitReportText(input: { client: string; date: string; properties: string[]; notes: string; interest: keyof typeof INTEREST_FR }) {
  const notes = input.notes.trim().replace(/\s+/g, " ");
  const sentence = notes.charAt(0).toUpperCase() + notes.slice(1) + (/[.!?]$/.test(notes) ? "" : ".");
  return (
    `Visite du ${input.date} avec ${input.client}` +
    (input.properties.length ? ` pour : ${input.properties.join(", ")}.` : ".") +
    `\nRetour du client : ${sentence}` +
    `\nÉvaluation : client ${INTEREST_FR[input.interest]}.`
  );
}

// ── Textes générés à partir de modèles ────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export function describeProperty(p: Record<string, unknown>, lang: Lang, agency: string): string {
  const type = (p.type as PropertyType) || "OTHER";
  const rental = p.transactionType === "RENTAL";
  const surface = Number(p.surface) || null;
  const price = Number(p.price) || null;
  const bedrooms = Number(p.bedrooms) || null;
  const place = [p.district, p.city].filter(Boolean).join(", ");
  const yes = (k: string) => p[k] === true;

  if (lang === "ar") {
    const parts = [
      `${rental ? "للكراء" : "للبيع"} ${LABEL_AR[type]}${bedrooms ? ` تتكون من ${bedrooms} غرف نوم` : ""}${place ? ` في ${place}` : ""}.`,
      surface ? `المساحة ${fmt(surface)} م².` : "",
      [yes("elevator") && "مصعد", yes("parking") && "مأوى سيارات", yes("furnished") && "مفروش", yes("balcony") && "شرفة", yes("garden") && "حديقة"].filter(Boolean).length
        ? `المميزات: ${[yes("elevator") && "مصعد", yes("parking") && "مأوى سيارات", yes("furnished") && "مفروش", yes("balcony") && "شرفة", yes("garden") && "حديقة"].filter(Boolean).join("، ")}.`
        : "",
      p.titleType === "INDIVIDUAL" ? "رسم عقاري فردي." : "",
      price ? `السعر: ${fmt(price)} د.ت${rental ? " شهريا" : ""}.` : "",
      `للمزيد من المعلومات أو لتحديد موعد زيارة، اتصلوا بوكالة ${agency}.`,
    ];
    return parts.filter(Boolean).join(" ");
  }

  const features = [
    yes("elevator") && "ascenseur",
    yes("parking") && "parking",
    yes("furnished") && "entièrement meublé",
    yes("balcony") && "balcon",
    yes("garden") && "jardin",
    yes("cellar") && "cave",
  ].filter(Boolean) as string[];

  if (lang === "tn") {
    return [
      `${LABEL[type]}${bedrooms ? ` S+${bedrooms}` : ""} ${rental ? "lel kra" : "lel bi3"}${place ? ` fi ${place}` : ""}.`,
      surface ? `Mesa7a ${fmt(surface)} m².` : "",
      features.length ? `Fih : ${features.join(", ")}.` : "",
      p.titleType === "INDIVIDUAL" ? "Titre bleu." : "",
      price ? `Soum : ${fmt(price)} DT${rental ? " fel chhar" : ""}.` : "",
      `Kallmouna fi ${agency} bech ta3mlou visite.`,
    ].filter(Boolean).join(" ");
  }

  // Accord : « une villa située », « elle comprend »
  const fem = type === "VILLA" || type === "HOUSE";
  const pron = fem ? "Elle" : "Il";
  const intro = `${rental ? "À louer" : "À vendre"} : ${LABEL[type].toLowerCase()}${
    type === "APARTMENT" && bedrooms ? ` S+${bedrooms}` : ""
  }${surface ? ` de ${fmt(surface)} m²` : ""}${place ? `, situé${fem ? "e" : ""} à ${place}` : ""}.`;
  const rooms = [
    bedrooms && type !== "APARTMENT" ? `${bedrooms} chambre(s)` : null,
    Number(p.bathrooms) ? `${p.bathrooms} salle(s) de bain` : null,
  ].filter(Boolean);
  const floorText =
    p.floor !== undefined && p.floor !== null && p.floor !== ""
      ? Number(p.floor) === 0 ? "en rez-de-chaussée" : `au ${p.floor}e étage`
      : null;
  const layout = [
    rooms.length ? `${pron} comprend ${rooms.join(" et ")}` : null,
    floorText ? `${rooms.length ? "et se situe" : `${pron} se situe`} ${floorText}` : null,
  ].filter(Boolean);
  const extras: string[] = [];
  if (type === "LAND") {
    if (Number(p.landFrontage)) extras.push(`façade de ${p.landFrontage} m`);
    if (Number(p.landCos)) extras.push(`COS ${p.landCos}`);
    if (yes("landServiced")) extras.push("terrain viabilisé");
  }
  if (type === "BUSINESS" && Number(p.businessDailyRevenue)) extras.push(`recette d'environ ${fmt(Number(p.businessDailyRevenue))} DT par jour`);
  if (type === "COMMERCIAL" && Number(p.commercialMonthlyRevenue)) extras.push(`revenu de ${fmt(Number(p.commercialMonthlyRevenue))} DT par mois`);

  const paragraphs = [
    intro + (layout.length ? ` ${layout.join(" ")}.` : ""),
    [
      features.length ? `${pron} dispose de : ${features.join(", ")}.` : "",
      extras.length ? `Points forts : ${extras.join(", ")}.` : "",
      p.titleType === "INDIVIDUAL" ? "Titre foncier individuel." : p.titleType === "COLLECTIVE" ? "Titre foncier collectif." : "",
    ].filter(Boolean).join(" "),
    `${price ? `Prix : ${fmt(price)} DT${rental ? " par mois" : ""}. ` : ""}Contactez l'agence ${agency} pour plus d'informations ou pour organiser une visite.`,
  ];
  return paragraphs.filter(Boolean).join("\n\n");
}

export function visitConfirmation(
  f: {
    client: string;
    date: string;
    properties: { title: string; address: string }[];
    fee: number;
    agent: { name: string; phone: string | null } | null;
    agency: { name: string; address: string; mapsUrl: string; phone: string };
  },
  lang: Lang,
): string {
  const biens = f.properties.map((p) => `• ${p.title}${p.address ? ` (${p.address})` : ""}`).join("\n");
  const ag = f.agency;
  // Lieu du rendez-vous : adresse et/ou lien Google Maps, puis téléphone de l'agence
  const meeting = (intro: string, sep: string, mapLabel: string, phoneLabel: string) =>
    [
      ag.address || ag.mapsUrl ? `${intro} ${ag.name}${ag.address ? `${sep}${ag.address}` : ""}` : "",
      ag.mapsUrl ? `📍 ${mapLabel}${ag.mapsUrl}` : "",
      ag.phone ? `📞 ${phoneLabel}${ag.phone}` : "",
    ].filter(Boolean).join("\n");
  if (lang === "ar") {
    return [
      `مرحبا ${f.client} 👋`,
      `نؤكد لكم موعد الزيارة يوم ${f.date}:`,
      biens,
      `معلوم الزيارة: ${f.fee} د.ت يدفع يوم الزيارة.`,
      meeting("الموعد في وكالة", ": ", "الموقع: ", "هاتف الوكالة: "),
      f.agent ? `المرافق: ${f.agent.name}${f.agent.phone ? ` (${f.agent.phone})` : ""}` : "",
      "الرجاء تأكيد حضوركم بالرد على هذه الرسالة. شكرا!",
    ].filter(Boolean).join("\n\n");
  }
  if (lang === "tn") {
    return [
      `Aslema ${f.client} 👋`,
      `N2akdoulek el visite nhar ${f.date} :`,
      biens,
      `Frais el visite : ${f.fee} DT tkhallashom nhar el visite.`,
      meeting("El rendez-vous fel agence", " : ", "Localisation : ", "Tel agence : "),
      f.agent ? `${f.agent.name} bech ykoun m3ak${f.agent.phone ? ` (${f.agent.phone})` : ""}.` : "",
      "A3tina confirmation b reply 3al message hedha. Y3aychek !",
    ].filter(Boolean).join("\n\n");
  }
  return [
    `Bonjour ${f.client} 👋`,
    `Nous vous confirmons votre visite le ${f.date} :`,
    biens,
    `Frais de visite : ${f.fee} DT, à régler sur place le jour de la visite.`,
    meeting("Rendez-vous à l'agence", " : ", "Localisation : ", "Téléphone de l'agence : "),
    f.agent ? `Votre conseiller : ${f.agent.name}${f.agent.phone ? ` (${f.agent.phone})` : ""}.` : "",
    "Merci de confirmer votre présence en répondant à ce message.",
  ].filter(Boolean).join("\n\n");
}

/** Réponse de l'assistant du site, sans IA. */
export function chatReply(input: {
  lastMessage: string;
  criteria: boolean;
  exact: boolean;
  count: number;
  leadCreated: boolean;
  phoneGiven: boolean;
  fee: number;
}): string {
  const arabic = /[؀-ۿ]/.test(input.lastMessage);
  if (input.leadCreated) {
    return arabic
      ? "شكرا! تم تسجيل رقمكم وسيتصل بكم أحد مستشارينا في أقرب وقت."
      : "Merci ! Votre numéro est bien enregistré : un conseiller vous rappelle rapidement.";
  }
  if (!input.criteria) {
    return arabic
      ? "مرحبا! أخبرونا عن نوع العقار، المدينة والميزانية، وسنقترح عليكم العقارات المتوفرة."
      : "Avec plaisir ! Indiquez-moi le type de bien, la ville et votre budget (ex. « S+2 à louer à La Marsa, 1500 DT max ») et je vous propose nos biens disponibles.";
  }
  if (input.count === 0) {
    return "Je n'ai pas de bien disponible correspondant pour le moment. Laissez-moi votre numéro de téléphone et un conseiller vous rappellera dès qu'un bien se libère.";
  }
  const intro = input.exact
    ? `Voici ${input.count > 1 ? `${input.count} biens qui correspondent` : "un bien qui correspond"} à votre recherche :`
    : "Je n'ai pas trouvé exactement ce que vous cherchez, mais voici nos biens disponibles qui s'en rapprochent :";
  return `${intro}\nLes frais de visite sont de ${input.fee} DT. Pour organiser une visite, laissez-moi votre numéro de téléphone.`;
}
