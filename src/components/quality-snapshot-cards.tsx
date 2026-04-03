import { motion } from 'motion/react';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualitySnapshot } from '@/generated/models/quality-snapshot-model';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface QualitySnapshotCardsProps {
  data?: QualitySnapshot;
  isLoading: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const;

// Synthetic Data generation simulating rolling test evaluations
const mockTrendData = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    passed: Math.floor(Math.random() * (400 - 300) + 300),
    failed: Math.floor(Math.random() * (50 - 5) + 5)
  };
});

// Synthetic Intent failure metrics
const mockIntentData = [
  { name: 'Human Escalation', value: 85 },
  { name: 'Refund Request', value: 55 },
  { name: 'Billing Issues', value: 45 },
  { name: 'Account Recovery', value: 20 },
  { name: 'Password Reset', value: 10 },
];
const COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#0f172a'];

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
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Scenarios Passed',
      value: passed,
      icon: CheckCircle2,
      iconColor: 'text-emerald',
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      label: 'Scenarios Failed',
      value: failed,
      icon: XCircle,
      iconColor: 'text-crimson',
      iconBg: 'bg-red-50 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <Card className="bg-white dark:bg-card border-t-[5px] border-t-slate-blue border-l border-r border-b border-border/50 shadow-sm hover:shadow-md transition-shadow">
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
          <Card className="bg-white dark:bg-card border-t-[5px] border-t-emerald border-l border-r border-b border-border/50 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Overall Pass Rate
              </p>
              {isLoading ? (
                <div className="h-14 w-full bg-muted animate-pulse rounded-full" />
              ) : (
                <div className="w-full bg-emerald-light border border-emerald/20 px-4 py-3.5 rounded-full flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald"></span>
                    </span>
                    <span className="font-semibold tracking-wide text-emerald uppercase text-xs">Healthy</span>
                  </div>
                  <span className="text-3xl font-bold text-emerald tracking-tight">
                    {passRate.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <Card className="col-span-2 shadow-sm border border-border/50 bg-white dark:bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald text-sm font-semibold uppercase tracking-wider">Pass/Fail Trailing Trend (14d)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockTrendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                   itemStyle={{ fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="passed" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Passed" />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/50 bg-white dark:bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-emerald text-sm font-semibold uppercase tracking-wider">Top Intent Failures</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockIntentData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                >
                  {mockIntentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                   itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}