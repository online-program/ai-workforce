import { auth } from '../firebase.ts';
import {
  MarketingBrainData,
  MarketingResearchItem,
  MarketingContentItem,
  PublishingConnection,
  PublishingSettings,
  MarketingAnalyticsMetric,
  MarketingLearningInsight,
  ContentPlatform,
  ContentFormat,
  ContentItemStatus,
} from '../types.ts';
import {
  defaultMarketingBrain,
  defaultResearchItems,
  defaultContentItems,
  defaultPublishingConnections,
  defaultPublishingSettings,
  defaultLearningInsights,
} from '../data/defaultMarketingData.ts';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      console.warn('Failed to get auth token for marketing service:', e);
    }
  }
  return headers;
}

export const marketingService = {
  // 1. Marketing Brain
  async getBrain(): Promise<MarketingBrainData> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/brain', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.brain || defaultMarketingBrain;
    } catch (e) {
      console.warn('Fallback to default marketing brain:', e);
      return defaultMarketingBrain;
    }
  },

  async updateBrain(updates: Partial<MarketingBrainData>): Promise<{ success: boolean; brain: MarketingBrainData; message?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/marketing/brain', {
      method: 'POST',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update marketing brain');
    }
    return data;
  },

  // 2. Research Engine
  async getResearch(): Promise<MarketingResearchItem[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/research', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.research || defaultResearchItems;
    } catch (e) {
      console.warn('Fallback to default research items:', e);
      return defaultResearchItems;
    }
  },

  async generateResearch(topic?: string, focusArea?: string): Promise<{ success: boolean; research: MarketingResearchItem[]; message?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/marketing/research/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic, focusArea }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate research opportunities');
    }
    return data;
  },

  async deleteResearch(id: string): Promise<{ success: boolean; research: MarketingResearchItem[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/research/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete research item');
    }
    return data;
  },

  // 3. Content Studio & Lifecycle
  async getContent(): Promise<MarketingContentItem[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/content', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.content || defaultContentItems;
    } catch (e) {
      console.warn('Fallback to default content items:', e);
      return defaultContentItems;
    }
  },

  async generateContent(params: {
    platform: ContentPlatform;
    format: ContentFormat;
    topic?: string;
    objective?: string;
    customInstructions?: string;
    researchItemId?: string;
  }): Promise<{ success: boolean; item: MarketingContentItem; message?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/marketing/content/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate content asset');
    }
    return data;
  },

  async updateContent(id: string, updates: Partial<MarketingContentItem>): Promise<{ success: boolean; item: MarketingContentItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/content/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update content');
    }
    return data;
  },

  async updateContentStatus(id: string, status: ContentItemStatus, notes?: string): Promise<{ success: boolean; item: MarketingContentItem }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/content/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update content status');
    }
    return data;
  },

  async publishNow(id: string): Promise<{ success: boolean; result: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/content/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.result?.message || 'Failed to publish content');
    }
    return data;
  },

  async schedulePost(id: string, scheduledTime: string): Promise<{ success: boolean; result: any }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/content/${encodeURIComponent(id)}/schedule`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scheduledTime }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to schedule content');
    }
    return data;
  },

  async deleteContent(id: string): Promise<{ success: boolean; content: MarketingContentItem[] }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/content/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete content');
    }
    return data;
  },

  // 4. Publishing Connections & Settings
  async getPublishingConnections(): Promise<PublishingConnection[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/publishing/connections', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.connections || defaultPublishingConnections;
    } catch (e) {
      return defaultPublishingConnections;
    }
  },

  async getPublishingSettings(): Promise<PublishingSettings> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/publishing/settings', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.settings || defaultPublishingSettings;
    } catch (e) {
      return defaultPublishingSettings;
    }
  },

  async updatePublishingSettings(settings: Partial<PublishingSettings>): Promise<{ success: boolean; settings: PublishingSettings }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/admin/marketing/publishing/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update publishing settings');
    }
    return data;
  },

  async connectChannel(platform: ContentPlatform): Promise<{ success: boolean; message: string; authUrl?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/admin/marketing/publishing/connect/${encodeURIComponent(platform)}`, {
      method: 'POST',
      headers,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to initiate channel connection');
    }
    return data;
  },

  // 5. Analytics & Audit Logs
  async getAnalytics(): Promise<{
    metrics: MarketingAnalyticsMetric[];
    insights: MarketingLearningInsight[];
    summary: {
      totalPublished: number;
      scheduledCount: number;
      draftsCount: number;
      inReviewCount: number;
      activeChannels: number;
    };
  }> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/analytics', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.data;
    } catch (e) {
      return {
        metrics: [],
        insights: defaultLearningInsights,
        summary: {
          totalPublished: 0,
          scheduledCount: 1,
          draftsCount: 1,
          inReviewCount: 1,
          activeChannels: 0,
        },
      };
    }
  },

  async getAuditLogs(): Promise<any[]> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/marketing/audit-logs', { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.logs || [];
    } catch (e) {
      return [];
    }
  },
};
