// PostHog event names — single source of truth for event taxonomy
export const EVENTS = {
  SHELF_IMPRESSION: 'shelf_impression',
  SHELF_CLICK: 'shelf_click',
  SEARCH_RERANK_IMPRESSION: 'search_rerank_impression',
  ADD_TO_CART: 'add_to_cart',
  PAGE_VIEWED: 'page_viewed',
  SHELF_LOAD_FAILED: 'shelf_load_failed',
  RERANK_FAILED: 'rerank_failed',
  INGEST_EVENT_FAILED: 'ingest_event_failed',
  AFFINITY_REBUILD_COMPLETED: 'affinity_rebuild_completed',
  AFFINITY_REBUILD_FAILED: 'affinity_rebuild_failed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
