import { describe, it, expect } from "vitest";
import {
  resolveDocUrl,
  DOCUMENTATION_MAPPINGS,
  DocMappingEntry,
} from "./documentationMapping";

describe("documentationMapping", () => {
  describe("DOCUMENTATION_MAPPINGS", () => {
    it("contains entries for all major providers", () => {
      const providers = DOCUMENTATION_MAPPINGS.map((m) => m.provider);
      expect(providers).toContain("AWS");
      expect(providers).toContain("Microsoft");
      expect(providers).toContain("Google Cloud");
      expect(providers).toContain("PMI");
      expect(providers).toContain("CNCF");
      expect(providers).toContain("HashiCorp");
      expect(providers).toContain("CompTIA");
    });

    it("each entry has at least 5 domain URLs for major providers", () => {
      const majorProviders = ["AWS", "Microsoft", "Google Cloud"];
      for (const provider of majorProviders) {
        const entry = DOCUMENTATION_MAPPINGS.find(
          (m) => m.provider === provider
        ) as DocMappingEntry;
        expect(Object.keys(entry.domainUrls).length).toBeGreaterThanOrEqual(5);
      }
    });

    it("each entry has language paths for en, es, pt, fr", () => {
      for (const entry of DOCUMENTATION_MAPPINGS) {
        expect(entry.languagePaths).toHaveProperty("en");
        expect(entry.languagePaths).toHaveProperty("es");
        expect(entry.languagePaths).toHaveProperty("pt");
        expect(entry.languagePaths).toHaveProperty("fr");
      }
    });
  });

  describe("resolveDocUrl", () => {
    it("resolves AWS Networking (no language path - AWS auto-detects)", () => {
      const url = resolveDocUrl("AWS", "Networking", "en");
      expect(url).toBe("https://docs.aws.amazon.com/vpc/latest/userguide/");
    });

    it("resolves AWS Compute same URL regardless of language (AWS auto-detects)", () => {
      const urlEn = resolveDocUrl("AWS", "Compute", "en");
      const urlEs = resolveDocUrl("AWS", "Compute", "es");
      expect(urlEn).toBe("https://docs.aws.amazon.com/ec2/latest/userguide/");
      expect(urlEs).toBe(urlEn); // AWS doesn't use language paths
    });

    it("resolves Microsoft Security in Portuguese (supports language path)", () => {
      const url = resolveDocUrl("Microsoft", "Security", "pt");
      expect(url).toContain("/pt-br/");
      expect(url).toContain("security");
    });

    it("resolves Microsoft DevOps in French", () => {
      const url = resolveDocUrl("Microsoft", "DevOps", "fr");
      expect(url).toContain("/fr-fr/");
      expect(url).toContain("devops");
    });

    it("performs case-insensitive provider matching", () => {
      const url = resolveDocUrl("aws", "Storage", "en");
      expect(url).toBe("https://docs.aws.amazon.com/s3/latest/userguide/");
    });

    it("performs case-insensitive domain matching", () => {
      const url = resolveDocUrl("AWS", "networking", "en");
      expect(url).toBe("https://docs.aws.amazon.com/vpc/latest/userguide/");
    });

    it("returns same URL for unsupported language on providers without language paths", () => {
      const urlDe = resolveDocUrl("AWS", "Networking", "de");
      const urlEn = resolveDocUrl("AWS", "Networking", "en");
      expect(urlDe).toBe(urlEn);
    });

    it("returns null for unknown provider", () => {
      const url = resolveDocUrl("UnknownProvider", "Networking", "en");
      expect(url).toBeNull();
    });

    it("returns null for unknown domain", () => {
      const url = resolveDocUrl("AWS", "UnknownDomain", "en");
      expect(url).toBeNull();
    });

    it("resolves CNCF Networking in Spanish (supports language path)", () => {
      const url = resolveDocUrl("CNCF", "Networking", "es");
      expect(url).toContain("/es/");
      expect(url).toContain("services-networking");
    });

    it("resolves HashiCorp Infrastructure as Code in English", () => {
      const url = resolveDocUrl("HashiCorp", "Infrastructure as Code", "en");
      expect(url).toBe("https://developer.hashicorp.com/terraform/docs");
    });

    it("resolves Google Cloud Compute in English", () => {
      const url = resolveDocUrl("Google Cloud", "Compute", "en");
      expect(url).toBe("https://cloud.google.com/compute/docs/overview");
    });

    it("all AWS domain URLs are absolute and start with https", () => {
      const aws = DOCUMENTATION_MAPPINGS.find(m => m.provider === "AWS")!;
      for (const url of Object.values(aws.domainUrls)) {
        expect(url).toMatch(/^https:\/\//);
      }
    });
  });
});
