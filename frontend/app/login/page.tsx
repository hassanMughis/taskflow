import { LoginForm } from "../components/auth/login-form";
import { RegistrationBranding } from "../components/auth/registration-branding";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f9] dark:bg-[#1d1f21] lg:grid lg:grid-cols-[44.5%_55.5%]">
      <RegistrationBranding />
      <LoginForm />
    </main>
  );
}

