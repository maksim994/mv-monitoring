"use client";

import { useEffect, useState } from "react";

export default function AdminMetricsPage() {
  const [data, setData] = useState<{
    pingLogsLast24h: number;
    usersTotal: number;
    pingQueueWaiting: number | null;
    notifyQueueWaiting: number | null;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) setData(await res.json());
    })();
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Метрики</h1>
      <ul className="space-y-2 text-sm">
        <li>Проверок (ping) за 24ч: {data.pingLogsLast24h}</li>
        <li>Пользователей всего: {data.usersTotal}</li>
        <li>Очередь ping (ожидание): {data.pingQueueWaiting ?? "n/a (нет REDIS_URL)"}</li>
        <li>Очередь уведомлений: {data.notifyQueueWaiting ?? "n/a"}</li>
      </ul>
    </div>
  );
}
