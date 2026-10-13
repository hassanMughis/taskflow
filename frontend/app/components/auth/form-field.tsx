type FormFieldProps = {
  id: string;
  label: string;
  type: "text" | "email";
  placeholder: string;
  autoComplete: string;
  icon: "user" | "email";
};

function FieldIcon({ icon }: { icon: FormFieldProps["icon"] }) {
  if (icon === "email") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20v-2.2c0-2.1 1.8-3.8 4-3.8h6c2.2 0 4 1.7 4 3.8V20H5Z" />
    </svg>
  );
}

export function FormField({
  id,
  label,
  type,
  placeholder,
  autoComplete,
  icon,
}: FormFieldProps) {
  return (
    <div className="space-y-1 lg:space-y-2">
      <label className="block text-sm font-medium text-[#24242a] dark:text-[#f1f2f4]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-[#7d7e90] dark:text-[#9fadbc] lg:hidden">
          <span className="h-5 w-5 [&_svg]:h-full [&_svg]:w-full [&_svg]:stroke-current [&_svg]:stroke-2 [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
            <FieldIcon icon={icon} />
          </span>
        </span>
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="block h-[42px] w-full rounded-md border border-[#b7bec8] bg-white pl-10 pr-[15px] text-base text-[#44546f] outline-none transition placeholder:text-[#626f86] hover:border-[#8590a2] focus:border-[#0c66e4] focus:shadow-[0_0_0_3px_rgba(12,102,228,0.12)] dark:border-[#626f86] dark:bg-[#1d2125] dark:text-[#f1f2f4] dark:placeholder:text-[#9fadbc] lg:h-[46px] lg:rounded-lg lg:pl-[15px] lg:text-sm lg:text-[#172b4d] lg:placeholder:text-[#626f86] lg:dark:text-[#f1f2f4] lg:dark:placeholder:text-[#9fadbc]"
        />
      </div>
    </div>
  );
}

