import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/adminDb";
import { getAccessStats, getDailyAccessData, getHourlyAccessData } from "@/services/sessionTrackingService";
import { useAdminOnlineMonitor } from "@/hooks/useOnlinePresence";
import { 
  Users, 
  UserX, 
  Wallet, 
  TrendingDown, 
  CalendarCheck, 
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Loader2,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Wifi,
  Clock,
  Calendar,
  CalendarDays,
  Eye
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from "recharts";

interface DashboardStats {
  activeUsers: number;
  blockedUsers: number;
  totalBalance: number;
  totalTodayExpenses: number;
  totalScheduledPayments: number;
  totalSalaryCredits: number;
  usersWithSalaryToday: Array<{ full_name: string; salary_amount: number }>;
  paymentsToday: Array<{ name: string; amount: number; user_matricula: number }>;
  totalImpact: number;
}

interface AccessStats {
  online: { count: number; users: Array<{ user_matricula: number; user_name: string | null; last_activity: string }> };
  today: { uniqueUsers: number; totalSessions: number };
  week: { uniqueUsers: number; totalSessions: number };
  month: { uniqueUsers: number; totalSessions: number };
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accessStats, setAccessStats] = useState<AccessStats | null>(null);
  const [hourlyData, setHourlyData] = useState<Array<{ hour: string; acessos: number }>>([]);
  const [dailyData, setDailyData] = useState<Array<{ day: string; date: string; acessos: number; usuarios: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { onlineUsers, onlineCount } = useAdminOnlineMonitor();

  useEffect(() => {
    loadStats();
    
    // Refresh access stats every 30 seconds
    const interval = setInterval(() => {
      loadAccessStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    await Promise.all([
      loadDashboardStats(),
      loadAccessStats()
    ]);
    setIsLoading(false);
  };

  const loadDashboardStats = async () => {
    const data = await getDashboardStats();
    setStats(data);
  };

  const loadAccessStats = async () => {
    const [access, hourly, daily] = await Promise.all([
      getAccessStats(),
      getHourlyAccessData(),
      getDailyAccessData()
    ]);
    setAccessStats(access);
    setHourlyData(hourly);
    setDailyData(daily);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  // Access stat cards
  const accessCards = [
    {
      title: "Online Agora",
      value: onlineCount > 0 ? onlineCount : (accessStats?.online.count || 0),
      subtext: "usuários ativos",
      icon: Wifi,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      pulse: true
    },
    {
      title: "Usuários Hoje",
      value: accessStats?.today.uniqueUsers || 0,
      subtext: `${accessStats?.today.totalSessions || 0} sessões`,
      icon: Clock,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    {
      title: "Usuários na Semana",
      value: accessStats?.week.uniqueUsers || 0,
      subtext: `${accessStats?.week.totalSessions || 0} sessões`,
      icon: Calendar,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      title: "Usuários no Mês",
      value: accessStats?.month.uniqueUsers || 0,
      subtext: `${accessStats?.month.totalSessions || 0} sessões`,
      icon: CalendarDays,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20"
    }
  ];

  const statCards = [
    {
      title: "Clientes Ativos",
      value: stats.activeUsers,
      icon: Users,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20"
    },
    {
      title: "Clientes Bloqueados",
      value: stats.blockedUsers,
      icon: UserX,
      color: "text-red-400",
      bgColor: "bg-red-500/20"
    },
    {
      title: "Saldo Total sob Gestão",
      value: formatCurrency(stats.totalBalance),
      icon: Wallet,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    {
      title: "Gastos de Hoje",
      value: formatCurrency(stats.totalTodayExpenses),
      icon: TrendingDown,
      color: "text-orange-400",
      bgColor: "bg-orange-500/20"
    },
    {
      title: "Pagamentos Agendados (Mês)",
      value: formatCurrency(stats.totalScheduledPayments),
      icon: CalendarCheck,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      title: "Impacto Geral do Banco",
      value: formatCurrency(stats.totalImpact),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/20"
    }
  ];

  // Data for pie chart - Users distribution
  const usersPieData = [
    { name: 'Ativos', value: stats.activeUsers, color: '#10b981' },
    { name: 'Bloqueados', value: stats.blockedUsers, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Data for financial overview bar chart
  const financialBarData = [
    { name: 'Saldo Total', value: stats.totalBalance, fill: '#3b82f6' },
    { name: 'Salários', value: stats.totalSalaryCredits, fill: '#10b981' },
    { name: 'Agendados', value: stats.totalScheduledPayments, fill: '#8b5cf6' },
    { name: 'Gastos Hoje', value: stats.totalTodayExpenses, fill: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* Online/Access Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accessCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center relative`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    {stat.pulse && (onlineCount > 0 || (accessStats?.online.count || 0) > 0) && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.subtext}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Online Users List */}
      {(onlineCount > 0 || (accessStats?.online.users.length || 0) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-green-500/10 border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Eye className="w-4 h-4 text-green-400" />
                Usuários Online Agora
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                  {onlineCount > 0 ? onlineCount : accessStats?.online.count}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(onlineCount > 0 ? onlineUsers : accessStats?.online.users || []).map((user, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-full"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-white">
                      {'name' in user ? user.name : user.user_name || `Mat. ${'matricula' in user ? user.matricula : user.user_matricula}`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Access Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Access Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-blue-400" />
                Acessos por Hora (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="acessos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Access Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-purple-400" />
                Acessos nos Últimos 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => [value, name === 'acessos' ? 'Acessos' : 'Usuários']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="acessos" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                      name="Acessos"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="usuarios" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                      name="Usuários Únicos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
          >
            <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{stat.title}</p>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <PieChartIcon className="w-4 h-4 text-emerald-400" />
                Distribuição de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={usersPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {usersPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Overview Bar Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-2"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Visão Financeira Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number" 
                      tickFormatter={formatCompactCurrency}
                      stroke="#94a3b8"
                      fontSize={11}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="#94a3b8"
                      fontSize={11}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Today */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Salários Creditados Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.usersWithSalaryToday.length === 0 ? (
                <p className="text-slate-400 text-sm">Nenhum salário creditado hoje</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.usersWithSalaryToday.map((user, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <span className="text-white">{user.full_name || 'Cliente'}</span>
                      <span className="text-emerald-400 font-semibold">
                        {formatCurrency(user.salary_amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Payments Today */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <CalendarCheck className="w-5 h-5 text-purple-400" />
                Pagamentos Agendados para Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.paymentsToday.length === 0 ? (
                <p className="text-slate-400 text-sm">Nenhum pagamento para hoje</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.paymentsToday.map((payment, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <span className="text-white">{payment.name}</span>
                        <span className="text-xs text-slate-400 block">
                          Matrícula: {payment.user_matricula}
                        </span>
                      </div>
                      <span className="text-red-400 font-semibold">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alert for blocked users */}
      {stats.blockedUsers > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-red-400 font-semibold">Atenção!</p>
                  <p className="text-slate-300 text-sm">
                    Existem {stats.blockedUsers} conta(s) bloqueada(s) que podem precisar de atenção.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
