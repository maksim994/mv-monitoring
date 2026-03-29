"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  projectId: string;
  domain: string;
  token: string | null;
  onVerified: () => void;
  className?: string;
};

export function DomainVerificationPanel({
  projectId,
  domain,
  token,
  onVerified,
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/verify-domain`, { method: "POST" });
    let data: { message?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    setLoading(false);
    if (res.ok) {
      onVerified();
      return;
    }
    setError(typeof data.message === "string" ? data.message : "Проверка не удалась");
  };

  const metaSnippet = token
    ? `<meta name="mv-monitor-verification" content="${token}" />`
    : "";
  const filePath = "/.well-known/mv-monitor-verification.txt";

  return (
    <div
      className={`rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-4 text-left ${className}`}
    >
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">Подтвердите владение доменом</h3>
        <p className="text-xs text-muted-foreground font-light leading-relaxed">
          До подтверждения нельзя добавлять страницы для мониторинга. Выберите один из способов ниже и
          нажмите «Проверить».
        </p>
      </div>

      {!token ? (
        <p className="text-sm text-muted-foreground">
          Токен недоступен. Сохраните домен в настройках проекта — после этого появятся инструкции.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Вариант 1 — meta в &lt;head&gt;</p>
            <pre className="text-xs bg-muted/80 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {metaSnippet}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border"
              onClick={() => void navigator.clipboard.writeText(metaSnippet)}
            >
              Скопировать meta
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Вариант 2 — файл на сайте</p>
            <p className="text-xs text-muted-foreground font-light">
              Путь: <span className="text-foreground font-mono">{filePath}</span>
              <br />
              Содержимое файла (только этот текст, без пробелов вокруг):
            </p>
            <pre className="text-xs bg-muted/80 border border-border rounded-lg p-3 overflow-x-auto break-all">
              {token}
            </pre>
            <p className="text-xs text-muted-foreground font-light">
              Полный URL:{" "}
              <span className="text-foreground font-mono">
                https://{domain}
                {filePath}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border"
              onClick={() => void navigator.clipboard.writeText(token)}
            >
              Скопировать содержимое
            </Button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        type="button"
        className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        disabled={loading || !token}
        onClick={() => void verify()}
      >
        {loading ? "Проверка..." : "Проверить"}
      </Button>
    </div>
  );
}
