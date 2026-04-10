import { Download, FileText, TrendingUp, Calendar, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";

interface Report {
  id: string;
  title: string;
  type: "summary" | "analysis" | "questions";
  date: string;
  status: "ready" | "generating";
}

export function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await apiClient.getLectures();
        if (res.success) {
          const generatedReports = res.lectures
            .filter((l: any) => l.has_summary || l.has_transcript)
            .map((l: any) => ({
              id: l.id,
              title: `${l.title} Report`,
              type: l.has_summary ? "summary" : "analysis",
              date: new Date(l.created_at).toLocaleDateString(),
              status: "ready",
            }));
          setReports(generatedReports);
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  const handleDownload = async (reportId: string, title: string) => {
    setDownloadingId(reportId);
    try {
      const res = await apiClient.getLecture(reportId);
      if (res.success && res.lecture) {
        const textContent = `REPORT: ${title}\n\n=== SUMMARY ===\n${res.lecture.summary || "No summary"}\n\n=== TRANSCRIPT ===\n${res.lecture.transcript || "No transcript"}`;
        const blob = new Blob([textContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Report details not found.");
      }
    } catch (error) {
      console.error("Failed to download report:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const typeLabels = {
    summary: "Study Summary",
    analysis: "Deep Analysis",
    questions: "Practice Questions",
  };

  const typeColors = {
    summary: "bg-blue-100 text-blue-700",
    analysis: "bg-purple-100 text-purple-700",
    questions: "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Study Reports</h1>
          <p className="text-gray-600">Generate comprehensive study materials from your lectures</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: FileText, label: "Executive Summary", desc: "Brief overview" },
            { icon: TrendingUp, label: "Analysis Report", desc: "Detailed insights" },
            { icon: Calendar, label: "Exam Questions", desc: "Practice questions" },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate("/")}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition text-left"
            >
              <action.icon className="w-8 h-8 text-blue-600 mb-3" />
              <p className="font-semibold text-gray-900">{action.label}</p>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Reports</h2>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No reports generated yet.</div>
          ) : (
            reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <FileText className="w-10 h-10 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${typeColors[report.type]}`}
                    >
                      {typeLabels[report.type]}
                    </span>
                    <span className="text-sm text-gray-500">{report.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.status === "generating" ? (
                  <div className="text-sm text-gray-500">Generating...</div>
                ) : (
                  <button 
                    onClick={() => handleDownload(report.id, report.title)}
                    disabled={downloadingId === report.id}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded transition flex items-center gap-2"
                  >
                    {downloadingId === report.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloadingId === report.id ? "Fetching..." : "Download"}
                  </button>
                )}
              </div>
            </div>
          )))}
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg shadow-sm p-12 text-center mt-8">
          <p className="text-gray-500 mb-4">Want to generate a new report?</p>
          <button 
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            Create New Report
          </button>
        </div>
      </div>
    </div>
  );
}
