"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [consent, setConsent] = React.useState(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!consent) {
      alert("Нужно согласие на обработку персональных данных.");
      return;
    }
    setIsLoading(true);

    const target = event.target as typeof event.target & {
      name: { value: string };
      email: { value: string };
      password: { value: string };
    };

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: target.name.value,
        email: target.email.value,
        password: target.password.value,
        personalDataConsent: true,
      }),
    });

    setIsLoading(false);

    if (!response.ok) {
      return alert("Ошибка регистрации. Возможно, email уже используется.");
    }

    router.push("/login");
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-muted-foreground">Имя</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect="off"
              disabled={isLoading}
              className="h-10 bg-muted border-border focus-visible:ring-ring/40"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="h-10 bg-muted border-border focus-visible:ring-ring/40"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-muted-foreground">Пароль</Label>
            <Input
              id="password"
              type="password"
              disabled={isLoading}
              className="h-10 bg-muted border-border focus-visible:ring-ring/40"
              required
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-input accent-primary"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={isLoading}
            />
            <span className="leading-snug">
              Согласен на обработку персональных данных в соответствии с{" "}
              <Link href="/legal/privacy" className="text-primary underline underline-offset-2">
                политикой конфиденциальности
              </Link>
            </span>
          </label>
          <Button type="submit" disabled={isLoading} className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium mt-2">
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            )}
            Зарегистрироваться
          </Button>
        </div>
      </form>
    </div>
  );
}
