export type PresetSeed = {
  name: string;
  slug: string;
  description: string;
  category: string;
  systemInstructions: string;
  presetInstructions: string;
  recommendedThemes: string[];
  recommendedGoals: string[];
  recommendedCtas: string[];
  recommendedPlatforms: string[];
  defaultCadence: string;
};

export const systemPresetCatalog: PresetSeed[] = [
  {
    name: "Real Estate",
    slug: "real-estate",
    description: "Lead-generation content for agents, brokers, and local market teams.",
    category: "Industry",
    systemInstructions:
      "You create compliant, practical real-estate marketing plans with clear local-market positioning.",
    presetInstructions:
      "Emphasize trust, neighborhood authority, listings, seller education, and repeatable weekly hooks.",
    recommendedThemes: [
      "market education",
      "listing spotlights",
      "buyer questions",
      "seller confidence",
    ],
    recommendedGoals: ["capture local leads", "book consultations"],
    recommendedCtas: ["Schedule a home value review", "DM for the buyer checklist"],
    recommendedPlatforms: ["Instagram", "Facebook", "LinkedIn"],
    defaultCadence: "4 posts per week",
  },
  {
    name: "Coach / Consultant",
    slug: "coach-consultant",
    description: "Authority-building editorial for coaches, consultants, and advisors.",
    category: "Business Model",
    systemInstructions:
      "You write content plans that build trust through insight, proof, and a clear transformation path.",
    presetInstructions:
      "Lead with expertise, concise teaching, client outcomes, and invitation-based offers.",
    recommendedThemes: [
      "framework teaching",
      "client transformations",
      "common misconceptions",
      "decision confidence",
    ],
    recommendedGoals: ["increase discovery calls", "grow authority"],
    recommendedCtas: ["Book a strategy call", "Reply for the worksheet"],
    recommendedPlatforms: ["LinkedIn", "Email", "Instagram"],
    defaultCadence: "3 posts per week plus 1 newsletter",
  },
  {
    name: "SaaS / Productized Service",
    slug: "saas-productized-service",
    description: "Pipeline and retention content for software and service operations teams.",
    category: "Business Model",
    systemInstructions:
      "You create commercially grounded marketing plans for recurring-revenue businesses.",
    presetInstructions:
      "Balance product education, category framing, customer proof, and short conversion CTAs.",
    recommendedThemes: [
      "operator insights",
      "workflow examples",
      "customer proof",
      "revenue enablement",
    ],
    recommendedGoals: ["support pipeline", "educate buyers", "reduce friction"],
    recommendedCtas: ["Book a demo", "Start a pilot", "Reply for the template"],
    recommendedPlatforms: ["LinkedIn", "X", "Email"],
    defaultCadence: "3 posts per week plus 1 newsletter",
  },
  {
    name: "E-commerce",
    slug: "e-commerce",
    description: "Offer-led campaigns for product launches, retention, and UGC-style storytelling.",
    category: "Industry",
    systemInstructions:
      "You build promotional content systems that balance product storytelling with conversion clarity.",
    presetInstructions:
      "Use launch arcs, proof, buying triggers, and clear urgency without sounding spammy.",
    recommendedThemes: ["product benefits", "customer proof", "seasonal promotions", "behind the scenes"],
    recommendedGoals: ["increase purchases", "support launches", "lift repeat orders"],
    recommendedCtas: ["Shop the collection", "Grab the launch offer"],
    recommendedPlatforms: ["Instagram", "TikTok", "Email"],
    defaultCadence: "5 posts per week",
  },
  {
    name: "Local Business",
    slug: "local-business",
    description: "Community-driven local marketing for service businesses and neighborhood brands.",
    category: "Industry",
    systemInstructions:
      "You produce local-market content plans that highlight trust, convenience, and community relevance.",
    presetInstructions:
      "Prioritize proof, FAQs, local moments, and high-intent calls to action.",
    recommendedThemes: ["local trust", "before and after", "customer FAQs", "seasonal service reminders"],
    recommendedGoals: ["increase bookings", "grow referrals"],
    recommendedCtas: ["Book today", "Call for an estimate"],
    recommendedPlatforms: ["Instagram", "Facebook", "Google Business Profile"],
    defaultCadence: "4 posts per week",
  },
  {
    name: "Creator Brand",
    slug: "creator-brand",
    description: "Audience growth and monetization planning for creator-led brands.",
    category: "Audience",
    systemInstructions:
      "You plan creator content that balances identity, consistency, and monetizable offers.",
    presetInstructions:
      "Mix point of view, repeatable series, behind-the-scenes context, and direct audience invites.",
    recommendedThemes: ["signature opinions", "recurring series", "community moments", "offer narratives"],
    recommendedGoals: ["grow audience", "increase conversions", "strengthen brand affinity"],
    recommendedCtas: ["Join the list", "Watch the full breakdown", "Buy the drop"],
    recommendedPlatforms: ["Instagram", "TikTok", "YouTube"],
    defaultCadence: "4 posts per week plus 1 long-form asset",
  },
];
