// AjoCircle ABI — subset used by the mobile app
export const AJO_CIRCLE_ABI = [
  // Write functions
  { type: 'function', name: 'createCircle', stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'maxMembers', type: 'uint256' },
      { name: 'contributionAmountUSDT', type: 'uint256' },
      { name: 'frequencyInSeconds', type: 'uint256' },
    ],
    outputs: [{ name: 'circleId', type: 'uint256' }] },

  { type: 'function', name: 'joinCircle', stateMutability: 'nonpayable',
    inputs: [{ name: 'circleId', type: 'uint256' }],
    outputs: [] },

  { type: 'function', name: 'contribute', stateMutability: 'payable',
    inputs: [
      { name: 'circleId', type: 'uint256' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
    ],
    outputs: [] },

  { type: 'function', name: 'claimPayout', stateMutability: 'nonpayable',
    inputs: [
      { name: 'circleId', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
    ],
    outputs: [] },

  // Read functions
  { type: 'function', name: 'getCircleInfo', stateMutability: 'view',
    inputs: [{ name: 'circleId', type: 'uint256' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'maxMembers', type: 'uint256' },
      { name: 'contributionAmount', type: 'uint256' },
      { name: 'currentRound', type: 'uint256' },
      { name: 'totalRounds', type: 'uint256' },
      { name: 'poolBalance', type: 'uint256' },
      { name: 'nextPayoutTimestamp', type: 'uint256' },
      { name: 'frequency', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'payoutPending', type: 'bool' },
      { name: 'paidCount', type: 'uint256' },
    ] },

  { type: 'function', name: 'getMembers', stateMutability: 'view',
    inputs: [{ name: 'circleId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }] },

  { type: 'function', name: 'hasPaid', stateMutability: 'view',
    inputs: [{ name: 'circleId', type: 'uint256' }, { name: 'member', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }] },

  { type: 'function', name: 'getCurrentRecipient', stateMutability: 'view',
    inputs: [{ name: 'circleId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }] },

  { type: 'function', name: 'getMemberPosition', stateMutability: 'view',
    inputs: [{ name: 'circleId', type: 'uint256' }, { name: 'member', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },

  { type: 'function', name: 'circleCount', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }] },

  { type: 'function', name: 'getUserCircles', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }] },

  // Events
  { type: 'event', name: 'CircleCreated',
    inputs: [{ name: 'circleId', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }] },
  { type: 'event', name: 'MemberJoined',
    inputs: [{ name: 'circleId', type: 'uint256', indexed: true }, { name: 'member', type: 'address', indexed: true }] },
  { type: 'event', name: 'ContributionMade',
    inputs: [{ name: 'circleId', type: 'uint256', indexed: true }, { name: 'member', type: 'address', indexed: true }, { name: 'usdtAmount', type: 'uint256', indexed: false }, { name: 'round', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'PayoutReleased',
    inputs: [{ name: 'circleId', type: 'uint256', indexed: true }, { name: 'recipient', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'round', type: 'uint256', indexed: false }] },
] as const;

// RollaVault ABI — subset used by the mobile app
export const ROLLA_VAULT_ABI = [
  // Write functions
  { type: 'function', name: 'deposit', stateMutability: 'payable',
    inputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
    ],
    outputs: [{ name: 'vaultId', type: 'uint256' }] },

  { type: 'function', name: 'claim', stateMutability: 'nonpayable',
    inputs: [
      { name: 'vaultId', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOutMinimum', type: 'uint256' },
      { name: 'poolFee', type: 'uint24' },
    ],
    outputs: [] },

  // Read functions
  { type: 'function', name: 'getVaultBalance', stateMutability: 'view',
    inputs: [{ name: 'vaultId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }] },

  { type: 'function', name: 'getProjectedEarnings', stateMutability: 'view',
    inputs: [{ name: 'vaultId', type: 'uint256' }, { name: 'atTimestamp', type: 'uint256' }],
    outputs: [{ name: 'earnings', type: 'uint256' }] },

  { type: 'function', name: 'isMatured', stateMutability: 'view',
    inputs: [{ name: 'vaultId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },

  { type: 'function', name: 'getUserVaults', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }] },

  { type: 'function', name: 'vaults', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'owner', type: 'address' },
      { name: 'tier', type: 'uint8' },
      { name: 'principalUSDT', type: 'uint256' },
      { name: 'aTokenShares', type: 'uint256' },
      { name: 'depositTimestamp', type: 'uint256' },
      { name: 'maturityTimestamp', type: 'uint256' },
      { name: 'lockDuration', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ] },

  // Public state getters for tier configuration
  { type: 'function', name: 'minDeposits', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'lockDurations', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'aprBps', stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }] },

  // Events
  { type: 'event', name: 'VaultCreated',
    inputs: [{ name: 'vaultId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'tier', type: 'uint8', indexed: false }, { name: 'usdcDeposited', type: 'uint256', indexed: false }] },
  { type: 'event', name: 'VaultClaimed',
    inputs: [{ name: 'vaultId', type: 'uint256', indexed: true }, { name: 'owner', type: 'address', indexed: true }, { name: 'usdcValue', type: 'uint256', indexed: false }, { name: 'tokenOut', type: 'address', indexed: false }] },
] as const;

// Uniswap V3 QuoterV2 — quoteExactInputSingle (nonpayable, called via eth_call simulation)
export const QUOTER_V2_ABI = [
  { type: 'function', name: 'quoteExactInputSingle', stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn',           type: 'address' },
        { name: 'tokenOut',          type: 'address' },
        { name: 'amountIn',          type: 'uint256' },
        { name: 'fee',               type: 'uint24'  },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [
      { name: 'amountOut',               type: 'uint256' },
      { name: 'sqrtPriceX96After',       type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32'  },
      { name: 'gasEstimate',             type: 'uint256' },
    ] },
] as const;

// UsernameRegistry ABI
export const USERNAME_REGISTRY_ABI = [
  { type: 'function', name: 'nameOf',    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'ownerOf',   stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'address' }] },
  { type: 'function', name: 'available', stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'cooldownEndsAt', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'claim',     stateMutability: 'nonpayable',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [] },
  { type: 'function', name: 'release',   stateMutability: 'nonpayable',
    inputs: [],
    outputs: [] },
  { type: 'event', name: 'Claimed',
    inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }] },
  { type: 'event', name: 'Released',
    inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }] },
  { type: 'error', name: 'NameTaken',    inputs: [] },
  { type: 'error', name: 'InvalidName',  inputs: [] },
  { type: 'error', name: 'NoName',       inputs: [] },
] as const;
