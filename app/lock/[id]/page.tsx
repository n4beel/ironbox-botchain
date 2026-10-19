import PageShell from "@/components/layout/PageShell";
import LockView from "@/components/ironbox/LockView";
import { NAV } from "@/lib/nav";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  return {
    title: `Lock #${id} — Ironbox`,
    description: `Details and status for Ironbox Lock #${id} on BOT Chain.`,
  };
}

export default async function LockDetailsPage({ params }: Params) {
  const { id } = await params;

  return (
    <PageShell
      nav={NAV}
      title={`Lock #${id}`}
      description="Permanent time-locked deposit on BOT Chain."
    >
      <LockView id={id} />
    </PageShell>
  );
}
