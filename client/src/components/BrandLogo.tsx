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
  const markSize = compact ? "h-10 w-11" : showTagline ? "h-[3.9rem] w-[4.5rem]" : "h-13 w-15";
  const titleSize = compact ? "text-[1.4rem]" : showTagline ? "text-[2rem]" : "text-[1.75rem]";
  const titleTone = inverted ? "text-white" : "text-[#0F3D2E]";
  const taglineTone = inverted ? "text-white/72" : "text-[#266B3D]";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`flex shrink-0 items-center justify-center ${markSize} ${markClassName}`}>
        <img
          src={inverted ? "/lumi-educa-mark-inverted.png" : "/lumi-educa-mark.png"}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
      <span className={`min-w-0 ${textClassName}`}>
        <span
          className={`block whitespace-nowrap font-[500] leading-none tracking-normal ${titleSize} ${titleTone}`}
          style={{ fontFamily: '"Century Gothic", "Aptos Display", "Trebuchet MS", sans-serif' }}
        >
          Lumi <span className={inverted ? "text-[#F4C430]" : "text-[#63A936]"}>educa</span>
        </span>
        {showTagline ? (
          <span className={`mt-1.5 block text-[0.67rem] font-semibold uppercase tracking-normal ${taglineTone}`}>
            Autoria estudantil
          </span>
        ) : null}
      </span>
    </div>
  );
}
