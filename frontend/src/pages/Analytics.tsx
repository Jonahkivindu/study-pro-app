import { BarChart3, Clock, BookOpen, Target, Loader } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../services/api";

interface AnalyticsData {
  total_study_time: number;
  lectures_recorded: number;
  avg_note_coverage: number;
  learning_streak: number;
  topic_distribution: Array<{ name: string; percent: number; color: string }>;
  study_sessions: Array<{ day: string; hours: number }>;
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange] = useState("week");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await apiClient.getAnalyticsOverview();
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader className="w-8 h-8 text-gray-900 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: "Total Study Time",
      value: data.total_study_time.toString(),
      unit: "hours",
      icon: Clock,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Lectures Recorded",
      value: data.lectures_recorded.toString(),
      unit: "lectures",
      icon: BookOpen,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "Avg. Note Coverage",
      value: data.avg_note_coverage.toString(),
      unit: "%",
      icon: Target,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Learning Streak",
      value: data.learning_streak.toString(),
      unit: "days",
      icon: BarChart3,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] pb-24 md:pb-8 text-gray-900 tracking-tight">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tighter">
            Learning Analytics
          </h1>
          <p className="text-xl font-medium text-gray-500 tracking-tight">
            Track your study progress and performance
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="glass-card rounded-[2rem] p-8 premium-shadow border border-gray-100">
                <div className={`${metric.color} p-4 rounded-2xl w-fit mb-6`}>
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-gray-500 text-sm font-black uppercase tracking-widest mb-2">{metric.label}</p>
                <p className="text-4xl font-extrabold text-gray-900 tracking-tighter">
                  {metric.value}
                  <span className="text-lg font-bold text-gray-400 ml-1 tracking-tight">{metric.unit}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Study Time Chart */}
          <div className="glass-card rounded-[2.5rem] p-10 premium-shadow border border-gray-100">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-8">Study Time (Hrs)</h2>
            <div className="flex items-end justify-between h-64 gap-3 px-2">
              {data.study_sessions.map((session, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gray-900 rounded-2xl transition hover:bg-black relative group"
                    style={{ height: `${Math.max(session.hours * 20, 10)}px` }}
                  >
                     <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {session.hours}h
                     </div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">
                    {session.day}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Distribution */}
          <div className="glass-card rounded-[2.5rem] p-10 premium-shadow border border-gray-100">
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-8">Discipline Overview</h2>
            <div className="space-y-6">
              {data.topic_distribution.length > 0 ? (
                data.topic_distribution.map((topic, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2 px-1">
                      <p className="text-sm font-black uppercase tracking-widest text-gray-600">{topic.name}</p>
                      <p className="text-sm font-bold text-gray-900">{topic.percent}%</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner border border-gray-50">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${topic.color} shadow-lg`}
                        style={{ width: `${topic.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 font-bold italic uppercase tracking-widest">
                   No lectures found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
