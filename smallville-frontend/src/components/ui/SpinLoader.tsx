import clsx from "clsx";

interface SpinLoaderProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white";
  className?: string;
}

export default function SpinLoader({
  size = "md",
  color = "primary",
  className,
}: SpinLoaderProps) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-[3px]",
    lg: "h-12 w-12 border-4",
  };

  const colors = {
    primary: "border-red-cinema border-t-transparent",
    white: "border-white border-t-transparent",
  };

  return (
    <div
      className={clsx(
        "animate-spin rounded-full",
        sizes[size],
        colors[color],
        className,
      )}
    />
  );
}
