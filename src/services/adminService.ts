import { dbService } from './db';
import { librarian } from '../agents/librarian';
import type { Exam, ExamDiscoveryResult } from '../types';

/**
 * Admin Service
 * 
 * Client-side service functions for admin exam management.
 * These functions interact with DynamoDB directly through dbService
 * and use the LibrarianAgent for AI-powered exam discovery.
 */

export const adminService = {
    /**
     * POST /api/admin/exams/discover - Discover exam with AI
     * 
     * Uses the LibrarianAgent to discover exam information from official guides
     * or general knowledge. Returns structured exam data with confidence scoring.
     * 
     * @param examName - Name of the certification exam
     * @param officialGuideUrl - Optional URL to official exam guide
     * @returns Promise<ExamDiscoveryResult> - Discovered exam with validation
     */
    async discoverExam(
        examName: string,
        officialGuideUrl?: string
    ): Promise<ExamDiscoveryResult> {
        if (!examName || examName.trim().length === 0) {
            throw new Error('Exam name is required');
        }

        try {
            const result = await librarian.discoverExam(
                examName.trim(),
                officialGuideUrl?.trim()
            );

            return result;
        } catch (error) {
            console.error('Error discovering exam:', error);
            throw new Error(
                `Failed to discover exam: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * POST /api/admin/exams - Create new exam
     * 
     * Creates a new exam in the database. Validates that the exam doesn't
     * already exist and ensures all required fields are present.
     * 
     * @param exam - Exam object to create
     * @param adminUserId - ID of the admin user creating the exam
     * @returns Promise<Exam> - The created exam with timestamps
     */
    async createExam(exam: Omit<Exam, 'created_at' | 'updated_at' | 'created_by'>, adminUserId: string): Promise<Exam> {
        // Validate required fields
        if (!exam.id || !exam.name || !exam.provider) {
            throw new Error('Missing required fields: id, name, and provider are required');
        }

        if (!exam.domains || exam.domains.length === 0) {
            throw new Error('At least one domain is required');
        }

        if (!exam.total_questions_official || exam.total_questions_official <= 0) {
            throw new Error('total_questions_official must be a positive number');
        }

        // Check if exam already exists
        const existingExams = await dbService.getExams();
        const duplicate = existingExams.find(
            e => e.id === exam.id || e.name.toLowerCase() === exam.name.toLowerCase()
        );

        if (duplicate) {
            throw new Error(`Exam already exists: ${duplicate.name} (${duplicate.id})`);
        }

        // Create exam with timestamps and admin info
        const now = new Date().toISOString();
        const newExam: Exam = {
            ...exam,
            is_active: exam.is_active ?? true,
            created_by: adminUserId,
            created_at: now,
            updated_at: now,
            usage_stats: {
                total_attempts: 0,
                average_score: 0,
                last_attempt: now
            }
        };

        // Save to database
        await dbService.saveExam(newExam);

        return newExam;
    },

    /**
     * GET /api/admin/exams - List all exams with stats
     * 
     * Retrieves all exams from the database, including usage statistics.
     * Can optionally filter by active status.
     * 
     * @param activeOnly - If true, only return active exams
     * @returns Promise<Exam[]> - Array of exams with stats
     */
    async listExams(activeOnly: boolean = false): Promise<Exam[]> {
        try {
            const exams = await dbService.getExams();

            if (activeOnly) {
                return exams.filter(exam => exam.is_active !== false);
            }

            return exams;
        } catch (error) {
            console.error('Error listing exams:', error);
            throw new Error(
                `Failed to list exams: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * GET /api/admin/exams/:id - Get single exam with detailed stats
     * 
     * Retrieves a single exam by ID with detailed statistics.
     * 
     * @param examId - ID of the exam to retrieve
     * @returns Promise<Exam | null> - The exam or null if not found
     */
    async getExam(examId: string): Promise<Exam | null> {
        if (!examId || examId.trim().length === 0) {
            throw new Error('Exam ID is required');
        }

        try {
            const exams = await dbService.getExams();
            const exam = exams.find(e => e.id === examId);

            return exam || null;
        } catch (error) {
            console.error('Error getting exam:', error);
            throw new Error(
                `Failed to get exam: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * PUT /api/admin/exams/:id - Update exam
     * 
     * Updates an existing exam. Only updates provided fields.
     * Automatically updates the updated_at timestamp.
     * 
     * @param examId - ID of the exam to update
     * @param updates - Partial exam object with fields to update
     * @returns Promise<Exam> - The updated exam
     */
    async updateExam(
        examId: string,
        updates: Partial<Omit<Exam, 'id' | 'created_at' | 'created_by'>>
    ): Promise<Exam> {
        if (!examId || examId.trim().length === 0) {
            throw new Error('Exam ID is required');
        }

        // Get existing exam
        const existingExam = await this.getExam(examId);
        if (!existingExam) {
            throw new Error(`Exam not found: ${examId}`);
        }

        // Validate domain weights if domains are being updated
        if (updates.domains) {
            if (updates.domains.length === 0) {
                throw new Error('At least one domain is required');
            }

            const totalWeight = updates.domains.reduce((sum, d) => sum + d.weight, 0);
            if (Math.abs(totalWeight - 100) > 0.01) {
                console.warn(`Domain weights sum to ${totalWeight}%, not 100%`);
            }
        }

        // Merge updates with existing exam
        const updatedExam: Exam = {
            ...existingExam,
            ...updates,
            id: examId, // Ensure ID doesn't change
            created_at: existingExam.created_at, // Preserve creation timestamp
            created_by: existingExam.created_by, // Preserve creator
            updated_at: new Date().toISOString()
        };

        // Save to database
        await dbService.saveExam(updatedExam);

        return updatedExam;
    },

    /**
     * DELETE /api/admin/exams/:id - Deactivate exam
     * 
     * Soft-deletes an exam by setting is_active to false.
     * The exam remains in the database but won't appear in student lists.
     * 
     * @param examId - ID of the exam to deactivate
     * @returns Promise<Exam> - The deactivated exam
     */
    async deactivateExam(examId: string): Promise<Exam> {
        if (!examId || examId.trim().length === 0) {
            throw new Error('Exam ID is required');
        }

        // Get existing exam
        const existingExam = await this.getExam(examId);
        if (!existingExam) {
            throw new Error(`Exam not found: ${examId}`);
        }

        // Update is_active to false
        const deactivatedExam = await this.updateExam(examId, {
            is_active: false
        });

        return deactivatedExam;
    },

    /**
     * POST /api/admin/exams/:id/activate - Reactivate exam
     * 
     * Reactivates a previously deactivated exam by setting is_active to true.
     * 
     * @param examId - ID of the exam to activate
     * @returns Promise<Exam> - The activated exam
     */
    async activateExam(examId: string): Promise<Exam> {
        if (!examId || examId.trim().length === 0) {
            throw new Error('Exam ID is required');
        }

        // Get existing exam
        const existingExam = await this.getExam(examId);
        if (!existingExam) {
            throw new Error(`Exam not found: ${examId}`);
        }

        // Update is_active to true
        const activatedExam = await this.updateExam(examId, {
            is_active: true
        });

        return activatedExam;
    },

    /**
     * GET /api/admin/exams/:id/stats - Get detailed exam statistics
     * 
     * Calculates detailed statistics for an exam including:
     * - Total attempts
     * - Average score
     * - Completion rate
     * - Domain performance
     * 
     * @param examId - ID of the exam
     * @returns Promise<ExamStats> - Detailed statistics
     */
    async getExamStats(examId: string): Promise<{
        total_attempts: number;
        average_score: number;
        completion_rate: number;
        last_attempt: string | null;
    }> {
        if (!examId || examId.trim().length === 0) {
            throw new Error('Exam ID is required');
        }

        // Note: This is a placeholder implementation
        // In a real application, you would query the attempts table
        // and calculate statistics from actual attempt data
        
        const exam = await this.getExam(examId);
        if (!exam) {
            throw new Error(`Exam not found: ${examId}`);
        }

        return {
            total_attempts: exam.usage_stats?.total_attempts || 0,
            average_score: exam.usage_stats?.average_score || 0,
            completion_rate: 0,
            last_attempt: exam.usage_stats?.last_attempt || null
        };
    }
};
