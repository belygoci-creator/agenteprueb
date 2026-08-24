import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-display text-2xl font-semibold">asesor-financiero</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá con tu email para entrar al dashboard.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
