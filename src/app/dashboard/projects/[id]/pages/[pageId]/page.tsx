"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Activity, Globe, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

export default function PageDetails({ params }: { params: Promise<{ id: string; pageId: string }> }) {
  const [data, setData] = useState<{ page: any; logs: any[]; uptime: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ id: string; pageId: string } | null>(null);

  useEffect(() => {
    params.then(p => setResolvedParams(p));
  }, [params]);

  useEffect(() => {
    const fetchData = async () => {
      if (!resolvedParams) return;
      const res = await fetch(`/api/projects/${resolvedParams.id}/pages/${resolvedParams.pageId}/logs`);
      if (res.ok) {
        setData(await res.json());
      }
      setIsLoading(false);
    };
    fetchData();
  }, [resolvedParams]);

  if (isLoading) return <div className="animate-pulse h-64 bg-[#111] rounded-2xl border border-white/10"></div>;
  if (!data) return <div className="text-zinc-400">Данные не найдены</div>;

  const chartData = data.logs.map(log => ({
    time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ping: log.responseTime,
    status: log.status,
    success: log.isSuccess,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/projects/${resolvedParams?.id}`} className="inline-flex items-center text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к страницам
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight flex items-center gap-3 mb-1">
              {data.page.name}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                data.page.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-white/10 text-zinc-400"
              }`}>
                {data.page.isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                {data.page.isActive ? "Активен" : "На паузе"}
              </span>
            </h1>
            <a href={data.page.url} target="_blank" rel="noreferrer" className="text-zinc-400 font-light hover:text-white transition-colors flex items-center gap-2 mt-2">
              <Globe className="h-4 w-4" />
              {data.page.url}
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Доступность (24ч)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-white">{data.uptime}%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Средний отклик</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-white">
              {chartData.length > 0 
                ? Math.round(chartData.reduce((acc, curr) => acc + curr.ping, 0) / chartData.length) 
                : 0} мс
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Интервал проверки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-white">{data.page.interval} мин</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111] border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">Время ответа</CardTitle>
          <CardDescription className="text-zinc-400 font-light">Динамика времени ответа (ping) за последние проверки</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 font-light border border-dashed border-white/10 rounded-xl bg-black/50">
                Нет данных для отображения. Подождите, пока воркер выполнит проверки.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="time" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} dx={-10} tickFormatter={(value) => `${value} мс`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="ping" 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorPing)" 
                    name="Отклик (мс)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#111] border-white/10">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">Последние проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.logs.slice(-10).reverse().map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-black border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  {log.isSuccess ? (
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      {log.status} {log.isSuccess ? "OK" : "Error"}
                    </div>
                    <div className="text-sm text-zinc-500 font-light mt-0.5">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm text-zinc-300 bg-white/5 px-3 py-1.5 rounded-lg">
                  {log.responseTime} мс
                </div>
              </div>
            ))}
            {data.logs.length === 0 && (
              <div className="text-center py-8 text-zinc-500 font-light">Нет логов</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
