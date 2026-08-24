"""
Endpoint serverless (Vercel, Python) del motor de calculo.

Convencion de Vercel para funciones Python en /api: un archivo .py que
define una clase de nivel superior llamada `handler`, heredando de
BaseHTTPRequestHandler. Este archivo es solo el adaptador HTTP -- toda la
logica de negocio vive en _motor_calculo.py (no se toca aca) y sigue
1 a 1 lo definido en reglas-recomendacion.md.

Se llama desde un route handler de Next.js (server-side) al cerrar la
entrevista, con el body = los datos de la ficha ya recolectados.

Respuestas:
- 200 { ...resultado de calcular_recomendacion } -- calculo completo.
- 200 { "bloqueado": true, "motivo": "..." } -- falta un dato indispensable
  o no se pudo resolver el tipo de cambio (SS6). Es un estado de negocio
  esperado, no un error de servidor: nunca se estima el dato faltante.
- 400 { "error": "..." } -- body invalido (JSON mal formado o campos
  requeridos ausentes).
"""

import json
import math
from http.server import BaseHTTPRequestHandler

from _motor_calculo import CalculoBloqueado, calcular_recomendacion


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"

        try:
            datos = json.loads(raw_body)
        except json.JSONDecodeError:
            self._responder(400, {"error": "Body invalido: se esperaba JSON."})
            return

        try:
            resultado = calcular_recomendacion(datos)
        except CalculoBloqueado as exc:
            self._responder(200, {"bloqueado": True, "motivo": str(exc)})
            return
        except KeyError as exc:
            self._responder(400, {"error": f"Falta el campo requerido: {exc}"})
            return

        self._responder(200, resultado)

    def _responder(self, status: int, payload: dict):
        body = json.dumps(_sanear_no_finitos(payload), ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def _sanear_no_finitos(valor):
    """Python permite Infinity/-Infinity/NaN en json.dumps por defecto, pero
    no son JSON valido (RFC 8259) -- JSON.parse del lado de Next.js los
    rechaza. El motor usa float('inf') a proposito para representar "no
    calculable" (ver SS4 de reglas-recomendacion.md); aca se convierte a
    null antes de serializar, sin tocar la logica de calculo.
    """
    if isinstance(valor, float) and not math.isfinite(valor):
        return None
    if isinstance(valor, dict):
        return {k: _sanear_no_finitos(v) for k, v in valor.items()}
    if isinstance(valor, list):
        return [_sanear_no_finitos(v) for v in valor]
    return valor
