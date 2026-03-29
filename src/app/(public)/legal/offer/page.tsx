import Link from "next/link";

export const metadata = {
  title: "Публичная оферта — MV Monitor",
};

export default function OfferPage() {
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
        ← На главную
      </Link>
      <h1 className="text-3xl font-medium tracking-tight mb-6">Публичная оферта</h1>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        <strong>Шаблон для согласования с юристом.</strong> Укажите реквизиты продавца, порядок оплаты через ЮKassa,
        возвраты, ответственность и срок действия оферты.
      </p>
      <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
        <p>
          Настоящий документ является офертой на заключение договора оказания услуг по предоставлению доступа к сервису
          онлайн-мониторинга доступности веб-ресурсов «MV Monitor».
        </p>
        <p>
          Акцептом считается регистрация в сервисе и/или оплата подписки PRO. Тарифы и лимиты публикуются на странице
          «Тарифы» и могут обновляться; для оплаченного периода применяются условия на момент оплаты, если иное не
          предусмотрено офертой.
        </p>
        <p>
          Подписка PRO списывается ежемесячно через платёжного провайдера ЮKassa при включённом автопродлении. Пользователь
          может отключить автопродление в настройках (если реализовано) или обратившись в поддержку.
        </p>
        <p>
          Исполнитель не гарантирует отсутствие сбоев мониторинга из-за факторов вне его контроля (сети, DNS, целевой
          сайт). Уведомления доставляются по каналам, настроенным пользователем (email, Telegram, webhook).
        </p>
      </div>
    </div>
  );
}
