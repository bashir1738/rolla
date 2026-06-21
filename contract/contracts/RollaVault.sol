// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IPool.sol";
import "./interfaces/IAToken.sol";
import "./utils/ReentrancyGuard.sol";

/// @title RollaVault
/// @notice Individual yield-bearing savings vaults.
///         User deposits any EVM token → swapped to USDT → deployed to Aave V3.
///         Three lock tiers (Flex / Growth / Power) with increasing APR targets.
///         On maturity, user claims principal + Aave yield in USDT or any EVM token.
contract RollaVault is ReentrancyGuard {
    // ─── Constants ───────────────────────────────────────────────────────────
    uint256 private constant RAY = 1e27;

    // ─── Immutables ──────────────────────────────────────────────────────────
    address public immutable USDT;
    address public immutable UNISWAP_ROUTER;
    address public immutable AAVE_POOL;
    address public immutable A_USDT; // Aave aUSDT token on Sepolia
    address public immutable WETH;

    // ─── Types ───────────────────────────────────────────────────────────────
    enum VaultTier {
        Flex,   // 4.5% APR target, no lock, min 10 USDT
        Growth, // 9.2% APR target, 90-day lock, min 100 USDT
        Power   // 14.8% APR target, 365-day lock, min 500 USDT
    }

    struct Vault {
        address owner;
        VaultTier tier;
        uint256 principalUSDT;    // USDT deposited (6 decimals)
        uint256 aTokenShares;     // Aave scaled balance at deposit time
        uint256 depositTimestamp;
        uint256 maturityTimestamp;
        uint256 lockDuration;     // 0 for Flex
        bool claimed;
    }

    // ─── Tier Config ─────────────────────────────────────────────────────────
    uint256[3] public minDeposits   = [10e6,  100e6,  500e6];   // USDT 6 dec
    uint256[3] public lockDurations = [0,     90 days, 365 days];
    uint256[3] public aprBps        = [450,   920,    1480];     // basis points (for projections)

    // ─── Storage ─────────────────────────────────────────────────────────────
    mapping(uint256 => Vault) public vaults;
    mapping(address => uint256[]) private _userVaults;
    uint256 public vaultCount;

    // ─── Events ──────────────────────────────────────────────────────────────
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed owner,
        VaultTier tier,
        uint256 usdtDeposited
    );
    event VaultClaimed(
        uint256 indexed vaultId,
        address indexed owner,
        uint256 usdtValue,
        address tokenOut
    );

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(
        address _usdt,
        address _router,
        address _aavePool,
        address _aUsdt,
        address _weth
    ) {
        require(
            _usdt != address(0) &&
            _router != address(0) &&
            _aavePool != address(0) &&
            _aUsdt != address(0),
            "Zero address"
        );
        USDT = _usdt;
        UNISWAP_ROUTER = _router;
        AAVE_POOL = _aavePool;
        A_USDT = _aUsdt;
        WETH = _weth;
    }

    // ─── External: Deposit ───────────────────────────────────────────────────

    /// @notice Deposit any EVM token into a vault tier.
    ///         Token is swapped to USDT (if needed) then supplied to Aave V3.
    ///         tokenIn == address(0) accepts native ETH via msg.value.
    /// @return vaultId The ID of the newly created vault.
    function deposit(
        VaultTier tier,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external payable nonReentrant returns (uint256 vaultId) {
        uint256 tierIdx = uint256(tier);

        uint256 usdtAmount = _pullAndSwapToUSDT(tokenIn, amountIn, amountOutMinimum, poolFee);
        require(usdtAmount >= minDeposits[tierIdx], "Below tier minimum");

        // Snapshot Aave scaled balance before and after deposit to track per-vault shares
        uint256 scaledBefore = IAToken(A_USDT).scaledBalanceOf(address(this));
        _safeApprove(USDT, AAVE_POOL, usdtAmount);
        IPool(AAVE_POOL).supply(USDT, usdtAmount, address(this), 0);
        uint256 scaledAfter = IAToken(A_USDT).scaledBalanceOf(address(this));

        uint256 lockDuration = lockDurations[tierIdx];

        vaultId = vaultCount++;
        Vault storage v = vaults[vaultId];
        v.owner = msg.sender;
        v.tier = tier;
        v.principalUSDT = usdtAmount;
        v.aTokenShares = scaledAfter - scaledBefore;
        v.depositTimestamp = block.timestamp;
        v.lockDuration = lockDuration;
        // Flex: maturity = depositTimestamp (claimable after the deposit block)
        v.maturityTimestamp = lockDuration == 0 ? block.timestamp : block.timestamp + lockDuration;

        _userVaults[msg.sender].push(vaultId);

        emit VaultCreated(vaultId, msg.sender, tier, usdtAmount);
    }

    // ─── External: Claim ─────────────────────────────────────────────────────

    /// @notice Claim a matured vault — receives USDT or any EVM token.
    ///         tokenOut == USDT → direct transfer; address(0) → native ETH; other → swap.
    function claim(
        uint256 vaultId,
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external nonReentrant {
        Vault storage v = vaults[vaultId];
        require(v.owner == msg.sender, "Not vault owner");
        require(!v.claimed, "Already claimed");
        // Prevent flash-loan same-block claim (applies to Flex vaults too)
        require(block.timestamp > v.depositTimestamp, "Cannot claim same block as deposit");

        if (v.lockDuration > 0) {
            require(block.timestamp >= v.maturityTimestamp, "Vault not yet matured");
        }

        // Mark before external calls (checks-effects-interactions)
        v.claimed = true;

        // Compute current USDT value including Aave yield
        uint256 normalizedIncome = IPool(AAVE_POOL).getReserveNormalizedIncome(USDT);
        uint256 usdtValue = (v.aTokenShares * normalizedIncome) / RAY;

        // Withdraw from Aave — returns actual amount (may differ by 1 wei due to rounding)
        uint256 withdrawn = IPool(AAVE_POOL).withdraw(USDT, usdtValue, address(this));

        emit VaultClaimed(vaultId, msg.sender, withdrawn, tokenOut);

        _swapUSDTAndSend(tokenOut, withdrawn, amountOutMinimum, poolFee, msg.sender);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    /// @notice Current USDT value of a vault, including accrued Aave yield.
    function getVaultBalance(uint256 vaultId) external view returns (uint256) {
        Vault storage v = vaults[vaultId];
        if (v.claimed) return 0;
        uint256 income = IPool(AAVE_POOL).getReserveNormalizedIncome(USDT);
        return (v.aTokenShares * income) / RAY;
    }

    /// @notice APR-based earnings projection for UI display.
    ///         Note: actual yield comes from Aave; this uses the tier's target APR.
    function getProjectedEarnings(uint256 vaultId, uint256 atTimestamp)
        external
        view
        returns (uint256 earnings)
    {
        Vault storage v = vaults[vaultId];
        if (v.claimed || atTimestamp <= v.depositTimestamp) return 0;
        uint256 elapsed = atTimestamp - v.depositTimestamp;
        return (v.principalUSDT * aprBps[uint256(v.tier)] * elapsed) / (365 days * 10_000);
    }

    /// @notice True if the vault can be claimed right now.
    function isMatured(uint256 vaultId) external view returns (bool) {
        Vault storage v = vaults[vaultId];
        if (v.claimed || v.owner == address(0)) return false;
        if (block.timestamp <= v.depositTimestamp) return false;
        if (v.lockDuration == 0) return true;
        return block.timestamp >= v.maturityTimestamp;
    }

    /// @notice Returns all vault IDs owned by a user.
    function getUserVaults(address user) external view returns (uint256[] memory) {
        return _userVaults[user];
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _pullAndSwapToUSDT(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) internal returns (uint256 usdtReceived) {
        if (tokenIn == USDT) {
            _safeTransferFrom(USDT, msg.sender, address(this), amountIn);
            return amountIn;
        }

        ISwapRouter.ExactInputSingleParams memory params;

        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "ETH amount mismatch");
            params = ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: USDT,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });
            usdtReceived = ISwapRouter(UNISWAP_ROUTER).exactInputSingle{value: amountIn}(params);
        } else {
            _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
            _safeApprove(tokenIn, UNISWAP_ROUTER, amountIn);
            params = ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: USDT,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });
            usdtReceived = ISwapRouter(UNISWAP_ROUTER).exactInputSingle(params);
        }
    }

    function _swapUSDTAndSend(
        address tokenOut,
        uint256 usdtAmount,
        uint256 amountOutMinimum,
        uint24 poolFee,
        address recipient
    ) internal {
        if (tokenOut == USDT) {
            _safeTransfer(USDT, recipient, usdtAmount);
            return;
        }

        bool wantNativeETH = (tokenOut == address(0));
        address effectiveOut = wantNativeETH ? WETH : tokenOut;
        address swapRecipient = wantNativeETH ? address(this) : recipient;

        _safeApprove(USDT, UNISWAP_ROUTER, usdtAmount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDT,
            tokenOut: effectiveOut,
            fee: poolFee,
            recipient: swapRecipient,
            deadline: block.timestamp + 15 minutes,
            amountIn: usdtAmount,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });
        uint256 amountOut = ISwapRouter(UNISWAP_ROUTER).exactInputSingle(params);

        if (wantNativeETH) {
            IWETH(WETH).withdraw(amountOut);
            (bool ok, ) = recipient.call{value: amountOut}("");
            require(ok, "ETH transfer failed");
        }
    }

    // ─── Safe Token Helpers ──────────────────────────────────────────────────

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TransferFrom failed");
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        (bool ok0, ) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, 0));
        require(ok0, "Approve reset failed");
        (bool ok1, bytes memory d1) = token.call(
            abi.encodeWithSelector(0x095ea7b3, spender, amount)
        );
        require(ok1 && (d1.length == 0 || abi.decode(d1, (bool))), "Approve failed");
    }

    receive() external payable {}
}
