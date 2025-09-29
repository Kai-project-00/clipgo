// src/ClipManager.js - 클립 관리 시스템
class ClipManager {
  constructor(storageManager, categoryManager) {
    this.storageManager = storageManager;
    this.categoryManager = categoryManager;
    this.initialized = false;
    this.cache = new Map();
    this.cacheExpiry = 3 * 60 * 1000; // 3분 캐시
    this.similarityThreshold = 0.85; // 중복 감지 임계값
    this.init();
  }

  async init() {
    try {
      if (!this.storageManager || !this.storageManager.initialized) {
        throw new Error('StorageManager is required and must be initialized');
      }

      this.initialized = true;
      console.log('ClipManager initialized successfully');
    } catch (error) {
      console.error('ClipManager initialization failed:', error);
      throw error;
    }
  }

  // ===== 클립 생성 =====

  async createClip(clipData) {
    if (!this.initialized) throw new Error('ClipManager not initialized');

    // 유효성 검사
    const validation = this.validateClip(clipData);
    if (!validation.isValid) {
      throw new Error(`Invalid clip data: ${validation.errors.join(', ')}`);
    }

    // 중복 클립 검사
    const isDuplicate = await this.isDuplicateClip(clipData);
    if (isDuplicate) {
      throw new Error('This clip already exists');
    }

    // 클립 데이터 최적화
    const optimizedClip = this.optimizeClipData(clipData);

    const clip = {
      ...optimizedClip,
      id: clipData.id || Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // StorageManager를 통해 저장
    const savedClip = await this.storageManager.createClip(clip);
    this.invalidateCache();

    return savedClip;
  }

  // 텍스트 선택에서 클립 생성
  async createClipFromSelection(text, url, title, options = {}) {
    if (!text || !text.trim()) {
      throw new Error('Selected text is required');
    }

    const source = this.getSourceFromUrl(url);
    const autoTags = await this.generateAutoTags(text, source);

    const clipData = {
      text: text.trim(),
      title: title || this.generateTitle(text),
      url: url || '',
      source: source,
      tags: [...(options.tags || []), ...autoTags],
      categoryIds: options.categoryIds || [],
      importance: options.importance || 'normal',
      language: this.detectLanguage(text),
      metadata: {
        selectionLength: text.length,
        wordCount: this.countWords(text),
        characterCount: text.length,
        estimatedReadingTime: this.estimateReadingTime(text),
        ...options.metadata
      }
    };

    return this.createClip(clipData);
  }

  // ===== 클립 조회 =====

  async getClip(id) {
    if (!this.initialized) throw new Error('ClipManager not initialized');

    const cached = this.getFromCache(`clip_${id}`);
    if (cached) return cached;

    const clip = await this.storageManager.getClip(id);
    if (clip) {
      this.setToCache(`clip_${id}`, clip);
    }
    return clip;
  }

  async getClips(filters = {}) {
    if (!this.initialized) throw new Error('ClipManager not initialized');

    const cacheKey = this.getCacheKey('clips', filters);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let clips = await this.storageManager.getClips();

    // 필터링 적용
    clips = this.applyFilters(clips, filters);

    // 정렬 적용
    clips = this.applySorting(clips, filters.sort);

    this.setToCache(cacheKey, clips);
    return clips;
  }

  async getClipsByCategory(categoryId) {
    return this.getClips({ categoryIds: [categoryId] });
  }

  async getClipsByTags(tags) {
    return this.getClips({ tags: Array.isArray(tags) ? tags : [tags] });
  }

  async getClipsBySource(source) {
    return this.getClips({ source });
  }

  async getRecentClips(limit = 10) {
    return this.getClips({ sort: 'createdAt', order: 'desc', limit });
  }

  // ===== 클립 수정 =====

  async updateClip(id, updates) {
    if (!this.initialized) throw new Error('ClipManager not initialized');

    const clip = await this.getClip(id);
    if (!clip) {
      throw new Error('Clip not found');
    }

    // 중복 검사 (텍스트 변경 시)
    if (updates.text && updates.text !== clip.text) {
      const testClip = { ...clip, ...updates };
      const isDuplicate = await this.isDuplicateClip(testClip, id);
      if (isDuplicate) {
        throw new Error('A clip with this text already exists');
      }
    }

    // 메타데이터 업데이트
    const updatedData = { ...updates };
    if (updates.text) {
      updatedData.metadata = {
        ...clip.metadata,
        selectionLength: updates.text.length,
        wordCount: this.countWords(updates.text),
        characterCount: updates.text.length,
        estimatedReadingTime: this.estimateReadingTime(updates.text),
        ...updates.metadata
      };
    }

    const updatedClip = await this.storageManager.updateClip(id, {
      ...updatedData,
      updatedAt: Date.now()
    });

    this.invalidateCache();
    return updatedClip;
  }

  async addTagToClip(clipId, tag) {
    const clip = await this.getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const tags = new Set([...(clip.tags || []), tag]);
    return this.updateClip(clipId, { tags: Array.from(tags) });
  }

  async removeTagFromClip(clipId, tag) {
    const clip = await this.getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const tags = (clip.tags || []).filter(t => t !== tag);
    return this.updateClip(clipId, { tags });
  }

  async addCategoryToClip(clipId, categoryId) {
    const clip = await this.getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const categoryIds = new Set([...(clip.categoryIds || []), categoryId]);
    return this.updateClip(clipId, { categoryIds: Array.from(categoryIds) });
  }

  async removeCategoryFromClip(clipId, categoryId) {
    const clip = await this.getClip(clipId);
    if (!clip) throw new Error('Clip not found');

    const categoryIds = (clip.categoryIds || []).filter(id => id !== categoryId);
    return this.updateClip(clipId, { categoryIds });
  }

  // ===== 클립 삭제 =====

  async deleteClip(id) {
    if (!this.initialized) throw new Error('ClipManager not initialized');

    const clip = await this.getClip(id);
    if (!clip) {
      throw new Error('Clip not found');
    }

    await this.storageManager.deleteClip(id);
    this.invalidateCache();
  }

  async deleteClipsByCategory(categoryId) {
    const clips = await this.getClipsByCategory(categoryId);
    await Promise.all(clips.map(clip => this.deleteClip(clip.id)));
  }

  async deleteOldClips(daysOld = 30) {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    const clips = await this.getClips();

    const oldClips = clips.filter(clip => clip.createdAt < cutoffDate);
    await Promise.all(oldClips.map(clip => this.deleteClip(clip.id)));

    return oldClips.length;
  }

  // ===== 검색 및 필터링 =====

  async searchClips(query, options = {}) {
    const filters = {
      searchQuery: query,
      ...options
    };

    return this.getClips(filters);
  }

  async searchClipsByContent(query) {
    const allClips = await this.getClips();
    const searchQuery = query.toLowerCase();

    return allClips.filter(clip =>
      clip.title.toLowerCase().includes(searchQuery) ||
      clip.text.toLowerCase().includes(searchQuery)
    );
  }

  async findSimilarClips(clipId, limit = 5) {
    const targetClip = await this.getClip(clipId);
    if (!targetClip) return [];

    const allClips = await this.getClips();
    const similarities = [];

    allClips.forEach(clip => {
      if (clip.id !== clipId) {
        const similarity = this.calculateSimilarity(targetClip.text, clip.text);
        if (similarity > 0.3) { // 30% 이상 유사한 클립만
          similarities.push({ clip, similarity });
        }
      }
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.clip);
  }

  // ===== 통계 및 분석 =====

  async getClipStats() {
    const clips = await this.getClips();
    const stats = {
      totalClips: clips.length,
      totalWords: clips.reduce((sum, clip) => sum + (clip.metadata?.wordCount || 0), 0),
      totalCharacters: clips.reduce((sum, clip) => sum + (clip.metadata?.characterCount || 0), 0),
      averageReadingTime: clips.reduce((sum, clip) => sum + (clip.metadata?.estimatedReadingTime || 0), 0) / clips.length || 0,
      sources: {},
      languages: {},
      importance: {},
      tags: {},
      categories: {}
    };

    // 소스 통계
    clips.forEach(clip => {
      stats.sources[clip.source] = (stats.sources[clip.source] || 0) + 1;
      stats.languages[clip.language || 'unknown'] = (stats.languages[clip.language || 'unknown'] || 0) + 1;
      stats.importance[clip.importance || 'normal'] = (stats.importance[clip.importance || 'normal'] || 0) + 1;
    });

    // 태그 통계
    clips.forEach(clip => {
      (clip.tags || []).forEach(tag => {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      });
    });

    // 카테고리 통계
    clips.forEach(clip => {
      (clip.categoryIds || []).forEach(categoryId => {
        stats.categories[categoryId] = (stats.categories[categoryId] || 0) + 1;
      });
    });

    return stats;
  }

  // ===== 유틸리티 메소드 =====

  validateClip(clipData) {
    const errors = [];

    if (!clipData.text || typeof clipData.text !== 'string') {
      errors.push('Text is required and must be a string');
    }

    if (clipData.text && (clipData.text.length < 1 || clipData.text.length > 10000)) {
      errors.push('Text must be between 1 and 10000 characters');
    }

    if (!clipData.title || typeof clipData.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (clipData.title && (clipData.title.length < 1 || clipData.title.length > 200)) {
      errors.push('Title must be between 1 and 200 characters');
    }

    if (clipData.url && typeof clipData.url !== 'string') {
      errors.push('URL must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async isDuplicateClip(clipData, excludeId = null) {
    const allClips = await this.getClips();

    return allClips.some(clip => {
      if (excludeId && clip.id === excludeId) return false;

      // 정확한 일치 검사
      if (clip.text === clipData.text && clip.url === clipData.url) {
        return true;
      }

      // 유사도 기반 중복 검사
      const similarity = this.calculateSimilarity(clip.text, clipData.text);
      return similarity > this.similarityThreshold;
    });
  }

  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  optimizeClipData(clipData) {
    const optimized = { ...clipData };

    // 텍스트 정리
    optimized.text = this.cleanText(clipData.text);
    optimized.title = this.cleanText(clipData.title || this.generateTitle(clipData.text));

    // 태그 정리
    if (optimized.tags) {
      optimized.tags = [...new Set(optimized.tags.map(tag => tag.trim().toLowerCase()))];
    }

    // 카테고리 ID 정리
    if (optimized.categoryIds) {
      optimized.categoryIds = [...new Set(optimized.categoryIds)];
    }

    return optimized;
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // 다중 공백을 단일 공백으로
      .replace(/^\s+|\s+$/g, '') // 앞뒤 공백 제거
      .replace(/\n\s*\n/g, '\n') // 빈 줄 제거
      .trim();
  }

  generateTitle(text) {
    if (text.length <= 50) return text;

    // 문장 단위로 자르기
    const sentences = text.split(/[.!?]+/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length >= 20) {
        return firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;
      }
    }

    // 단어 단위로 자르기
    const words = text.split(/\s+/);
    let result = '';
    for (const word of words) {
      if ((result + word).length > 47) break;
      result += (result ? ' ' : '') + word;
    }

    return result.length > 0 ? result + '...' : text.substring(0, 50) + '...';
  }

  getSourceFromUrl(url) {
    if (!url) return 'other';
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    return 'other';
  }

  async generateAutoTags(text, source) {
    const tags = new Set([source]);

    // 소스 기반 태그
    if (source === 'chatgpt') tags.add('ai');
    if (source === 'claude') tags.add('ai');

    // 텍스트 길이 기반 태그
    if (text.length > 500) tags.add('long');
    if (text.length < 100) tags.add('short');

    // 키워드 기반 태그
    const keywords = ['code', 'javascript', 'python', 'api', 'tutorial', 'guide', 'tip'];
    keywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags);
  }

  detectLanguage(text) {
    // 간단한 언어 감지 (한글/영문)
    const koreanRatio = (text.match(/[가-힣]/g) || []).length / text.length;
    return koreanRatio > 0.3 ? 'ko' : 'en';
  }

  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  estimateReadingTime(text) {
    const wordsPerMinute = 200;
    const words = this.countWords(text);
    return Math.ceil(words / wordsPerMinute);
  }

  applyFilters(clips, filters) {
    let filtered = [...clips];

    // 검색어 필터
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(clip =>
        clip.title.toLowerCase().includes(query) ||
        clip.text.toLowerCase().includes(query) ||
        (clip.tags && clip.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // 카테고리 필터
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      filtered = filtered.filter(clip =>
        clip.categoryIds && clip.categoryIds.some(id => filters.categoryIds.includes(id))
      );
    }

    // 태그 필터
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(clip =>
        clip.tags && filters.tags.some(tag => clip.tags.includes(tag))
      );
    }

    // 소스 필터
    if (filters.source) {
      filtered = filtered.filter(clip => clip.source === filters.source);
    }

    // 중요도 필터
    if (filters.importance) {
      filtered = filtered.filter(clip => clip.importance === filters.importance);
    }

    // 언어 필터
    if (filters.language) {
      filtered = filtered.filter(clip => (clip.language || 'unknown') === filters.language);
    }

    // 날짜 범위 필터
    if (filters.dateFrom) {
      filtered = filtered.filter(clip => clip.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(clip => clip.createdAt <= filters.dateTo);
    }

    // 길이 제한
    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  applySorting(clips, sort = 'createdAt', order = 'desc') {
    const sorted = [...clips];

    switch (sort) {
      case 'createdAt':
        sorted.sort((a, b) => order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
        break;
      case 'updatedAt':
        sorted.sort((a, b) => order === 'desc' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt);
        break;
      case 'title':
        sorted.sort((a, b) => order === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
        break;
      case 'source':
        sorted.sort((a, b) => order === 'desc' ? b.source.localeCompare(a.source) : a.source.localeCompare(b.source));
        break;
      case 'importance':
        const importanceOrder = { 'high': 3, 'normal': 2, 'low': 1 };
        sorted.sort((a, b) => {
          const aImportance = importanceOrder[a.importance || 'normal'];
          const bImportance = importanceOrder[b.importance || 'normal'];
          return order === 'desc' ? bImportance - aImportance : aImportance - bImportance;
        });
        break;
      default:
        sorted.sort((a, b) => order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
    }

    return sorted;
  }

  getCacheKey(prefix, filters = {}) {
    const filterString = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('&');
    return `${prefix}${filterString ? `_${filterString}` : ''}`;
  }

  // ===== 캐시 관리 =====

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidateCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

// Export for global use
window.ClipManager = ClipManager;