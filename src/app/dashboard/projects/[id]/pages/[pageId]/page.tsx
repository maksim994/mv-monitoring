"use client";

import { useState, useEffect } from "react";
import { useMounted } from "@/lib/hooks/use-mounted";
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
  const chartMounted = useMounted();

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

  if (isLoading) return <div className="animate-pulse h-64 bg-card rounded-2xl border border-border"></div>;
  if (!data) return <div className="text-muted-foreground">Данные не найдены</div>;

  const chartData = data.logs.map((log) => ({
    time: new Date(log.createdAt).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    ping: log.responseTime,
    status: log.status,
    success: log.isSuccess,
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/projects/${resolvedParams?.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к страницам
        </Link>
        <div className="flex min-w-0 items-center justify-between">
          <div className="min-w-0 max-w-full">
            <h1 className="mb-1 flex min-w-0 flex-nowrap items-center gap-2 text-3xl font-medium tracking-tight sm:gap-3">
              <span className="min-w-0 flex-1 truncate">{data.page.name}</span>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  data.page.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                }`}
              >
                {data.page.isActive && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {data.page.isActive ? "Активен" : "На паузе"}
              </span>
            </h1>
            <a
              href={data.page.url}
              target="_blank"
              rel="noreferrer"
              title={data.page.url}
              className="mt-2 flex min-w-0 max-w-full items-center gap-2 text-muted-foreground font-light transition-colors hover:text-foreground"
            >
              <Globe className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{data.page.url}</span>
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Доступность (24ч)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-foreground">{data.uptime}%</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний отклик</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-foreground">
              {chartData.length > 0 
                ? Math.round(chartData.reduce((acc, curr) => acc + curr.ping, 0) / chartData.length) 
                : 0} мс
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Интервал проверки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium text-foreground">{data.page.interval} мин</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Время ответа</CardTitle>
          <CardDescription className="text-muted-foreground font-light">Динамика времени ответа (ping) за последние проверки</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground font-light border border-dashed border-border rounded-xl bg-muted/60">
                Нет данных для отображения. Подождите, пока воркер выполнит проверки.
              </div>
            ) : chartMounted ? (
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
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" aria-hidden />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-foreground">Последние проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.logs.slice(-10).reverse().map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border/40 hover:border-border transition-colors">
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
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {log.status} {log.isSuccess ? "OK" : "Error"}
                    </div>
                    <div className="text-sm text-muted-foreground font-light mt-0.5">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm text-foreground/90 bg-muted/40 px-3 py-1.5 rounded-lg">
                  {log.responseTime} мс
                </div>
              </div>
            ))}
            {data.logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-light">Нет логов</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
