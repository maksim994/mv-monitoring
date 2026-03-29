export type MonitorNotifyEvent = "down" | "up" | "down_reminder";

export function buildNotificationPayload(input: {
  event: MonitorNotifyEvent;
  projectName: string;
  pageName: string;
  pageUrl: string;
  status: number;
  responseTimeMs: number;
  errorMessage: string | null;
  checkedAtIso: string;
}) {
  return {
    type: "mv_monitoring",
    version: 1,
    event: input.event,
    projectName: input.projectName,
    pageName: input.pageName,
    pageUrl: input.pageUrl,
    httpStatus: input.status,
    responseTimeMs: input.responseTimeMs,
    errorMessage: input.errorMessage,
    checkedAt: input.checkedAtIso,
  };
}

export function buildEmailCopy(input: {
  event: MonitorNotifyEvent;
  projectName: string;
  pageName: string;
  pageUrl: string;
  status: number;
  responseTimeMs: number;
  errorMessage: string | null;
}): { subject: string; text: string } {
  let subject: string;
  let lead: string;
  if (input.event === "up") {
    subject = `[MV Monitor] Восстановлено: ${input.pageName}`;
    lead = "Страница снова отвечает нормально.";
  } else if (input.event === "down_reminder") {
    subject = `[MV Monitor] Всё ещё недоступно: ${input.pageName}`;
    lead = "Страница по-прежнему не проходит проверку.";
  } else {
    subject = `[MV Monitor] Недоступно: ${input.pageName}`;
    lead = "Страница не прошла проверку.";
  }
  const text = [
    lead,
    "",
    `Проект: ${input.projectName}`,
    `Страница: ${input.pageName}`,
    `URL: ${input.pageUrl}`,
    `HTTP: ${input.status}`,
    `Время ответа: ${input.responseTimeMs} мс`,
    input.errorMessage ? `Ошибка: ${input.errorMessage}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, text };
}

export function buildTelegramPlainText(input: {
  event: MonitorNotifyEvent;
  projectName: string;
  pageName: string;
  pageUrl: string;
  status: number;
  responseTimeMs: number;
  errorMessage: string | null;
}): string {
  const { text } = buildEmailCopy(input);
  return text;
}
