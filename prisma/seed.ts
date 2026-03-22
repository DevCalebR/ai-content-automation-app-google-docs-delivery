import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { systemPresetCatalog } from "../lib/presets/catalog";

const prisma = new PrismaClient();

async function main() {
  for (const preset of systemPresetCatalog) {
    await prisma.preset.upsert({
      where: {
        isSystem_slug: {
          isSystem: true,
          slug: preset.slug,
        },
      },
      update: {
        name: preset.name,
        description: preset.description,
        category: preset.category,
        systemInstructions: preset.systemInstructions,
        presetInstructions: preset.presetInstructions,
        recommendedThemes: preset.recommendedThemes,
        recommendedGoals: preset.recommendedGoals,
        recommendedCtas: preset.recommendedCtas,
        recommendedPlatforms: preset.recommendedPlatforms,
        defaultCadence: preset.defaultCadence,
      },
      create: {
        ...preset,
        isSystem: true,
      },
    });
  }

  if (process.env.SEED_DEMO_ACCOUNT === "true") {
    const demoEmail = process.env.SEED_DEMO_EMAIL ?? "demo@example.com";
    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Phase1DemoPass!";
    const passwordHash = await hash(demoPassword, 12);

    const user = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {
        name: "Demo Operator",
        passwordHash,
      },
      create: {
        email: demoEmail,
        name: "Demo Operator",
        passwordHash,
      },
    });

    const workspace = await prisma.workspace.upsert({
      where: { slug: "north-star-demo" },
      update: {},
      create: {
        name: "North Star Media",
        slug: "north-star-demo",
        description: "Seeded workspace for local review.",
        ownerId: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    const preset = await prisma.preset.findFirstOrThrow({
      where: { slug: "saas-productized-service", isSystem: true },
    });

    await prisma.contentBrief.upsert({
      where: { id: "seeded-phase1-brief" },
      update: {},
      create: {
        id: "seeded-phase1-brief",
        workspaceId: workspace.id,
        authorId: user.id,
        presetId: preset.id,
        title: "April pipeline acceleration brief",
        status: "READY",
        businessName: "North Star Media",
        niche: "B2B content operations",
        offer: "Done-for-you monthly content systems for SaaS teams",
        audience: "Seed to Series B SaaS marketers who need predictable publishing",
        brandVoice: "Strategic, grounded, concise, and operator-first",
        themes: ["demand capture", "content operations", "weekly repurposing"],
        platforms: ["LinkedIn", "X", "Email"],
        cadence: "3 posts per week plus a weekly email",
        goals: ["book discovery calls", "grow warm pipeline"],
        ctas: ["Book a strategy session", "Reply for the workflow template"],
        promotions: ["April kickoff offer with onboarding sprint"],
        notes:
          "Lean into client-facing proof and practical systems language. Avoid hype.",
        briefSnapshot: {
          source: "seed",
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
