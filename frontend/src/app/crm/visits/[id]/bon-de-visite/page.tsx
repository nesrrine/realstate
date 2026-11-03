"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { visitsService } from "@/services/visits.service";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/* Constantes agence (à modifier ici si besoin)                        */
/* ------------------------------------------------------------------ */
const AGENCY = {
  name: "Le Portail Immobilier",
  branch: "Le Portail Immobilier - Aouina",
  address: "Résidence Khalij, Aouina",
  mf: "1680173/M",
  phones: ["+21622009309", "+21622009302"],
  email: "contact@leportailimmo.com",
};
const LOGO_SRC = "/logo-portail-immobilier.png"; // à placer dans /public
const CITY_FR = "Tunis";
const CITY_AR = "تونس";

type Lang = "fr" | "ar";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const clean = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

const formatLongDate = (d: Date, lang: Lang) =>
  d.toLocaleDateString(lang === "ar" ? "ar-TN-u-nu-latn" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** Affiche la valeur, ou une ligne pointillée si elle est vide (à remplir à la main). */
function Val({ v, dots = 34 }: { v: string; dots?: number }) {
  return <span>{v || ".".repeat(dots)}</span>;
}

/* ------------------------------------------------------------------ */
/* Textes                                                              */
/* ------------------------------------------------------------------ */
const TEXT = {
  fr: {
    title: "Accord préliminaire d'achat",
    visit: "Visite",
    identity: "Identité du signataire",
    dateLieu: "Date et lieu",
    nom: "Nom et prénom",
    cin: "N° CIN / Passeport",
    adresse: "Adresse",
    tel: "Téléphone",
    signature: "Signature",
    faitLe: "Fait le",
    approved: "Lu et approuvé, bon pour accord",
    agencyLeft: "Agence immobilière",
    tagline: "Vente · Achat · Location",
  },
  ar: {
    title: "إتفاق مبدئي للشراء",
    visit: "Visite",
    identity: "بيانات الممضي",
    dateLieu: "التاريخ والمكان",
    nom: "الاسم واللقب",
    cin: "رقم بطاقة تعريف",
    adresse: "العنوان",
    tel: "رقم الهاتف",
    signature: "الإمضاء",
    faitLe: "حرر يوم",
    approved: "أطلعت و وقعت عليه",
    agencyLeft: "Agence immobilière",
    tagline: "Vente · Achat · Location",
  },
};

export default function BonDeVisitePage() {
  const params = useParams();
  const visitId = params.id as string;
  const [lang, setLang] = useState<Lang>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data: visit, isLoading } = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => visitsService.getById(visitId),
    enabled: !!visitId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Préparation du bon de visite…</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <p className="text-destructive">Visite introuvable.</p>
          <Link href="/crm/visits">
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded">Retour aux visites</button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------- Données ---------------- */
  const v: any = visit;
  const client: any = v.client ?? {};
  const properties: any[] = v.properties ?? [];

  const fullName = [clean(client.firstName), clean(client.lastName)].filter(Boolean).join(" ");
  // ⚠️ Adapter le nom du champ CIN/passeport à votre modèle Client
  const cinOrPassport = clean(client.cinOrPassport ?? client.cin ?? client.passport);
  const address = [clean(client.address), clean(client.city), clean(client.zipCode)].filter(Boolean).join(", ");
  const phone = clean(client.phone);

  const docDate = new Date(v.scheduledAt ?? v.createdAt ?? Date.now());
  const dateStr = formatLongDate(docDate, lang);

  // Biens : "Titre — Ville — Réf"
  const propertyLines: string[] = properties.map((p) => {
    const prop = p.property ?? p;
    return [clean(prop.title), clean(prop.city), clean(prop.reference ?? prop.ref ?? prop.code)]
      .filter(Boolean)
      .join(" — ");
  });
  const refs = properties
    .map((p) => clean((p.property ?? p).reference ?? (p.property ?? p).ref ?? (p.property ?? p).code))
    .filter(Boolean)
    .join(", ");

  const t = TEXT[lang];
  const rtl = lang === "ar";

  const Row = ({ label, value, dots }: { label: string; value: string; dots?: number }) => (
    <div>
      {label} : <Val v={value} dots={dots} />
    </div>
  );

  const renderSheet = (forPrint: boolean) => (
    <>
      {/* ---------------- Feuille A4 ---------------- */}
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={`mx-auto flex flex-col bg-white px-[19mm] pb-[12mm] pt-[16mm] text-[10.5pt] leading-[1.6] text-[#111] ${forPrint ? "h-[296mm] w-[210mm] overflow-hidden" : "min-h-[285mm] w-full max-w-[210mm] shadow"}`}
      >
        {/* En-tête */}
        <div dir="ltr" className="flex items-start justify-between">
          <div className="w-[36%] text-[9pt] leading-[1.55] text-gray-600">
            <div className="mb-0.5 text-[12pt] font-bold text-[#111]">{AGENCY.name}</div>
            <div>{t.agencyLeft}</div>
            <div>{AGENCY.branch}</div>
            <div>{t.tagline}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt={AGENCY.name}
            className="h-[24mm] w-[24mm] object-contain"
          />
          <div
            dir={rtl ? "rtl" : "ltr"}
            className="w-[36%] text-right text-[9pt] leading-[1.55] text-gray-600"
          >
            <div className="mb-0.5 text-[12pt] font-bold text-[#111]">{AGENCY.name}</div>
            {rtl ? (
              <>
                <div>وكالة عقارية</div>
                <div dir="ltr">{AGENCY.branch}</div>
                <div>بيع · شراء · كراء</div>
              </>
            ) : (
              <>
                <div>{AGENCY.branch}</div>
                <div>{AGENCY.address}</div>
              </>
            )}
          </div>
        </div>

        {/* Titre */}
        <h1 className="mb-1 mt-[12mm] text-center text-[21pt] font-bold">{t.title}</h1>
        <div dir="ltr" className="text-center">
          REF : <Val v={refs} dots={18} />
        </div>
        <div className="mb-[5mm] text-center font-bold">{t.visit}</div>

        {/* Identité */}
        <div className="mb-[3mm] font-bold">{t.identity}</div>
        <Row label={t.dateLieu} value={rtl ? `${CITY_AR} في ${dateStr}` : `${CITY_FR}, le ${dateStr}`} />
        <Row label={t.nom} value={fullName} />
        <Row label={t.cin} value={cinOrPassport} dots={26} />
        <Row label={t.adresse} value={address} />
        <Row label={t.tel} value={phone} dots={26} />

        <hr className="my-[3.5mm] border-t-[1.6px] border-[#111]" />

        {/* Engagement 1 */}
        <p className={`mb-[3mm] ${rtl ? "text-right" : "text-justify"}`}>
          {rtl ? (
            <>
              أتعهد بأنني أتعامل مع شركة <bdi className="font-bold">{AGENCY.name}</bdi> عبر وكالتها{" "}
              <bdi className="font-bold">{AGENCY.branch}</bdi> الكائنة في{" "}
              <bdi className="font-bold">{AGENCY.address}</bdi>، وذلك بهدف التوسط في شراء العقار أو العقارات
              المذكورة أدناه، بعد الاطلاع الميداني عليها.
            </>
          ) : (
            <>
              Je m'engage à traiter avec la société <b>{AGENCY.name}</b> par l'intermédiaire de son agence{" "}
              <b>{AGENCY.branch}</b> située à <b>{AGENCY.address}</b>, dans le but de négocier l'achat du ou des
              biens immobiliers mentionnés ci-dessous, après visite sur place.
            </>
          )}
        </p>

        <p className={`mb-[3mm] ${rtl ? "text-right" : "text-justify"}`}>
          {rtl
            ? "كما أصرح بأني سأقوم بزيارة ميدانية للعقار المذكور الذي تحت تصرف الوكالة قصد شراءه:"
            : "Je déclare également effectuer une visite sur place du bien mentionné, placé sous la responsabilité de l'agence, en vue de son achat :"}
        </p>

        {/* Bien(s) */}
        <div className="mb-[4mm] min-h-[11mm] rounded border border-[#111] px-[4mm] py-[2.5mm]">
          {propertyLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <hr className="my-[3.5mm] border-t-[1.6px] border-[#111]" />

        {/* Engagement 2 */}
        <p className={`mb-[3mm] ${rtl ? "text-right" : "text-justify"}`}>
          {rtl ? (
            <>
              كما أني أتعهد بعدم محاولة التعامل بشكل مباشر أو غير مباشر مع المالك مدة <b>24 شهر</b> من هذا اليوم و
              إلا أكون قد خالفت عمولة الوكالة المقدرة بـ <b>2٪</b> من كامل المبلغ المحرر في العقد النهائي (أو عقد
              الوعد بالبيع أو عقد بيع نهائي).
            </>
          ) : (
            <>
              Je m'engage à ne pas tenter de traiter directement ou indirectement avec le propriétaire pendant une
              durée de <b>24 mois</b> à compter de ce jour, faute de quoi j'aurais violé la commission de l'agence
              fixée à <b>2 %</b> du montant total inscrit dans le contrat définitif (promesse de vente ou acte de
              vente définitif).
            </>
          )}
        </p>

        <hr className="my-[3.5mm] border-t-[1.6px] border-[#111]" />

        {/* Signature */}
        <div className="flex justify-between">
          <span>{t.signature}</span>
          <span>
            {t.faitLe} {dateStr}
          </span>
        </div>
        <div>{t.approved}</div>
        <div className="h-[22mm]" />

        {/* Pied de page */}
        <div
          dir="ltr"
          className="mt-auto border-t border-gray-300 pt-[3mm] text-center text-[8.8pt] leading-[1.7] text-gray-700"
        >
          <div>
            MF{rtl ? "" : " "}: {AGENCY.mf} · {AGENCY.phones.join(" · ")}
          </div>
          <div>Email{rtl ? "" : " "}: {AGENCY.email}</div>
          <div>{AGENCY.address}</div>
        </div>
      </div>

    </>
  );

  return (
    <>
      {/* Écran : aperçu dans l'application (masqué à l'impression) */}
      <div className="mx-auto max-w-[210mm] bg-white p-10 print:hidden">
      {/* Outils visibles uniquement à l'écran */}
      <div className="print:hidden mb-6 flex justify-between items-center">
        <Link href={`/crm/visits/${v.id}`}>
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">← Retour à la visite</button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded border overflow-hidden text-sm">
            <button
              onClick={() => setLang("fr")}
              className={`px-3 py-2 ${lang === "fr" ? "bg-primary text-white" : "bg-white"}`}
            >
              Français
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-3 py-2 ${lang === "ar" ? "bg-primary text-white" : "bg-white"}`}
            >
              العربية
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

        {renderSheet(false)}
      </div>

      {/* Impression : seule la feuille est imprimée (rendue hors de la mise en page de l'application) */}
      {mounted && createPortal(<div id="print-root">{renderSheet(true)}</div>, document.body)}

      <style jsx global>{`
        #print-root {
          display: none;
        }
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          body > *:not(#print-root) {
            display: none !important;
          }
          #print-root {
            display: block !important;
          }
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}