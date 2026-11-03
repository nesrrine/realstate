import { Suspense } from 'react';
import { HeroSection } from '@/components/sections/HeroSection';
import { SearchSection } from '@/components/sections/SearchSection';
import { FeaturedSection } from '@/components/sections/FeaturedSection';
import { LatestSection } from '@/components/sections/LatestSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { AgencySection } from '@/components/sections/AgencySection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { ContactSection } from '@/components/sections/ContactSection';

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<div className="h-[60vh] bg-slate-100 animate-pulse" />}>
        <HeroSection />
      </Suspense>
      <SearchSection />
      <FeaturedSection />
      <LatestSection />
      <ServicesSection />
      <AgencySection />
      <TestimonialsSection />
      <ContactSection />
    </>
  );
}