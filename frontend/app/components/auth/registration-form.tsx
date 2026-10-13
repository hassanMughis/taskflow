import Image from "next/image";
import Link from "next/link";
import { RegistrationFormFields } from "./registration-form-fields";

export function RegistrationForm() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-[#f5f6f7] px-4 py-12 dark:bg-[#1d1f21] lg:bg-transparent lg:px-14 lg:py-10">
      <div className="w-full max-w-[358px] rounded-xl border border-[#dddddf] bg-white px-6 pb-6 pt-12 shadow-[0_3px_5px_rgba(0,0,0,0.13)] dark:border-transparent dark:bg-transparent dark:shadow-none lg:max-w-[420px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <Image
          src="/image_3-removebg-preview.png"
          alt="Kanvero"
          width={230}
          height={74}
          priority
          className="mx-auto mb-[53px] h-auto w-[60px] object-contain dark:brightness-0 dark:invert lg:hidden"
        />

        <header className="mb-8 text-center lg:text-left">
          <h1 className="whitespace-nowrap text-[30px] font-semibold leading-tight tracking-[-0.035em] text-[#172b4d] dark:text-[#f1f2f4] sm:text-[34px] lg:text-[36px]">
            Create your account
          </h1>
          <p className="mt-2 text-[16px] text-[#44546f] dark:text-[#b6c2cf]">
            <span className="lg:hidden">Bring your team together.</span>
            <span className="hidden lg:inline">
              Bring your ideas, tasks, and team together.
            </span>
          </p>
        </header>

        <RegistrationFormFields />

        <p className="mt-7 text-center text-sm text-[#44546f] dark:text-[#b6c2cf] lg:mt-14">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#0c66e4] hover:underline dark:text-[#579dff]">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

