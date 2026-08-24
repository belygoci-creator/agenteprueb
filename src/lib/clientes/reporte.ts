import { ETAPA_LABEL, formatMoneda, type ClienteCompleto } from "./obtener-cliente-completo";

export interface SeccionReporte {
  titulo: string;
  items: { label: string; valor: string }[];
  notas?: string;
}

export interface Reporte {
  nombreCliente: string;
  generadoEl: string;
  secciones: SeccionReporte[];
}

/** Arma el contenido del reporte a partir de los mismos datos que muestra
 * el dashboard -- una sola fuente de verdad para pantalla, PDF y Word.
 * Siempre reporta la entrada más reciente del historial. */
export function construirReporte({ cliente, historial }: ClienteCompleto): Reporte {
  if (!cliente) {
    throw new Error("Cliente no encontrado.");
  }

  const { ficha, diagnostico, recomendacion } = historial[0] ?? {
    ficha: null,
    diagnostico: null,
    recomendacion: null,
  };

  const secciones: SeccionReporte[] = [];

  if (ficha) {
    secciones.push({
      titulo: "Ficha",
      items: [
        { label: "Edad", valor: `${ficha.edad} años` },
        { label: "Dependientes", valor: ficha.dependientes },
        { label: "Situación laboral", valor: `${ficha.situacion_laboral} (${ficha.estabilidad_laboral})` },
        { label: "Objetivo", valor: ficha.objetivo_descripcion },
        {
          label: "Monto y plazo",
          valor: `${ficha.objetivo_monto} ${ficha.objetivo_moneda} en ${ficha.objetivo_plazo_meses} meses`,
        },
        {
          label: "Ingresos netos mensuales",
          valor: formatMoneda(ficha.ingresos_netos_mensuales) + (ficha.ingresos_estimado ? " (estimado)" : ""),
        },
        {
          label: "Gastos fijos mensuales",
          valor: formatMoneda(ficha.gastos_fijos_mensuales) + (ficha.gastos_estimado ? " (estimado)" : ""),
        },
        {
          label: "Deuda",
          valor:
            ficha.deuda_saldo != null
              ? `Saldo ${formatMoneda(ficha.deuda_saldo)}, cuota ${formatMoneda(ficha.deuda_cuota_mensual ?? 0)}, tasa ${ficha.deuda_tasa_interes ?? "—"}%`
              : "Sin deuda",
        },
        {
          label: "Ahorro actual",
          valor: `${formatMoneda(ficha.ahorro_actual_monto)}${ficha.ahorro_actual_liquidez ? ` (${ficha.ahorro_actual_liquidez})` : ""}`,
        },
        { label: "Fondo de emergencia actual", valor: `${ficha.fondo_emergencia_meses} meses` },
        { label: "Perfil de riesgo declarado", valor: ficha.perfil_riesgo_declarado },
      ],
      notas: ficha.notas_cualitativas ?? undefined,
    });
  }

  if (diagnostico) {
    secciones.push({
      titulo: "Diagnóstico",
      items: [
        { label: "Tasa de ahorro", valor: `${diagnostico.tasa_ahorro.toFixed(1)}%` },
        { label: "% del camino recorrido", valor: `${diagnostico.porcentaje_camino_recorrido.toFixed(1)}%` },
        { label: "Proyección acumulada", valor: formatMoneda(diagnostico.proyeccion_acumulada) },
        {
          label: "Gap",
          valor:
            diagnostico.gap !== null
              ? formatMoneda(diagnostico.gap)
              : (diagnostico.gap_pendiente_motivo ?? "Pendiente"),
        },
      ],
    });
  }

  if (recomendacion) {
    secciones.push({
      titulo: "Recomendación técnica",
      items: [
        { label: "Etapa", valor: ETAPA_LABEL[recomendacion.etapa_prioridad] ?? recomendacion.etapa_prioridad },
        { label: "Fondo de emergencia requerido", valor: `${recomendacion.fondo_emergencia_requerido_meses} meses` },
        { label: "Aporte necesario", valor: formatMoneda(recomendacion.aporte_necesario) },
        { label: "Aporte máximo sostenible", valor: formatMoneda(recomendacion.aporte_maximo_sostenible) },
        { label: "Diferencia", valor: formatMoneda(recomendacion.diferencia) },
        { label: "¿Viable?", valor: recomendacion.viable ? "Sí" : "No" },
        {
          label: "Distribución recomendada",
          valor: `${recomendacion.distribucion_renta_fija}% renta fija / ${recomendacion.distribucion_liquidez}% liquidez / ${recomendacion.distribucion_renta_variable}% renta variable`,
        },
        ...(recomendacion.tipo_cambio_usado
          ? [
              {
                label: "Tipo de cambio usado",
                valor: `${recomendacion.tipo_cambio_usado} (${recomendacion.tipo_cambio_fecha}, fuente: ${recomendacion.tipo_cambio_fuente})`,
              },
            ]
          : []),
        ...(!recomendacion.viable && recomendacion.alternativas
          ? [{ label: "Alternativas de viabilidad", valor: JSON.stringify(recomendacion.alternativas, null, 2) }]
          : []),
      ],
    });
  }

  return {
    nombreCliente: cliente.nombre,
    generadoEl: new Date().toLocaleString("es-AR"),
    secciones,
  };
}

/** Nombre de archivo seguro (sin acentos ni caracteres especiales) para los headers de descarga. */
export function nombreArchivoSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-");
}
