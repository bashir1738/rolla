// Deployed 2026-06-20 | Network: Sepolia (11155111)
// AjoCircle:        https://sepolia.etherscan.io/address/0x0666e867fC584098bCa6d7E8deb8D31006dc7713
// RollaVault:       https://sepolia.etherscan.io/address/0x68fAdb236D12F2D79e90C7768Ee622E92e0f659e
// UsernameRegistry: https://sepolia.etherscan.io/address/0xD2599C5aFFa09c4BE034fEBD7F3D902667DF5CE4

export const CONTRACT_ADDRESSES = {
  AJO_CIRCLE:        '0x0666e867fC584098bCa6d7E8deb8D31006dc7713' as `0x${string}`,
  ROLLA_VAULT:       '0x68fAdb236D12F2D79e90C7768Ee622E92e0f659e' as `0x${string}`,
  USERNAME_REGISTRY: '0xD2599C5aFFa09c4BE034fEBD7F3D902667DF5CE4' as `0x${string}`,
} as const;

export const TOKEN_ADDRESSES = {
  USDT: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06' as `0x${string}`,
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as `0x${string}`,
} as const;

export const PROTOCOL_ADDRESSES = {
  UNISWAP_ROUTER: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E' as `0x${string}`,
  UNISWAP_QUOTER: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3' as `0x${string}`,
  AAVE_POOL:      '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951' as `0x${string}`,
  CHAINLINK_ETH:  '0x694AA1769357215DE4FAC081bf1f309aDC325306' as `0x${string}`,
} as const;

export const CHAIN_ID = 11155111;
