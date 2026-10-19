"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BaseError,
  ContractFunctionRevertedError,
  isAddress,
  parseEther,
  parseEventLogs,
  type Hex,
} from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Panel from "@/components/ui/Panel";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import { isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { ironboxAbi } from "@/lib/botchain/abi";

export default function LockForm() {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [beneficiary, setBeneficiary] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<TxStage>("idle");
  const [hash, setHash] = useState<Hex | null>(null);

  const deployment = isBotChainId(chainId) ? getDeployment(chainId) : null;

  const receipt = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
    query: { enabled: Boolean(hash) },
  });

  const settledHash = useRef<Hex | null>(null);

  useEffect(() => {
    if (!hash || settledHash.current === hash) return;
    if (!receipt.isSuccess && !receipt.isError) return;

    settledHash.current = hash;

    if (receipt.isSuccess) {
      setStage("confirmed");
      toast("success", "Locked", "BOT has been locked on chain.");
    } else {
      setStage("failed");
      toast(
        "error",
        "Transaction failed",
        "Nothing was locked. Check the explorer and try again.",
      );
    }
  }, [hash, receipt.isSuccess, receipt.isError, toast]);

  const createdId = useMemo(() => {
    if (!receipt.data) return null;
    try {
      const logs = parseEventLogs({
        abi: ironboxAbi,
        eventName: "Locked",
        logs: receipt.data.logs,
      });
      return logs[0]?.args.id ?? null;
    } catch {
      return null;
    }
  }, [receipt.data]);

  const unlockAtSeconds = useMemo(() => {
    if (!unlockDate) return 0;
    const ms = new Date(unlockDate).getTime();
    if (isNaN(ms)) return 0;
    return Math.floor(ms / 1000);
  }, [unlockDate]);

  const parsedAmount = useMemo(() => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 0n;
    try {
      return parseEther(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  const beneficiaryValid = isAddress(beneficiary);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const dateValid = unlockAtSeconds > nowSeconds;
  const amountValid = parsedAmount > 0n;

  const canSubmit =
    Boolean(deployment && isBotChainId(chainId)) &&
    beneficiaryValid &&
    dateValid &&
    amountValid &&
    stage !== "signing" &&
    stage !== "pending";

  const handleLock = useCallback(async () => {
    if (!deployment || !isBotChainId(chainId) || !beneficiaryValid || !dateValid || !amountValid) {
      return;
    }

    setStage("signing");
    setHash(null);
    settledHash.current = null;

    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: ironboxAbi,
        functionName: "lock",
        args: [beneficiary as `0x${string}`, BigInt(unlockAtSeconds)],
        value: parsedAmount,
        chainId,
      });
      setHash(txHash);
      setStage("pending");
    } catch (err) {
      setStage("idle");

      const reverted =
        err instanceof BaseError
          ? err.walk((e) => e instanceof ContractFunctionRevertedError)
          : null;

      if (reverted instanceof ContractFunctionRevertedError) {
        const error = reverted.data;
        if (error?.errorName === "ZeroValue") {
          toast("error", "Zero value", "You must lock more than 0 BOT.");
          return;
        }
        if (error?.errorName === "ZeroAddress") {
          toast("error", "Invalid address", "Beneficiary cannot be the zero address.");
          return;
        }
        if (error?.errorName === "UnlockInPast") {
          toast("error", "Invalid date", "Unlock timestamp must be in the future.");
          return;
        }
      }

      const message = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      if (/rejected|denied/i.test(message)) {
        toast("info", "Cancelled", "Nothing was sent.");
      } else {
        toast("error", "Could not send", message);
      }
    }
  }, [
    deployment,
    chainId,
    beneficiaryValid,
    dateValid,
    amountValid,
    beneficiary,
    unlockAtSeconds,
    parsedAmount,
    writeContractAsync,
    toast,
  ]);

  const resetForm = useCallback(() => {
    setBeneficiary("");
    setUnlockDate("");
    setAmount("");
    setStage("idle");
    setHash(null);
    settledHash.current = null;
  }, []);

  // Checked FIRST: confirming a lock must preserve the confirmation state and receipt hash
  if (stage === "confirmed") {
    return (
      <div className="flex flex-col gap-3">
        <Panel>
          <div className="flex flex-col gap-4">
            <TxStatus stage="confirmed" hash={hash} confirmedLabel="BOT locked on chain" />

            {createdId !== null && (
              <div
                className="p-3 rounded"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Lock #{createdId.toString()} Created
                </p>
                <p className="text-[11px] mb-3" style={{ color: "var(--text-secondary)" }}>
                  The lock is permanently recorded on BOT Chain.
                </p>
                <Link
                  href={`/lock/${createdId.toString()}`}
                  className="text-[11px] uppercase tracking-[0.04em] underline"
                  style={{ color: "var(--accent)" }}
                >
                  View Shareable Lock Page
                </Link>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={resetForm}>
              Create another lock
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <Panel>
      <div className="flex flex-col gap-4">
        <Input
          label="Beneficiary address"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value.trim())}
          placeholder="0x..."
          mono
          disabled={stage === "signing" || stage === "pending"}
          error={beneficiary && !beneficiaryValid ? "Enter a valid 40-character address" : undefined}
          hint="The only address that will ever be able to withdraw these funds."
        />

        {address && beneficiary.toLowerCase() !== address.toLowerCase() && (
          <button
            type="button"
            onClick={() => setBeneficiary(address)}
            className="text-[11px] text-left underline -mt-2 self-start cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            Lock for myself ({address.slice(0, 6)}…{address.slice(-4)})
          </button>
        )}

        <Input
          label="Unlock Date & Time (Local)"
          type="datetime-local"
          value={unlockDate}
          onChange={(e) => setUnlockDate(e.target.value)}
          disabled={stage === "signing" || stage === "pending"}
          error={unlockDate && !dateValid ? "Unlock time must be in the future" : undefined}
          hint={
            unlockAtSeconds > 0
              ? `Unlocks at: ${new Date(unlockAtSeconds * 1000).toUTCString()}`
              : "Choose when the beneficiary can claim the BOT."
          }
        />

        <Input
          label="Amount to lock"
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.1"
          suffix="BOT"
          disabled={stage === "signing" || stage === "pending"}
          error={amount && !amountValid ? "Enter a positive number" : undefined}
          hint="Native BOT to deposit into the contract."
        />

        <div
          className="p-3 rounded text-[11px] leading-relaxed"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-tertiary)",
          }}
        >
          <strong style={{ color: "var(--warning)" }}>No early withdrawal, for anyone.</strong> Once
          locked, the sender cannot cancel or claw back funds, and the beneficiary cannot withdraw
          before the unlock date. There is no admin key and no backdoor.
        </div>

        {stage === "idle" || stage === "failed" ? (
          <Button onClick={handleLock} disabled={!canSubmit}>
            Lock BOT
          </Button>
        ) : null}

        <TxStatus
          stage={stage}
          hash={hash}
          failedLabel="Transaction failed — nothing was locked."
        />
      </div>
    </Panel>
  );
}
