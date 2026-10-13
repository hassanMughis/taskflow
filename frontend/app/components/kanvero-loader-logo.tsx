export function KanveroLoaderLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 455 104"
      role="img"
      aria-label="Kanvero"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="currentColor">
        <path className="kanvero-logo-piece kanvero-logo-top" d="M14 8h82L76 31H14z" opacity=".86" />
        <path className="kanvero-logo-piece kanvero-logo-center" d="M0 42a6 6 0 0 1 6-6h63L101 0h31L88 51l47 53h-32L68 63H6a6 6 0 0 1-6-6z" />
        <path className="kanvero-logo-piece kanvero-logo-bottom" d="M14 70h61l22 26H14z" opacity=".86" />
      </g>
      <text
        className="kanvero-logo-word"
        x="154"
        y="72"
        fill="currentColor"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="54"
        fontWeight="600"
        letterSpacing="3"
      >
        KANVERO
      </text>
    </svg>
  );
}
