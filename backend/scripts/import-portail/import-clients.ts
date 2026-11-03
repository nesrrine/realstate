/**
 * Import du fichier « base de donnes portail 2026.xlsx » (suivi des visites clients) dans le CRM.
 *
 * 1. Lire l'Excel (bibliothèque standard Python, aucune installation) :
 *      python -I scripts/import-portail/lire-excel.py "C:\\...\\base de donnes portail 2026.xlsx" scripts/import-portail/sortie/portail.json
 * 2. Importer (SIMULATION par défaut, --executer pour écrire dans le CRM) :
 *      npx ts-node -T scripts/import-portail/import-clients.ts
 *      npx ts-node -T scripts/import-portail/import-clients.ts --executer
 *
 * Pour chaque ligne : un client (acheteur ou locataire) avec ses critères (types, zones, surface,
 * budget, mode de paiement, besoin exact), l'agent bureau et l'agent terrain, le statut de suivi,
 * et un historique (interaction datée) reprenant le résultat et les remarques.
 * Un client déjà présent (même téléphone, même agent) n'est pas recréé.
 */
import * as fs from "fs";
import * as path from "path";
import { findPhone, norm } from "../../src/ai/rules";

const args = process.argv.slice(2);
const EXECUTE = args.includes("--executer");
const API = "http://localhost:3001/api";
const EMAIL = process.env.IMPORT_EMAIL || "admin@agency.com";
const PASSWORD = process.env.IMPORT_PASSWORD || "Admin1234!";

const OUT = path.join(__dirname, "sortie");
const INPUT = path.join(OUT, "portail.json");
const STATE_FILE = path.join(OUT, "import-etat.json");
const REPORT = path.join(OUT, "rapport-import-clients.csv");

// ── Lecture du tableau ────────────────────────────────────────────────

const COLS = {
  date: "date", "agent bureau": "officeAgent", "agent terrain": "fieldAgent", nom: "firstName", prenom: "lastName",
  telephone: "phone", demande: "request", modalite: "financing", zone: "zone", "superficie -type ap": "size",
  "budget (dt)": "budget", "besoin exact": "need", "resultat +remarque": "remark", resultat: "result", trouve: "found",
} as const;
type Row = Partial<Record<(typeof COLS)[keyof typeof COLS], string>>;

function readRows(): Row[] {
  const sheets = JSON.parse(fs.readFileSync(INPUT, "utf8")) as Record<string, string[][]>;
  const all = Object.values(sheets).find((r) => r.length) ?? [];
  // La ligne d'en-tête est celle qui contient « Téléphone »
  const h = all.findIndex((r) => r.some((c) => norm(c ?? "") === "telephone"));
  if (h < 0) throw new Error("En-tête introuvable (colonne « Téléphone »).");
  const header = all[h].map((c) => norm(c ?? ""));
  return all.slice(h + 1).map((r) => {
    const row: Row = {};
    header.forEach((name, i) => {
      const key = COLS[name as keyof typeof COLS];
      if (key && r[i] !== undefined && r[i] !== null) row[key] = String(r[i]).trim();
    });
    return row;
  });
}

// ── Conversion des valeurs ────────────────────────────────────────────

/** Date Excel (nombre de jours depuis le 30/12/1899) ou texte jj/mm/aaaa. */
function excelDate(v?: string): string | null {
  if (!v) return null;
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(v) * 86400000);
    return d.toISOString();
  }
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 9)).toISOString() : null;
}

const TYPE_WORDS: [string, RegExp][] = [
  ["LAND", /terrain|terain|lot/],
  ["VILLA", /villa|vilal/],
  ["HOUSE", /maison|maidon/],
  ["APARTMENT", /appart|apart|app\b|s\+\d/],
  ["BUSINESS", /fond|fonds/],
  ["COMMERCIAL", /local|depot|dépôt|magasin/],
  ["OFFICE", /bureau/],
];
const typesOf = (s: string) => TYPE_WORDS.filter(([, re]) => re.test(norm(s))).map(([t]) => t);

function financingOf(s?: string): "CASH" | "CREDIT" | "MIXED" | undefined {
  const t = norm(s ?? "");
  const cash = /cash|cach|comptant|espece/.test(t);
  const credit = /credit|caredit|banque|pret/.test(t);
  return cash && credit ? "MIXED" : cash ? "CASH" : credit ? "CREDIT" : undefined;
}

