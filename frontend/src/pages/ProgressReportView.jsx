import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { CheckCircle2, Circle } from "lucide-react";
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
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-border/60 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif">Learning Progress</h1>
            <div className="text-sm text-muted-foreground">{data.student_name} · {data.level}</div>
          </div>
          <Link to="/login" className="text-xs uppercase tracking-widest text-primary hover:underline">
            Login
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
        {data.outcomes.length === 0 ? (
          <div className="bg-white border border-border/60 p-8 text-center text-muted-foreground">
            No learning progress tracked yet.
          </div>
        ) : (
          <Tabs defaultValue={defaultLevel} className="bg-white border border-border/60">
            <TabsList className="w-full flex overflow-x-auto rounded-none border-b border-border/60 p-0 h-auto hide-scrollbar">
              {levels.map(level => (
                <TabsTrigger
                  key={level}
                  value={level}
                  className="rounded-none py-3 px-4 flex-shrink-0 data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  {level}
                </TabsTrigger>
              ))}
            </TabsList>
            {levels.map(level => (
              <TabsContent key={level} value={level} className="p-0 m-0">
                <Accordion type="multiple" defaultValue={Object.keys(grouped[level])} className="w-full">
                  {Object.keys(grouped[level]).map((module, i) => (
                    <AccordionItem key={i} value={module} className="border-b last:border-0 border-border/60">
                      <AccordionTrigger className="px-4 hover:no-underline hover:bg-gray-50">
                        <span className="font-semibold text-left">{module}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="divide-y divide-border/60">
                          {grouped[level][module].map((outcome, j) => (
                            <div key={outcome.id || j} className="p-4 flex gap-4">
                              <div className="mt-0.5">
                                {outcome.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-success" />
                                ) : (
                                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                                )}
                              </div>
                              <div>
                                <p className={`text-sm ${outcome.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {outcome.text}
                                </p>
                                {outcome.completed && outcome.completed_date && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed on {new Date(outcome.completed_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  );
}
