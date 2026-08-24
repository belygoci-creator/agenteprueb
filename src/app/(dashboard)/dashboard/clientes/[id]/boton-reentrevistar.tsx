"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EnlaceEntrevista } from "./enlace-entrevista";
import { generarNuevoEnlace } from "../actions";

export function BotonReentrevistar({ clienteId }: { clienteId: string }) {
  const [pending, startTransition] = useTransition();
  const [nuevoToken, setNuevoToken] = useState<{ token: string; expiresAt: string } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const { token, expiresAt } = await generarNuevoEnlace(clienteId);
      setNuevoToken({ token, expiresAt });
    });
  }

  if (nuevoToken) {
    return <EnlaceEntrevista token={nuevoToken.token} expiresAt={nuevoToken.expiresAt} />;
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Generando…" : "Reentrevistar"}
    </Button>
  );
}
