"""
Motor de calculo -- Agente de finanzas
========================================

Implementa de forma deterministica las formulas descritas en
`reglas-recomendacion.md`. Cada bloque de codigo cita la seccion (SS) del
archivo de reglas de la que proviene, para que quede auditable 1 a 1.

Este script NO decide nada por su cuenta que las reglas dejen explicitamente
a criterio del asesor (ej. aporte paralelo, reparto de la opcion 4 de
"combinacion"). Esos casos se devuelven senalados pero sin cuantificar.

Migrado tal cual desde el motor_calculo.py original (ver changelog) -- vive
en api/_motor_calculo.py como modulo puro, sin dependencias de HTTP, para
que api/motor-calculo.py (el endpoint serverless) lo importe sin tocar la
logica de negocio.

Uso tipico (desde el endpoint serverless):

    from _motor_calculo import calcular_recomendacion

    resultado = calcular_recomendacion({
        "ingresos_mensuales": 700000,
        "gastos_fijos_mensuales": 500000,
        "deuda_cuota_mensual": 0,
        "deuda_tasa_interes": None,
        "estabilidad_laboral": "inestable",
        "fondo_emergencia_meses_actual": 2,
        "ahorro_actual": 0,
        "objetivo_monto": 5000,
        "objetivo_moneda": "USD",
        "flujo_moneda": "ARS",
        "objetivo_plazo_meses": 8,
        "perfil_riesgo": "moderado",
        "tipo_cambio": {"valor": 1350, "fecha": "2026-08-12", "fuente": "dolar blue, ..."},
        "colchon_pct": 0.15,
    })

El resultado es un dict con todos los valores intermedios y finales; el
endpoint lo usa para persistir diagnostico/recomendacion, sin recalcular
nada a mano.
"""

from typing import Optional


# ---------------------------------------------------------------------------
# Constantes -- deben coincidir siempre con reglas-recomendacion.md
# ---------------------------------------------------------------------------

# SS1 Orden de prioridad
MESES_FONDO_EMERGENCIA_ESTABLE = 3
MESES_FONDO_EMERGENCIA_INESTABLE = 6
TASA_DEUDA_CARA = 30.0  # % anual, >= bloquea inversion

# SS2 Regla de aportacion
COLCHON_PCT_DEFAULT = 0.15  # dentro del rango 10%-15% de reglas-recomendacion.md

# SS3 Distribucion por perfil de riesgo (renta_fija, liquidez, renta_variable), en %
DISTRIBUCION_BASE = {
    "conservador": {"renta_fija": 70, "liquidez": 30, "renta_variable": 0},
    "moderado": {"renta_fija": 50, "liquidez": 20, "renta_variable": 30},
    "dinamico": {"renta_fija": 30, "liquidez": 10, "renta_variable": 60},
}

# SS5 Supuestos de rentabilidad anual por perfil -- SOLO para escenario opcional
RENTABILIDAD_ANUAL_ASUMIDA = {
    "conservador": 2.0,
    "moderado": 4.5,
    "dinamico": 6.5,
}

PERFILES_VALIDOS = set(DISTRIBUCION_BASE.keys())


# ---------------------------------------------------------------------------
# Excepciones
# ---------------------------------------------------------------------------

class CalculoBloqueado(Exception):
    """Se lanza cuando falta un dato indispensable y no debe estimarse.

    Nunca se debe atrapar esta excepcion para "seguir igual" -- el endpoint
    debe devolver el bloqueo tal cual, en simple, sin estimar el dato.
    """


# ---------------------------------------------------------------------------
# SS1 -- Orden de prioridad
# ---------------------------------------------------------------------------

def meses_fondo_emergencia_minimo(estabilidad_laboral: str) -> int:
    estabilidad_laboral = estabilidad_laboral.strip().lower()
    if estabilidad_laboral in ("estable", "dependencia", "relacion de dependencia"):
        return MESES_FONDO_EMERGENCIA_ESTABLE
    return MESES_FONDO_EMERGENCIA_INESTABLE  # independiente / inestable / mixto-inestable


def clasificar_deuda(tasa_interes: Optional[float]) -> str:
    """Devuelve 'sin_deuda', 'cara' o 'tasa_baja'."""
    if tasa_interes is None:
        return "sin_deuda"
    return "cara" if tasa_interes >= TASA_DEUDA_CARA else "tasa_baja"


