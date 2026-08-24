"""Servidor local de desarrollo para motor-calculo.py.

Uso: python api/_run_local_server.py
Despues, en .env.local: MOTOR_CALCULO_URL=http://localhost:8001

Solo para desarrollo con `next dev`. No se usa en produccion -- ahi Vercel
sirve motor-calculo.py directamente junto con el resto de la app (ver
docs/architecture.md). Con `vercel dev` tampoco hace falta este script.
"""
import importlib.util
from http.server import HTTPServer

spec = importlib.util.spec_from_file_location("motor_calculo_endpoint", "motor-calculo.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

server = HTTPServer(("localhost", 8001), mod.handler)
print("Motor de calculo escuchando en http://localhost:8001")
server.serve_forever()
