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

      {/* A4 Sheet - dynamically sized for perfect print fit */}
      <div className={`w-[210mm] h-[297mm] relative overflow-hidden print:shadow-none print:w-full print:h-[100vh] mx-auto box-border flex flex-col ${isColorMode ? 'bg-[#F8FAFC] shadow-2xl rounded-sm' : 'bg-white shadow-xl'}`}>
        
        {/* Background Chess Watermark */}
        <div className={`absolute inset-0 pointer-events-none flex items-center justify-center z-0 select-none ${isColorMode ? 'opacity-[0.04]' : 'opacity-[0.03] print:opacity-[0.04]'}`}>
          <svg viewBox="0 0 512 512" fill="currentColor" className={`w-[160mm] h-[160mm] ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>
            <path d="M225.8 45.4c-6.8-9.1-18.7-12.7-29.3-8.8l-68.5 25.1c-14.7 5.4-23 20.8-19.6 35.9l12.5 55c3.2 14.1 14.5 25.4 28.6 28.6l10 2.3c-15.6 15.6-38.1 36.3-51.7 48-18.4 15.8-41.9 26.6-67.6 30.7-12.6 2-20.2 14-16.5 26.1l20.4 67.2c3 9.8 11.2 17 21.3 18.5l68.7 10.7c21.8 3.4 43.1-4 58.7-19.6l28.6-28.6c18.5 9.4 39 14.6 60.3 14.6h.4c34 0 66.8-13.5 90.8-37.5 13-13 23-28.5 29.5-45.5 15.5-40.4 9.1-85.7-18.4-120-14.7-18.4-34.1-33.1-56.3-42.5-3.1-1.3-6.4-2.4-9.8-3.3-21.7-6.2-39.6-20.6-50.6-40l-21.3-37.3c-5.5-9.6-14.5-16.7-25.2-19.9zM128 416h256v32H128v-32zm0 64h256v32H128v-32z" />
          </svg>
        </div>

        {/* Top edge gradient/checkerboard */}
        {!isColorMode && (
          <div className="absolute top-0 left-0 right-0 h-2 opacity-20" style={{ backgroundImage: \`repeating-linear-gradient(90deg, black 0, black 20px, transparent 20px, transparent 40px)\` }} />
        )}
        {isColorMode && (
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] z-20" />
        )}

        {/* Main padding container ensuring uniform inner structure */}
        <div className="flex-1 flex flex-col p-[12mm] relative z-10 w-full box-border h-full print:max-h-[100vh] max-h-[297mm]">
          
          {/* Header */}
          <div className={`flex items-center gap-4 mb-5 ${isColorMode ? 'bg-[#0F172A] -mt-[12mm] -mx-[12mm] px-[12mm] pt-[15mm] pb-6 shadow-lg rounded-b-[2rem]' : 'border-b-2 border-black pb-3 mt-[2mm]'}`}>
            <div className={isColorMode ? 'bg-white p-2.5 rounded-2xl shadow-xl' : ''}>
              <img src="/favicon.svg" alt="Logo" className={`w-16 h-16 object-contain ${isColorMode ? '' : 'filter grayscale'}`} />
            </div>
            <div className="flex-1 flex justify-between items-center">
              <div>
                <h1 className={`text-3xl font-serif tracking-tight mb-0.5 font-bold ${isColorMode ? 'text-white' : 'text-black'}`}>
                  The Chess Lifestyle
                </h1>
                <p className={`text-sm font-medium italic tracking-wide ${isColorMode ? 'text-[#D4AF37]' : 'text-neutral-600'}`}>
                  "Life is a chess game, learn to checkmate"
                </p>
              </div>
              <div className="text-right">
                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${isColorMode ? 'text-[#D4AF37]' : 'text-black'}`}>Document Type</p>
                <p className={`text-xs uppercase tracking-widest font-bold px-3 py-1 ${isColorMode ? 'bg-white/10 text-white rounded-full border border-white/20' : 'border border-black text-black bg-neutral-100 rounded-sm'}`}>
                  Registration Form
                </p>
              </div>
            </div>
          </div>

          {/* Form Content - Uniform Spacing */}
          <div className="flex-1 flex flex-col gap-3">
            
            {/* Section 1 */}
            <div>
              <div className={`px-4 py-1.5 mb-3 ${isColorMode ? 'bg-[#0F172A] text-[#D4AF37] rounded-t-lg shadow-sm border-b-2 border-[#D4AF37] inline-block' : 'border-b border-black inline-block px-0'}`}>
                <h2 className={`text-xs font-serif uppercase tracking-widest font-bold ${isColorMode ? '' : 'text-black'}`}>Student Details</h2>
              </div>
              
              <div className={`grid grid-cols-2 gap-x-8 gap-y-4 ${isColorMode ? 'bg-white p-5 rounded-lg shadow-sm border border-neutral-200' : ''}`}>
                <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}`}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Full Name of Student</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Date of Birth (DD/MM/YYYY)</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Gender</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>School Name</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Class / Grade</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Current Chess Rating (If any)</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>FIDE ID (If any)</div>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <div className={`px-4 py-1.5 mb-3 ${isColorMode ? 'bg-[#0F172A] text-[#D4AF37] rounded-t-lg shadow-sm border-b-2 border-[#D4AF37] inline-block' : 'border-b border-black inline-block px-0 mt-3'}`}>
                <h2 className={`text-xs font-serif uppercase tracking-widest font-bold ${isColorMode ? '' : 'text-black'}`}>Parent / Guardian Details</h2>
              </div>
              
              <div className={`grid grid-cols-2 gap-x-8 gap-y-4 ${isColorMode ? 'bg-white p-5 rounded-lg shadow-sm border border-neutral-200' : ''}`}>
                <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}`}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Parent / Guardian Name</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Primary Phone Number</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Secondary Phone Number</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Father's Occupation</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Mother's Occupation</div>
                </div>
                <div className={`col-span-2 ${isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}`}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Email Address</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>City / Region</div>
                </div>
                <div className={isColorMode ? 'bg-neutral-50 p-2 rounded border-b-2 border-neutral-300' : 'border-b-2 border-dotted border-black pb-0.5'}>
                  <div className={`text-[8px] uppercase tracking-widest font-bold ${isColorMode ? 'text-neutral-500 mb-3' : 'text-black mb-3'}`}>Country</div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className={`mt-auto pt-4 pb-1`}>
              <div className={`grid grid-cols-2 gap-12`}>
                <div className={`${isColorMode ? 'border-t-2 border-[#0F172A]/20 pt-1 text-center' : 'border-t-2 border-black pt-1 text-center'}`}>
                  <div className={`text-[9px] uppercase tracking-widest font-bold ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>Parent / Guardian Signature</div>
                  <div className={`text-[8px] mt-1 ${isColorMode ? 'text-neutral-500' : 'text-neutral-500'}`}>Date: _______ / _______ / 20____</div>
                </div>
                <div className={`${isColorMode ? 'border-t-2 border-[#0F172A]/20 pt-1 text-center' : 'border-t-2 border-black pt-1 text-center'}`}>
                  <div className={`text-[9px] uppercase tracking-widest font-bold ${isColorMode ? 'text-[#0F172A]' : 'text-black'}`}>Academy Representative</div>
                  <div className={`text-[8px] mt-1 ${isColorMode ? 'text-[#D4AF37] font-bold' : 'text-neutral-500'}`}>Official Use Only</div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer - Ensures it is exactly at the bottom of the container */}
          <div className={`w-full text-center ${isColorMode ? 'bg-[#0F172A] text-white -mb-[12mm] -mx-[12mm] px-[12mm] py-3 rounded-t-[2rem]' : 'pt-2 border-t-2 border-black/10 text-black'}`}>
            <p className={`font-bold tracking-widest uppercase mb-1 ${isColorMode ? 'text-[#D4AF37] text-[10px]' : 'text-[10px]'}`}>thechesslifestyle.com</p>
            <p className={`text-[8px] ${isColorMode ? 'text-slate-400 max-w-2xl mx-auto' : 'text-neutral-500'}`}>
              This document is strictly for internal academy use. All student data is handled securely and privately.
              <br />
              Knowing parents' occupations helps us tailor our communication and explore networking opportunities.
            </p>
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}
