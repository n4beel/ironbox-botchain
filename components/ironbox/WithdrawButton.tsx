"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BaseError,
  ContractFunctionRevertedError,
  type Hex,
} from "viem";
import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Button from "@/components/ui/Button";
import TxStatus, { type TxStage } from "@/components/ui/TxStatus";
import { useToast } from "@/components/ui/Toast";
import BotChainGate from "@/components/botchain/BotChainGate";
import { isBotChainId } from "@/lib/botchain/chain";
import { getDeployment } from "@/lib/botchain/deployment";
import { ironboxAbi } from "@/lib/botchain/abi";

export default function WithdrawButton({
  id,
  beneficiary,
  onSuccess,
}: {
  id: bigint;
  beneficiary: string;
  onSuccess?: () => void;
}) {
  const chainId = useChainId();
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

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
      toast("success", "Withdrawn", "Unlocked BOT has been withdrawn to your wallet.");
      onSuccess?.();
    } else {
      setStage("failed");
      toast(
        "error",
        "Withdrawal failed",
        "Could not withdraw funds. Check the explorer and try again.",
      );
    }
  }, [hash, receipt.isSuccess, receipt.isError, toast, onSuccess]);

  const isBeneficiary =
    Boolean(address && beneficiary) &&
    address!.toLowerCase() === beneficiary.toLowerCase();

  const handleWithdraw = useCallback(async () => {
    if (!deployment || !isBotChainId(chainId) || !isBeneficiary) return;

    setStage("signing");
    setHash(null);
    settledHash.current = null;

    try {
      const txHash = await writeContractAsync({
        address: deployment.address,
        abi: ironboxAbi,
        functionName: "withdraw",
        args: [id],
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
        if (error?.errorName === "NotBeneficiary") {
          toast("error", "Not beneficiary", "Only the designated beneficiary can withdraw.");
          return;
        }
        if (error?.errorName === "StillLocked") {
          toast("error", "Still locked", "The unlock date has not arrived yet.");
          return;
        }
        if (error?.errorName === "AlreadyWithdrawn") {
          toast("warning", "Already withdrawn", "This lock has already been withdrawn.");
          return;
        }
        if (error?.errorName === "TransferFailed") {
          toast("error", "Transfer failed", "Failed to transfer BOT to beneficiary.");
          return;
        }
      }

      const message = err instanceof BaseError ? err.shortMessage : "Something went wrong.";
      if (/rejected|denied/i.test(message)) {
        toast("info", "Cancelled", "Transaction cancelled.");
      } else {
        toast("error", "Could not send", message);
      }
    }
  }, [deployment, chainId, isBeneficiary, id, writeContractAsync, toast]);

  return (
    <BotChainGate noWalletNote="Connect the beneficiary wallet to withdraw.">
      <div className="flex flex-col gap-2">
        {stage === "confirmed" ? (
          <TxStatus stage="confirmed" hash={hash} confirmedLabel="Withdrawn to your wallet" />
        ) : isBeneficiary ? (
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleWithdraw}
              disabled={stage === "signing" || stage === "pending"}
              loading={stage === "signing" || stage === "pending"}
            >
              Withdraw BOT
            </Button>
            <TxStatus
              stage={stage}
              hash={hash}
              failedLabel="Withdrawal failed."
            />
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Connected wallet is not the beneficiary. Only{" "}
            <span className="font-mono">{beneficiary.slice(0, 6)}…{beneficiary.slice(-4)}</span> can
            withdraw.
          </p>
        )}
      </div>
    </BotChainGate>
  );
}
