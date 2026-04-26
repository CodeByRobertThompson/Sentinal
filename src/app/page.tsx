"use client";

import { motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { ThemeToggle } from '@/components/theme-toggle';

const TestRunnerPanel = dynamic(
  () => import('@/components/test-runner-panel').then(mod => mod.TestRunnerPanel),
  { ssr: false }
);

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="print:hidden sticky top-0 z-50 bg-white/70 backdrop-blur-md dark:bg-card/70 border-t-[6px] border-t-emerald border-b border-border shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <img src="/logo.png" alt="WaFd Bank Logo" className="h-9 w-auto" />
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald to-slate-blue bg-clip-text text-transparent hidden sm:block">
                Sentinel Tester
              </h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col">
        {/* We give the TestRunnerPanel full reign here */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.5 }}
           className="w-full flex-1 flex flex-col"
        >
          <TestRunnerPanel />
        </motion.div>
      </main>
    </div>
  );
}
