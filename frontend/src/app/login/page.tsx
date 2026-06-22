import type { Metadata } from "next";
import LoginForm from "./LoginForm";

import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("loginTitle"),
    description: t("loginDescription"),
  };
}

export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}