def determinar_etapa(
    fondo_emergencia_meses_actual: float,
    estabilidad_laboral: str,
    deuda_tasa_interes: Optional[float],
) -> dict:
    """Determina en que etapa de la prioridad esta el cliente (SS1)."""
    minimo = meses_fondo_emergencia_minimo(estabilidad_laboral)
    fondo_ok = fondo_emergencia_meses_actual >= minimo
    clase_deuda = clasificar_deuda(deuda_tasa_interes)

    if not fondo_ok:
        etapa = "fondo_emergencia"
    elif clase_deuda == "cara":
        etapa = "deuda_cara"
    else:
        etapa = "inversion"

    return {
        "etapa": etapa,
        "fondo_emergencia_minimo_meses": minimo,
        "fondo_emergencia_completo": fondo_ok,
        "clase_deuda": clase_deuda,
        "bloquea_inversion": etapa != "inversion",
    }


# ---------------------------------------------------------------------------
# SS2 -- Regla de aportacion
# ---------------------------------------------------------------------------

def calcular_aportacion(
    ingresos_mensuales: float,
    gastos_fijos_mensuales: float,
    deuda_cuota_mensual: float,
    etapa: str,
    colchon_pct: float,
    gap: float,
    plazo_meses: float,
) -> dict:
    excedente = ingresos_mensuales - gastos_fijos_mensuales - deuda_cuota_mensual
    colchon_seguridad = excedente * colchon_pct

    if etapa == "inversion":
        # Fondo de emergencia completo y sin deuda cara: todo el excedente
        # remanente (menos colchon) puede ir a la meta.
        aporte_maximo_sostenible = max(excedente - colchon_seguridad, 0.0)
    else:
        # Bloqueado por prioridad (SS1). El aporte "paralelo" es criterio del
        # asesor caso por caso -- el motor no lo cuantifica automaticamente.
        aporte_maximo_sostenible = 0.0

    aporte_necesario = gap / plazo_meses if plazo_meses else float("inf")
    diferencia = aporte_necesario - aporte_maximo_sostenible

    return {
        "excedente_mensual": excedente,
        "colchon_seguridad": colchon_seguridad,
        "aporte_necesario": aporte_necesario,
        "aporte_maximo_sostenible": aporte_maximo_sostenible,
        "diferencia": diferencia,
        "viable": diferencia <= 0,
        "aporte_paralelo_disponible": etapa != "inversion",
    }


# ---------------------------------------------------------------------------
# SS3 -- Distribucion por perfil de riesgo
# ---------------------------------------------------------------------------

def calcular_distribucion(perfil_riesgo: str, plazo_meses: float) -> dict:
    perfil_riesgo = perfil_riesgo.strip().lower()
    if perfil_riesgo not in PERFILES_VALIDOS:
        raise CalculoBloqueado(
            f"Perfil de riesgo '{perfil_riesgo}' no reconocido. "
            f"Debe ser uno de: {sorted(PERFILES_VALIDOS)}."
        )

    base = DISTRIBUCION_BASE[perfil_riesgo]

    # Los rangos <12/12-36/37-60 son topes ABSOLUTOS de renta variable
    # (no "% del perfil"), segun reglas-recomendacion.md SS3. Solo el rango
    # >60 meses usa "100% del perfil" (sin recorte). Limites tal cual la
    # tabla: "< 12" es estrictamente menor a 12; el mes 12 ya cae en el
    # tramo 12-36.
    if plazo_meses < 12:
        tope_absoluto = 0
    elif plazo_meses <= 36:
        tope_absoluto = 20
    elif plazo_meses <= 60:
        tope_absoluto = 40
    else:
        tope_absoluto = base["renta_variable"]  # sin tope adicional

    renta_variable = min(base["renta_variable"], tope_absoluto)
    recorte = base["renta_variable"] - renta_variable

    if recorte > 0:
        total_rf_liq = base["renta_fija"] + base["liquidez"]
        if total_rf_liq > 0:
            renta_fija = base["renta_fija"] + recorte * (base["renta_fija"] / total_rf_liq)
            liquidez = base["liquidez"] + recorte * (base["liquidez"] / total_rf_liq)
        else:
            renta_fija = base["renta_fija"]
            liquidez = base["liquidez"] + recorte
    else:
        renta_fija = base["renta_fija"]
        liquidez = base["liquidez"]

    return {
        "perfil": perfil_riesgo,
        "distribucion_base_perfil": base,
        "tope_renta_variable_por_plazo": tope_absoluto,
        "distribucion_recomendada": {
            "renta_fija": round(renta_fija, 1),
            "liquidez": round(liquidez, 1),
            "renta_variable": round(renta_variable, 1),
        },
        "recortado_por_plazo": recorte > 0,
    }


