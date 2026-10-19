/**
 * Ironbox's ABI.
 *
 * Hand-written and `as const` rather than imported from `contracts/out`. The const assertion is
 * what gives viem and wagmi their argument and return types; a generated JSON artifact loses that
 * unless it is cast, and a mistyped argument would then only surface as a revert.
 *
 * Custom errors are included so viem can decode reverts and surface actionable error messages.
 */
export const ironboxAbi = [
  {
    type: "function",
    name: "lock",
    stateMutability: "payable",
    inputs: [
      { name: "beneficiary", type: "address" },
      { name: "unlockAt", type: "uint64" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lockOf",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "beneficiary", type: "address" },
          { name: "unlockAt", type: "uint64" },
          { name: "withdrawn", type: "bool" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "Locked",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "unlockAt", type: "uint64", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "ZeroValue", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "UnlockInPast", inputs: [] },
  {
    type: "error",
    name: "NotBeneficiary",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "StillLocked",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "unlockAt", type: "uint64" },
    ],
  },
  {
    type: "error",
    name: "AlreadyWithdrawn",
    inputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "error",
    name: "TransferFailed",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
] as const;

export const contractAbi = ironboxAbi;
