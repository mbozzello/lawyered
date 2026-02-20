import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const DEFAULT_RULES = [
  {
    name: "Indemnity Cap",
    category: "Indemnity",
    description: "Indemnification obligations should be capped",
    condition: "Indemnity cap should not exceed 2x annual fees or contract value",
    severity: "critical",
  },
  {
    name: "Liability Carve-outs",
    category: "Liability",
    description: "Limitation of liability must include standard carve-outs",
    condition: "Must include carve-outs for IP infringement, confidentiality breaches, and willful misconduct",
    severity: "critical",
  },
  {
    name: "DPA Required for PII",
    category: "Data Privacy",
    description: "Data Processing Addendum required when PII is involved",
    condition: "If contract involves processing personal data or PII, a DPA must be included or referenced",
    severity: "critical",
  },
  {
    name: "Breach Notification Timeline",
    category: "Data Privacy",
    description: "Data breach notification must have a reasonable timeline",
    condition: "Breach notification should be required within 72 hours of discovery",
    severity: "warning",
  },
  {
    name: "Termination for Convenience",
    category: "Termination",
    description: "Must allow termination for convenience",
    condition: "Must allow termination for convenience with at least 30-day prior written notice",
    severity: "warning",
  },
  {
    name: "Auto-Renewal Notice",
    category: "Auto-Renewal",
    description: "Auto-renewal must include opt-out notice period",
    condition: "Auto-renewal clause must include opt-out notice period of at least 30 days before renewal date",
    severity: "warning",
  },
  {
    name: "IP Ownership",
    category: "IP",
    description: "Work product and IP ownership must vest in company",
    condition: "All work product, deliverables, and IP created under the contract must vest in the company (client)",
    severity: "critical",
  },
  {
    name: "Non-Compete Duration",
    category: "Non-Compete",
    description: "Non-compete restrictions should be reasonable",
    condition: "Non-compete duration should not exceed 12 months and geographic scope should be reasonable",
    severity: "warning",
  },
  {
    name: "SLA Uptime",
    category: "SaaS/SLA",
    description: "SaaS agreements should include uptime commitments",
    condition: "Uptime SLA of at least 99.9% with service credits for downtime",
    severity: "info",
  },
  {
    name: "Cyber Insurance",
    category: "Insurance",
    description: "Vendor should carry adequate cyber liability insurance",
    condition: "Vendor must carry at least $1M in cyber liability insurance coverage",
    severity: "warning",
  },
  {
    name: "Governing Law",
    category: "Governing Law",
    description: "Governing law should be favorable jurisdiction",
    condition: "Governing law should specify Delaware or California law",
    severity: "info",
  },
  {
    name: "Assignment Consent",
    category: "Assignment",
    description: "Assignment should require prior written consent",
    condition: "Neither party should be able to assign the agreement without prior written consent of the other party",
    severity: "warning",
  },
  {
    name: "Confidentiality Survival",
    category: "Confidentiality",
    description: "Confidentiality obligations should survive termination",
    condition: "Confidentiality obligations must survive for at least 2 years after termination or expiration",
    severity: "warning",
  },
  {
    name: "Reps & Warranties",
    category: "Representations",
    description: "Standard representations and warranties must be present",
    condition: "Contract should include standard reps & warranties: authority, compliance with laws, non-infringement",
    severity: "warning",
  },
  {
    name: "Force Majeure",
    category: "Force Majeure",
    description: "Force majeure clause should be balanced",
    condition: "Force majeure clause should allow either party to terminate if force majeure persists for more than 90 days",
    severity: "info",
  },
];

export async function POST() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: "paul@lawyered.ai" },
    });

    if (existingUser) {
      return NextResponse.json({
        message: "Seed data already exists",
        userId: existingUser.id,
      });
    }

    // Create default user
    const passwordHash = await bcrypt.hash("lawyered2024", 12);
    const user = await prisma.user.create({
      data: {
        email: "paul@lawyered.ai",
        passwordHash,
        name: "Paul Bozzello",
      },
    });

    // Create default playbook profile
    const profile = await prisma.playbookProfile.create({
      data: {
        userId: user.id,
        name: "Standard Corporate Playbook",
        description:
          "Default playbook with standard corporate counsel review rules for commercial contracts, SaaS, data privacy, and employment agreements.",
        isDefault: true,
      },
    });

    // Create rules
    await prisma.playbookRule.createMany({
      data: DEFAULT_RULES.map((rule) => ({
        profileId: profile.id,
        ...rule,
        enabled: true,
      })),
    });

    return NextResponse.json({
      message: "Seed data created successfully",
      userId: user.id,
      profileId: profile.id,
      rulesCreated: DEFAULT_RULES.length,
      credentials: {
        email: "paul@lawyered.ai",
        password: "lawyered2024",
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed data" },
      { status: 500 }
    );
  }
}
