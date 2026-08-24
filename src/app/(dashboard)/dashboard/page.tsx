import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Entrevista pendiente",
  entrevista_completa: "Entrevista completa",
};

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, estado, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Tus clientes</h1>
        <Button asChild>
          <Link href="/dashboard/clientes/nuevo">Nuevo cliente</Link>
        </Button>
      </div>

      {!clientes || clientes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Todavía no tenés clientes cargados. Creá el primero para generar su
            enlace de entrevista.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
          {clientes.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/dashboard/clientes/${cliente.id}`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted"
            >
              <span className="font-medium">{cliente.nombre}</span>
              <span
                className={
                  cliente.estado === "entrevista_completa"
                    ? "text-sm text-secondary"
                    : "text-sm text-muted-foreground"
                }
              >
                {ESTADO_LABEL[cliente.estado] ?? cliente.estado}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
