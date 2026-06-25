// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/ISwapRouter.sol";
import "./utils/ReentrancyGuard.sol";

/// @title RollaVault
/// @notice Individual savings vaults with lock tiers.
///         User deposits any EVM token → swapped to USDC → held in vault.
///         Three lock tiers (Flex / Growth / Power) with increasing lock periods.
///         On maturity, user claims in USDC or any EVM token.
contract RollaVault is ReentrancyGuard {
    // ─── Immutables ──────────────────────────────────────────────────────────
    address public immutable USDC;
    address public immutable UNISWAP_ROUTER;
    address public immutable WETH;
    address public immutable owner;

    // ─── Types ───────────────────────────────────────────────────────────────
    enum VaultTier { Flex, Growth, Power }

    struct Vault {
        address owner;
        VaultTier tier;
        uint256 principalUSDC;
        uint256 aTokenShares; // reserved for future mainnet Aave integration
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
    event VaultCreated(uint256 indexed vaultId, address indexed owner, VaultTier tier, uint256 usdcDeposited);
    event VaultClaimed(uint256 indexed vaultId, address indexed owner, uint256 usdcValue, address tokenOut);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _usdc, address _router, address _weth) {
        require(_usdc != address(0) && _router != address(0), "Zero address");
        USDC = _usdc;
        UNISWAP_ROUTER = _router;
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
        if (tokenIn != address(0)) {
            require(msg.value == 0, "ETH not accepted for ERC20 path");
        }

        uint256 tierIdx = uint256(tier);
        uint256 usdcAmount = _pullAndSwapToUSDC(tokenIn, amountIn, amountOutMinimum, poolFee);
        require(usdcAmount >= minDeposits[tierIdx], "Below tier minimum");

        uint256 lockDuration = lockDurations[tierIdx];

        vaultId = vaultCount++;
        Vault storage v = vaults[vaultId];
        v.owner = msg.sender;
        v.tier = tier;
        v.principalUSDC = usdcAmount;
        v.depositTimestamp = block.timestamp;
        v.lockDuration = lockDuration;
        v.maturityTimestamp = lockDuration == 0 ? block.timestamp : block.timestamp + lockDuration;

        _userVaults[msg.sender].push(vaultId);
        emit VaultCreated(vaultId, msg.sender, tier, usdcAmount);
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

        uint256 balance = v.principalUSDC;
        emit VaultClaimed(vaultId, msg.sender, balance, tokenOut);
        _swapUSDCAndSend(tokenOut, balance, amountOutMinimum, poolFee, msg.sender);
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getVaultBalance(uint256 vaultId) external view returns (uint256) {
        Vault storage v = vaults[vaultId];
        if (v.claimed) return 0;
        return v.principalUSDC;
    }

    function getProjectedEarnings(uint256 vaultId, uint256 atTimestamp)
        external view returns (uint256)
    {
        Vault storage v = vaults[vaultId];
        if (v.claimed || atTimestamp <= v.depositTimestamp) return 0;
        uint256 elapsed = atTimestamp - v.depositTimestamp;
        return (v.principalUSDC * aprBps[uint256(v.tier)] * elapsed) / (365 days * 10_000);
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

    function rescueETH() external {
        require(msg.sender == owner, "Not owner");
        uint256 bal = address(this).balance;
        require(bal > 0, "No ETH");
        (bool ok, ) = owner.call{value: bal}("");
        require(ok, "ETH rescue failed");
    }

    // ─── Internal ────────────────────────────────────────────────────────────

    function _pullAndSwapToUSDC(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) internal returns (uint256 usdcReceived) {
        if (tokenIn == USDC) {
            _safeTransferFrom(USDC, msg.sender, address(this), amountIn);
            return amountIn;
        }

        ISwapRouter.ExactInputSingleParams memory params;

        if (tokenIn == address(0)) {
            require(msg.value == amountIn, "ETH amount mismatch");
            params = ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: USDC,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });
            usdcReceived = ISwapRouter(UNISWAP_ROUTER).exactInputSingle{value: amountIn}(params);
        } else {
            _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
            _safeApprove(tokenIn, UNISWAP_ROUTER, amountIn);
            params = ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: USDC,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp + 15 minutes,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            });
            usdcReceived = ISwapRouter(UNISWAP_ROUTER).exactInputSingle(params);
        }
    }

    function _swapUSDCAndSend(
        address tokenOut,
        uint256 usdcAmount,
        uint256 amountOutMinimum,
        uint24 poolFee,
        address recipient
    ) internal {
        if (tokenOut == USDC) {
            _safeTransfer(USDC, recipient, usdcAmount);
            return;
        }

        bool wantNativeETH = (tokenOut == address(0));
        address effectiveOut = wantNativeETH ? WETH : tokenOut;
        address swapRecipient = wantNativeETH ? address(this) : recipient;

        _safeApprove(USDC, UNISWAP_ROUTER, usdcAmount);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDC,
            tokenOut: effectiveOut,
            fee: poolFee,
            recipient: swapRecipient,
            deadline: block.timestamp + 15 minutes,
            amountIn: usdcAmount,
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
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "TransferFrom failed");
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        (bool ok0, ) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, 0));
        require(ok0, "Approve reset failed");
        (bool ok1, bytes memory d1) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, amount));
        require(ok1 && (d1.length == 0 || abi.decode(d1, (bool))), "Approve failed");
    }

    receive() external payable {}
}
