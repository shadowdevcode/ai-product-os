'use client';

export function ShelfSkeleton() {
  return (
    <section className="shelf-container">
      <div className="shelf-header">
        <div className="skeleton-title" />
        <div className="skeleton-subtitle" />
      </div>
      <div className="shelf-scroll">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="product-card-skeleton">
            <div className="skeleton-image" />
            <div className="skeleton-text" />
            <div className="skeleton-text short" />
          </div>
        ))}
      </div>
    </section>
  );
}
