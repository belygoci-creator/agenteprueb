import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl font-semibold">asesor-financiero</h1>
      <p className="max-w-md text-muted-foreground">
        Diagnóstico y recomendación financiera para tus clientes, en una
        conversación guiada.
      </p>
      <Button asChild>
        <Link href="/dashboard">Entrar al dashboard</Link>
      </Button>
    </main>
  );
}
