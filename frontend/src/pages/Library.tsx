import { Search, Download, Trash2, Clock, BookOpen, Loader, FileText, Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../services/api";

interface Lecture {
  id: string;
  title: string;
  created_at: string;
  duration: number;
}

export function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view state
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);
  const [selectedLectureDetails, setSelectedLectureDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    async function loadLectures() {
      try {
        const res = await apiClient.getLectures();
        if (res.success) {
          setLectures(res.lectures);
        }
      } catch (error) {
        console.error("Error fetching lectures:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadLectures();
  }, []);

  const handleSelectLecture = async (id: string) => {
    if (selectedLectureId === id) return;
    setSelectedLectureId(id);
    setSelectedLectureDetails(null);
    setLoadingDetails(true);
    try {
      const res = await apiClient.getLecture(id);
      if (res.success) {
        setSelectedLectureDetails(res.lecture);
      }
    } catch (error) {
      console.error("Error fetching lecture details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return;
    try {
      const res = await apiClient.deleteLecture(id);
      if (res.success) {
        setLectures((prev) => prev.filter((l) => l.id !== id));
        if (selectedLectureId === id) {
          setSelectedLectureId(null);
          setSelectedLectureDetails(null);
        }
      } else {
        alert("Failed to delete the lecture.");
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleDownloadText = (title: string, summary: string, transcript: string) => {
    const textContent = `Title: ${title}\n\n=== SUMMARY ===\n${summary || "No summary"}\n\n=== TRANSCRIPT ===\n${transcript || "No transcript"}`;
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_Details.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = lectures.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Lecture Library</h1>
          <p className="text-gray-600">Browse and manage your recorded lectures</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search lectures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column: List */}
          <div className="w-full md:w-1/3 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px] md:h-[700px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-800">Files ({filtered.length})</h2>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((lecture) => (
                  <button
                    key={lecture.id}
                    onClick={() => handleSelectLecture(lecture.id)}
                    className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors ${
                      selectedLectureId === lecture.id
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "hover:bg-gray-50 border-transparent"
                    } border`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${selectedLectureId === lecture.id ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium line-clamp-1 ${selectedLectureId === lecture.id ? "text-blue-900" : "text-gray-900"}`}>
                        {lecture.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(lecture.duration / 60)}:{(lecture.duration % 60).toString().padStart(2, '0')}
                        </span>
                        <span>{lecture.created_at ? new Date(lecture.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm">No lectures found</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="w-full md:w-2/3 bg-white rounded-lg shadow-sm border border-gray-100 p-6 min-h-[600px] md:h-[700px] flex flex-col">
            {!selectedLectureId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <FileText className="w-16 h-16 mb-4 text-gray-200" />
                <p className="text-lg font-medium text-gray-500">Select a file to preview</p>
                <p className="text-sm text-gray-400">View transcripts, summaries, and details</p>
              </div>
            ) : loadingDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <Loader className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading lecture details...</p>
              </div>
            ) : selectedLectureDetails ? (
              <div className="flex flex-col h-full overflow-y-auto pr-2">
                {/* Preview Header */}
                <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100 shrink-0">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedLectureDetails.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(selectedLectureDetails.duration / 60)}:{(selectedLectureDetails.duration % 60).toString().padStart(2, '0')}
                      </span>
                      <span>
                        {selectedLectureDetails.created_at ? new Date(selectedLectureDetails.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownloadText(selectedLectureDetails.title, selectedLectureDetails.summary, selectedLectureDetails.transcript)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                      title="Download Text Outline"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedLectureDetails.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                      title="Delete Lecture"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content Tabs / Sections */}
                <div className="space-y-8 pb-4">
                  
                  {/* Summary Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-purple-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                    </div>
                    {selectedLectureDetails.summary ? (
                      <div className="bg-purple-50/50 p-5 rounded-xl border border-purple-100/50 text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedLectureDetails.summary}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">No summary generated yet.</p>
                    )}
                  </div>

                  {/* Transcript Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-900">Transcript</h3>
                    </div>
                    {selectedLectureDetails.transcript ? (
                      <div className="bg-blue-50/30 p-5 rounded-xl border border-blue-50 text-gray-700 whitespace-pre-wrap leading-relaxed font-serif">
                        {selectedLectureDetails.transcript}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic bg-gray-50 p-4 rounded-lg">No transcript available.</p>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <p>Could not load lecture details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
