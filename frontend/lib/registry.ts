import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";

export const REGISTRY_ADDRESS =
  "0x795e44e3Bb43AAcBC7419B05e400BeaB781c0A40" as Address;

export const SEPOLIA_RPC =
  "https://sepolia.infura.io/v3/abdabfe7ec854c8cbcfdb520c1d1c29e";

const REGISTRY_ABI = [
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "available",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "cooldownEndsAt",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
] as const;

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC),
});

export async function checkAvailable(name: string): Promise<boolean> {
  return publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "available",
    args: [name],
  }) as Promise<boolean>;
}

export async function lookupName(address: Address): Promise<string> {
  return publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "nameOf",
    args: [address],
  }) as Promise<string>;
}

export async function lookupOwner(name: string): Promise<Address> {
  return publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "ownerOf",
    args: [name],
  }) as Promise<Address>;
}

export async function getCooldown(address: Address): Promise<number> {
  const ts = await publicClient.readContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "cooldownEndsAt",
    args: [address],
  }) as bigint;
  return Number(ts);
}

// Build calldata for claim(name) — used by the browser wallet
export function buildClaimCalldata(name: string): `0x${string}` {
  // ABI-encode: selector(claim(string)) + offset + length + data
  const selector = "0x1e83409a"; // keccak256("claim(string)")[0:4]
  const nameBytes = new TextEncoder().encode(name);
  const pad = (n: number) => n.toString(16).padStart(64, "0");
  const dataHex = Array.from(nameBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const paddedData = dataHex.padEnd(Math.ceil(dataHex.length / 64) * 64, "0");
  return (
    selector +
    pad(32) +             // offset to string
    pad(nameBytes.length) + // length
    paddedData             // data
  ) as `0x${string}`;
}
