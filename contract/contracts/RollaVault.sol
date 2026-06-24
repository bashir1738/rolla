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
    address public immutable A_USDT;
    address public immutable WETH;
    address public immutable owner;

    // ─── Types ───────────────────────────────────────────────────────────────
    enum VaultTier {
        Flex,   // 4.5% APR target, no lock, min 10 USDT
        Growth, // 9.2% APR target, 90-day lock, min 100 USDT
        Power   // 14.8% APR target, 365-day lock, min 500 USDT
    }

    struct Vault {
        address owner;
        VaultTier tier;
        uint256 principalUSDT;
        uint256 aTokenShares;
        uint256 depositTimestamp;
        uint256 maturityTimestamp;
        uint256 lockDuration;
        bool claimed;
    }

    // ─── Tier Config ─────────────────────────────────────────────────────────
    uint256[3] public minDeposits   = [10e6,  100e6,  500e6];
    uint256[3] public lockDurations = [0,     90 days, 365 days];
    uint256[3] public aprBps        = [450,   920,    1480];

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
        owner = msg.sender;
    }

    // ─── External: Deposit ───────────────────────────────────────────────────

    function deposit(
        VaultTier tier,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external payable nonReentrant returns (uint256 vaultId) {
        // Reject accidental ETH on ERC20 paths
        if (tokenIn != address(0)) {
            require(msg.value == 0, "ETH not accepted for ERC20 path");
        }

        uint256 tierIdx = uint256(tier);
        uint256 usdtAmount = _pullAndSwapToUSDT(tokenIn, amountIn, amountOutMinimum, poolFee);
        require(usdtAmount >= minDeposits[tierIdx], "Below tier minimum");

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
        v.maturityTimestamp = lockDuration == 0 ? block.timestamp : block.timestamp + lockDuration;

        _userVaults[msg.sender].push(vaultId);
        emit VaultCreated(vaultId, msg.sender, tier, usdtAmount);
    }

    // ─── External: Claim ─────────────────────────────────────────────────────

    function claim(
        uint256 vaultId,
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external nonReentrant {
        Vault storage v = vaults[vaultId];
        require(v.owner == msg.sender, "Not vault owner");
        require(!v.claimed, "Already claimed");
        require(block.timestamp > v.depositTimestamp, "Cannot claim same block as deposit");

        if (v.lockDuration > 0) {
            require(block.timestamp >= v.maturityTimestamp, "Vault not yet matured");
        }

        v.claimed = true;

        // Use type(uint256).max to withdraw the full scaled balance, avoiding
        // 1-wei rounding issues when Aave recomputes the amount internally.
        uint256 withdrawn = IPool(AAVE_POOL).withdraw(USDT, type(uint256).max, address(this));

        emit VaultClaimed(vaultId, msg.sender, withdrawn, tokenOut);

        _swapUSDTAndSend(tokenOut, withdrawn, amountOutMinimum, poolFee, msg.sender);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getVaultBalance(uint256 vaultId) external view returns (uint256) {
        Vault storage v = vaults[vaultId];
        if (v.claimed) return 0;
        uint256 income = IPool(AAVE_POOL).getReserveNormalizedIncome(USDT);
        return (v.aTokenShares * income) / RAY;
    }

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

    function isMatured(uint256 vaultId) external view returns (bool) {
        Vault storage v = vaults[vaultId];
        if (v.claimed || v.owner == address(0)) return false;
        if (block.timestamp <= v.depositTimestamp) return false;
        if (v.lockDuration == 0) return true;
        return block.timestamp >= v.maturityTimestamp;
    }

    function getUserVaults(address user) external view returns (uint256[] memory) {
        return _userVaults[user];
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    /// @notice Rescue ETH accidentally sent directly to the contract.
    function rescueETH() external {
        require(msg.sender == owner, "Not owner");
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH");
        (bool ok, ) = owner.call{value: bal}("");
        require(ok, "ETH rescue failed");
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
