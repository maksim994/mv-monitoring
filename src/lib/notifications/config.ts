export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() && process.env.NOTIFICATION_FROM_EMAIL?.trim()
  );
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export type MonitoringNotificationPrefs = {
  notifyEmailEnabled: boolean;
  notifyWebhookEnabled: boolean;
  notifyWebhookUrl: string | null;
  notifyTelegramEnabled: boolean;
};

export function canSendMonitoringNotifications(
  prefs: MonitoringNotificationPrefs,
  owner: {
    email: string | null | undefined;
    telegramChatId: string | null | undefined;
  },
  planCaps: { allowTelegram: boolean; allowWebhook: boolean } = {
    allowTelegram: true,
    allowWebhook: true,
  }
): boolean {
  const emailOk =
    prefs.notifyEmailEnabled &&
    Boolean(owner.email?.trim()) &&
    isSmtpConfigured();
  const webhookOk =
    planCaps.allowWebhook &&
    prefs.notifyWebhookEnabled &&
    Boolean(prefs.notifyWebhookUrl?.trim());
  const telegramOk =
    planCaps.allowTelegram &&
    prefs.notifyTelegramEnabled &&
    Boolean(owner.telegramChatId?.trim()) &&
    isTelegramConfigured();
  return emailOk || webhookOk || telegramOk;
}
