import { connection } from "next/server";
import { notFound } from "next/navigation";
import { isAdminEnabled } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!isAdminEnabled()) notFound();
  return children;
}
