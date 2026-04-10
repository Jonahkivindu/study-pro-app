import { X, Download, FileText, CheckCircle } from "lucide-react";

interface ReportPanelProps {
  lectureTitle: string;
  summary: string | null;
  transcript: string;
  onClose: () => void;
}

export function ReportPanel({ lectureTitle, summary, transcript, onClose }: ReportPanelProps) {
  // Mock report data
  const mockReport = {
    title: lectureTitle,
    date: new Date().toLocaleDateString(),
    duration: "45 minutes",
    sections: [
      {
        title: "Executive Summary",
        content: summary || "A comprehensive overview of the key concepts covered in this lecture.",
      },
      {
        title: "Key Concepts",
        items: [
          "Fundamental principles and definitions",
          "Core mathematical or theoretical framework",
          "Practical applications and real-world examples",
          "Common misconceptions and how to avoid them",
          "Relationships to previous and future topics",
        ],
      },
      {
        title: "Study Guide",
        items: [
          "Review the main definitions and concepts",
          "Practice problems related to the material",
          "Connect concepts to your existing knowledge",
          "Prepare questions for clarification",
          "Create summary notes for later review",
        ],
      },
      {
        title: "Exam Readiness",
        items: [
          "High priority topics: Core concepts, formulas, and key findings",
          "Medium priority: Applications and connections to other topics",
          "Lower priority: Historical context and supplementary details",
          "Estimated preparation time: 2-3 hours of focused study",
        ],
      },
      {
        title: "Action Items",
        items: [
          "Complete assigned problems by next session",
          "Review synthesis problems combining multiple concepts",
          "Read supplementary materials on challenging topics",
          "Attend office hours if you need clarification",
          "Form study group for peer teaching",
        ],
      },
    ],
  };

  const handleDownloadPDF = () => {
    alert("📥 PDF Download feature coming soon!\n\nIn the future, you'll be able to download this report as a formatted PDF with all sections, graphics, and your notes.");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Study Report</h3>
              <p className="text-sm text-gray-600">{lectureTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-gray-50">
          {/* Report Header Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">DATE</p>
              <p className="text-sm font-semibold text-gray-900">{mockReport.date}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
              <p className="text-xs text-purple-600 font-semibold">DURATION</p>
              <p className="text-sm font-semibold text-gray-900">{mockReport.duration}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-semibold">STATUS</p>
              <p className="text-sm font-semibold text-gray-900">Complete</p>
            </div>
          </div>

          {/* Report Sections */}
          {mockReport.sections.map((section, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                {section.title}
              </h4>
              {section.items ? (
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-700">{section.content}</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
