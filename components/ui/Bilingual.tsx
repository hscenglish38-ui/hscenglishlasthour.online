type BilingualProps = {
  bn: string;
  en: string;
  className?: string;
};

/**
 * Renders a bilingual label as "বাংলা / English". The Bangla part uses the
 * Bangla font stack (`--font-bn`); a muted slash separates the two languages.
 * Screen readers announce the full "বাংলা / English" text.
 */
export function Bilingual({ bn, en, className = "" }: BilingualProps) {
  return (
    <span className={className}>
      <span lang="bn" className="bn">
        {bn}
      </span>
      <span aria-hidden="true" className="mx-1 text-[var(--ink-muted)] opacity-70">
        /
      </span>
      <span lang="en">{en}</span>
    </span>
  );
}
