"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    const target = event.target as typeof event.target & {
      email: { value: string };
      password: { value: string };
    };

    const signInResult = await signIn("credentials", {
      email: target.email.value,
      password: target.password.value,
      redirect: false,
    });

    setIsLoading(false);

    if (!signInResult?.ok) {
      return alert("Ошибка входа. Проверьте email и пароль.");
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
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
          <Button type="submit" disabled={isLoading} className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium mt-2">
            {isLoading && (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
            )}
            Войти
          </Button>
        </div>
      </form>
    </div>
  );
}
