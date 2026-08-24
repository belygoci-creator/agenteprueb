import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ETAPA_LABEL,
  formatMoneda,
  obtenerClienteCompleto,
  type EntradaHistorial,
} from "@/lib/clientes/obtener-cliente-completo";
import { createClient } from "@/lib/supabase/server";
import { EnlaceEntrevista } from "./enlace-entrevista";
import { BotonReentrevistar } from "./boton-reentrevistar";

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { cliente, historial } = await obtenerClienteCompleto(id);

  if (!cliente) {
    notFound();
  }

  if (historial.length === 0) {
    const supabase = await createClient();
    const { data: token } = await supabase
      .from("entrevista_tokens")
      .select("token, expires_at, used_at")
      .eq("cliente_id", id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-semibold">{cliente.nombre}</h1>
        <Card>
          <CardHeader>
            <CardTitle>Entrevista pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            {token ? (
              <EnlaceEntrevista token={token.token} expiresAt={token.expires_at} />
            ) : (
              <p className="text-muted-foreground">
                No hay un enlace generado para este cliente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const [actual, ...anteriores] = historial;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{cliente.nombre}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/dashboard/clientes/${id}/export/pdf`}>Exportar a PDF</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/dashboard/clientes/${id}/export/docx`}>Exportar a Word</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/dashboard/clientes/${id}/editar`}>Editar ficha</a>
          </Button>
          <BotonReentrevistar clienteId={id} />
        </div>
      </div>

      <EntradaDetalle entrada={actual} titulo="Situación actual" />

      {anteriores.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-muted-foreground">
            Historial ({anteriores.length} {anteriores.length === 1 ? "entrevista anterior" : "entrevistas anteriores"})
          </h2>
          {anteriores.map((entrada) => (
            <details key={entrada.ficha?.id} className="rounded-[var(--radius-card)] border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
                {entrada.ficha ? new Date(entrada.ficha.created_at).toLocaleString("es-AR") : "—"}
                {entrada.recomendacion && (
                  <span className={entrada.recomendacion.viable ? "ml-2 text-secondary" : "ml-2 text-warning"}>
                    · {entrada.recomendacion.viable ? "viable" : "no viable"}
                  </span>
                )}
              </summary>
              <div className="border-t border-border px-4 pb-4 pt-2">
                <EntradaDetalle entrada={entrada} compacta />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function EntradaDetalle({
  entrada,
  titulo,
  compacta = false,
}: {
  entrada: EntradaHistorial;
  titulo?: string;
  compacta?: boolean;
}) {
  const { ficha, diagnostico, recomendacion } = entrada;

  return (
    <div className={compacta ? "space-y-4" : "space-y-6"}>
      {titulo && !compacta && (
        <p className="text-sm text-muted-foreground">
          {ficha ? new Date(ficha.created_at).toLocaleString("es-AR") : ""}
        </p>
      )}
      {ficha && (
        <SeccionCard titulo="Ficha" compacta={compacta}>
          <Dato label="Edad" valor={`${ficha.edad} años`} />
          <Dato label="Situación laboral" valor={`${ficha.situacion_laboral} (${ficha.estabilidad_laboral})`} />
          <Dato label="Objetivo" valor={ficha.objetivo_descripcion} />
          <Dato
            label="Monto y plazo"
            valor={`${ficha.objetivo_monto} ${ficha.objetivo_moneda} en ${ficha.objetivo_plazo_meses} meses`}
          />
          <Dato
            label="Ingresos netos"
            valor={formatMoneda(ficha.ingresos_netos_mensuales) + (ficha.ingresos_estimado ? " (estimado)" : "")}
          />
          <Dato
            label="Gastos fijos"
            valor={formatMoneda(ficha.gastos_fijos_mensuales) + (ficha.gastos_estimado ? " (estimado)" : "")}
          />
          <Dato label="Fondo de emergencia" valor={`${ficha.fondo_emergencia_meses} meses`} />
          <Dato label="Perfil de riesgo" valor={ficha.perfil_riesgo_declarado} />
          {ficha.notas_cualitativas && (
            <div className="col-span-full">
              <Dato label="Notas" valor={ficha.notas_cualitativas} />
            </div>
          )}
        </SeccionCard>
      )}

      {diagnostico && (
        <SeccionCard titulo="Diagnóstico" compacta={compacta}>
          <Dato label="Tasa de ahorro" valor={`${diagnostico.tasa_ahorro.toFixed(1)}%`} />
          <Dato label="% del camino recorrido" valor={`${diagnostico.porcentaje_camino_recorrido.toFixed(1)}%`} />
          <Dato label="Proyección acumulada" valor={formatMoneda(diagnostico.proyeccion_acumulada)} />
          <Dato
            label="Gap"
            valor={diagnostico.gap !== null ? formatMoneda(diagnostico.gap) : diagnostico.gap_pendiente_motivo ?? "Pendiente"}
          />
        </SeccionCard>
      )}

      {recomendacion && (
        <SeccionCard titulo="Recomendación técnica" compacta={compacta}>
          <Dato label="Etapa" valor={ETAPA_LABEL[recomendacion.etapa_prioridad] ?? recomendacion.etapa_prioridad} />
          <Dato
            label="Fondo de emergencia requerido"
            valor={`${recomendacion.fondo_emergencia_requerido_meses} meses`}
          />
          <Dato label="Aporte necesario" valor={formatMoneda(recomendacion.aporte_necesario)} />
          <Dato label="Aporte máximo sostenible" valor={formatMoneda(recomendacion.aporte_maximo_sostenible)} />
          <Dato label="Diferencia" valor={formatMoneda(recomendacion.diferencia)} />
          <Dato label="¿Viable?" valor={recomendacion.viable ? "Sí" : "No"} />
          <div className="col-span-full">
            <Dato
              label="Distribución recomendada"
              valor={`${recomendacion.distribucion_renta_fija}% renta fija / ${recomendacion.distribucion_liquidez}% liquidez / ${recomendacion.distribucion_renta_variable}% renta variable`}
            />
          </div>
          {recomendacion.tipo_cambio_usado && (
            <div className="col-span-full">
              <Dato
                label="Tipo de cambio usado"
                valor={`${recomendacion.tipo_cambio_usado} (${recomendacion.tipo_cambio_fecha}, fuente: ${recomendacion.tipo_cambio_fuente})`}
              />
            </div>
          )}
          {!recomendacion.viable && Boolean(recomendacion.alternativas) && (
            <div className="col-span-full">
              <p className="mb-1 font-medium">Alternativas de viabilidad</p>
              <pre className="overflow-x-auto rounded-[var(--radius-input)] bg-muted p-3 text-xs">
                {JSON.stringify(recomendacion.alternativas, null, 2)}
              </pre>
            </div>
          )}
        </SeccionCard>
      )}
    </div>
  );
}

function SeccionCard({
  titulo,
  compacta,
  children,
}: {
  titulo: string;
  compacta: boolean;
  children: React.ReactNode;
}) {
  if (compacta) {
    return (
      <div>
        <p className="mb-2 text-sm font-medium">{titulo}</p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">{children}</dl>
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
