import React from 'react';

export interface BluePremiumPosterProps {
  title?: string; // Conservé pour compatibilité API
  bannerText?: string;
  propertyType?: string;
  template?: 'BLUE_PREMIUM' | 'BLUE_MODERN' | 'LUXURY' | 'MINIMAL' | 'FLASH_SALE';
  location?: string;
  locationSub?: string;
  surface?: number | string;
  price?: number | string;
  pricePerSqm?: number | string;
  phone?: string;
  slogan?: string;
  imageUrl?: string;
  agencyName?: string;
  agencyPhone?: string;
  logoUrl?: string;
}

const BluePremiumPoster: React.FC<BluePremiumPosterProps> = ({
  title, // eslint-disable-line @typescript-eslint/no-unused-vars
  bannerText = 'À VENDRE',
  propertyType = 'TERRAIN',
  template = 'BLUE_PREMIUM',
  location = 'CHOTRANA 3',
  locationSub = 'À proximité El Firma',
  surface,
  price,
  pricePerSqm,
  phone,
  slogan = 'Terrain idéal pour votre projet',
  imageUrl,
  agencyName = 'Le Portail Immobilier',
  agencyPhone,
  logoUrl = '/logo-portail-immobilier.png',
}) => {
const accent = template === 'LUXURY' ? '#1a1a2e' : template === 'MINIMAL' ? '#333' : template === 'FLASH_SALE' ? '#e53935' : template === 'BLUE_MODERN' ? '#0d47a1' : '#062653';

  return (
    <div className="relative w-[1080px] h-[1350px] overflow-hidden bg-white text-[#062653] font-sans">
      {/* header */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center px-8 py-6 z-10">
        <img src={logoUrl} alt={agencyName} className="h-24 object-contain" />
        <span className="text-sm font-semibold text-[#062653] mt-2">Votre projet, notre priorité</span>
      </div>

      {/* main photo full bleed */}
      <div className="absolute inset-0 bg-gray-200 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">Photo du bien</div>
        )}
      </div>

      {/* title banners */}
      <div className="absolute top-[560px] left-0 right-0 flex flex-col items-start gap-3 px-8">
        <div className="text-white text-5xl font-extrabold px-8 py-3 -rotate-2 shadow-lg" style={{ backgroundColor: accent }}>
          {bannerText}
        </div>
        <div className="bg-white text-[#062653] text-5xl font-extrabold px-8 py-3 -rotate-2 shadow-lg border-2 border-[#062653]">
          {propertyType.toUpperCase()}
        </div>
      </div>

      {/* location badge */}
      <div className="absolute top-[720px] left-8 flex items-center gap-2 bg-[#062653] text-white px-6 py-3 rounded-full">
        <span>📍</span>
        <span className="font-bold text-xl">{location}</span>
      </div>
      {locationSub && (
        <div className="absolute top-[780px] left-8 text-[#062653] text-lg">{locationSub}</div>
      )}

      {/* info columns */}
      <div className="absolute top-[840px] left-8 right-8 bg-white rounded-2xl shadow-xl grid grid-cols-3 gap-4 p-8">
        <div className="text-center">
          <div className="text-4xl">📐</div>
          <div className="text-sm text-gray-500 mt-2">Superficie</div>
          <div className="text-3xl font-extrabold mt-1">{surface ?? '—'}</div>
        </div>
        <div className="text-center">
          <div className="text-4xl">💰</div>
          <div className="text-sm text-gray-500 mt-2">Prix</div>
          <div className="text-3xl font-extrabold mt-1">{price ?? '—'}</div>
          {pricePerSqm && <div className="text-sm text-gray-500 mt-1">{pricePerSqm}/m²</div>}
        </div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#168FE5] flex items-center justify-center text-white text-3xl">📞</div>
          <div className="text-sm text-gray-500 mt-2">Contact</div>
          <div className="text-xl font-bold mt-1">{phone ?? agencyPhone ?? '—'}</div>
        </div>
      </div>

      {/* footer */}
      <div className="absolute bottom-0 left-0 right-0 h-[180px] text-white flex items-center justify-center" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          <span className="text-2xl font-semibold">{slogan}</span>
        </div>
      </div>
    </div>
  );
};

export default BluePremiumPoster;