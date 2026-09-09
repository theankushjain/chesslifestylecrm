import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Star, Send, CheckCircle2 } from "lucide-react";

export default function FeedbackForm() {
  const { id } = useParams();
  const [step, setStep] = useState(1);
  const [satisfaction, setSatisfaction] = useState(0);
  const [pacing, setPacing] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!satisfaction || !pacing) {
      setError("Please fill out all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/public/feedback/${id}`, {
        satisfaction,
        pacing,
        suggestions
      });
      setStep(2);
    } catch (e) {
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-[#F58B10]">
          <div className="text-green-500 mb-4 flex justify-center">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-800 mb-2">Thank You!</h2>
          <p className="text-slate-600">Your feedback has been successfully submitted. We appreciate your time and support!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-border/40">
        <div className="bg-[#242B38] text-white p-6 text-center">
          <div className="inline-flex bg-white p-2 rounded-xl mb-4 shadow-sm">
            <img src="/favicon.svg" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => e.target.style.display='none'} />
          </div>
          <h1 className="text-2xl font-serif font-bold">Parent Feedback</h1>
          <p className="text-white/70 text-sm mt-1">Help us improve your child's learning experience</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-3 text-center">
            <label className="block text-slate-800 font-semibold text-lg">1. How satisfied are you with your child's progress?</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSatisfaction(star)}
                  className={`p-2 transition-all ${satisfaction >= star ? 'text-yellow-400 scale-110' : 'text-slate-200 hover:text-yellow-200'}`}
                >
                  <Star className="w-10 h-10" fill={satisfaction >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 text-center">
            <label className="block text-slate-800 font-semibold text-lg">2. How do you feel about the pace of learning?</label>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {["Too Slow", "Just Right", "Too Fast"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPacing(opt)}
                  className={`px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                    pacing === opt 
                      ? 'bg-[#F58B10] border-[#F58B10] text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-[#F58B10]/50 hover:bg-orange-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-slate-800 font-semibold text-lg text-center">3. Any suggestions or areas to focus on?</label>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Tell us what you think... (Optional)"
              className="w-full min-h-[120px] p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F58B10] focus:border-transparent transition-all outline-none resize-none text-slate-700 bg-slate-50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#F58B10] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#e07a0b] transition-colors disabled:opacity-70 shadow-lg shadow-orange-500/20"
          >
            {submitting ? "Submitting..." : (
              <>
                <span>Submit Feedback</span>
                <Send className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
