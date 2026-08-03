/**
 * Static documentation URL mappings for certification providers.
 * 
 * IMPORTANT: All URLs here are verified landing pages that exist.
 * We do NOT construct deep paths or add language prefixes that may not exist.
 * AWS docs auto-redirects to the user's browser language.
 * Microsoft Learn supports language in the path reliably.
 */

export interface DocMappingEntry {
  provider: string;
  baseUrl: string;
  /** If true, language path is prepended. If false, the URL is used as-is (provider handles i18n). */
  supportsLanguagePath: boolean;
  languagePaths: Record<string, string>;
  domainUrls: Record<string, string>; // Full verified URLs per domain
}

export const DOCUMENTATION_MAPPINGS: DocMappingEntry[] = [
  // ── AWS ──────────────────────────────────────────────────────────────────
  // AWS docs auto-detects language from browser. No language path needed.
  {
    provider: "AWS",
    baseUrl: "https://docs.aws.amazon.com",
    supportsLanguagePath: false,
    languagePaths: { en: "", es: "", pt: "", fr: "" },
    domainUrls: {
      "Networking": "https://docs.aws.amazon.com/vpc/latest/userguide/",
      "Compute": "https://docs.aws.amazon.com/ec2/latest/userguide/",
      "Storage": "https://docs.aws.amazon.com/s3/latest/userguide/",
      "Database": "https://docs.aws.amazon.com/dynamodb/latest/developerguide/",
      "Security": "https://docs.aws.amazon.com/iam/latest/UserGuide/",
      "Machine Learning": "https://docs.aws.amazon.com/sagemaker/latest/dg/",
      "Analytics": "https://docs.aws.amazon.com/athena/latest/ug/",
      "DevOps": "https://docs.aws.amazon.com/codepipeline/latest/userguide/",
      "SDLC Automation": "https://docs.aws.amazon.com/codepipeline/latest/userguide/",
      "Containers": "https://docs.aws.amazon.com/ecs/latest/developerguide/",
      "Serverless": "https://docs.aws.amazon.com/lambda/latest/dg/",
      "Monitoring": "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/",
      "Monitoring and Logging": "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/",
      "Migration": "https://docs.aws.amazon.com/dms/latest/userguide/",
      "Configuration Management": "https://docs.aws.amazon.com/config/latest/developerguide/",
      "Policies and Standards Automation": "https://docs.aws.amazon.com/config/latest/developerguide/",
      "Incident and Event Response": "https://docs.aws.amazon.com/eventbridge/latest/userguide/",
      "High Availability": "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/",
      "Resilience": "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/",
    },
  },
  // ── Microsoft ────────────────────────────────────────────────────────────
  // Microsoft Learn supports language paths reliably
  {
    provider: "Microsoft",
    baseUrl: "https://learn.microsoft.com",
    supportsLanguagePath: true,
    languagePaths: { en: "/en-us", es: "/es-es", pt: "/pt-br", fr: "/fr-fr" },
    domainUrls: {
      "Networking": "/azure/networking/fundamentals/",
      "Compute": "/azure/virtual-machines/overview",
      "Storage": "/azure/storage/common/storage-introduction",
      "Database": "/azure/cosmos-db/introduction",
      "Security": "/azure/security/fundamentals/overview",
      "AI": "/azure/ai-services/what-are-ai-services",
      "DevOps": "/azure/devops/user-guide/what-is-azure-devops",
      "Containers": "/azure/aks/intro-kubernetes",
      "Identity": "/entra/fundamentals/whatis",
      "Monitoring": "/azure/azure-monitor/overview",
    },
  },
  // ── Google Cloud ─────────────────────────────────────────────────────────
  // GCP docs don't support language paths reliably
  {
    provider: "Google Cloud",
    baseUrl: "https://cloud.google.com",
    supportsLanguagePath: false,
    languagePaths: { en: "", es: "", pt: "", fr: "" },
    domainUrls: {
      "Networking": "https://cloud.google.com/vpc/docs/overview",
      "Compute": "https://cloud.google.com/compute/docs/overview",
      "Storage": "https://cloud.google.com/storage/docs/introduction",
      "Database": "https://cloud.google.com/spanner/docs/overview",
      "Security": "https://cloud.google.com/iam/docs/overview",
      "Machine Learning": "https://cloud.google.com/ai-platform/docs/technical-overview",
      "DevOps": "https://cloud.google.com/build/docs/overview",
      "Containers": "https://cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview",
      "Data Engineering": "https://cloud.google.com/bigquery/docs/introduction",
      "Serverless": "https://cloud.google.com/functions/docs/concepts/overview",
    },
  },
  // ── PMI ──────────────────────────────────────────────────────────────────
  {
    provider: "PMI",
    baseUrl: "https://www.pmi.org",
    supportsLanguagePath: false,
    languagePaths: { en: "", es: "", pt: "", fr: "" },
    domainUrls: {
      "Project Management": "https://www.pmi.org/learning/library",
      "Agile": "https://www.pmi.org/disciplined-agile",
      "Risk Management": "https://www.pmi.org/learning/library?topics=Risk+Management",
      "Scheduling": "https://www.pmi.org/learning/library?topics=Schedule+Management",
      "Stakeholder Management": "https://www.pmi.org/learning/library?topics=Stakeholder+Management",
      "Scope Management": "https://www.pmi.org/learning/library?topics=Scope+Management",
    },
  },
  // ── CNCF / Kubernetes ────────────────────────────────────────────────────
  // Kubernetes docs support language paths
  {
    provider: "CNCF",
    baseUrl: "https://kubernetes.io",
    supportsLanguagePath: true,
    languagePaths: { en: "", es: "/es", pt: "/pt-br", fr: "/fr" },
    domainUrls: {
      "Cluster Architecture": "/docs/concepts/architecture/",
      "Workloads": "/docs/concepts/workloads/",
      "Networking": "/docs/concepts/services-networking/",
      "Storage": "/docs/concepts/storage/",
      "Security": "/docs/concepts/security/",
      "Scheduling": "/docs/concepts/scheduling-eviction/",
    },
  },
  // ── HashiCorp ────────────────────────────────────────────────────────────
  {
    provider: "HashiCorp",
    baseUrl: "https://developer.hashicorp.com",
    supportsLanguagePath: false,
    languagePaths: { en: "", es: "", pt: "", fr: "" },
    domainUrls: {
      "Infrastructure as Code": "https://developer.hashicorp.com/terraform/docs",
      "Secrets Management": "https://developer.hashicorp.com/vault/docs",
      "Networking": "https://developer.hashicorp.com/consul/docs",
      "Security": "https://developer.hashicorp.com/vault/docs/concepts/policies",
      "State Management": "https://developer.hashicorp.com/terraform/language/state",
      "Modules": "https://developer.hashicorp.com/terraform/language/modules",
    },
  },
  // ── CompTIA ──────────────────────────────────────────────────────────────
  {
    provider: "CompTIA",
    baseUrl: "https://www.comptia.org",
    supportsLanguagePath: false,
    languagePaths: { en: "", es: "", pt: "", fr: "" },
    domainUrls: {
      "Security": "https://www.comptia.org/certifications/security",
      "Networking": "https://www.comptia.org/certifications/network",
      "Cloud": "https://www.comptia.org/certifications/cloud",
      "Hardware": "https://www.comptia.org/certifications/a",
      "Troubleshooting": "https://www.comptia.org/certifications/a",
      "Infrastructure": "https://www.comptia.org/certifications/server",
    },
  },
];

