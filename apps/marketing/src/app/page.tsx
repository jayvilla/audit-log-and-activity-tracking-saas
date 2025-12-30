'use client';

import { HeroSection } from '../components/sections/hero-section';
import { HowItWorksSection } from '../components/sections/how-it-works-section';
import { FeaturesSection } from '../components/sections/features-section';
import { SecuritySection } from '../components/sections/security-section';
import { DeveloperSection } from '../components/sections/developer-section';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <SecuritySection />
      <DeveloperSection />
    </>
  );
}