# ---------------------------------------------------------------------------
# SS4 -- Politica de inviabilidad
# ---------------------------------------------------------------------------

def calcular_escenarios_inviabilidad(
    gap: float,
    plazo_meses: float,
    aporte_maximo_sostenible: float,
    ahorro_actual: float,
) -> dict:
    """Solo tiene sentido llamarla si aportacion['viable'] es False."""

    # 1. Objetivo + aporte sostenible -> plazo necesario adicional
    if aporte_maximo_sostenible > 0:
        plazo_necesario_total = gap / aporte_maximo_sostenible
        plazo_adicional = plazo_necesario_total - plazo_meses
    else:
        plazo_necesario_total = float("inf")
        plazo_adicional = float("inf")

    # 2. Objetivo + plazo original -> aporte necesario (ya calculado en SS2,
    #    se repite aca por completitud del bloque de escenarios)
    aporte_necesario = gap / plazo_meses if plazo_meses else float("inf")

    # 3. Aporte sostenible + plazo original -> objetivo alcanzable
    objetivo_alcanzable = ahorro_actual + aporte_maximo_sostenible * plazo_meses

    return {
        "opcion_1_mantener_objetivo": {
            "descripcion": "Objetivo + aporte sostenible -> plazo necesario",
            "plazo_necesario_total_meses": plazo_necesario_total,
            "plazo_adicional_meses": plazo_adicional,
        },
        "opcion_2_mantener_plazo": {
            "descripcion": "Objetivo + plazo original -> aporte necesario",
            "aporte_necesario": aporte_necesario,
        },
        "opcion_3_mantener_aporte": {
            "descripcion": "Aporte sostenible + plazo original -> objetivo alcanzable",
            "objetivo_alcanzable": objetivo_alcanzable,
        },
        "opcion_4_combinacion": {
            "descripcion": (
                "Ajuste parcial de plazo y/o aporte y/o objetivo. "
                "No se cuantifica un split por defecto -- queda a criterio del asesor."
            ),
            "cuantificada": False,
        },
    }


# ---------------------------------------------------------------------------
# SS5 -- Rentabilidad asumida (uso EXCLUSIVAMENTE opcional)
# ---------------------------------------------------------------------------

def calcular_escenario_con_rendimiento(
    aporte_mensual: float,
    plazo_meses: float,
    perfil_riesgo: str,
    ahorro_actual: float = 0.0,
) -> dict:
    """Escenario opcional. NO se llama por defecto -- solo si el asesor lo
    pide explicitamente. El resultado debe marcarse siempre como supuesto
    en el informe.
    """
    perfil_riesgo = perfil_riesgo.strip().lower()
    if perfil_riesgo not in RENTABILIDAD_ANUAL_ASUMIDA:
        raise CalculoBloqueado(f"Perfil '{perfil_riesgo}' no reconocido para rentabilidad asumida.")

    tasa_anual = RENTABILIDAD_ANUAL_ASUMIDA[perfil_riesgo]
    tasa_mensual = (1 + tasa_anual / 100) ** (1 / 12) - 1

    saldo = ahorro_actual
    for _ in range(int(plazo_meses)):
        saldo = saldo * (1 + tasa_mensual) + aporte_mensual

    return {
        "supuesto": f"rentabilidad anual asumida: {tasa_anual}% (perfil {perfil_riesgo}) -- SS5 reglas-recomendacion.md",
        "acumulado_proyectado_con_rendimiento": saldo,
        "nota": "Escenario opcional, no incorporado por defecto en los calculos principales.",
    }


