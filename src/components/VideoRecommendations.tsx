import React, { useState } from 'react';
import type { VideoRecommendation } from '../types';
import { Play, Youtube } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface VideoRecommendationsProps {
    videos: VideoRecommendation[] | undefined;
}

const VideoThumbnailPlaceholder: React.FC<{ title: string }> = ({ title }) => (
    <div style={{
        width: '100%',
        aspectRatio: '16/9',
        borderRadius: '10px 10px 0 0',
        background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        gap: '0.5rem',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.75rem',
        textAlign: 'center',
        lineHeight: 1.4,
    }}>
        <Youtube size={28} color="#fff" />
        <span style={{ maxWidth: '90%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{title}</span>
    </div>
);

const VideoCard: React.FC<{ video: VideoRecommendation }> = ({ video }) => {
    const [imgFailed, setImgFailed] = useState(false);
    const showPlaceholder = !video.thumbnailUrl || imgFailed;

    return (
        <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: '10px',
                border: '1px solid var(--border-default)',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: 'pointer',
                minWidth: '220px',
                maxWidth: '280px',
                flex: '1 1 220px',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.12)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Thumbnail area */}
            <div style={{ position: 'relative' }}>
                {showPlaceholder ? (
                    <VideoThumbnailPlaceholder title={video.title} />
                ) : (
                    <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        loading="lazy"
                        onError={() => setImgFailed(true)}
                        style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            objectFit: 'cover',
                            display: 'block',
                            borderRadius: '10px 10px 0 0',
                        }}
                    />
                )}
                {/* Play icon overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <Play size={14} color="#fff" fill="#fff" />
                </div>
            </div>

            {/* Video info */}
            <div style={{ padding: '0.625rem 0.75rem' }}>
                <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    lineHeight: 1.3,
                    marginBottom: '0.25rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {video.title}
                </div>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                }}>
                    {video.channelName}
                </div>
            </div>
        </a>
    );
};

const VideoRecommendations: React.FC<VideoRecommendationsProps> = ({ videos }) => {
    const { t } = useLanguage();
    if (!videos || videos.length === 0) return null;

    return (
        <div style={{ marginTop: '1rem' }}>
            <h6 style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
            }}>
                {t('recommendedVideos') || 'Videos recomendados'}
            </h6>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
            }}>
                {videos.map((video, index) => (
                    <VideoCard key={index} video={video} />
                ))}
            </div>
        </div>
    );
};

export default VideoRecommendations;
