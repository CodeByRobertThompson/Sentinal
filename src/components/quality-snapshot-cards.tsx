import { motion } from 'motion/react';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { QualitySnapshot } from '@/generated/models/quality-snapshot-model';

interface QualitySnapshotCardsProps {
  data?: QualitySnapshot;
  isLoading: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

export function QualitySnapshotCards({ data, isLoading }: QualitySnapshotCardsProps) {
  const totalTests = data?.totaltests ?? 0;
  const passed = data?.passed ?? 0;
  const failed = data?.failed ?? 0;
  const passRate = data?.passrate ?? 0;

  const metrics = [
    {
      label: 'Total Scenarios Tested',
      value: totalTests,
      icon: Activity,
      iconColor: 'text-[#3B82F6]',
      iconBg: 'bg-blue-50',
    },
    {
      label: 'Scenarios Passed',
      value: passed,
      icon: CheckCircle2,
      iconColor: 'text-emerald',
      iconBg: 'bg-emerald-50',
    },
    {
      label: 'Scenarios Failed',
      value: failed,
      icon: XCircle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index: number) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.label}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-white border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    {isLoading ? (
                      <div className="h-10 w-20 bg-muted animate-pulse rounded mt-2" />
                    ) : (
                      <p className="text-3xl font-bold mt-2 text-foreground">
                        {metric.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className={`${metric.iconBg} p-2.5 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Pass Rate Gauge Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-white border border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pass Rate
                </p>
                {isLoading ? (
                  <div className="h-10 w-20 bg-muted animate-pulse rounded mt-2" />
                ) : (
                  <p className="text-3xl font-bold mt-2 text-foreground">
                    {passRate.toFixed(1)}%
                  </p>
                )}
              </div>
              {/* Circular Progress Gauge */}
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  {/* Progress arc */}
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(passRate / 100) * 87.96} 87.96`}
                    initial={{ strokeDasharray: '0 87.96' }}
                    animate={{ strokeDasharray: `${(passRate / 100) * 87.96} 87.96` }}
                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' as const }}
                  />
                </svg>
                {/* Center percentage */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-emerald">{Math.round(passRate)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}