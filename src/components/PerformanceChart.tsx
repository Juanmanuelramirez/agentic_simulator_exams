import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { ExamAttempt } from '../types';

interface PerformanceChartProps {
    attempts: ExamAttempt[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ attempts }) => {
    // Aggregate performance by domain
    const domainStats: Record<string, { total: number; correct: number }> = {};

    attempts.forEach(attempt => {
        attempt.questions.forEach(q => {
            if (!q.domain) return;
            if (!domainStats[q.domain]) domainStats[q.domain] = { total: 0, correct: 0 };

            domainStats[q.domain].total += 1;
            const isCorrect = q.correct_ids.length === q.user_selected_ids?.length &&
                q.correct_ids.every(id => q.user_selected_ids?.includes(id));

            if (isCorrect) domainStats[q.domain].correct += 1;
        });
    });

    const data = Object.keys(domainStats).map(domain => ({
        subject: domain.split(' ').slice(0, 2).join(' '), // Shorten for display
        fullDomain: domain,
        value: Math.round((domainStats[domain].correct / domainStats[domain].total) * 100),
        fullMark: 100,
    }));

    if (data.length < 3) {
        return (
            <div className="chart-placeholder card glass">
                <p>Realiza más exámenes para ver tu gráfico de radar por dominios.</p>
                <style>{`.chart-placeholder { height: 300px; display: flex; align-items: center; justify-content: center; text-align: center; color: var(--text-secondary); }`}</style>
            </div>
        );
    }

    return (
        <div className="performance-chart card glass">
            <h3>Desempeño por Dominio</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                        <Radar
                            name="Student"
                            dataKey="value"
                            stroke="var(--primary-color)"
                            fill="var(--primary-color)"
                            fillOpacity={0.4}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <style>{`
        .performance-chart h3 { margin-bottom: 1rem; text-align: center; font-size: 1rem; }
      `}</style>
        </div>
    );
};

export default PerformanceChart;
