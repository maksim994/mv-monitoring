"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
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
            <Label htmlFor="name" className="text-zinc-400">Имя</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect="off"
              disabled={isLoading}
              className="h-10 bg-black border-white/10 focus-visible:ring-white/20"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-zinc-400">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              className="h-10 bg-black border-white/10 focus-visible:ring-white/20"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-zinc-400">Пароль</Label>
            <Input
              id="password"
              type="password"
              disabled={isLoading}
              className="h-10 bg-black border-white/10 focus-visible:ring-white/20"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-10 bg-white text-black hover:bg-zinc-200 font-medium mt-2">
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
