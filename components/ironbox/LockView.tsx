"use client";

import { useMemo } from "react";
import { formatEther, type Address } from "viem";
import { useChainId, useReadContract } from "wagmi";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { addressUrl, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { ironboxAbi } from "@/lib/botchain/abi";
import { formatUnlockAt, isUnlocked, type IronboxLock } from "@/lib/ironbox";
import WithdrawButton from "./WithdrawButton";

export default function LockView({ id }: { id: string | bigint }) {
  const chainId = useChainId();
  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

  const numericId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const read = useReadContract({
    address: deployment?.address,
    abi: ironboxAbi,
    functionName: "lockOf",
    args: numericId !== null ? [numericId] : undefined,
    query: {
      enabled: Boolean(deployment && numericId !== null && numericId > 0n),
    },
  });

  if (numericId === null || numericId <= 0n) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--danger)" }}>
          Invalid lock ID.
        </p>
      </Panel>
    );
  }

  if (!deployment || !isBotChainId(chainId)) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Contract not deployed on this network.
        </p>
      </Panel>
    );
  }

  // §3.10: Distinguish unknown from empty / not found
  if (read.isLoading) {
    return (
      <Panel>
        <Spinner label={`Loading lock #${numericId.toString()}...`} />
      </Panel>
    );
  }

  if (read.isError) {
    return (
      <Panel>
        <div className="flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: "var(--danger)" }}>
            Could not load lock. Failed to read from chain.
          </p>
          <button
            type="button"
            onClick={() => void read.refetch()}
            className="text-[11px] underline self-start cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            Retry read
          </button>
        </div>
      </Panel>
    );
  }

  const data = read.data;
  if (!data || data.beneficiary === "0x0000000000000000000000000000000000000000") {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Lock #{numericId.toString()} not found. It may not exist on this chain.
        </p>
      </Panel>
    );
  }

  const lock: IronboxLock = {
    beneficiary: data.beneficiary as Address,
    unlockAt: Number(data.unlockAt),
    withdrawn: data.withdrawn,
    amount: data.amount,
  };

  const unlocked = isUnlocked(lock);

  const statusVariant = lock.withdrawn
    ? "default"
    : unlocked
      ? "confirmed"
      : "pending";

  const statusLabel = lock.withdrawn
    ? "Withdrawn"
    : unlocked
      ? "Unlocked"
      : "Locked";

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className="text-[14px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--text-primary)" }}
            >
              Lock #{numericId.toString()}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                Amount Locked
              </span>
              <span
                className="text-[18px] font-semibold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {formatEther(lock.amount)} BOT
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                className="text-[10px] uppercase tracking-[0.06em]"
                style={{ color: "var(--text-secondary)" }}
              >
                Unlock Date (UTC)
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {formatUnlockAt(lock.unlockAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <span
              className="text-[10px] uppercase tracking-[0.06em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Beneficiary
            </span>
            <a
              href={addressUrl(chainId, lock.beneficiary)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[12px] break-all underline"
              style={{ color: "var(--text-primary)" }}
            >
              {lock.beneficiary}
            </a>
          </div>

          <div className="text-[11px] leading-relaxed pt-2" style={{ color: "var(--text-tertiary)" }}>
            {lock.withdrawn ? (
              <p>This deposit has been claimed by the beneficiary.</p>
            ) : unlocked ? (
              <p style={{ color: "var(--success)" }}>
                This lock has reached its unlock date and is ready for withdrawal by the beneficiary.
              </p>
            ) : (
              <p>
                Funds are locked until {formatUnlockAt(lock.unlockAt)}. No early withdrawal is possible.
              </p>
            )}
          </div>
        </div>
      </Panel>

      {!lock.withdrawn && unlocked && (
        <Panel>
          <div className="flex flex-col gap-2">
            <span
              className="text-[11px] uppercase tracking-[0.04em] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Withdraw Funds
            </span>
            <WithdrawButton
              id={numericId}
              beneficiary={lock.beneficiary}
              onSuccess={() => void read.refetch()}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
