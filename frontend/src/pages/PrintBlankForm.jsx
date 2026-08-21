import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrintBlankForm() {
  // We can optionally trigger print automatically, but offering a button is safer.
  // We'll hide the button when printing.
  
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-10 font-sans print:py-0 print:bg-white print:min-h-0">
      
      {/* Non-printable action bar */}
      <div className="print:hidden w-[210mm] flex justify-end mb-4">
        <Button onClick={() => window.print()} className="rounded-full shadow-lg h-12 px-6 gap-2 bg-brand hover:bg-brand/90 text-white">
          <Printer className="w-5 h-5" />
          <span>Print PDF</span>
        </Button>
      </div>

      {/* A4 Sheet */}
      <div className="bg-white w-[210mm] min-h-[297mm] shadow-xl p-[20mm] print:shadow-none print:p-0 print:w-auto print:h-auto mx-auto relative overflow-hidden">
        
        {/* Subtle decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-brand/40 via-brand to-brand/40" />

        {/* Header */}
        <div className="flex items-center gap-6 mb-12 mt-4 border-b border-border/40 pb-8">
          <img src="/favicon.svg" alt="Logo" className="w-24 h-24 object-contain" />
          <div className="flex-1">
            <h1 className="text-4xl font-serif tracking-tight text-foreground mb-1">
              The Chess Lifestyle
            </h1>
            <p className="text-xl text-brand font-medium italic mb-2 tracking-wide">
              "Life is a chess game, learn to checkmate"
            </p>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">
              Student Registration & Details
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-neutral-50/50 p-6 border border-border/40 rounded-sm">
            <h2 className="text-lg font-serif mb-6 uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
              Student Information
            </h2>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              <div className="border-b-2 border-dashed border-border/60 pb-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Student Name</div>
              </div>
              <div className="border-b-2 border-dashed border-border/60 pb-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Date of Birth</div>
              </div>
              <div className="border-b-2 border-dashed border-border/60 pb-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Class / Grade</div>
              </div>
              <div className="border-b-2 border-dashed border-border/60 pb-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">School Name</div>
              </div>
              <div className="col-span-2 border-b-2 border-dashed border-border/60 pb-1 mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Favorite Hobby</div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-50/50 p-6 border border-border/40 rounded-sm">
            <h2 className="text-lg font-serif mb-6 uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
              Parent / Guardian Details
            </h2>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              <div className="col-span-2 border-b-2 border-dashed border-border/60 pb-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Primary Contact (Phone Number)</div>
              </div>
              <div className="border-b-2 border-dashed border-border/60 pb-1 mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Father's Occupation</div>
              </div>
              <div className="border-b-2 border-dashed border-border/60 pb-1 mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Mother's Occupation</div>
              </div>
              <div className="col-span-2 border-b-2 border-dashed border-border/60 pb-1 mt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-6">Email Address (Optional)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] print:bottom-0 print:left-0 print:right-0 text-center">
          <div className="text-xs text-muted-foreground/60 border-t border-border/40 pt-4">
            <p className="mb-1">thechesslifestyle.com</p>
            <p>Secure, private, and solely used to enhance the learning experience.</p>
          </div>
        </div>
        
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
