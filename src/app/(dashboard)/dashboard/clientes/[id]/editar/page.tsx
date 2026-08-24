import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { obtenerClienteCompleto } from "@/lib/clientes/obtener-cliente-completo";
import { guardarEdicionFicha } from "../../actions";

export default async function EditarFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { cliente, historial } = await obtenerClienteCompleto(id);

  if (!cliente) {
    notFound();
  }

  const ficha = historial[0]?.ficha;

  if (!ficha) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold">{cliente.nombre}</h1>
        <p className="text-muted-foreground">
          Este cliente todavía no completó ninguna entrevista, no hay una ficha para corregir.
        </p>
      </div>
    );
  }

  const accion = guardarEdicionFicha.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Editar ficha — {cliente.nombre}</h1>
        <p className="text-sm text-muted-foreground">
          Corrige lo que haga falta. Al guardar se crea una nueva versión (la anterior queda en el
          historial) y se recalculan el diagnóstico y la recomendación.
        </p>
      </div>

      <form action={accion} className="space-y-8">
        <Seccion titulo="Situación">
          <Campo label="Edad" name="edad" type="number" defaultValue={ficha.edad} required />
          <Campo label="Dependientes" name="dependientes" defaultValue={ficha.dependientes} required />
          <Campo
            label="Situación laboral"
            name="situacion_laboral"
            defaultValue={ficha.situacion_laboral}
            required
          />
          <div className="space-y-2">
            <Label htmlFor="estabilidad_laboral">Estabilidad laboral</Label>
            <Select id="estabilidad_laboral" name="estabilidad_laboral" defaultValue={ficha.estabilidad_laboral}>
              <option value="estable">Estable</option>
              <option value="inestable">Inestable</option>
            </Select>
          </div>
        </Seccion>

        <Seccion titulo="Objetivo">
          <Campo
            label="Descripción del objetivo"
            name="objetivo_descripcion"
            defaultValue={ficha.objetivo_descripcion}
            required
            className="sm:col-span-2"
          />
          <Campo label="Monto" name="objetivo_monto" type="number" defaultValue={ficha.objetivo_monto} required />
          <Campo label="Moneda" name="objetivo_moneda" defaultValue={ficha.objetivo_moneda} required />
          <Campo
            label="Plazo (meses)"
            name="objetivo_plazo_meses"
            type="number"
            defaultValue={ficha.objetivo_plazo_meses}
            required
          />
          <Campo
            label="Prioridad (si hay más de una meta)"
            name="objetivo_prioridad"
            defaultValue={ficha.objetivo_prioridad ?? ""}
          />
        </Seccion>

        <Seccion titulo="Ingresos y gastos">
          <CampoConEstimado
            label="Ingresos netos mensuales"
            name="ingresos_netos_mensuales"
            nameEstimado="ingresos_estimado"
            defaultValue={ficha.ingresos_netos_mensuales}
            estimadoDefault={ficha.ingresos_estimado}
          />
          <CampoConEstimado
            label="Gastos fijos mensuales"
            name="gastos_fijos_mensuales"
            nameEstimado="gastos_estimado"
            defaultValue={ficha.gastos_fijos_mensuales}
            estimadoDefault={ficha.gastos_estimado}
          />
        </Seccion>

        <Seccion titulo="Deuda (dejar vacío si no tiene)">
          <Campo label="Saldo" name="deuda_saldo" type="number" defaultValue={ficha.deuda_saldo ?? ""} />
          <Campo
            label="Cuota mensual"
            name="deuda_cuota_mensual"
            type="number"
            defaultValue={ficha.deuda_cuota_mensual ?? ""}
          />
          <Campo
            label="Tasa de interés anual (%)"
            name="deuda_tasa_interes"
            type="number"
            defaultValue={ficha.deuda_tasa_interes ?? ""}
          />
          <Checkbox label="Estos datos son estimados" name="deuda_estimado" defaultChecked={ficha.deuda_estimado} />
        </Seccion>

        <Seccion titulo="Ahorro">
          <CampoConEstimado
            label="Ahorro actual"
            name="ahorro_actual_monto"
            nameEstimado="ahorro_estimado"
            defaultValue={ficha.ahorro_actual_monto}
            estimadoDefault={ficha.ahorro_estimado}
          />
          <Campo
            label="¿Es líquido o inmovilizado?"
            name="ahorro_actual_liquidez"
            defaultValue={ficha.ahorro_actual_liquidez ?? ""}
          />
          <Campo
            label="Fondo de emergencia (meses de cobertura)"
            name="fondo_emergencia_meses"
            type="number"
            defaultValue={ficha.fondo_emergencia_meses}
            required
          />
        </Seccion>

        <Seccion titulo="Perfil de riesgo">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="perfil_riesgo_declarado">Perfil declarado</Label>
            <Select
              id="perfil_riesgo_declarado"
              name="perfil_riesgo_declarado"
              defaultValue={ficha.perfil_riesgo_declarado}
            >
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="dinamico">Dinámico</option>
            </Select>
          </div>
        </Seccion>

        <Seccion titulo="Notas">
          <div className="sm:col-span-2">
            <textarea
              name="notas_cualitativas"
              defaultValue={ficha.notas_cualitativas ?? ""}
              rows={3}
              className="flex w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
        </Seccion>

        <div className="flex gap-2">
          <Button type="submit">Guardar y recalcular</Button>
          <Button asChild variant="outline">
            <a href={`/dashboard/clientes/${id}`}>Cancelar</a>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-display text-base font-semibold">{titulo}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Campo({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} step="any" />
    </div>
  );
}

function CampoConEstimado({
  label,
  name,
  nameEstimado,
  defaultValue,
  estimadoDefault,
}: {
  label: string;
  name: string;
  nameEstimado: string;
  defaultValue: number;
  estimadoDefault: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step="any" defaultValue={defaultValue} required />
      <Checkbox label="Es un dato estimado" name={nameEstimado} defaultChecked={estimadoDefault} />
    </div>
  );
}

function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-border" />
      {label}
    </label>
  );
}

function Select({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="flex h-10 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {children}
    </select>
  );
}
