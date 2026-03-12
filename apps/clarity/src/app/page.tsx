import TaskBoard from "@/components/TaskBoard";
import { Sparkles, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-neutral-950 font-sans text-neutral-200 selection:bg-indigo-500/30">

      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 ring-1 ring-white/10 backdrop-blur-md">
              <BrainCircuit className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
                Clarity
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  MVP
                </span>
              </h1>
              <p className="text-sm text-neutral-400">The AI task engine for Product Managers.</p>
            </div>
          </div>
        </header>

        {/* The interactive board spanning the rest of page */}
        <TaskBoard />

      </div>
    </main>
  );
}
