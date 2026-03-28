'use client';

import { useState, useCallback, useEffect } from 'react';
import { ForYouShelf } from '@/components/personalisation/ForYouShelf';
import { useIntentTracker } from '@/components/personalisation/useIntentTracker';
import { type Product } from '@/lib/catalog/NykaaCatalogClient';
import { Search } from 'lucide-react';
import Link from 'next/link';

// Demo: cycle through test users to show personalisation
const DEMO_USERS = [
  { id: 'user-001', name: 'Priya (Fashion)' },
  { id: 'user-002', name: 'Arjun (Activewear)' },
  { id: 'user-003', name: 'Meera (Beauty)' },
  { id: 'user-004', name: 'Rahul (Denim)' },
  { id: 'user-005', name: 'Ananya (Tops)' },
];

export default function HomePage() {
  const [activeUser, setActiveUser] = useState(DEMO_USERS[0]);
  const authToken = btoa(JSON.stringify({ userId: activeUser.id }));
  const { trackClick } = useIntentTracker(authToken);
  const [shelfKey, setShelfKey] = useState(0);

  const handleProductClick = useCallback(
    (product: Product) => {
      trackClick(product);
    },
    [trackClick]
  );

  const switchUser = useCallback((user: (typeof DEMO_USERS)[number]) => {
    setActiveUser(user);
    setShelfKey((k) => k + 1);
    sessionStorage.removeItem('nykaa_intent_clicks');
    sessionStorage.removeItem('nykaa_session_id');
  }, []);

  useEffect(() => {
    // Explicit page_viewed since PostHog provider has capture_pageview: false
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('page_viewed', { page: 'homepage' });
    }
  }, []);

  return (
    <main className="app-container">
      {/* Demo user switcher */}
      <div className="demo-bar">
        <span className="demo-label">Demo User:</span>
        <div className="demo-users">
          {DEMO_USERS.map((user) => (
            <button
              key={user.id}
              className={`demo-user-btn ${activeUser.id === user.id ? 'active' : ''}`}
              onClick={() => switchUser(user)}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>

      {/* Hero banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1 className="hero-title">Nykaa Fashion</h1>
          <p className="hero-subtitle">Discover your style, curated for you</p>
          <Link href={`/search?user=${activeUser.id}`} className="hero-search-link">
            <Search size={16} />
            Search products…
          </Link>
        </div>
      </section>

      {/* Personalised shelf — injected below hero banner */}
      <ForYouShelf key={shelfKey} authToken={authToken} onProductClick={handleProductClick} />

      {/* Rest of homepage (static editorial sections) */}
      <section className="editorial-section">
        <h2>New Arrivals</h2>
        <p className="editorial-note">
          This is a placeholder for the editorial homepage content that would normally appear below
          the personalised shelf.
        </p>
      </section>
    </main>
  );
}
