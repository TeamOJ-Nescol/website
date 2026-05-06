import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PromoBanner2Props {
  message?: string;
  discount?: string;
  link?: string;
  linkText?: string;
  className?: string;
}

const PromoBanner2 = ({
  message = "Built by team OJ",
  discount = "Welcome back or first time idk??",
  link = "/dashboard",
  linkText = "Dashboard",
  className,
}: PromoBanner2Props) => {
  return (
    <div className={cn("w-full bg-primary text-primary-foreground", className)}>
      <div className="container py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm">
          <span className="font-semibold">{message}</span>
          <span className="hidden sm:inline">·</span>
          <span>{discount}</span>
          <a
            href={link}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-4 hover:no-underline"
          >
            {linkText}
            <ArrowRight className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

export { PromoBanner2 };
