import Image from "next/image";

export function RegistrationBranding() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_37%_46%,#1d7afc_0%,#0c66e4_48%,#0747a6_100%)] px-12 py-10 text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-[#85b8ff]/35 blur-3xl" />

      <Image
        src="/output-onlinepngtools.png"
        alt="Kanvero"
        width={230}
        height={74}
        priority
        className="relative h-auto w-[154px] object-contain object-left"
      />

      <div className="relative flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[382px] -translate-x-8 rounded-[13px] bg-white p-8 shadow-[0_24px_65px_rgba(9,30,66,0.28)]">
          <Image
            src="/image 2.svg"
            alt="A visual workflow of connected Kanvero cards"
            width={896}
            height={1200}
            priority
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="relative max-w-[470px] pb-1">
        <blockquote className="text-[24px] font-semibold leading-[1.35] tracking-[-0.02em]">
          “Kanvero transformed how our team collaborates. It&apos;s the digital
          canvas we didn&apos;t know we needed.”
        </blockquote>
        <p className="mt-4 text-[15px] text-white/75">
          Join thousands of teams shipping faster.
        </p>
      </div>
    </aside>
  );
}
