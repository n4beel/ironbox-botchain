import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { activeBotChain, type BotChainId } from "@/lib/botchain/chain";
import { getDeployment, isDeployed } from "@/lib/botchain/deployment";
import { ironboxAbi } from "@/lib/botchain/abi";

export type IronboxLock = {
  beneficiary: Address;
  unlockAt: number; // seconds since epoch
  withdrawn: boolean;
  amount: bigint;
};

export function isUnlocked(lock: IronboxLock, now?: number): boolean {
  return (now ?? Math.floor(Date.now() / 1000)) >= lock.unlockAt;
}

export function formatUnlockAt(unlockAt: number): string {
  return new Date(unlockAt * 1000).toUTCString();
}

export function lockStatus(lock: IronboxLock): "locked" | "unlocked" | "withdrawn" {
  if (lock.withdrawn) return "withdrawn";
  if (isUnlocked(lock)) return "unlocked";
  return "locked";
}

/**
 * A client for reading Ironbox without a wallet.
 */
export function readClient(): PublicClient {
  return createPublicClient({
    chain: activeBotChain,
    transport: http(undefined, { timeout: 15_000 }),
  }) as PublicClient;
}

/**
 * Read one lock by ID. Returns null for an unknown lock or zero address beneficiary.
 */
export async function readLock(
  client: PublicClient,
  chainId: BotChainId,
  id: bigint,
): Promise<IronboxLock | null> {
  if (!isDeployed(chainId)) return null;

  const data = await client.readContract({
    address: getDeployment(chainId).address,
    abi: ironboxAbi,
    functionName: "lockOf",
    args: [id],
  });

  if (!data || data.beneficiary === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return {
    beneficiary: data.beneficiary,
    unlockAt: Number(data.unlockAt),
    withdrawn: data.withdrawn,
    amount: data.amount,
  };
}
