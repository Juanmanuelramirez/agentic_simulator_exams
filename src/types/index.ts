export type QuestionType = 'single_select' | 'multi_select';

export interface Option {
    id: string;
    text: string;
}

export interface Question {
    id: string;
    type: QuestionType;
    question_text: string;
    options: Option[];
    correct_ids: string[];
    explanation: string;
    domain?: string;
    official_link?: string;
    user_selected_ids?: string[];
    is_verified?: boolean;
}

export interface Exam {
    id: string;
    name: string;
    provider: string;
    domains: { name: string; weight: number }[];
    duration_minutes: number;
}

export interface ExamAttempt {
    id: string;
    exam_id: string;
    mode: 'simulator' | 'real';
    start_time: string;
    end_time?: string;
    questions: Question[];
    status: 'in_progress' | 'completed';
}

export interface UserProfile {
    preferred_language: string;
    streak: number;
    study_commitment: {
        days: string[]; // ['Mon', 'Wed', 'Fri']
        time: string; // '20:00'
        notifications: boolean;
    };
}
