/**
 * ResourceResolver - Combines static documentation mapping with YouTube Data API video search.
 *
 * Resolves official documentation references from static URL mappings and
 * searches for real YouTube videos via the YouTube Data API v3.
 * Handles failures gracefully: documentation resolution is synchronous and reliable,
 * while video resolution degrades to empty array on any error.
 */

import type { DocumentationReference, VideoRecommendation } from '../types';
import { resolveDocUrl } from '../data/documentationMapping';
import { searchYouTubeVideos } from '../services/youtubeService';

export interface DayResources {
  documentation: DocumentationReference[];
  videos: VideoRecommendation[];
}

const SUPPORTED_LANGUAGES = ['es', 'en', 'pt', 'fr'];

/**
 * Normalizes a language code to a supported value.
 * Returns 'en' if the provided language is not in the supported set.
 */
function normalizeLanguage(language: string): string {
  const lang = language.toLowerCase().trim();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
}

export class ResourceResolver {
  /**
   * Resolves 1-2 official documentation references for a given provider/domain/topic.
   * Uses the static DocumentationMapping to construct URLs.
   *
   * @param provider - Certification provider (e.g., "AWS", "Microsoft")
   * @param domain - Exam domain (e.g., "Networking", "Security")
   * @param topic - Specific topic within the domain
   * @param language - User's language code
   * @returns Array of 1-2 DocumentationReference objects, or empty if no mapping found
   */
  resolveDocumentation(
    provider: string,
    domain: string,
    topic: string,
    language: string
  ): DocumentationReference[] {
    const normalizedLang = normalizeLanguage(language);
    const references: DocumentationReference[] = [];

    // Get the main domain documentation URL
    const domainUrl = resolveDocUrl(provider, domain, normalizedLang);
    if (!domainUrl) {
      return references;
    }

    // Add the primary domain-level reference
    references.push({
      url: domainUrl,
      title: `Official ${domain} Documentation`,
    });

    // If topic differs from domain, try to add a topic-specific reference
    if (topic && topic.toLowerCase() !== domain.toLowerCase()) {
      // Attempt to resolve topic as a domain (some topics map directly)
      const topicUrl = resolveDocUrl(provider, topic, normalizedLang);
      if (topicUrl && topicUrl !== domainUrl) {
        references.push({
          url: topicUrl,
          title: `${topic} - Official Guide`,
        });
      }
    }

    return references.slice(0, 2);
  }

  /**
   * Searches YouTube for 1-2 real educational videos related to the topic.
   * Uses the YouTube Data API v3 to find verified videos with real thumbnails.
   *
   * @param examName - Name of the certification exam
   * @param domain - Exam domain
   * @param topic - Specific topic within the domain
   * @param language - User's language code
   * @returns Array of 0-2 VideoRecommendation objects with real YouTube data; empty on any error
   */
  async resolveVideos(
    examName: string,
    domain: string,
    topic: string,
    language: string
  ): Promise<VideoRecommendation[]> {
    const normalizedLang = normalizeLanguage(language);

    // Build a targeted search query combining exam name, domain, and topic
    const query = `${examName} ${domain} ${topic} tutorial`;

    try {
      return await searchYouTubeVideos(query, normalizedLang, 2);
    } catch (error) {
      console.error('[ResourceResolver] Failed to resolve videos:', error);
      return [];
    }
  }

  /**
   * Resolves all resources (documentation + videos) for a single study day.
   *
   * @param provider - Certification provider
   * @param examName - Name of the certification exam
   * @param domain - Exam domain
   * @param topic - Specific topic within the domain
   * @param language - User's language code
   * @returns DayResources with documentation and videos arrays
   */
  async resolveResourcesForDay(
    provider: string,
    examName: string,
    domain: string,
    topic: string,
    language: string
  ): Promise<DayResources> {
    const documentation = this.resolveDocumentation(provider, domain, topic, language);
    const videos = await this.resolveVideos(examName, domain, topic, language);

    return {
      documentation,
      videos,
    };
  }
}
