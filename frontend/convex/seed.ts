import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed official Polangui municipal ordinances into Convex Cloud Database
 */
export const seedPolanguiData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("documents").first();
    if (existing) {
      return { message: "Database already contains documents. Seed skipped." };
    }

    const now = Date.now();

    // 1. Solid Waste Management & Ecological Ordinance
    const doc1 = await ctx.db.insert("documents", {
      title: "Comprehensive Ecological Solid Waste Management Code of Polangui",
      ordinance_number: "Municipal Ordinance No. 2022-014",
      document_type: "Ordinance",
      year: 2022,
      date_enacted: "2022-06-15",
      jurisdiction: "Municipality of Polangui, Province of Albay",
      lgu: "Polangui, Albay",
      status: "active",
      category: "Environment & Sanitation",
      is_active: true,
      page_count: 18,
      section_count: 4,
      notes: "Enacted by the Sangguniang Bayan of Polangui pursuant to RA 9003.",
      created_at: now,
      updated_at: now,
    });

    await ctx.db.insert("sections", {
      document_id: doc1,
      section_number: "Section 1",
      section_type: "Title",
      heading: "Short Title",
      raw_text: "This Ordinance shall be known and cited as the Polangui Ecological Solid Waste Management Code of 2022.",
      normalized_text: "This Ordinance shall be known and cited as the Polangui Ecological Solid Waste Management Code of 2022.",
      corrected_text: "This Ordinance shall be known and cited as the Polangui Ecological Solid Waste Management Code of 2022.",
      page_start: 1,
      page_end: 1,
      verification_status: "verified",
      chunk_count: 1,
      created_at: now,
    });

    await ctx.db.insert("sections", {
      document_id: doc1,
      section_number: "Section 4",
      section_type: "Provisions",
      heading: "Mandatory Segregation of Solid Waste at Source",
      raw_text: "All households, commercial establishments, institutions, and barangay facilities in Polangui shall segregate waste into Biodegradable (Nabubulok), Recyclable (Maaaring I-recycle), Residual (Hindi Nabubulok), and Special/Hazardous Waste prior to collection.",
      normalized_text: "All households, commercial establishments, institutions, and barangay facilities in Polangui shall segregate waste into Biodegradable (Nabubulok), Recyclable (Maaaring I-recycle), Residual (Hindi Nabubulok), and Special/Hazardous Waste prior to collection.",
      corrected_text: "All households, commercial establishments, institutions, and barangay facilities in Polangui shall segregate waste into Biodegradable (Nabubulok), Recyclable (Maaaring I-recycle), Residual (Hindi Nabubulok), and Special/Hazardous Waste prior to collection.",
      page_start: 3,
      page_end: 4,
      verification_status: "verified",
      chunk_count: 2,
      created_at: now,
    });

    await ctx.db.insert("sections", {
      document_id: doc1,
      section_number: "Section 12",
      section_type: "Penalty",
      heading: "Penalties for Illegal Dumping and Non-Segregation",
      raw_text: "First Offense: Reprimand and mandatory two (2) hours community service. Second Offense: Administrative fine of Five Hundred Pesos (PHP 500.00). Third and Subsequent Offenses: Fine of One Thousand Five Hundred Pesos (PHP 1,500.00) or cancellation of business permit for commercial establishments.",
      normalized_text: "First Offense: Reprimand and mandatory two (2) hours community service. Second Offense: Administrative fine of Five Hundred Pesos (PHP 500.00). Third and Subsequent Offenses: Fine of One Thousand Five Hundred Pesos (PHP 1,500.00) or cancellation of business permit for commercial establishments.",
      corrected_text: "First Offense: Reprimand and mandatory two (2) hours community service. Second Offense: Administrative fine of Five Hundred Pesos (PHP 500.00). Third and Subsequent Offenses: Fine of One Thousand Five Hundred Pesos (PHP 1,500.00) or cancellation of business permit for commercial establishments.",
      page_start: 9,
      page_end: 10,
      verification_status: "verified",
      chunk_count: 2,
      created_at: now,
    });

    // 2. Traffic Management & Tricycle Franchising Ordinance
    const doc2 = await ctx.db.insert("documents", {
      title: "Revised Traffic Management and Tricycle Franchising Code of Polangui",
      ordinance_number: "Municipal Ordinance No. 2021-008",
      document_type: "Ordinance",
      year: 2021,
      date_enacted: "2021-09-22",
      jurisdiction: "Municipality of Polangui, Province of Albay",
      lgu: "Polangui, Albay",
      status: "active",
      category: "Transportation & Public Safety",
      is_active: true,
      page_count: 24,
      section_count: 5,
      notes: "Regulating tricycle for hire operation and designated loading zones in Polangui Poblacion.",
      created_at: now,
      updated_at: now,
    });

    await ctx.db.insert("sections", {
      document_id: doc2,
      section_number: "Section 8",
      section_type: "Provisions",
      heading: "Designated Loading and Unloading Zones in Central Business District",
      raw_text: "No motorized tricycle or passenger vehicle shall load or unload passengers along the national highway intersection and fronting the Polangui Public Market except at officially designated terminals and loading bays.",
      normalized_text: "No motorized tricycle or passenger vehicle shall load or unload passengers along the national highway intersection and fronting the Polangui Public Market except at officially designated terminals and loading bays.",
      corrected_text: "No motorized tricycle or passenger vehicle shall load or unload passengers along the national highway intersection and fronting the Polangui Public Market except at officially designated terminals and loading bays.",
      page_start: 6,
      page_end: 7,
      verification_status: "verified",
      chunk_count: 2,
      created_at: now,
    });

    return {
      message: "Successfully seeded initial Polangui ordinances and sections into Convex!",
      seededDocuments: 2,
      seededSections: 4,
    };
  },
});

