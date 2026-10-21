"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

export type NavItem = { href: string; label: string };

interface PageShellProps {
  children: React.ReactNode;
  nav?: NavItem[];
  title?: string;
  description?: string;
}

/**
 * Plate shell: a heavy banded header over a narrow centred column.
 *
 * Ironbox does one irreversible thing, so the page is deliberately plain and heavy — a thick
 * rule under a banded header, a single 620px column, and a standing warning in the footer rather
 * than tucked beside a button. The weight is the message: this is not an interface you skim.
 */
export default function PageShell({ children, nav = [], title, description }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <header
        className="flex-shrink-0"
        style={{ background: "#0B0E12", borderBottom: "3px solid var(--border-strong)" }}
      >
        <div
          className="mx-auto w-full px-6 py-4 flex items-center justify-between gap-4"
          style={{ maxWidth: "860px" }}
        >
          <Link href="/" className="flex items-center gap-3 no-underline">
            <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: "21px", height: "21px" }}>
              <rect x="16" y="16" width="68" height="68" fill="none" stroke="var(--accent)" strokeWidth="9" />
              <rect x="40" y="40" width="20" height="20" fill="var(--accent)" />
            </svg>
            <span className="text-[20px] font-bold uppercase tracking-[0.1em]">{app.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div style={{ width: "160px" }}><ConnectButton /></div>
          </div>
        </div>

        {nav.length > 1 && (
          <div className="mx-auto w-full px-6" style={{ maxWidth: "860px" }}>
            <nav className="flex items-center gap-6 pb-3">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="nav-link text-[13px] uppercase tracking-[0.1em] no-underline"
                    style={{
                      color: active ? "var(--accent)" : "var(--text-tertiary)",
                      borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                      paddingBottom: "4px",
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full px-6 py-9" style={{ maxWidth: "620px" }}>
        {title && (
          <h1 className="text-[30px] md:text-[34px]" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
        )}
        {description && (
          <p className="mt-3 text-[15px]" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
        <div className={title || description ? "mt-7" : ""}>{children}</div>
      </main>

      <footer
        className="flex-shrink-0 mx-auto w-full px-6 py-6"
        style={{ maxWidth: "620px", borderTop: "1px solid var(--border-default)" }}
      >
        {/* The warning stands in the footer rather than beside a button, because it is true of
            the whole product and not of one control. */}
        <p
          className="text-[12px] uppercase tracking-[0.08em] mb-3"
          style={{ color: "var(--warning)" }}
        >
          A lock cannot be cancelled, shortened or reversed by anyone
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
          <BuiltOnBotChain style={{ color: "var(--text-secondary)" }} />
          <a href="https://botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>botchain.ai</a>
          <a href="https://scan.botchain.ai" target="_blank" rel="noreferrer" style={{ color: "var(--text-tertiary)" }}>BOT Chain Explorer</a>
        </div>
      </footer>
    </div>
  );
}
