import { AuthForm } from "@/components/AuthForm";
import { useHead } from "@/hooks/useHead";

export function SignUp() {
  useHead({
    title: "Sign up — Flight Price Notifier",
    description: "Create an account and get emailed when fares drop.",
  });
  return <AuthForm mode="signup" />;
}
