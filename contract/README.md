# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

## Deployed & Verified Contracts

Network: **Sepolia** (chain ID `11155111`) · Deployed: 2026-06-25 · Source ✅ verified on Etherscan

| Contract | Address | Verified Source |
| --- | --- | --- |
| AjoCircle | `0x6bba73Fa725357faf03b660F6727799C6B529366` | [Etherscan ↗](https://sepolia.etherscan.io/address/0x6bba73Fa725357faf03b660F6727799C6B529366#code) |
| RollaVault | `0x1Da5E825c273F173da45a0AF3aBf938DA0761342` | [Etherscan ↗](https://sepolia.etherscan.io/address/0x1Da5E825c273F173da45a0AF3aBf938DA0761342#code) |
| UsernameRegistry | `0x2808324229e00C3Dc10BEe19fd8eb2Df24991eA5` | [Etherscan ↗](https://sepolia.etherscan.io/address/0x2808324229e00C3Dc10BEe19fd8eb2Df24991eA5#code) |

Re-verify with: `npx hardhat ignition verify chain-11155111`
