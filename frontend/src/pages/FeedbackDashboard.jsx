import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Star, MessageSquare } from "lucide-react";

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await api.get("/feedback");
        setFeedbacks(res.data);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading Feedback...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-medium">{error}</div>;

  const averageSatisfaction = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, f) => acc + f.satisfaction, 0) / feedbacks.length).toFixed(1)
    : 0;

  const pacingCounts = feedbacks.reduce((acc, f) => {
    acc[f.pacing] = (acc[f.pacing] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900">Parent Feedback</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/40">
          <div className="text-sm font-medium text-slate-500 mb-1">Average Satisfaction</div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-slate-900">{averageSatisfaction}</span>
            <Star className="w-6 h-6 text-yellow-400" fill="currentColor" />
          </div>
          <div className="text-xs text-slate-400 mt-2">Based on {feedbacks.length} responses</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/40 md:col-span-2">
          <div className="text-sm font-medium text-slate-500 mb-4">Curriculum Pacing Breakdown</div>
          <div className="flex flex-wrap gap-4">
            {["Too Slow", "Just Right", "Too Fast"].map(opt => (
              <div key={opt} className="flex-1 min-w-[100px] bg-slate-50 p-3 rounded-xl text-center">
                <div className="text-xl font-bold text-slate-800">{pacingCounts[opt] || 0}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{opt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border/40 overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-slate-50/50">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-slate-400" />
            Recent Responses
          </h2>
        </div>
        <div className="divide-y divide-border/40">
          {feedbacks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No feedback responses yet.</div>
          ) : (
            feedbacks.map(f => (
              <div key={f.id} className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="font-bold text-slate-900">{f.student_name}</div>
                    <div className="text-xs text-slate-500">{new Date(f.created_at).toLocaleDateString()} at {new Date(f.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-sm font-medium">
                      {f.satisfaction} <Star className="w-3.5 h-3.5" fill="currentColor" />
                    </div>
                    <div className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-600 rounded-md">
                      {f.pacing}
                    </div>
                  </div>
                </div>
                {f.suggestions && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap">
                    "{f.suggestions}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
