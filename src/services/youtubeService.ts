/**
 * YouTube Data API v3 Service
 * 
 * Searches for educational videos related to certification exam topics.
 * Uses the YouTube Data API v3 search endpoint to find real videos
 * with verified IDs, thumbnails, and working links.
 */

import type { VideoRecommendation } from '../types';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

/**
 * Maps language codes to YouTube relevanceLanguage parameter values.
 */
const LANGUAGE_MAP: Record<string, string> = {
  es: 'es',
  en: 'en',
  pt: 'pt',
  fr: 'fr',
};

/**
 * Searches YouTube for educational videos related to a certification topic.
 * Returns 1-2 video recommendations with real thumbnails and working links.
 *
 * @param query - Search query (e.g., "AWS VPC Networking tutorial")
 * @param language - User's language code (es, en, pt, fr)
 * @param maxResults - Maximum number of results (default 2)
 * @returns Array of VideoRecommendation with real data from YouTube
 */
export async function searchYouTubeVideos(
  query: string,
  language: string,
  maxResults: number = 2
): Promise<VideoRecommendation[]> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('[YouTubeService] No API key configured (VITE_YOUTUBE_API_KEY)');
    return [];
  }

  const relevanceLanguage = LANGUAGE_MAP[language.toLowerCase()] || 'en';

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    relevanceLanguage,
    videoCategoryId: '27', // Education category
    order: 'relevance',
    key: apiKey,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE}?${params.toString()}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[YouTubeService] API error:', response.status, errorBody);
      return [];
    }

    const data: YouTubeSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items
      .filter(item => item.id?.videoId && item.snippet)
      .map(item => ({
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || 
                      `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
        videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }))
      .slice(0, maxResults);
  } catch (error) {
    console.error('[YouTubeService] Failed to search videos:', error);
    return [];
  }
}
