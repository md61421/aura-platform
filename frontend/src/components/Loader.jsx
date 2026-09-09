import { useId } from "react";

const SIZES = {
  xs: {
    spinner: "w-4 h-4",
    trackWidth: 3.5,
    text: "text-xs font-medium",
    gap: "gap-2",
  },
  sm: {
    spinner: "w-6 h-6",
    trackWidth: 3.5,
    text: "text-xs font-medium",
    gap: "gap-2.5",
  },
  md: {
    spinner: "w-9 h-9",
    trackWidth: 3.5,
    text: "text-sm font-semibold",
    gap: "gap-3",
  },
  lg: {
    spinner: "w-12 h-12",
    trackWidth: 3.5,
    text: "text-base font-semibold",
    gap: "gap-3.5",
  },
  xl: {
    spinner: "w-16 h-16",
    trackWidth: 3.5,
    text: "text-lg font-bold",
    gap: "gap-4",
  },
};

export default function Loader({
  size = "md",
  text = null,
  fullPage = false,
  minHeight = "",
  inline = false,
  variant = "brand",
  showAuraGlow = true,
  className = "",
}) {
  const reactId = useId();
  const gradientId = `aura-spin-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const config = SIZES[size] || SIZES.md;

  const isDark = variant === "dark";
  const isWhite = variant === "white";

  const textColor = isDark
    ? "text-slate-200"
    : isWhite
    ? "text-white"
    : "text-slate-700";

  const trackColor = isDark
    ? "rgba(148, 163, 184, 0.2)"
    : isWhite
    ? "rgba(255, 255, 255, 0.25)"
    : "rgba(14, 165, 233, 0.15)";

  const glowColor = isDark
    ? "bg-cyan-500/20"
    : isWhite
    ? "bg-white/20"
    : "bg-brand-500/20";

  const spinnerSvg = (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      {showAuraGlow && !inline && size !== "xs" && (
        <div
          className={`absolute -inset-2 rounded-full blur-lg pointer-events-none opacity-70 ${glowColor}`}
          style={{ animation: "subtlePulse 2.5s ease-in-out infinite" }}
        />
      )}
      <svg
        className={`${config.spinner} animate-aura-spin relative z-10`}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {isDark ? (
              <>
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#06b6d4" />
              </>
            ) : isWhite ? (
              <>
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.65)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Outer subtle circular track */}
        <circle
          cx="24"
          cy="24"
          r="19"
          stroke={trackColor}
          strokeWidth={config.trackWidth}
          fill="none"
        />

        {/* Foreground active rotating arc */}
        <circle
          cx="24"
          cy="24"
          r="19"
          stroke={`url(#${gradientId})`}
          strokeWidth={config.trackWidth}
          strokeLinecap="round"
          strokeDasharray="56 80"
          fill="none"
        />

        {/* Center focal dot */}
        {size !== "xs" && (
          <circle
            cx="24"
            cy="24"
            r="2.25"
            className={
              isDark
                ? "fill-cyan-400"
                : isWhite
                ? "fill-white"
                : "fill-brand-500"
            }
            opacity="0.85"
          />
        )}
      </svg>
    </div>
  );

  if (inline) {
    return (
      <span
        className={`inline-flex items-center ${config.gap} ${className}`}
        role="status"
        aria-live="polite"
      >
        {spinnerSvg}
        {text && <span className={`${config.text} ${textColor}`}>{text}</span>}
      </span>
    );
  }

  const containerHeight =
    minHeight || (fullPage ? "min-h-[55vh]" : "py-12");

  return (
    <div
      className={`animate-fade-in flex flex-col items-center justify-center text-center px-4 ${containerHeight} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className={`flex flex-col items-center ${config.gap}`}>
        {spinnerSvg}
        {text && (
          <p className={`${config.text} ${textColor} tracking-tight`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

export function PageLoader({
  text = "Loading...",
  size = "lg",
  ...props
}) {
  return (
    <Loader
      fullPage
      size={size}
      text={text}
      {...props}
    />
  );
}

export function InlineLoader({
  size = "xs",
  variant = "brand",
  ...props
}) {
  return (
    <Loader
      inline
      size={size}
      variant={variant}
      {...props}
    />
  );
}
