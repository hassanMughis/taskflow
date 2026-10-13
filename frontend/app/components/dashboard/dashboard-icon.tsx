type IconName =
  | "bell"
  | "calendar"
  | "check"
  | "chevron-right"
  | "ellipsis"
  | "grid"
  | "help"
  | "history"
  | "home"
  | "plus"
  | "rocket"
  | "search"
  | "settings"
  | "star"
  | "tasks"
  | "x"
  | "megaphone";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

export function Icon({ name, size = 20, className }: IconProps) {
  const commonProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
    width: size,
  };

  const paths = {
    bell: <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    ellipsis: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    help: <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.3 2.3 0 1 1 4.3 1.2c-.8 1.1-2.1 1.3-2.1 2.8M12 17h.01" />
    </>,
    history: <>
      <path d="M3 12a9 9 0 1 0 9-9 9.1 9.1 0 0 0-6.4 2.6L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>,
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    rocket: <>
      <path d="M14 4c2.5-2 5.4-2 6-2 .1.6 0 3.5-2 6l-5.4 5.4-4-4L14 4Z" />
      <path d="m8.6 9.4-4 1L2 14l4.6.6M14.6 15.4l-1 4L10 22l-.6-4.6M7.5 16.5l-2.2 2.2M9 15l-2-2" />
    </>,
    search: <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>,
    settings: <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.1 2.1-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.6v.2h-3v-.2a1.8 1.8 0 0 0-1.1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1-2.1-2.1.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1.1H5v-3h.2a1.8 1.8 0 0 0 1.6-1.1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.1-2.1.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.6V4h3v.2a1.8 1.8 0 0 0 1.1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1 2.1 2.1-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1.1h.2v3H21a1.8 1.8 0 0 0-1.6 1.4Z" />
    </>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    tasks: <>
      <rect x="5" y="4" width="14" height="17" rx="1.5" />
      <path d="M9 4V2M15 4V2M8 10h8M8 14h8M8 18h4" />
    </>,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    megaphone: <>
      <path d="M4 14h3l9 4V6l-9 4H4v4ZM7 14l1.5 5" />
      <path d="M19 9a4 4 0 0 1 0 6" />
    </>,
  } satisfies Record<IconName, React.ReactNode>;

  return <svg {...commonProps}>{paths[name]}</svg>;
}
