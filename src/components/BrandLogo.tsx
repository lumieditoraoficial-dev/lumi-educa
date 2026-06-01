type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
  inverted?: boolean;
  compact?: boolean;
};

export default function BrandLogo({
  className = "",
  markClassName = "",
  textClassName = "",
  showTagline = false,
  inverted = false,
  compact = false,
}: BrandLogoProps) {
  const textColor = inverted ? "text-[#F7F3E9]" : "text-[#0F3D2E]";
  const taglineColor = inverted ? "text-[#BDE3A1]" : "text-[#6DB33F]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[#0F3D2E] shadow-sm ${markClassName}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="h-9 w-9" role="img">
          <path
            d="M34 50c15-7 22-19 21-36-13 4-24 14-27 27 2 2 4 5 6 9Z"
            fill="#6DB33F"
          />
          <path
            d="M29 45c2-16 11-28 26-35-15 1-29 11-35 25 2 4 5 7 9 10Z"
            fill="#F4C430"
          />
          <path d="M28 46c8-6 15-14 22-25-4 14-12 24-22 29v-4Z" fill="#266B3D" opacity=".9" />
        </svg>
      </span>
      <span className="leading-none">
        <span
          className={`block font-semibold tracking-normal ${textColor} ${
            compact ? "text-xl" : "text-2xl"
          } ${textClassName}`}
        >
          Lumi Educa
        </span>
        {showTagline ? (
          <span className={`mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.42em] ${taglineColor}`}>
            Educacao
          </span>
        ) : null}
      </span>
    </div>
  );
}
