import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crearCliente } from "../actions";

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="font-display text-2xl font-semibold">Nuevo cliente</h1>
      <form action={crearCliente} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required placeholder="Nombre del cliente" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (opcional)</Label>
          <Input id="email" name="email" type="email" placeholder="cliente@ejemplo.com" />
        </div>
        <Button type="submit" className="w-full">
          Crear cliente y generar enlace
        </Button>
      </form>
    </div>
  );
}
