import { Hero } from '@/components/Hero';
import { PipelineSection } from '@/components/PipelineSection';
import { AgentGrid } from '@/components/AgentGrid';
import { BuiltProducts } from '@/components/BuiltProducts';
import { HowItWorks } from '@/components/HowItWorks';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <PipelineSection />
      <AgentGrid />
      <BuiltProducts />
      <HowItWorks />
      <Footer />
    </main>
  );
}
