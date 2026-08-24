"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

const MENSAJE_INICIAL = "Hola, estoy listo/a para empezar.";

type Estado =
  | { fase: "cargando" }
  | { fase: "conversando" }
  | { fase: "enviando" }
  | { fase: "cierre"; resumen: string }
  | { fase: "bloqueado"; motivo: string }
  | { fase: "error"; motivo: string };

export function Entrevista({ token, nombreCliente }: { token: string; nombreCliente: string }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    llamarApi([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, estado]);

  async function llamarApi(historial: Mensaje[]) {
    setEstado((prev) => (prev.fase === "cargando" ? prev : { fase: "enviando" }));
    try {
      const response = await fetch("/api/entrevista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, messages: historial }),
      });
      const data = await response.json();

      if (data.type === "pregunta") {
        setMensajes(data.messages);
        setEstado({ fase: "conversando" });
      } else if (data.type === "cierre") {
        setEstado({ fase: "cierre", resumen: data.resumen });
      } else if (data.type === "bloqueado") {
        setEstado({ fase: "bloqueado", motivo: data.motivo });
      } else {
        setEstado({ fase: "error", motivo: data.motivo ?? "Algo salió mal." });
      }
    } catch {
      setEstado({ fase: "error", motivo: "No pudimos conectar. Probá de nuevo en un momento." });
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim() || estado.fase !== "conversando") return;

    const nuevoHistorial: Mensaje[] = [...mensajes, { role: "user", content: input.trim() }];
    setMensajes(nuevoHistorial);
    setInput("");
    llamarApi(nuevoHistorial);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
      <h1 className="mb-6 font-display text-xl font-semibold">
        {nombreCliente ? `Hola, ${nombreCliente}` : "Entrevista financiera"}
      </h1>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {mensajes
          .filter((mensaje) => mensaje.content !== MENSAJE_INICIAL)
          .map((mensaje, index) => (
            <Burbuja key={index} mensaje={mensaje} />
          ))}

        {estado.fase === "cargando" || estado.fase === "enviando" ? (
          <p className="text-sm text-muted-foreground">Escribiendo…</p>
        ) : null}

        {estado.fase === "cierre" && (
          <div className="whitespace-pre-line rounded-[var(--radius-card)] border border-secondary/30 bg-secondary/10 p-4 text-sm">
            {estado.resumen}
          </div>
        )}

        {estado.fase === "bloqueado" && (
          <div className="whitespace-pre-line rounded-[var(--radius-card)] border border-warning/40 bg-warning/10 p-4 text-sm">
            {estado.motivo}
          </div>
        )}

        {estado.fase === "error" && (
          <div className="rounded-[var(--radius-card)] border border-error/40 bg-error/10 p-4 text-sm text-error">
            {estado.motivo}
          </div>
        )}

        <div ref={finRef} />
      </div>

      {estado.fase === "conversando" && (
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border pt-4">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribí tu respuesta…"
            autoFocus
          />
          <Button type="submit">Enviar</Button>
        </form>
      )}
    </main>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esCliente = mensaje.role === "user";
  return (
    <div className={`flex ${esCliente ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-[var(--radius-card)] px-4 py-2 text-sm ${
          esCliente ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {mensaje.content}
      </div>
    </div>
  );
}
