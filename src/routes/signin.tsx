import { AuthForm } from "@/components/AuthForm";
import { useHead } from "@/hooks/useHead";

export function SignIn() {
  useHead({
    title: "Sign in — Flight Price Notifier",
    description: "Sign in to manage your flight price alerts.",
  });
  return <AuthForm mode="signin" />;
}
