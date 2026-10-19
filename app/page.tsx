import PageShell from "@/components/layout/PageShell";
import BotChainGate from "@/components/botchain/BotChainGate";
import LockForm from "@/components/ironbox/LockForm";
import { NAV } from "@/lib/nav";

export const metadata = {
  title: "Lock BOT — Ironbox",
  description: "Lock BOT until a date. No early withdrawal, for anyone.",
};

export default function Home() {
  return (
    <PageShell
      nav={NAV}
      title="Lock BOT"
      description="Lock BOT for a beneficiary address until a specified date. No early withdrawal, for anyone."
    >
      <BotChainGate noWalletNote="Viewing a lock by ID still works without a wallet.">
        <LockForm />
      </BotChainGate>
    </PageShell>
  );
}
