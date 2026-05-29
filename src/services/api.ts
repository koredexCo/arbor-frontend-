import type { Conversation, Branch, Message, ChatResponse, UserSettings, StoredApiKey, UsageSummary, Model } from "../types";
import { supabase } from '../lib/supabase';

import type { VisibleGraph } from "../types/visibleGraph";

const API_URL = import.meta.env.VITE_API_URL;

// Returns the current Supabase session JWT for API requests.
// Refreshes the session if it exists but the access_token may be stale.
export async function getAccessToken(): Promise<string> {
  // Try to get the existing session first
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("No active session. Please log in.");
  }

  // If the token is close to expiry (within 60s), refresh it proactively
  const expiresAt = session.expires_at ?? 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt - nowSeconds < 60) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}

// Helper to automatically attach JWT to requests
async function fetchWithAuth(path: string, options: RequestInit = {}) {
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    throw new Error("Authentication required. Please log in.");
  }

  if (!API_URL) {
    throw new Error("Backend API URL (VITE_API_URL) is not configured.");
  }

  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`API Error (${response.status}): ${errText || response.statusText}`);
  }

  return response;
}

export async function sendMessageStream(
  branchId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onDone: (node: any) => void
) {
  const token = await getAccessToken()
  
  const response = await fetch(`${API_URL}/messages/chat/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch_id: branchId, content })
  })
  
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`API Error (${response.status}): ${errText || response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error("No response body received from stream");
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  
  try {
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      
      buffer += decoder.decode(value, { stream: true })
      let boundary = buffer.indexOf('\n\n')
      
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        
        const lines = block.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const rawData = trimmed.slice(6).trim()
            if (!rawData) continue
            try {
              const data = JSON.parse(rawData)
              if (data.error) {
                throw new Error(data.error)
              }
              if (data.chunk) {
                onChunk(data.chunk)
              }
              if (data.done) {
                onDone(data.node)
              }
            } catch (e) {
              if (e instanceof Error && !e.message.includes("JSON")) {
                throw e
              }
              console.error("Error parsing stream line", e)
            }
          }
        }
        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export const api = {
  // --- Conversations ---
  async createConversation(_token: string, title: string, projectId?: string | null, treeId?: string | null, modelId?: string | null): Promise<Conversation> {
    const res = await fetchWithAuth(`/conversations/`, {
      method: "POST",
      body: JSON.stringify({ title, project_id: projectId, tree_id: treeId, model_id: modelId }),
    });
    return res.json();
  },

  async getModels(_token: string): Promise<Model[]> {
    const res = await fetchWithAuth(`/models/`);
    return res.json();
  },

  async listConversations(_token: string): Promise<Conversation[]> {
    const res = await fetchWithAuth(`/conversations/`);
    const data = await res.json();
    // Backend returns { conversations: [...] }
    return Array.isArray(data) ? data : (data.conversations ?? []);
  },

  async getProjectMainConversation(projectId: string): Promise<Conversation | null> {
    const res = await fetchWithAuth(`/conversations/?project_id=${encodeURIComponent(projectId)}&limit=1`);
    const data = await res.json();
    const list: Conversation[] = Array.isArray(data) ? data : (data.conversations ?? []);
    return list[0] ?? null;
  },

  async getConversation(_token: string, conversationId: string): Promise<Conversation> {
    const res = await fetchWithAuth(`/conversations/${conversationId}`);
    return res.json();
  },

  async deleteConversation(_token: string, conversationId: string): Promise<void> {
    await fetchWithAuth(`/conversations/${conversationId}`, { method: "DELETE" });
  },

  // --- Projects ---
  async listProjects(_token: string): Promise<any[]> {
    const res = await fetchWithAuth(`/projects/`);
    return res.json();
  },

  async createProject(_token: string, name: string, description: string): Promise<any> {
    const res = await fetchWithAuth(`/projects/`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    return res.json();
  },

  async deleteProject(_token: string, projectId: string): Promise<void> {
    await fetchWithAuth(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  async getProjectMembers(_token: string, projectId: string): Promise<any[]> {
    const res = await fetchWithAuth(`/projects/${projectId}/members`);
    return res.json();
  },

  async inviteProjectMember(_token: string, projectId: string, email: string): Promise<any> {
    const res = await fetchWithAuth(`/projects/${projectId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  // --- Trees ---
  async createTree(_token: string, projectId: string, name: string, sharedContext: string): Promise<any> {
    const res = await fetchWithAuth(`/trees/`, {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, name, shared_context: sharedContext }),
    });
    return res.json();
  },

  // --- Branches ---
  async getConversationBranches(_token: string, conversationId: string): Promise<Branch[]> {
    const res = await fetchWithAuth(`/conversations/${conversationId}/branches`);
    return res.json();
  },

  async createBranch(_token: string, conversationId: string, originNodeId: string, name: string, modelId?: string): Promise<Branch> {
    const res = await fetchWithAuth(`/branches/`, {
      method: "POST",
      body: JSON.stringify({ 
        conversation_id: conversationId,
        origin_node_id: originNodeId,
        name,
        model_id: modelId 
      }),
    });
    return res.json();
  },
  
  async updateBranch(_token: string, branchId: string, data: { name?: string, model_id?: string, user_initiated_model_change?: boolean }): Promise<Branch> {
    const res = await fetchWithAuth(`/branches/${branchId}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // --- Messages ---
  async getBranchMessages(_token: string, branchId: string): Promise<Message[]> {
    const res = await fetchWithAuth(`/branches/${branchId}/messages`);
    return res.json();
  },

  async getBranchFullContext(_token: string, branchId: string) {
    const res = await fetchWithAuth(`/branches/${branchId}/full-context`);
    return res.json();
  },

  async getVisibleGraph(_token: string, branchId: string): Promise<VisibleGraph> {
    const res = await fetchWithAuth(`/branches/${branchId}/visible-graph`);
    return res.json();
  },

  async pinMessage(_token: string, branchId: string, nodeId: string): Promise<Message> {
    const res = await fetchWithAuth(`/branches/${branchId}/pin/${nodeId}`, { method: "POST" });
    return res.json();
  },

  async unpinMessage(_token: string, branchId: string, nodeId: string): Promise<Message> {
    const res = await fetchWithAuth(`/branches/${branchId}/unpin/${nodeId}`, { method: "POST" });
    return res.json();
  },

  async sendMessage(_token: string, branchId: string, content: string): Promise<ChatResponse> {
    const res = await fetchWithAuth(`/messages/chat`, {
      method: "POST",
      body: JSON.stringify({ branch_id: branchId, content })
    });
    return res.json();
  },

  async compareModels(_token: string, prompt: string, models: string[], branchId: string): Promise<any> {
    const res = await fetchWithAuth(`/compare`, {
      method: "POST",
      body: JSON.stringify({ prompt, models, branch_id: branchId })
    });
    return res.json();
  },

  async compareBranches(_token: string, branchAId: string, branchBId: string, generateAiSummary: boolean = true): Promise<any> {
    const res = await fetchWithAuth(`/compare/branches`, {
      method: "POST",
      body: JSON.stringify({ branch_a_id: branchAId, branch_b_id: branchBId, generate_ai_summary: generateAiSummary })
    });
    return res.json();
  },

  // --- Media & Export ---
  async generateImage(_token: string, prompt: string, modelProvider?: string, branchId?: string): Promise<string> {
    const res = await fetchWithAuth(`/media/image`, {
      method: "POST",
      body: JSON.stringify({ prompt, model_provider: modelProvider, branch_id: branchId })
    });
    const data = await res.json();
    return data.image_url;
  },

  async exportPDF(_token: string, branchId: string): Promise<Blob> {
    const res = await fetchWithAuth(`/export/pdf`, {
      method: "POST",
      body: JSON.stringify({ branch_id: branchId })
    });
    return res.blob();
  },

  async submitVideoGeneration(
    _token: string,
    prompt: string,
    modelProvider: string = "gemini",
    branchId?: string,
    aspectRatio: string = "16:9",
    resolution: string = "720p"
  ): Promise<{ job_id: string; status: string }> {
    const res = await fetchWithAuth(`/media/video`, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        model_provider: modelProvider,
        branch_id: branchId,
        aspect_ratio: aspectRatio,
        resolution,
      })
    });
    return res.json();
  },

  async pollVideoStatus(
    _token: string,
    jobId: string
  ): Promise<{ job_id: string; status: string; video_url?: string; error?: string }> {
    const res = await fetchWithAuth(`/media/video/${jobId}`);
    return res.json();
  },

  async generateVideo(_token: string): Promise<{ status: string }> {
    return { status: "Use submitVideoGeneration() + pollVideoStatus() instead" };
  },

  // --- Settings & API Keys ---
  async getSettings(_token: string): Promise<UserSettings> {
    const res = await fetchWithAuth(`/settings/`);
    return res.json();
  },

  async updateSettings(
    _token: string,
    settings: Partial<Pick<UserSettings, "api_mode" | "storage_mode" | "self_hosted_endpoint">>
  ): Promise<UserSettings> {
    const res = await fetchWithAuth(`/settings/`, {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  async addApiKey(_token: string, provider: string, apiKey: string): Promise<void> {
    await fetchWithAuth(`/settings/api-keys`, {
      method: "POST",
      body: JSON.stringify({ provider, api_key: apiKey })
    });
  },

  async removeApiKey(_token: string, provider: string): Promise<void> {
    await fetchWithAuth(`/settings/api-keys/${provider}`, { method: "DELETE" });
  },

  async listApiKeys(_token: string): Promise<StoredApiKey[]> {
    const res = await fetchWithAuth(`/settings/api-keys`);
    const data = await res.json();
    return data.keys || [];
  },

  async validateEndpoint(_token: string, url: string): Promise<{ valid: boolean; error?: string }> {
    const res = await fetchWithAuth(`/settings/validate-endpoint`, {
      method: "POST",
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  async getUsageSummary(_token: string, days: number = 30): Promise<UsageSummary> {
    const res = await fetchWithAuth(`/settings/usage?days=${days}`);
    return res.json();
  },

  async getSystemHealth(): Promise<any> {
    const res = await fetchWithAuth(`/system/health`);
    return res.json();
  }
};

