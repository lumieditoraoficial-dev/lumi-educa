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
  const imageSize = compact ? "h-9 max-w-[168px]" : showTagline ? "h-16 max-w-[260px]" : "h-14 max-w-[230px]";
  const imageTone = inverted ? "drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)]" : "";

  return (
    <div className={`flex items-center ${className}`} data-logo-mark={markClassName} data-logo-text={textClassName}>
      <img
        src="/lumi-educa-logo.png"
        alt="Lumi Educa"
        className={`block w-auto object-contain ${imageSize} ${imageTone}`}
        draggable={false}
      />
    </div>
  );
}
