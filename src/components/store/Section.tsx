import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; to: "/ofertas" | "/categoria/$cat"; params?: { cat: string } };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2 text-gold">{eyebrow}</p>}
        <h2 className="text-4xl sm:text-5xl">{title}</h2>
      </div>
      {action && (
        <Link
          to={action.to}
          params={action.params as never}
          className="group inline-flex items-center gap-1.5 text-sm font-medium underline decoration-gold underline-offset-4"
        >
          {action.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export function Section({ children, tone = "plain", id }: { children: ReactNode; tone?: "plain" | "blush"; id?: string }) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${tone === "blush" ? "bg-blush" : ""}`}>
      <div className="container-store">{children}</div>
    </section>
  );
}
