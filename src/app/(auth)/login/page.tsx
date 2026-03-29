import { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "Вход | MV Monitor",
  description: "Войдите в свой аккаунт",
};

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link href="/" className="absolute left-4 top-4 md:left-8 md:top-8 flex items-center gap-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
          <Activity className="h-4 w-4" strokeWidth={3} />
        </div>
        <span className="text-sm font-semibold tracking-wide">MV Monitor</span>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            С возвращением
          </h1>
          <p className="text-sm text-muted-foreground">
            Введите email и пароль для входа в аккаунт
          </p>
        </div>
        <LoginForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Нет аккаунта? Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
