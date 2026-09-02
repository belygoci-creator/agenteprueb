import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/clientes/nuevo" className="font-display text-lg font-semibold">
              asesor-financiero
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard/clientes/nuevo" className="text-muted-foreground hover:text-foreground">
                Nuevo cliente
              </Link>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Ver clientes
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
