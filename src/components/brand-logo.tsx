import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  size = 36,
  wordmark = true,
  className,
}: {
  href?: string;
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="Postara"
        width={size}
        height={size}
        className="rounded-xl"
        priority
      />
      {wordmark ? <span className="display text-2xl tracking-tight">POSTARA</span> : null}
    </Link>
  );
}
