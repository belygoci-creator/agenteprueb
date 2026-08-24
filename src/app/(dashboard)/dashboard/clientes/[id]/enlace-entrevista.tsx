"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EnlaceEntrevista({
  token,
  expiresAt,
}: {
  token: string;
  expiresAt: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/entrevista/${token}`
      : `/entrevista/${token}`;

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(event) => event.target.select()} />
        <Button type="button" variant="secondary" onClick={copiar}>
          {copiado ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Vence el {new Date(expiresAt).toLocaleDateString("es-AR")}. Mandaselo al cliente por el
        canal que prefieras.
      </p>
    </div>
  );
}