/** Statut de suivi d'après la colonne « Résultat » (et la remarque si le résultat est vide). */
function followUpOf(result: string, remark: string): "TO_CONTACT" | "CONTACTED" | "NEGOTIATION" | "WON" | "LOST" {
  const t = norm(`${result} ${remark}`);
  const r = norm(result);
  if (/conclu|contrat final|achete aupres de notre agence|vente signee/.test(t)) return "WON";
  if (/sans suite|achat ailleurs|autre agence|achete un autre|ne veux pas|pas interesse pour le moment/.test(t) && !/tres interesse/.test(r)) return "LOST";
  if (/tres interesse|negociation|verification|acompte|en cours|promesse/.test(r)) return "NEGOTIATION";
  if (/rappeler|relance/.test(r)) return "TO_CONTACT";
  if (/visite|cible|contact/.test(r)) return "CONTACTED";
  return remark ? "CONTACTED" : "TO_CONTACT";
}

const cap = (s: string) => s.trim().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());

// ── API ───────────────────────────────────────────────────────────────

let token = "";
async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = Array.isArray(j.message) ? j.message.join(", ") : j.message ?? text;
    } catch { /* non JSON */ }
    throw Object.assign(new Error(`${res.status} : ${msg}`), { status: res.status });
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// ── Programme principal ───────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Lancez d'abord lire-excel.py (fichier attendu : ${INPUT}).`);
  const rows = readRows().filter((r) => (r.firstName || r.lastName) && findPhone(r.phone ?? "") || (r.phone ?? "").replace(/\D/g, "").length >= 8);
  const state: Record<string, string> = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : {};

  // Connexion aussi en simulation : lecture seule des agents pour vérifier leur correspondance
  const login = await fetch(`${API}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) throw new Error("Connexion au CRM impossible : le backend est-il démarré ?");
  const auth = await login.json();
  token = auth.accessToken;
  const me: { agentId?: string } = auth.user;
  const agents: { id: string; user: { firstName: string; lastName: string } }[] = await api("GET", "/agents/options");

  /** Agent CRM dont le prénom ressemble au nom saisi (« nersine » → nesrine, « hejer » → hajer). */
  /** Distance d'édition (fautes de frappe : « nersine » ≈ « nesrine »). */
  const distance = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  // « chams /nesrine » : on essaie chaque nom, le premier connu du CRM l'emporte
  const agentOf = (name?: string) => {
    for (const n of norm(name ?? "").split(/[\s/,]+/).filter((x) => x.length > 2)) {
      const found = agents.find((a) => {
        const f = norm(a.user.firstName);
        return f === n || (n.length >= 5 && distance(f, n) <= 2) || (n.length >= 4 && distance(f, n) <= 1);
      });
      if (found) return found.id;
    }
    return undefined;
  };

  console.log(`${EXECUTE ? "IMPORT" : "SIMULATION (ajoutez --executer pour importer)"} — ${rows.length} client(s) dans le fichier.`);
  const report: string[][] = [["client", "telephone", "resultat", "client_id", "suivi", "remarque_import"]];
  let created = 0;

  for (const r of rows) {
    const phone = findPhone(r.phone ?? "") ?? (r.phone ?? "").replace(/[^\d+]/g, "");
    const firstName = cap(r.firstName || "Client");
    const lastName = cap(r.lastName || "(à compléter)");
    const key = `${norm(firstName)} ${norm(lastName)} ${phone}`;
    const types = typesOf(`${r.request ?? ""} ${r.size ?? ""}`);
    const rental = /location|louer|kra/.test(norm(r.request ?? ""));
    const sizeText = norm(r.size ?? "");
    const surface = /(\d{2,5})/.exec(sizeText.replace(/s\s*\+\s*\d/g, ""))?.[1];
    const bedrooms = /s\s*\+\s*(\d)/.exec(sizeText)?.[1];
    // Budget : « 400 » = 400 MD pour un achat ; « 250-300 » = fourchette (min / max)
    const amounts = (r.budget ?? "").replace(/\s/g, "").split(/[-/à]|\ba\b/).map((x) => Number(x.replace(/[^\d.]/g, ""))).filter((x) => x > 0);
    const scale = (x: number) => (!rental && x < 5000 ? x * 1000 : x);
    // Au-delà de 50 MDT, c'est une erreur de saisie : non retenu (la valeur reste dans les notes)
    const rawBudget = amounts.length ? scale(Math.max(...amounts)) : undefined;
    const budget = rawBudget && rawBudget <= 50_000_000 ? rawBudget : undefined;
    const budgetMin = amounts.length > 1 ? scale(Math.min(...amounts)) : undefined;
    const zones = (r.zone ?? "").split(/[-,/]|\bet\b/).map((z) => cap(z)).filter((z) => z.length > 1);
    const status = followUpOf(r.result ?? "", r.remark ?? "");
    const date = excelDate(r.date);
    const officeAgent = agentOf(r.officeAgent);
    const fieldAgent = agentOf(r.fieldAgent);
    const unknownAgents = [r.officeAgent && !officeAgent && `bureau « ${r.officeAgent.trim()} »`, r.fieldAgent && !fieldAgent && `terrain « ${r.fieldAgent.trim()} »`].filter(Boolean);

    const notes = [
      "Importé depuis « base de donnes portail 2026 ».",
      r.size ? `Superficie / type demandé : ${r.size}` : null,
      r.budget ? `Budget saisi dans l'Excel : ${r.budget}` : null,
      unknownAgents.length ? `Agent(s) absent(s) du CRM : ${unknownAgents.join(", ")}` : null,
    ].filter(Boolean).join("\n");

    const payload = {
      ...(officeAgent ?? me.agentId ? { agentId: officeAgent ?? me.agentId } : {}),
      ...(fieldAgent && { fieldAgentId: fieldAgent }),
      firstName, lastName, phone,
      cinOrPassport: "À compléter",
      professionalAddress: "À compléter",
      clientType: rental ? "RENTER" : "BUYER",
      transactionType: rental ? "RENTAL" : "SALE",
      ...(types.length && { preferredPropertyTypes: types }),
      ...(zones.length && { preferredZones: zones }),
      ...(surface && { minSurface: Number(surface) }),
      ...(bedrooms && { bedrooms: Number(bedrooms) }),
      ...(budget && { budgetMax: budget }),
      ...(budgetMin && { budgetMin }),
      ...(financingOf(r.financing) && { financing: financingOf(r.financing) }),
      ...(r.need && { needDescription: r.need.slice(0, 2000) }),
      followUpStatus: status,
      status: status === "WON" ? "CLIENT" : "PROSPECT",
      ...(date && { lastInteractionAt: date }),
      notes,
    };

    if (!EXECUTE) {
      console.log(`• ${firstName} ${lastName} (${phone}) — ${types.join("/") || "?"} ${zones.join(", ")} | ${budget ?? "budget ?"} DT | ${payload.financing ?? "paiement ?"} | suivi ${status}${unknownAgents.length ? ` | agents inconnus : ${unknownAgents.join(", ")}` : ""}`);
      report.push([`${firstName} ${lastName}`, phone, r.result ?? "", "", status, unknownAgents.join(", ")]);
      continue;
    }
    if (state[key]) { report.push([`${firstName} ${lastName}`, phone, r.result ?? "", state[key], status, "déjà importé"]); continue; }

    try {
      const client = await api<{ id: string }>("POST", "/clients", payload);
      state[key] = client.id;
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1), "utf8");
      // Historique : le résultat et la remarque deviennent une interaction datée
      if (r.remark || r.result) {
        await api("POST", `/clients/${client.id}/interactions`, {
          type: "NOTE",
          title: `Suivi visites${r.result ? ` – ${r.result}` : ""}`.slice(0, 200),
          body: [r.remark, r.need && `Besoin : ${r.need}`].filter(Boolean).join("\n\n") || undefined,
          ...(date && { occurredAt: date }),
          followUpStatus: status,
        });
      }
      created++;
      console.log(`✓ ${firstName} ${lastName} (${phone}) → ${status}`);
      report.push([`${firstName} ${lastName}`, phone, r.result ?? "", client.id, status, unknownAgents.join(", ")]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const dup = (e as { status?: number }).status === 409;
      console.log(`${dup ? "=" : "✗"} ${firstName} ${lastName} (${phone}) — ${dup ? "déjà dans le CRM (même téléphone), non recréé" : msg}`);
      report.push([`${firstName} ${lastName}`, phone, r.result ?? "", "", status, dup ? "déjà dans le CRM" : `erreur : ${msg}`]);
    }
  }

  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  fs.writeFileSync(REPORT, "\uFEFF" + report.map((x) => x.map(cell).join(";")).join("\r\n"), "utf8");
  console.log(`\n${EXECUTE ? `Clients créés : ${created}` : "Simulation terminée"} — rapport : ${REPORT}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
