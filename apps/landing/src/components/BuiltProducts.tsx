interface Product {
  name: string;
  description: string;
  tech: string[];
  status: 'Shipped' | 'Explored';
}

const PRODUCTS: Product[] = [
  {
    name: 'Clarity',
    description:
      'AI-powered PM task engine. Type a messy thought, get it categorized into a structured Kanban board in under 3 seconds.',
    tech: ['Next.js', 'Supabase', 'Gemini', 'PostHog'],
    status: 'Shipped',
  },
  {
    name: 'Finance Advisor',
    description:
      'WhatsApp-based proactive nudge system for young earners. Daily spending reminders and weekly report cards to combat lifestyle inflation.',
    tech: ['Next.js', 'Supabase', 'Gemini', 'Twilio'],
    status: 'Shipped',
  },
  {
    name: 'SMB Bundler',
    description:
      'Feature bundle and value-based pricing engine for B2B SaaS. Select features, get AI-generated INR pricing and email pitch in 5 seconds.',
    tech: ['Next.js', 'Neon', 'Gemini', 'PostHog'],
    status: 'Shipped',
  },
  {
    name: 'Ozi Reorder',
    description:
      'Experiment instrumentation for baby essentials dark-store. Tests whether consumption-cycle-aware reorder reminders lift repeat purchases.',
    tech: ['Next.js', 'Neon', 'PostHog', 'A/B Test'],
    status: 'Shipped',
  },
  {
    name: 'Ozi Insights',
    description:
      'Customer insight workspace analyzing synthetic support tickets grounded in real Play Store reviews to surface pain points.',
    tech: ['Data Analysis', 'Synthetic Data'],
    status: 'Explored',
  },
];

export function BuiltProducts() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            5 Products Built Through This Pipeline
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Each product went through the full 12-step cycle. Every postmortem generated rules that
            made the next product better.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((product) => (
            <div
              key={product.name}
              className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 transition-colors hover:bg-neutral-900/70"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">{product.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    product.status === 'Shipped'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  {product.status}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-neutral-400">
                {product.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {product.tech.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-500"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
