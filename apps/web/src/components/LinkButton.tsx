import { Link, type LinkProps } from "react-router-dom";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "./Button";

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** A react-router Link styled identically to Button — for CTAs that navigate rather
 * than submit, so "Book a session" and "Create account" look like the same design
 * language whether they're an <a> or a <button> under the hood. */
export function LinkButton({ variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClassName(variant, size, className)} {...props} />;
}