/**
 * Resolves a documentation URL from the static mapping.
 * Returns verified, working URLs. For providers that support language paths
 * (Microsoft, Kubernetes), the language is included. For others (AWS, GCP),
 * the URL is returned as-is since those sites auto-detect language.
 *
 * @param provider - The certification provider name (case-insensitive match)
 * @param domain - The exam domain/topic area (case-insensitive match)
 * @param language - The user's language code (es, en, pt, fr).
 * @returns The documentation URL, or null if provider or domain is not found.
 */
export function resolveDocUrl(
  provider: string,
  domain: string,
  language: string
): string | null {
  const entry = DOCUMENTATION_MAPPINGS.find(
    (m) => m.provider.toLowerCase() === provider.toLowerCase()
  );
  if (!entry) return null;

  const domainKey = Object.keys(entry.domainUrls).find(
    (k) => k.toLowerCase() === domain.toLowerCase()
  );
  if (!domainKey) return null;

  const domainUrl = entry.domainUrls[domainKey];

  // If the URL is already absolute, use it directly (with language path if supported)
  if (domainUrl.startsWith('http')) {
    if (entry.supportsLanguagePath) {
      // Insert language path after the base URL
      const lang = language.toLowerCase();
      const langPath = entry.languagePaths[lang] ?? entry.languagePaths["en"] ?? "";
      const url = new URL(domainUrl);
      url.pathname = langPath + url.pathname;
      return url.toString();
    }
    return domainUrl;
  }

  // Relative URL: construct from base + language + path
  const lang = language.toLowerCase();
  const langPath = entry.languagePaths[lang] ?? entry.languagePaths["en"] ?? "";

  return entry.baseUrl + langPath + domainUrl;
}
