"""
Tests del motor de calculo -- paridad con los casos reales ya generados
(ver docs/testing.md). El caso de Maribel es el fixture de referencia:
ficha-maribel.md / recomendacion-maribel.md en la carpeta del asesor.
"""

import pytest

from _motor_calculo import CalculoBloqueado, calcular_recomendacion, calcular_distribucion


def test_maribel_fondo_emergencia_incompleto_bloquea_inversion():
    resultado = calcular_recomendacion({
        "ingresos_mensuales": 700_000,
        "gastos_fijos_mensuales": 500_000,
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
        "tipo_cambio": {"valor": 1540, "fecha": "2026-08-12", "fuente": "prueba"},
        "colchon_pct": 0.15,
    })

    assert resultado["etapa"]["etapa"] == "fondo_emergencia"
    assert resultado["etapa"]["fondo_emergencia_minimo_meses"] == 6
    assert resultado["gap"] == pytest.approx(7_700_000)
    assert resultado["aportacion"]["aporte_maximo_sostenible"] == 0.0
    assert resultado["aportacion"]["aporte_necesario"] == pytest.approx(962_500)
    assert resultado["aportacion"]["viable"] is False
    # Distribucion recomendada tal cual recomendacion-maribel.md SS4:
    # perfil moderado (50/20/30) recortado a plazo < 12 meses -> renta variable 0%.
    dist = resultado["distribucion"]["distribucion_recomendada"]
    assert dist["renta_variable"] == 0
    assert dist["renta_fija"] == pytest.approx(71.4, abs=0.1)
    assert dist["liquidez"] == pytest.approx(28.6, abs=0.1)


def test_conversion_moneda_bloqueada_sin_tipo_de_cambio():
    with pytest.raises(CalculoBloqueado):
        calcular_recomendacion({
            "ingresos_mensuales": 700_000,
            "gastos_fijos_mensuales": 500_000,
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
            # sin tipo_cambio: debe bloquearse, nunca estimar
        })


def test_deuda_cara_bloquea_inversion_aunque_fondo_este_completo():
    resultado = calcular_recomendacion({
        "ingresos_mensuales": 500_000,
        "gastos_fijos_mensuales": 300_000,
        "deuda_cuota_mensual": 20_000,
        "deuda_tasa_interes": 45.0,
        "estabilidad_laboral": "estable",
        "fondo_emergencia_meses_actual": 4,
        "ahorro_actual": 100_000,
        "objetivo_monto": 1_000_000,
        "objetivo_moneda": "ARS",
        "flujo_moneda": "ARS",
        "objetivo_plazo_meses": 24,
        "perfil_riesgo": "conservador",
    })

    assert resultado["etapa"]["etapa"] == "deuda_cara"
    assert resultado["aportacion"]["aporte_maximo_sostenible"] == 0.0


def test_meta_viable_sin_bloqueos():
    resultado = calcular_recomendacion({
        "ingresos_mensuales": 1_000_000,
        "gastos_fijos_mensuales": 500_000,
        "deuda_cuota_mensual": 0,
        "deuda_tasa_interes": None,
        "estabilidad_laboral": "estable",
        "fondo_emergencia_meses_actual": 6,
        "ahorro_actual": 0,
        "objetivo_monto": 1_000_000,
        "objetivo_moneda": "ARS",
        "flujo_moneda": "ARS",
        "objetivo_plazo_meses": 12,
        "perfil_riesgo": "dinamico",
    })

    assert resultado["etapa"]["etapa"] == "inversion"
    assert resultado["aportacion"]["viable"] is True
    assert resultado["escenarios_inviabilidad"] is None


def test_distribucion_recorta_renta_variable_segun_plazo():
    # Perfil dinamico (30/10/60), plazo 24 meses -> tope absoluto 20%.
    dist = calcular_distribucion("dinamico", 24)["distribucion_recomendada"]
    assert dist["renta_variable"] == 20
    assert dist["renta_fija"] + dist["liquidez"] + dist["renta_variable"] == pytest.approx(100, abs=0.1)


def test_perfil_riesgo_invalido_bloquea():
    with pytest.raises(CalculoBloqueado):
        calcular_distribucion("agresivo", 12)
