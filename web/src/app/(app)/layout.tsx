import { SiteHeader } from "@/components/SiteChrome";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader authed email={user.email} />
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-4">{children}</div>
    </>
  );
}
