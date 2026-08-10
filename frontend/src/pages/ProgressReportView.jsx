import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { CheckCircle2, Circle, Trophy, Star, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function ProgressReportView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/public/progress/${id}`);
        setData(res.data);
      } catch (e) {
        setError(formatApiError(e));
      }
    };
    load();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
          <div className="text-red-500 mb-4 flex justify-center">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin"></div>
          <p className="text-slate-500 font-medium tracking-wide">Loading Progress...</p>
        </div>
      </div>
    );
  }

  // Group outcomes by Level -> Module
  const grouped = data.outcomes.reduce((acc, curr) => {
    if (!acc[curr.level]) acc[curr.level] = {};
    if (!acc[curr.level][curr.module]) acc[curr.level][curr.module] = [];
    acc[curr.level][curr.module].push(curr);
    return acc;
  }, {});

  const levels = Object.keys(grouped);
  const defaultLevel = levels.find(l => 
    Object.values(grouped[l]).flat().some(o => o.completed)
  ) || levels[0];

  const totalOutcomes = data.outcomes.length;
  const completedOutcomes = data.outcomes.filter(o => o.completed).length;
  const progressPercentage = totalOutcomes === 0 ? 0 : Math.round((completedOutcomes / totalOutcomes) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans selection:bg-orange-200 selection:text-orange-900 pb-12">
      {/* Brand Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo Placeholder - Instructed user to add logo.png to public folder */}
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <img 
                src="/favicon.svg" 
                alt="TheChessLifestyle.com" 
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center h-10 w-10 text-orange-500 font-bold text-xl">
                #
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="text-white font-bold text-lg tracking-wide">TheChessLifestyle.com</div>
              <div className="text-slate-400 text-[10px] uppercase tracking-widest mt-0.5">life is a chess game, learn to checkmate</div>
            </div>
          </div>
          <Link to="/login" className="text-xs font-semibold uppercase tracking-widest text-slate-300 hover:text-orange-400 transition-colors bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full">
            Staff Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Student Highlight Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 md:p-8 mb-8 relative overflow-hidden border border-slate-100">
          {/* Decorative background circle */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-10 blur-3xl"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
            <div className="text-center md:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Official Progress Report
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {data.student_name}
              </h1>
              <p className="text-lg text-slate-500 font-medium">
                Current Level: <span className="text-slate-800 font-semibold">{data.level}</span>
              </p>
            </div>

            {/* Circular Progress */}
            <div className="flex items-center justify-center shrink-0">
              <div className="relative w-32 h-32 flex items-center justify-center bg-slate-50 rounded-full shadow-inner border border-slate-100">
                <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0">
                  <circle
                    cx="64" cy="64" r="56"
                    className="stroke-slate-200" strokeWidth="8" fill="none"
                  />
                  <circle
                    cx="64" cy="64" r="56"
                    className="stroke-orange-500 transition-all duration-1000 ease-out"
                    strokeWidth="8" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={351.858}
                    strokeDashoffset={351.858 - (351.858 * progressPercentage) / 100}
                  />
                </svg>
                <div className="text-center">
                  <span className="text-3xl font-black text-slate-800">{progressPercentage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center md:justify-start gap-8">
            <div>
              <div className="text-sm text-slate-500 font-medium">Mastered</div>
              <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" /> {completedOutcomes}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 font-medium">Total Goals</div>
              <div className="text-2xl font-bold text-slate-900">{totalOutcomes}</div>
            </div>
          </div>
        </div>

        {/* Learning Outcomes Tabs */}
        {data.outcomes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-slate-100">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No learning goals yet</h3>
            <p className="text-slate-500">The curriculum is being prepared and will appear here soon.</p>
          </div>
        ) : (
          <Tabs defaultValue={defaultLevel} className="w-full">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 flex overflow-x-auto hide-scrollbar">
              <TabsList className="w-full flex justify-start bg-transparent h-auto p-0 gap-2">
                {levels.map(level => {
                  const levelOutcomes = data.outcomes.filter(o => o.level === level);
                  const levelCompleted = levelOutcomes.filter(o => o.completed).length;
                  const isFullyCompleted = levelOutcomes.length > 0 && levelCompleted === levelOutcomes.length;
                  
                  return (
                    <TabsTrigger
                      key={level}
                      value={level}
                      className="rounded-xl py-3 px-6 flex-shrink-0 transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {isFullyCompleted && <Star className="w-4 h-4 text-orange-400 fill-orange-400" />}
                        {level}
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            
            {levels.map(level => (
              <TabsContent key={level} value={level} className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  {Object.keys(grouped[level]).map((module, i) => (
                    <Accordion type="multiple" defaultValue={[module]} className="w-full" key={i}>
                      <AccordionItem value={module} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-slate-50/80 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <span className="text-orange-600 font-bold text-sm">{i + 1}</span>
                            </div>
                            <span className="font-bold text-slate-800 text-lg">{module}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 border-t border-slate-100 bg-slate-50/30">
                          <div className="divide-y divide-slate-100">
                            {grouped[level][module].map((outcome, j) => (
                              <div key={outcome.id || j} className={`p-5 flex gap-4 transition-colors ${outcome.completed ? 'bg-orange-50/30' : 'hover:bg-white'}`}>
                                <div className="mt-1 flex-shrink-0">
                                  {outcome.completed ? (
                                    <div className="relative">
                                      <div className="absolute inset-0 bg-orange-400 rounded-full animate-ping opacity-20"></div>
                                      <CheckCircle2 className="w-6 h-6 text-orange-500 relative z-10 bg-white rounded-full" />
                                    </div>
                                  ) : (
                                    <Circle className="w-6 h-6 text-slate-300" />
                                  )}
                                </div>
                                <div>
                                  <p className={`text-base font-medium leading-relaxed ${outcome.completed ? 'text-slate-800' : 'text-slate-600'}`}>
                                    {outcome.text}
                                  </p>
                                  {outcome.completed && outcome.completed_date && (
                                    <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-md">
                                      <Trophy className="w-3 h-3" />
                                      Mastered on {new Date(outcome.completed_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
}
