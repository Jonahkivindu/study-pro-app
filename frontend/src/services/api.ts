// API client for backend communication
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiClient {
  async getLectures() {
    const res = await fetch(`${API_URL}/api/lectures`);
    return res.json();
  }

  async getLecture(id: string) {
    const res = await fetch(`${API_URL}/api/lectures/${id}`);
    return res.json();
  }

  async createLecture(title: string, description?: string) {
    const formData = new FormData();
    formData.append("title", title);
    if (description) formData.append("description", description);
    
    const res = await fetch(`${API_URL}/api/lectures`, {
      method: "POST",
      body: formData
    });
    return res.json();
  }

  async uploadAudio(lectureId: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/upload-audio`, {
      method: "POST",
      body: formData
    });
    return res.json();
  }

  async transcribeLecture(lectureId: string, method: string = "auto") {
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method })
    });
    return res.json();
  }

  async getTranscript(lectureId: string) {
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/transcript`);
    return res.json();
  }

  async summarizeLecture(lectureId: string, summaryType: string = "executive") {
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary_type: summaryType })
    });
    return res.json();
  }

  async getSummary(lectureId: string) {
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/summary`);
    return res.json();
  }

  async sendChatMessage(lectureId: string, query: string) {
    const res = await fetch(`${API_URL}/api/lectures/${lectureId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    return res.json();
  }

  async generateReport(lectureIds: string[], reportType: string) {
    const res = await fetch(`${API_URL}/api/reports/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lecture_ids: lectureIds, report_type: reportType })
    });
    return res.json();
  }
}

export const apiClient = new ApiClient();
