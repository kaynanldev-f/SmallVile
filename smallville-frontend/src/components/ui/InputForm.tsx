"use client";

import clsx from "clsx";
import { InputMask, type MaskOptions } from "@react-input/mask";

interface InputFormProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasIcon?: boolean;
  error?: string;

  mask?: MaskOptions["mask"];
  replacement?: MaskOptions["replacement"];
  showMask?: boolean;
}

export default function InputForm({
  error,
  hasIcon,
  mask,
  replacement,
  showMask = false,
  className,
  ...props
}: InputFormProps) {
  const inputClassName = clsx(
    "w-full px-4 py-3 rounded-lg bg-grayScale-700 text-grayScale-200 placeholder-grayScale-400 text-sm focus:outline-none",
    hasIcon
      ? "border-none"
      : "border border-grayScale-400 focus:border-red-cinema transition-all",
    className, // <-- adiciona as classes vindas do componente pai
  );

  if (mask) {
    return (
      <InputMask
        component="input"
        mask={mask}
        replacement={replacement}
        showMask={showMask}
        className={inputClassName}
        {...props}
      />
    );
  }

  return <input {...props} className={inputClassName} />;
}
