import React from "react";
import "./blue-premium.css";

export interface BluePremiumProps {
  logoUrl?: string;
  title: string;
  propertyType: string;
  location: string;
  locationSub?: string;
  surface?: number;
  price?: number | string;
  pricePerSqm?: number | string;
  phone?: string;
  slogan?: string;
  imageUrl?: string;
  agencyName?: string;
  agencyPhone?: string;
}

const BluePremium: React.FC<BluePremiumProps> = ({
  logoUrl = "/logo-portail-immobilier.png",
  title,
  propertyType,
  location,
  locationSub,
  surface,
  price,
  pricePerSqm,
  phone,
  slogan = "Votre projet, notre priorit\u00e9",
  imageUrl,
  agencyName = "Le Portail Immobilier",
  agencyPhone,
}) => {
  const formatPrice = (p?: number | string) => {
    if (p === undefined || p === null || p === "") return "";
    const n = Number(p);
    if (Number.isNaN(n)) return String(p);
    return n.toLocaleString("fr-FR") + " DT";
  };

  return (
    <div className="blue-premium">
      <div className="header">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="logo" />
        ) : (
          <div style={{ height: 60, width: 200, background: "#fff", borderRadius: 8 }} />
        )}
        <div className="slogan">{slogan}</div>
      </div>

      <div className="photo-wrap">
        {imageUrl ? (
          <img src={imageUrl} alt={title} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#e2e8f0" }} />
        )}
        <div className="ribbon">A VENDRE</div>
        <div className="ribbon-2">{propertyType}</div>
        <div className="location-badge">
          <span>&#128204;</span> {location}
        </div>
        {locationSub && <div className="location-sub">A proximit\u00e9 {locationSub}</div>}
      </div>

      <div className="info-panel">
        <div className="info-col">
          <div className="label">&#128202; Superficie</div>
          <div className="value">{surface ? surface + " m\u00b2" : "\u2014"}</div>
        </div>
        <div className="info-col">
          <div className="label">&#128176; Prix</div>
          <div className="value">{formatPrice(price)}</div>
          {pricePerSqm && (
            <div style={{ fontSize: 16, color: "#64748B", marginTop: 4 }}>
              {formatPrice(pricePerSqm)} / m\u00b2
            </div>
          )}
        </div>
        <div className="contact-col">
          <div className="phone-circle">&#128222;</div>
          <div className="phone-num">{agencyPhone || phone || "Contact"}</div>
        </div>
      </div>

      <div className="footer">
        <div className="footer-wave" />
        <div className="footer-content">
          <div className="icon">&#127968;</div>
          <div className="text">{agencyName} - {slogan}</div>
        </div>
      </div>
    </div>
  );
};

export default BluePremium;
