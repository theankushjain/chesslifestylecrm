import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintBlankForm() {
  const [isColorMode, setIsColorMode] = useState(false);

  const handlePrint = (color) => {
    setIsColorMode(color);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const primaryColor = isColorMode ? '#D4AF37' : '#000000';
  const primaryColorClass = isColorMode ? 'text-[#D4AF37]' : 'text-black';
  const borderColorClass = isColorMode ? 'border-[#D4AF37]' : 'border-black';
  const dividerBgClass = isColorMode ? 'bg-[#D4AF37]/30' : 'bg-black/20';

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-10 font-sans print:py-0 print:bg-white print:min-h-0">
      
      {/* Non-printable action bar */}
      <div className="print:hidden w-[210mm] flex justify-end gap-4 mb-4">
        <Button onClick={() => handlePrint(false)} className="rounded-full shadow-lg h-12 px-6 gap-2 bg-neutral-800 hover:bg-neutral-900 text-white transition-colors">
          <Printer className="w-5 h-5" />
          <span>Print B&W Form</span>
        </Button>
        <Button onClick={() => handlePrint(true)} className="rounded-full shadow-lg h-12 px-6 gap-2 bg-[#D4AF37] hover:bg-[#b5952f] text-white transition-colors">
          <Printer className="w-5 h-5" />
          <span>Print Color Form</span>
        </Button>
      </div>

      {/* A4 Sheet */}
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-xl relative overflow-hidden print:shadow-none print:w-[210mm] print:h-[297mm] mx-auto box-border">
        
        {/* Background Chess Watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] print:opacity-[0.05] z-0 select-none">
          <svg viewBox="0 0 512 512" fill="currentColor" className={`w-[180mm] h-[180mm] ${primaryColorClass}`}>
            <path d="M225.8 45.4c-6.8-9.1-18.7-12.7-29.3-8.8l-68.5 25.1c-14.7 5.4-23 20.8-19.6 35.9l12.5 55c3.2 14.1 14.5 25.4 28.6 28.6l10 2.3c-15.6 15.6-38.1 36.3-51.7 48-18.4 15.8-41.9 26.6-67.6 30.7-12.6 2-20.2 14-16.5 26.1l20.4 67.2c3 9.8 11.2 17 21.3 18.5l68.7 10.7c21.8 3.4 43.1-4 58.7-19.6l28.6-28.6c18.5 9.4 39 14.6 60.3 14.6h.4c34 0 66.8-13.5 90.8-37.5 13-13 23-28.5 29.5-45.5 15.5-40.4 9.1-85.7-18.4-120-14.7-18.4-34.1-33.1-56.3-42.5-3.1-1.3-6.4-2.4-9.8-3.3-21.7-6.2-39.6-20.6-50.6-40l-21.3-37.3c-5.5-9.6-14.5-16.7-25.2-19.9zM128 416h256v32H128v-32zm0 64h256v32H128v-32z" />
          </svg>
        </div>

        {/* Checkerboard subtle borders (Top & Bottom) */}
        <div className="absolute top-0 left-0 right-0 h-3 print:h-2 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${primaryColor} 0, ${primaryColor} 20px, transparent 20px, transparent 40px)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-3 print:h-2 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(90deg, ${primaryColor} 0, ${primaryColor} 20px, transparent 20px, transparent 40px)` }} />

        {/* Content Wrapper */}
        <div className="p-[20mm] print:p-[15mm] relative z-10 flex flex-col h-full">
          
          {/* Header */}
          <div className={`flex items-center justify-between mb-10 border-b-2 pb-6 print:pb-4 ${borderColorClass}`}>
            <div className="flex items-center gap-6">
              <img src="/favicon.svg" alt="Logo" className={`w-20 h-20 print:w-16 print:h-16 object-contain ${isColorMode ? '' : 'filter grayscale'}`} />
              <div>
                <h1 className="text-4xl print:text-3xl font-serif tracking-tight text-black mb-1 font-bold">
                  The Chess Lifestyle
                </h1>
                <p className={`text-lg print:text-base font-medium italic mb-2 tracking-wide ${isColorMode ? 'text-[#D4AF37]' : 'text-neutral-600'}`}>
                  "Life is a chess game, learn to checkmate"
                </p>
                <p className={`text-sm uppercase tracking-widest font-bold inline-block px-3 py-1 border rounded-sm print:bg-transparent ${isColorMode ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/10 print:border-[#D4AF37]' : 'text-black border-black bg-neutral-100 print:border-black'}`}>
                  Student Registration Form
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-8 print:space-y-6">
            
            <div className="mb-6">
              <h2 className={`text-lg font-serif uppercase tracking-widest font-bold flex items-center gap-4 mb-6 ${primaryColorClass}`}>
                <span>Student Details</span>
                <div className={`flex-1 h-px ${dividerBgClass}`}></div>
              </h2>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 print:gap-y-8">
                <div className={`col-span-2 border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Full Name of Student</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Date of Birth (DD/MM/YYYY)</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Gender</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>School Name</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Class / Grade</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Current Chess Rating (If any)</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>FIDE ID (If any)</div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className={`text-lg font-serif uppercase tracking-widest font-bold flex items-center gap-4 mb-6 ${primaryColorClass}`}>
                <span>Parent / Guardian Details</span>
                <div className={`flex-1 h-px ${dividerBgClass}`}></div>
              </h2>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 print:gap-y-8">
                <div className={`col-span-2 border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Parent / Guardian Name</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Primary Phone Number</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Secondary Phone Number</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Father's Occupation</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Mother's Occupation</div>
                </div>
                <div className={`col-span-2 border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Email Address</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>City / Region</div>
                </div>
                <div className={`border-b-2 border-dotted pb-1 relative ${borderColorClass}`}>
                  <div className={`text-[11px] uppercase tracking-widest font-bold mb-6 ${primaryColorClass}`}>Country</div>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="mt-16 pt-8 print:mt-12 print:pt-6">
              <div className="grid grid-cols-2 gap-12">
                <div className={`border-t-2 pt-2 text-center ${borderColorClass}`}>
                  <div className={`text-xs uppercase tracking-widest font-bold ${primaryColorClass}`}>Parent / Guardian Signature</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Date: _______ / _______ / 20____</div>
                </div>
                <div className={`border-t-2 pt-2 text-center ${borderColorClass}`}>
                  <div className={`text-xs uppercase tracking-widest font-bold ${primaryColorClass}`}>Academy Representative</div>
                  <div className="text-[10px] text-neutral-500 mt-1">Official Use Only</div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-auto pt-6 text-center">
            <div className={`text-xs border-t-2 pt-4 print:pt-2 ${isColorMode ? 'border-[#D4AF37]/30 text-[#D4AF37]' : 'border-black/10 text-black'}`}>
              <p className="font-bold tracking-widest uppercase mb-1">thechesslifestyle.com</p>
              <p className="text-[10px] text-neutral-500">
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
