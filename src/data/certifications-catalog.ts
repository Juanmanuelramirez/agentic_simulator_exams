/**
 * Catálogo de certificaciones conocidas para búsqueda instantánea.
 * Se usa como fuente primaria en el modal de añadir certificación.
 * Bedrock se usa solo como fallback para certificaciones no listadas.
 */
export interface CertificationEntry {
    name: string;
    provider: string;
    code?: string;
}

export const CERTIFICATIONS_CATALOG: CertificationEntry[] = [
    // ── AWS ──────────────────────────────────────────────────────────────────
    { name: "AWS Certified Solutions Architect - Associate", provider: "AWS", code: "SAA-C03" },
    { name: "AWS Certified Solutions Architect - Professional", provider: "AWS", code: "SAP-C02" },
    { name: "AWS Certified Developer - Associate", provider: "AWS", code: "DVA-C02" },
    { name: "AWS Certified SysOps Administrator - Associate", provider: "AWS", code: "SOA-C02" },
    { name: "AWS Certified DevOps Engineer - Professional", provider: "AWS", code: "DOP-C02" },
    { name: "AWS Certified Cloud Practitioner", provider: "AWS", code: "CLF-C02" },
    { name: "AWS Certified Data Engineer - Associate", provider: "AWS", code: "DEA-C01" },
    { name: "AWS Certified Machine Learning - Specialty", provider: "AWS", code: "MLS-C01" },
    { name: "AWS Certified Security - Specialty", provider: "AWS", code: "SCS-C02" },
    { name: "AWS Certified Advanced Networking - Specialty", provider: "AWS", code: "ANS-C01" },
    { name: "AWS Certified Database - Specialty", provider: "AWS", code: "DBS-C01" },
    { name: "AWS Certified AI Practitioner", provider: "AWS", code: "AIF-C01" },

    // ── Azure ─────────────────────────────────────────────────────────────────
    { name: "Microsoft Azure Fundamentals", provider: "Microsoft", code: "AZ-900" },
    { name: "Microsoft Azure Administrator", provider: "Microsoft", code: "AZ-104" },
    { name: "Microsoft Azure Developer Associate", provider: "Microsoft", code: "AZ-204" },
    { name: "Microsoft Azure Solutions Architect Expert", provider: "Microsoft", code: "AZ-305" },
    { name: "Microsoft Azure DevOps Engineer Expert", provider: "Microsoft", code: "AZ-400" },
    { name: "Microsoft Azure AI Fundamentals", provider: "Microsoft", code: "AI-900" },
    { name: "Microsoft Azure AI Engineer Associate", provider: "Microsoft", code: "AI-102" },
    { name: "Microsoft Azure Data Fundamentals", provider: "Microsoft", code: "DP-900" },
    { name: "Microsoft Azure Data Engineer Associate", provider: "Microsoft", code: "DP-203" },
    { name: "Microsoft Azure Security Engineer Associate", provider: "Microsoft", code: "AZ-500" },

    // ── GCP ───────────────────────────────────────────────────────────────────
    { name: "Google Cloud Digital Leader", provider: "Google Cloud" },
    { name: "Google Cloud Associate Cloud Engineer", provider: "Google Cloud" },
    { name: "Google Cloud Professional Cloud Architect", provider: "Google Cloud" },
    { name: "Google Cloud Professional Data Engineer", provider: "Google Cloud" },
    { name: "Google Cloud Professional Cloud Developer", provider: "Google Cloud" },
    { name: "Google Cloud Professional Cloud DevOps Engineer", provider: "Google Cloud" },
    { name: "Google Cloud Professional Cloud Security Engineer", provider: "Google Cloud" },
    { name: "Google Cloud Professional Machine Learning Engineer", provider: "Google Cloud" },

    // ── PMI ───────────────────────────────────────────────────────────────────
    { name: "Project Management Professional (PMP)", provider: "PMI" },
    { name: "PMI Agile Certified Practitioner (PMI-ACP)", provider: "PMI" },
    { name: "Certified Associate in Project Management (CAPM)", provider: "PMI" },
    { name: "PMI Risk Management Professional (PMI-RMP)", provider: "PMI" },
    { name: "PMI Scheduling Professional (PMI-SP)", provider: "PMI" },

    // ── Kubernetes / CNCF ─────────────────────────────────────────────────────
    { name: "Certified Kubernetes Administrator (CKA)", provider: "CNCF" },
    { name: "Certified Kubernetes Application Developer (CKAD)", provider: "CNCF" },
    { name: "Certified Kubernetes Security Specialist (CKS)", provider: "CNCF" },

    // ── Terraform / HashiCorp ─────────────────────────────────────────────────
    { name: "HashiCorp Certified Terraform Associate", provider: "HashiCorp" },
    { name: "HashiCorp Certified Vault Associate", provider: "HashiCorp" },

    // ── CompTIA ───────────────────────────────────────────────────────────────
    { name: "CompTIA Cloud+", provider: "CompTIA" },
    { name: "CompTIA Security+", provider: "CompTIA" },
    { name: "CompTIA Network+", provider: "CompTIA" },
    { name: "CompTIA A+", provider: "CompTIA" },

    // ── Scrum / Agile ─────────────────────────────────────────────────────────
    { name: "Professional Scrum Master I (PSM I)", provider: "Scrum.org" },
    { name: "Professional Scrum Master II (PSM II)", provider: "Scrum.org" },
    { name: "Certified ScrumMaster (CSM)", provider: "Scrum Alliance" },
    { name: "SAFe Agilist (SA)", provider: "Scaled Agile" },

    // ── Salesforce ────────────────────────────────────────────────────────────
    { name: "Salesforce Certified Administrator", provider: "Salesforce" },
    { name: "Salesforce Certified Platform Developer I", provider: "Salesforce" },
    { name: "Salesforce Certified Platform App Builder", provider: "Salesforce" },
];

/**
 * Busca certificaciones en el catálogo local por nombre o proveedor.
 * Retorna hasta 6 resultados ordenados por relevancia.
 */
export function searchLocalCatalog(query: string): string[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();

    const scored = CERTIFICATIONS_CATALOG
        .map(cert => {
            const nameLower = cert.name.toLowerCase();
            const providerLower = cert.provider.toLowerCase();
            const codeLower = (cert.code || '').toLowerCase();

            let score = 0;
            if (nameLower.startsWith(q)) score += 10;
            else if (nameLower.includes(q)) score += 5;
            if (providerLower.includes(q)) score += 3;
            if (codeLower.includes(q)) score += 4;

            // Bonus por palabras individuales
            q.split(' ').forEach(word => {
                if (word.length > 1 && nameLower.includes(word)) score += 2;
                if (word.length > 1 && providerLower.includes(word)) score += 1;
            });

            return { cert, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ cert }) => cert.code
            ? `${cert.name} (${cert.code})`
            : cert.name
        );

    return scored;
}
