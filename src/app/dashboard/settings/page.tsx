"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, CreditCard, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotifSettings = {
  notifyEmailEnabled: boolean;
  notifyWebhookEnabled: boolean;
  notifyTelegramEnabled: boolean;
  notifyFailureThreshold: number;
  notifyRecoveryEnabled: boolean;
  notifyReminderIntervalMinutes: number;
  webhookConfigured: boolean;
  webhookUrlMasked: string;
  smtpConfigured: boolean;
  telegramBotConfigured: boolean;
  telegramLinked: boolean;
  planTier?: string;
  allowTelegram?: boolean;
  allowWebhook?: boolean;
};

type BillingInfo = {
  effectivePlan: string;
  proValidUntil: string | null;
  proAutoRenew: boolean;
  subscriptionNextChargeAt: string | null;
  yookassaConfigured: boolean;
  proPriceRubPerMonth: number;
};

type ApiKeyRow = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
};

function UserSettingsContent() {
  const searchParams = useSearchParams();
  const billingReturn = searchParams.get("billing") === "return";

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
  const [webhookDraft, setWebhookDraft] = useState("");
  const [webhookTouched, setWebhookTouched] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifTesting, setNotifTesting] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);
  const [telegramLinkUrl, setTelegramLinkUrl] = useState<string | null>(null);
  const [telegramLinkError, setTelegramLinkError] = useState<string | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyCreating, setApiKeyCreating] = useState(false);
  const [newApiToken, setNewApiToken] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/user/notifications");
    if (res.ok) {
      const j = (await res.json()) as NotifSettings;
      setNotifSettings(j);
      setWebhookDraft("");
      setWebhookTouched(false);
      setNotifError(null);
    } else {
      setLoadError("Не удалось загрузить настройки");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    const res = await fetch("/api/user/billing");
    if (res.ok) {
      setBilling((await res.json()) as BillingInfo);
    }
    setBillingLoading(false);
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling, billingReturn]);

  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    setApiKeyError(null);
    const res = await fetch("/api/user/api-keys");
    if (res.ok) {
      setApiKeys((await res.json()) as ApiKeyRow[]);
    } else {
      setApiKeyError("Не удалось загрузить ключи");
    }
    setApiKeysLoading(false);
  }, []);

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName.trim()) return;
    setApiKeyCreating(true);
    setApiKeyError(null);
    setNewApiToken(null);
    const res = await fetch("/api/user/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: apiKeyName.trim() }),
    });
    if (res.ok) {
      const j = (await res.json()) as { token?: string };
      if (typeof j.token === "string") setNewApiToken(j.token);
      setApiKeyName("");
      await loadApiKeys();
    } else {
      try {
        const j = (await res.json()) as { error?: string };
        setApiKeyError(typeof j.error === "string" ? j.error : "Не удалось создать ключ");
      } catch {
        setApiKeyError("Не удалось создать ключ");
      }
    }
    setApiKeyCreating(false);
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm("Отозвать этот ключ? Интеграции с ним перестанут работать.")) return;
    const res = await fetch(`/api/user/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) void loadApiKeys();
  };

  const startPayment = async () => {
    setPayLoading(true);
    const res = await fetch("/api/billing/create-payment", { method: "POST" });
    setPayLoading(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      alert(j.error === "ALREADY_PRO" ? "У вас уже активен PRO." : "Оплата недоступна. Проверьте настройки ЮKassa.");
      return;
    }
    const j = (await res.json()) as { confirmationUrl?: string };
    if (j.confirmationUrl) window.location.href = j.confirmationUrl;
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifSettings) return;
    setNotifSaving(true);
    setNotifError(null);
    const body: Record<string, unknown> = {
      notifyEmailEnabled: notifSettings.notifyEmailEnabled,
      notifyWebhookEnabled: notifSettings.notifyWebhookEnabled,
      notifyTelegramEnabled: notifSettings.notifyTelegramEnabled,
      notifyFailureThreshold: notifSettings.notifyFailureThreshold,
      notifyRecoveryEnabled: notifSettings.notifyRecoveryEnabled,
      notifyReminderIntervalMinutes: notifSettings.notifyReminderIntervalMinutes,
    };
    if (webhookTouched) {
      body.notifyWebhookUrl = webhookDraft.trim() || null;
    }
    const res = await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = (await res.json()) as NotifSettings;
      setNotifSettings(j);
      setWebhookDraft("");
      setWebhookTouched(false);
    } else {
      setNotifError("Не удалось сохранить настройки уведомлений");
    }
    setNotifSaving(false);
  };

  const handleTestNotification = async () => {
    setNotifTesting(true);
    setNotifError(null);
    const res = await fetch("/api/user/notifications/test", { method: "POST" });
    if (!res.ok) {
      try {
        const j = (await res.json()) as { message?: string };
        setNotifError(typeof j.message === "string" ? j.message : "Тест не выполнен");
      } catch {
        setNotifError("Тест не выполнен");
      }
    }
    setNotifTesting(false);
  };

  const handleTelegramLink = async () => {
    setTelegramLinkLoading(true);
    setTelegramLinkError(null);
    setTelegramLinkUrl(null);
    const res = await fetch("/api/user/telegram-link", { method: "POST" });
    if (res.ok) {
      const j = (await res.json()) as { linkUrl?: string };
      if (j.linkUrl) setTelegramLinkUrl(j.linkUrl);
    } else {
      try {
        const j = (await res.json()) as { message?: string };
        setTelegramLinkError(typeof j.message === "string" ? j.message : "Не удалось создать ссылку");
      } catch {
        setTelegramLinkError("Не удалось создать ссылку");
      }
    }
    setTelegramLinkLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проектам
        </Link>
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Настройки</h1>
            <p className="text-muted-foreground">Уведомления о проверках для всех ваших проектов</p>
          </div>
        </div>
      </div>

      {loadError ? <p className="text-sm text-red-500">{loadError}</p> : null}

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            Тариф и оплата
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {billingLoading ? (
            <p className="text-muted-foreground">Загрузка…</p>
          ) : billing ? (
            <>
              {billingReturn ? (
                <p className="text-emerald-600 dark:text-emerald-400">
                  Если оплата прошла успешно, статус PRO обновится после обработки уведомления от ЮKassa (обычно
                  несколько секунд). Обновите страницу.
                </p>
              ) : null}
              <p>
                Текущий план:{" "}
                <span className="font-medium text-foreground">
                  {billing.effectivePlan === "pro" ? "PRO" : "Free"}
                </span>
                {billing.effectivePlan === "pro" && billing.proValidUntil ? (
                  <span className="text-muted-foreground">
                    {" "}
                    до {new Date(billing.proValidUntil).toLocaleString("ru-RU")}
                  </span>
                ) : null}
              </p>
              {billing.effectivePlan === "pro" && billing.subscriptionNextChargeAt ? (
                <p className="text-xs text-muted-foreground">
                  Следующее списание (планировщик):{" "}
                  {new Date(billing.subscriptionNextChargeAt).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {billing.effectivePlan !== "pro" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    disabled={!billing.yookassaConfigured || payLoading}
                    onClick={() => void startPayment()}
                  >
                    {payLoading ? "Переход…" : `Оформить PRO — ${billing.proPriceRubPerMonth} ₽/мес`}
                  </Button>
                  {!billing.yookassaConfigured ? (
                    <span className="text-xs text-muted-foreground">ЮKassa не настроена на сервере.</span>
                  ) : null}
                  <Link href="/pricing" className="text-xs text-primary underline">
                    Сравнение тарифов
                  </Link>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Не удалось загрузить биллинг.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Key className="h-5 w-5 text-muted-foreground" aria-hidden />
            API-ключи
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-light leading-relaxed text-muted-foreground">
            Доступ к REST API без входа в интерфейс:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.8rem]">GET /api/v1/projects</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.8rem]">…/projects/[id]/pages</code> и т.д. Заголовок:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[0.8rem]">Authorization: Bearer mv_…</code>
          </p>
          {newApiToken ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium text-amber-200">Сохраните токен сейчас — он больше не отобразится:</p>
              <code className="mt-2 block break-all rounded bg-background/80 p-2 text-xs text-foreground">{newApiToken}</code>
            </div>
          ) : null}
          {apiKeyError ? <p className="text-sm text-red-500">{apiKeyError}</p> : null}
          <form onSubmit={handleCreateApiKey} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="text-sm text-muted-foreground">Название ключа</label>
              <Input
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder="CI, скрипт, …"
                className="h-10 border-border bg-muted"
                maxLength={128}
              />
            </div>
            <Button type="submit" variant="outline" className="h-10 border-border sm:shrink-0" disabled={apiKeyCreating || !apiKeyName.trim()}>
              {apiKeyCreating ? "Создание…" : "Создать ключ"}
            </Button>
          </form>
          {apiKeysLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ключей пока нет.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
              {apiKeys.map((k) => (
                <li key={k.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-foreground">{k.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {k.tokenPrefix}
                      {k.lastUsedAt ? (
                        <span className="ml-2">Последнее использование: {new Date(k.lastUsedAt).toLocaleString("ru-RU")}</span>
                      ) : (
                        <span className="ml-2">Ещё не использовался</span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleRevokeApiKey(k.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Отозвать
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Уведомления о проверках</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-light leading-relaxed text-muted-foreground">
            Одинаковые каналы и правила для всех проектов: сбой после нескольких неудачных проверок подряд, опциональные
            напоминания, пока страница недоступна, и уведомление о восстановлении. Тест использует первый проект и первую
            страницу в нём.
          </p>
          {notifSettings ? (
            <form onSubmit={handleSaveNotifications} className="space-y-4">
              {notifError ? <p className="text-sm text-red-500">{notifError}</p> : null}

              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
                    checked={notifSettings.notifyTelegramEnabled}
                    disabled={
                      !notifSettings.telegramBotConfigured || notifSettings.allowTelegram === false
                    }
                    onChange={(e) =>
                      setNotifSettings({ ...notifSettings, notifyTelegramEnabled: e.target.checked })
                    }
                  />
                  <span className="text-sm leading-snug">
                    <span className="text-foreground">Telegram</span>
                    <span className="mt-0.5 block text-xs font-light text-muted-foreground">
                      Сообщения в привязанный чат.{" "}
                      {notifSettings.allowTelegram === false
                        ? "Недоступно на тарифе Free. Оформите PRO."
                        : !notifSettings.telegramBotConfigured
                          ? "На сервере не задан TELEGRAM_BOT_TOKEN."
                          : notifSettings.telegramLinked
                            ? "Чат привязан к аккаунту."
                            : "Привяжите чат через кнопку ниже."}
                    </span>
                  </span>
                </label>
                {notifSettings.allowTelegram !== false &&
                notifSettings.telegramBotConfigured &&
                !notifSettings.telegramLinked ? (
                  <div className="space-y-2 pl-7">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-border"
                      disabled={telegramLinkLoading}
                      onClick={() => void handleTelegramLink()}
                    >
                      {telegramLinkLoading ? "Создание ссылки…" : "Подключить Telegram"}
                    </Button>
                    {telegramLinkError ? (
                      <p className="text-xs text-red-500">{telegramLinkError}</p>
                    ) : null}
                    {telegramLinkUrl ? (
                      <p className="text-xs break-all text-muted-foreground">
                        Откройте в Telegram:{" "}
                        <a
                          href={telegramLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {telegramLinkUrl}
                        </a>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
                  checked={notifSettings.notifyEmailEnabled}
                  disabled={!notifSettings.smtpConfigured}
                  onChange={(e) =>
                    setNotifSettings({ ...notifSettings, notifyEmailEnabled: e.target.checked })
                  }
                />
                <span className="text-sm leading-snug">
                  <span className="text-foreground">Email</span>
                  <span className="block text-xs font-light text-muted-foreground">
                    На адрес аккаунта. Нужны{" "}
                    <code className="text-[11px]">SMTP_HOST</code>,{" "}
                    <code className="text-[11px]">NOTIFICATION_FROM_EMAIL</code>
                    {!notifSettings.smtpConfigured ? " (сейчас не настроено)" : ""}.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
                  checked={notifSettings.notifyWebhookEnabled}
                  disabled={notifSettings.allowWebhook === false}
                  onChange={(e) =>
                    setNotifSettings({ ...notifSettings, notifyWebhookEnabled: e.target.checked })
                  }
                />
                <span className="text-sm text-foreground">
                  Webhook (POST JSON)
                  {notifSettings.allowWebhook === false ? (
                    <span className="mt-0.5 block text-xs font-light text-muted-foreground">
                      Недоступно на тарифе Free.
                    </span>
                  ) : null}
                </span>
              </label>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">URL webhook</label>
                {notifSettings.webhookConfigured && notifSettings.webhookUrlMasked ? (
                  <p className="text-xs text-muted-foreground">Сейчас: {notifSettings.webhookUrlMasked}</p>
                ) : null}
                <Input
                  type="url"
                  placeholder="https://example.com/hook"
                  value={webhookDraft}
                  disabled={notifSettings.allowWebhook === false}
                  onChange={(e) => {
                    setWebhookDraft(e.target.value);
                    setWebhookTouched(true);
                  }}
                  className="h-10 border-border bg-muted text-sm"
                />
                <p className="text-xs font-light text-muted-foreground">
                  Пустое поле и «Сохранить» удалит webhook.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Порог: неудачных проверок подряд до алерта
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={notifSettings.notifyFailureThreshold}
                  onChange={(e) =>
                    setNotifSettings({
                      ...notifSettings,
                      notifyFailureThreshold: Number(e.target.value) || 1,
                    })
                  }
                  className="h-10 border-border bg-muted"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Напоминать каждые N минут, пока недоступно
                </label>
                <Input
                  type="number"
                  min={0}
                  max={10080}
                  value={notifSettings.notifyReminderIntervalMinutes}
                  onChange={(e) =>
                    setNotifSettings({
                      ...notifSettings,
                      notifyReminderIntervalMinutes: Math.max(
                        0,
                        Math.min(10080, Number(e.target.value) || 0)
                      ),
                    })
                  }
                  className="h-10 border-border bg-muted"
                />
                <p className="text-xs font-light text-muted-foreground">
                  0 — только первое уведомление о сбое и сообщение о восстановлении. Максимум 10080 (неделя).
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
                  checked={notifSettings.notifyRecoveryEnabled}
                  onChange={(e) =>
                    setNotifSettings({ ...notifSettings, notifyRecoveryEnabled: e.target.checked })
                  }
                />
                <span className="text-sm text-foreground">Уведомлять о восстановлении</span>
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-10 flex-1 border-border"
                  disabled={notifSaving}
                >
                  {notifSaving ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 border-border"
                  disabled={notifTesting}
                  onClick={() => void handleTestNotification()}
                >
                  {notifTesting ? "Отправка..." : "Тест"}
                </Button>
              </div>
            </form>
          ) : (
            !loadError && <p className="text-sm text-muted-foreground">Загрузка…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl p-6 text-sm text-muted-foreground">Загрузка…</div>
      }
    >
      <UserSettingsContent />
    </Suspense>
  );
}