# ---------------------------------------------------------------------------
# SS6 -- Conversion de moneda
# ---------------------------------------------------------------------------

def convertir_objetivo_a_moneda_flujo(
    objetivo_monto: float,
    objetivo_moneda: str,
    flujo_moneda: str,
    tipo_cambio: Optional[dict],
) -> dict:
    """tipo_cambio, si se provee, debe ser un dict:
        {"valor": float, "fecha": "YYYY-MM-DD", "fuente": str}
    Ese dict lo resuelve el endpoint (busqueda en vivo a la API de
    cotizacion) -- este modulo NO busca en la web, solo aplica el valor ya
    resuelto.
    """
    if objetivo_moneda == flujo_moneda:
        return {
            "objetivo_monto_moneda_flujo": objetivo_monto,
            "conversion_aplicada": False,
        }

    if not tipo_cambio or "valor" not in tipo_cambio:
        raise CalculoBloqueado(
            f"Objetivo en {objetivo_moneda} pero flujo en {flujo_moneda}, y no hay "
            "tipo de cambio resuelto (SS6 reglas-recomendacion.md). "
            "El motor debe buscar el dolar blue en vivo antes de calcular; "
            "si la busqueda falla, el calculo queda bloqueado."
        )

    return {
        "objetivo_monto_moneda_flujo": objetivo_monto * tipo_cambio["valor"],
        "conversion_aplicada": True,
        "tipo_cambio_usado": tipo_cambio,
    }


# ---------------------------------------------------------------------------
# Orquestador principal
# ---------------------------------------------------------------------------

def calcular_recomendacion(datos: dict) -> dict:
    """Corre la secuencia completa de SS1 a SS4 y devuelve todos los
    resultados intermedios y finales. Lanza CalculoBloqueado si falta un
    dato indispensable -- el endpoint debe capturarla y devolver el bloqueo
    tal cual, nunca estimar el dato faltante.
    """

    # -- Conversion de moneda (SS6) --
    conversion = convertir_objetivo_a_moneda_flujo(
        objetivo_monto=datos["objetivo_monto"],
        objetivo_moneda=datos["objetivo_moneda"],
        flujo_moneda=datos["flujo_moneda"],
        tipo_cambio=datos.get("tipo_cambio"),
    )
    objetivo_monto_flujo = conversion["objetivo_monto_moneda_flujo"]

    ahorro_actual = datos["ahorro_actual"]
    gap = max(objetivo_monto_flujo - ahorro_actual, 0.0)

    # -- Etapa / prioridad (SS1) --
    etapa_info = determinar_etapa(
        fondo_emergencia_meses_actual=datos["fondo_emergencia_meses_actual"],
        estabilidad_laboral=datos["estabilidad_laboral"],
        deuda_tasa_interes=datos.get("deuda_tasa_interes"),
    )

    # -- Aportacion (SS2) --
    aportacion = calcular_aportacion(
        ingresos_mensuales=datos["ingresos_mensuales"],
        gastos_fijos_mensuales=datos["gastos_fijos_mensuales"],
        deuda_cuota_mensual=datos.get("deuda_cuota_mensual", 0.0),
        etapa=etapa_info["etapa"],
        colchon_pct=datos.get("colchon_pct", COLCHON_PCT_DEFAULT),
        gap=gap,
        plazo_meses=datos["objetivo_plazo_meses"],
    )

    # -- Distribucion (SS3) --
    distribucion = calcular_distribucion(
        perfil_riesgo=datos["perfil_riesgo"],
        plazo_meses=datos["objetivo_plazo_meses"],
    )

    resultado = {
        "conversion_moneda": conversion,
        "gap": gap,
        "etapa": etapa_info,
        "aportacion": aportacion,
        "distribucion": distribucion,
        "escenarios_inviabilidad": None,
    }

    # -- Inviabilidad (SS4), solo si corresponde --
    if not aportacion["viable"]:
        resultado["escenarios_inviabilidad"] = calcular_escenarios_inviabilidad(
            gap=gap,
            plazo_meses=datos["objetivo_plazo_meses"],
            aporte_maximo_sostenible=aportacion["aporte_maximo_sostenible"],
            ahorro_actual=ahorro_actual,
        )

    return resultado
