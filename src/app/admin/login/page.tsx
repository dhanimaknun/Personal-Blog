import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  if (await getSession()) redirect(searchParams.from || "/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[320px]">
        <h1 className="text-center font-display text-[22px] font-light tracking-tight text-ink">
          THE JOURNAL
        </h1>
        <p className="mt-1 text-center text-[13px] text-secondary">Sign in to write</p>
        <div className="mt-10">
          <LoginForm from={searchParams.from} />
        </div>
      </div>
    </div>
  );
}
