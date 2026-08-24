"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="rounded-[var(--radius-card)] border border-border bg-muted p-4 text-center text-sm text-foreground">
        Te mandamos un enlace de acceso a <strong>{email}</strong>. Abrilo desde este mismo
        dispositivo para entrar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="vos@ejemplo.com"
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-error">{errorMessage}</p>
      )}
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Enviando..." : "Mandarme el enlace de acceso"}
      </Button>
    </form>
  );
}
