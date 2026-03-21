export interface Feature {
  id: string;
  label: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    id: "automated-invoicing",
    label: "Automated Invoicing",
    description: "Auto-generate and send GST-compliant invoices",
  },
  {
    id: "gst-reports",
    label: "GST-ready Reports",
    description: "One-click GST filing reports and reconciliation",
  },
  {
    id: "whatsapp-notifications",
    label: "WhatsApp Notifications",
    description: "Automated customer alerts via WhatsApp",
  },
  {
    id: "role-based-access",
    label: "Role-based Access",
    description: "Control what each team member can see and do",
  },
  {
    id: "bulk-data-import",
    label: "Bulk Data Import",
    description: "Import customers, products, or records via CSV",
  },
  {
    id: "api-access",
    label: "API Access",
    description: "Connect to other tools via REST API",
  },
  {
    id: "custom-branding",
    label: "Custom Branding",
    description: "Add your logo and brand colors to the interface",
  },
  {
    id: "offline-mode",
    label: "Offline Mode",
    description: "Continue working without internet; syncs on reconnect",
  },
  {
    id: "multi-currency",
    label: "Multi-currency Support",
    description: "Bill and report in INR, USD, or other currencies",
  },
  {
    id: "priority-support",
    label: "Priority Support",
    description: "Dedicated support SLA with <4 hour response time",
  },
];

// Whitelist of allowed feature labels for prompt injection prevention
export const FEATURE_LABELS_WHITELIST = new Set(FEATURES.map((f) => f.label));
