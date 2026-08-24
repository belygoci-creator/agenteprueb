import { createAdminClient } from "@/lib/supabase/admin";
import { Entrevista } from "./entrevista";

export default async function EntrevistaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("entrevista_tokens")
    .select("expires_at, used_at, cliente_id, clientes(nombre)")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return <MensajeError texto="Este enlace no es válido. Pedile a tu asesor uno nuevo." />;
  }
  if (tokenRow.used_at) {
    return <MensajeError texto="Este enlace ya fue usado. Si necesitás retomar, pedile a tu asesor un enlace nuevo." />;
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return <MensajeError texto="Este enlace venció. Pedile a tu asesor uno nuevo." />;
  }

  const nombre = (tokenRow.clientes as unknown as { nombre: string } | null)?.nombre ?? "";

  return <Entrevista token={token} nombreCliente={nombre} />;
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="max-w-sm text-muted-foreground">{texto}</p>
    </main>
  );
}
