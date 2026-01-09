import type { Exam } from '../types';

/**
 * Librarian Agent
 * Responsible for finding official certification guides and extracting blueprint data.
 */
export class LibrarianAgent {
    /**
     * Searches for an exam and returns the extracted blueprint structure.
     */
    async discoverExam(query: string): Promise<Exam> {
        console.log(`Librarian: Searching for "${query}"...`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        if (query.toLowerCase().includes('aws certified solutions architect - associate') || query.toUpperCase().includes('SAA-C03')) {
            return {
                id: 'saa-c03',
                name: 'AWS Certified Solutions Architect - Associate',
                provider: 'Amazon Web Services',
                duration_minutes: 130,
                domains: [
                    { name: 'Design Secure Architectures', weight: 30 },
                    { name: 'Design Resilient Architectures', weight: 26 },
                    { name: 'Design High-Performing Architectures', weight: 24 },
                    { name: 'Design Cost-Optimized Architectures', weight: 20 },
                ]
            };
        }

        if (query.toLowerCase().includes('azure data fundamentals') || query.toUpperCase().includes('DP-900')) {
            return {
                id: 'dp-900',
                name: 'Microsoft Certified: Azure Data Fundamentals',
                provider: 'Microsoft',
                duration_minutes: 60,
                domains: [
                    { name: 'Core Data Concepts', weight: 25 },
                    { name: 'Relational Data on Azure', weight: 25 },
                    { name: 'Non-Relational Data on Azure', weight: 25 },
                    { name: 'Analytics Workloads on Azure', weight: 25 },
                ]
            };
        }

        return {
            id: `gen-${Date.now()}`,
            name: query,
            provider: 'Unknown Provider',
            duration_minutes: 120,
            domains: [
                { name: 'General Domain 1', weight: 50 },
                { name: 'General Domain 2', weight: 50 },
            ]
        };
    }
}

export const librarian = new LibrarianAgent();
