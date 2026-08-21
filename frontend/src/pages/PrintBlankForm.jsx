import { useState } from "react";
import { Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintBlankForm() {
  const [isColorMode, setIsColorMode] = useState(false);

  const handlePrint = (color) => {
    setIsColorMode(color);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-10 font-sans print:py-0 print:bg-white print:min-h-0 selection:bg-[#D4AF37]/30">
      
      {/* Non-printable action bar */}
      <div className="print:hidden w-[210mm] flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-border/50">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          Select your print style before generating the PDF
        </div>
        <div className="flex gap-3">
          <Button onClick={() => handlePrint(false)} variant="outline" className="rounded-full h-11 px-6 gap-2 hover:bg-neutral-100 transition-colors border-neutral-300">
            <Printer className="w-4 h-4" />
            <span>Classic B&W</span>
          </Button>
          <Button onClick={() => handlePrint(true)} className="rounded-full h-11 px-6 gap-2 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#334155] text-white shadow-md border-0 transition-all">
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Premium Color</span>
          </Button>
        </div>
      </div>

      {/* A4 Sheet */}
      <div className={`w-[210mm] min-h-[297mm] relative overflow-hidden print:shadow-none print:w-[210mm] print:h-[297mm] mx-auto box-border ${isColorMode ? 'bg-[#F8FAFC] shadow-2xl rounded-sm print:bg-[#F8FAFC]' : 'bg-white shadow-xl print:bg-white'}`}>
        
        {/* Background Chess Watermark */}
        <div className={`absolute inset-0 pointer-events-none flex items-center justify-center z-0 select-none ${isColorMode ? 'opacity-[0.04]' : 'opacity-[0.03] print:opacity-[0.05]'}`}>
          <svg viewBox="0 0 512 512" fill="currentColor" className={`w-[180mm] h-[180mm] ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>
            <path d="M225.8 45.4c-6.8-9.1-18.7-12.7-29.3-8.8l-68.5 25.1c-14.7 5.4-23 20.8-19.6 35.9l12.5 55c3.2 14.1 14.5 25.4 28.6 28.6l10 2.3c-15.6 15.6-38.1 36.3-51.7 48-18.4 15.8-41.9 26.6-67.6 30.7-12.6 2-20.2 14-16.5 26.1l20.4 67.2c3 9.8 11.2 17 21.3 18.5l68.7 10.7c21.8 3.4 43.1-4 58.7-19.6l28.6-28.6c18.5 9.4 39 14.6 60.3 14.6h.4c34 0 66.8-13.5 90.8-37.5 13-13 23-28.5 29.5-45.5 15.5-40.4 9.1-85.7-18.4-120-14.7-18.4-34.1-33.1-56.3-42.5-3.1-1.3-6.4-2.4-9.8-3.3-21.7-6.2-39.6-20.6-50.6-40l-21.3-37.3c-5.5-9.6-14.5-16.7-25.2-19.9zM128 416h256v32H128v-32zm0 64h256v32H128v-32z" />
          </svg>
        </div>

        {/* Checkerboard subtle borders (Top & Bottom) for B&W, solid for Color */}
        {!isColorMode && (
          <>
            <div className="absolute top-0 left-0 right-0 h-3 print:h-2 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, black 0, black 20px, transparent 20px, transparent 40px)` }} />
            <div className="absolute bottom-0 left-0 right-0 h-3 print:h-2 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, black 0, black 20px, transparent 20px, transparent 40px)` }} />
          </>
        )}
        {isColorMode && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37]" />
        )}

        {/* Content Wrapper */}
        <div className={`relative z-10 flex flex-col h-full ${isColorMode ? '' : 'p-[20mm] print:p-[15mm]'}`}>
          
          {/* Header */}
          <div className={isColorMode ? "bg-[#0F172A] px-[20mm] pt-[15mm] pb-[12mm] shadow-lg rounded-b-[2.5rem] mb-10 flex items-center gap-8 relative overflow-hidden" : "flex items-center justify-between mb-10 border-b-2 pb-6 print:pb-4 border-black"}>
            
            {/* Color Mode Header Glow */}
            {isColorMode && <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-[#D4AF37] opacity-20 blur-[100px] rounded-full pointer-events-none" />}
            
            <div className={`flex items-center gap-6 relative z-10 ${isColorMode ? 'w-full' : ''}`}>
              <div className={isColorMode ? "bg-white p-3 rounded-2xl shadow-xl" : ""}>
                <img src="/favicon.svg" alt="Logo" className={`w-20 h-20 print:w-16 print:h-16 object-contain ${isColorMode ? '' : 'filter grayscale'}`} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className={`text-4xl print:text-3xl font-serif tracking-tight mb-1 font-bold ${isColorMode ? 'text-white' : 'text-black'}`}>
                      The Chess Lifestyle
                    </h1>
                    <p className={`text-lg print:text-base font-medium italic tracking-wide ${isColorMode ? 'text-[#D4AF37]' : 'text-neutral-600 mb-2'}`}>
                      "Life is a chess game, learn to checkmate"
                    </p>
                  </div>
                  {isColorMode && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold mb-1">Document Type</p>
                      <p className="text-sm uppercase tracking-widest font-bold px-4 py-1.5 bg-white/10 text-white rounded-full border border-white/20 backdrop-blur-sm">
                        Registration Form
                      </p>
                    </div>
                  )}
                </div>
                {!isColorMode && (
                  <p className="text-sm uppercase tracking-widest font-bold inline-block px-3 py-1 border rounded-sm text-black border-black bg-neutral-100 print:border-black print:bg-transparent">
                    Student Registration Form
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className={`flex-1 ${isColorMode ? 'px-[20mm]' : ''}`}>
            
            <div className="mb-8">
              {isColorMode ? (
                <div className="bg-[#0F172A] text-[#D4AF37] px-6 py-3 rounded-t-xl shadow-md border-b-4 border-[#D4AF37] inline-block mb-0 relative top-2 z-10">
                  <h2 className="text-base font-serif uppercase tracking-widest font-bold">Student Details</h2>
                </div>
              ) : (
                <h2 className="text-lg font-serif uppercase tracking-widest font-bold flex items-center gap-4 mb-6 text-black">
                  <span>Student Details</span>
                  <div className="flex-1 h-px bg-black/20"></div>
                </h2>
              )}
              
              <div className={isColorMode ? "bg-white p-8 rounded-xl shadow-xl rounded-tl-none border border-neutral-200/60" : ""}>
                <div className={`grid grid-cols-2 ${isColorMode ? 'gap-6' : 'gap-x-12 gap-y-10 print:gap-y-8'}`}>
                  
                  <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}`}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Full Name of Student</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Date of Birth (DD/MM/YYYY)</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Gender</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>School Name</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Class / Grade</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Current Chess Rating (If any)</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>FIDE ID (If any)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {isColorMode ? (
                <div className="bg-[#0F172A] text-[#D4AF37] px-6 py-3 rounded-t-xl shadow-md border-b-4 border-[#D4AF37] inline-block mb-0 relative top-2 z-10">
                  <h2 className="text-base font-serif uppercase tracking-widest font-bold">Parent / Guardian Details</h2>
                </div>
              ) : (
                <h2 className="text-lg font-serif uppercase tracking-widest font-bold flex items-center gap-4 mb-6 text-black mt-8">
                  <span>Parent / Guardian Details</span>
                  <div className="flex-1 h-px bg-black/20"></div>
                </h2>
              )}
              
              <div className={isColorMode ? "bg-white p-8 rounded-xl shadow-xl rounded-tl-none border border-neutral-200/60" : ""}>
                <div className={`grid grid-cols-2 ${isColorMode ? 'gap-6' : 'gap-x-12 gap-y-10 print:gap-y-8'}`}>
                  
                  <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}`}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Parent / Guardian Name</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Primary Phone Number</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Secondary Phone Number</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Father's Occupation</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Mother's Occupation</div>
                  </div>
                  
                  <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}`}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Email Address</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>City / Region</div>
                  </div>
                  
                  <div className={isColorMode ? 'bg-neutral-50 border border-neutral-200 rounded-lg p-3 pt-4 border-b-4 border-b-[#0F172A]/10' : 'border-b-2 border-dotted border-black pb-1'}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-6' : 'text-black mb-6'}`}>Country</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className={`mt-10 ${isColorMode ? 'px-4' : 'pt-8 print:mt-12 print:pt-6'}`}>
              <div className={`grid grid-cols-2 ${isColorMode ? 'gap-16' : 'gap-12'}`}>
                <div className={`${isColorMode ? 'border-t-[3px] border-[#0F172A]/20 pt-3' : 'border-t-2 border-black pt-2 text-center'}`}>
                  <div className={`text-xs uppercase tracking-widest font-bold ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>Parent / Guardian Signature</div>
                  <div className={`text-[10px] mt-1 ${isColorMode ? 'text-neutral-500 font-medium' : 'text-neutral-500'}`}>Date: _______ / _______ / 20____</div>
                </div>
                <div className={`${isColorMode ? 'border-t-[3px] border-[#0F172A]/20 pt-3' : 'border-t-2 border-black pt-2 text-center'}`}>
                  <div className={`text-xs uppercase tracking-widest font-bold ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>Academy Representative</div>
                  <div className={`text-[10px] mt-1 ${isColorMode ? 'text-[#D4AF37] font-bold' : 'text-neutral-500'}`}>Official Use Only</div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className={`mt-auto ${isColorMode ? 'bg-[#0F172A] text-white px-[20mm] py-6 rounded-t-[2.5rem] relative' : 'pt-6 text-center'}`}>
            {isColorMode && <div className="absolute top-0 left-[20%] right-[20%] h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />}
            <div className={`${isColorMode ? 'text-center' : 'text-xs border-t-2 border-black/10 text-black pt-4 print:pt-2'}`}>
              <p className={`font-bold tracking-widest uppercase mb-2 ${isColorMode ? 'text-[#D4AF37] text-sm' : 'mb-1'}`}>thechesslifestyle.com</p>
              <p className={`text-[10px] ${isColorMode ? 'text-slate-400 max-w-2xl mx-auto leading-relaxed' : 'text-neutral-500'}`}>
                This document is strictly for internal academy use. All student data is handled securely and privately.
                <br />
                Knowing parents' occupations helps us tailor our communication, organize better schedules, and explore mutually beneficial professional networking opportunities within our academy community.
              </p>
            </div>
          </div>
          
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important;
          }
          /* Ensure backgrounds print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
