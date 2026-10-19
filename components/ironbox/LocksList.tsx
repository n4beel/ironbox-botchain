"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther, type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import Panel from "@/components/ui/Panel";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";
import { activeBotChain, isBotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { ironboxAbi } from "@/lib/botchain/abi";
import { formatUnlockAt } from "@/lib/ironbox";

// The chain's own symbol. Hardcoding "BOT" labelled every testnet amount as mainnet
// currency, which is the confusion the network badge exists to prevent.
const SYMBOL = activeBotChain.nativeCurrency.symbol;

type LockEventItem = {
  id: bigint;
  sender: Address;
  beneficiary: Address;
  unlockAt: number;
  amount: bigint;
  block: bigint;
  hash: Hex;
};

export default function LocksList() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const client = usePublicClient(); // stable-hook-result

  const [locks, setLocks] = useState<LockEventItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !address || !isBotChainId(chainId) || !isDeployed(chainId)) {
      setLocks(null);
      return;
    }

    let cancelled = false;
    setLocks(null);
    setError(null);

    const deployment = getDeployment(chainId);

    Promise.all([
      client.getContractEvents({
        address: deployment.address,
        abi: ironboxAbi,
        eventName: "Locked",
        args: { beneficiary: address },
        fromBlock: deployment.deployBlock,
        toBlock: "latest",
      }),
      client.getContractEvents({
        address: deployment.address,
        abi: ironboxAbi,
        eventName: "Locked",
        args: { sender: address },
        fromBlock: deployment.deployBlock,
        toBlock: "latest",
      }),
    ])
      .then(([asBeneficiary, asSender]) => {
        if (cancelled) return;

        const allLogs = [...asBeneficiary, ...asSender];
        const byId = new Map<bigint, LockEventItem>();

        for (const log of allLogs) {
          const id = log.args.id as bigint;
          if (!byId.has(id)) {
            byId.set(id, {
              id,
              sender: log.args.sender as Address,
              beneficiary: log.args.beneficiary as Address,
              unlockAt: Number(log.args.unlockAt),
              amount: log.args.amount as bigint,
              block: log.blockNumber,
              hash: log.transactionHash,
            });
          }
        }

        // Sort descending by ID (newest first)
        const sorted = Array.from(byId.values()).sort((a, b) => (b.id > a.id ? 1 : -1));
        setLocks(sorted);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not read locks from the chain. Please reload to try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [client, address, chainId]);

  if (!isConnected) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Connect a wallet to view its locked funds.
        </p>
      </Panel>
    );
  }

  if (!isBotChainId(chainId) || !isDeployed(chainId)) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
          Contract is not configured for this network.
        </p>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <p className="text-[12px]" style={{ color: "var(--warning)" }}>
          {error}
        </p>
      </Panel>
    );
  }

  if (locks === null) {
    return (
      <Panel>
        <Spinner label="Scanning chain logs for your locks..." />
      </Panel>
    );
  }

  if (locks.length === 0) {
    return (
      <Panel>
        <div className="flex flex-col gap-3">
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            No locks found for this address as sender or beneficiary.
          </p>
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.04em] underline"
            style={{ color: "var(--accent)" }}
          >
            Create your first lock →
          </Link>
        </div>
      </Panel>
    );
  }

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="flex flex-col gap-3">
      {locks.map((item) => {
        const isBeneficiary = address?.toLowerCase() === item.beneficiary.toLowerCase();
        const isSender = address?.toLowerCase() === item.sender.toLowerCase();
        const unlocked = now >= item.unlockAt;

        return (
          <Panel key={item.id.toString()}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Lock #{item.id.toString()}
                  </span>
                  <Badge variant={unlocked ? "confirmed" : "pending"}>
                    {unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
                <span className="font-mono text-[14px] font-semibold" style={{ color: "var(--accent)" }}>
                  {formatEther(item.amount)} {SYMBOL}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Role: </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {isBeneficiary && isSender
                      ? "Self-locked"
                      : isBeneficiary
                        ? "Beneficiary (recipient)"
                        : "Sender (creator)"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Unlocks: </span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {formatUnlockAt(item.unlockAt)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Block {item.block.toString()}
                </span>
                <Link
                  href={`/lock/${item.id.toString()}`}
                  className="text-[11px] uppercase tracking-[0.04em] underline font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  View Details & Status →
                </Link>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
