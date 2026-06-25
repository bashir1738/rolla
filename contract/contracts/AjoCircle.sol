// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/ISwapRouter.sol";
import "./utils/ReentrancyGuard.sol";

/// @title AjoCircle
/// @notice Trustless rotating savings circles (ajo / esusu / adashe).
///         Members contribute a fixed USDC amount each round. When every
///         member has paid, the pot is released to the current round's
///         recipient. Contributions and claims accept any EVM token via
///         an atomic Uniswap V3 swap.
contract AjoCircle is ReentrancyGuard {
    // ─── Immutables ─────────────────────────────────────────────────────────
    address public immutable USDC;
    address public immutable UNISWAP_ROUTER;
    address public immutable WETH;
    address public immutable owner;

    // ─── Types ──────────────────────────────────────────────────────────────
    enum CircleStatus {
        Recruiting,
        Active,
        Completed
    }

    struct Circle {
        string name;
        address[] members;
        uint256 maxMembers;
        uint256 contributionAmount; // USDC (6 decimals)
        uint256 currentRound;       // 0-indexed; increments after each payout trigger
        uint256 totalRounds;        // == maxMembers
        uint256 poolBalance;        // USDC held pending claim
        uint256 nextPayoutTimestamp;
        uint256 frequency;          // seconds between rounds
        CircleStatus status;
        bool payoutPending;         // true once all have paid; false after claim
        uint256 paidCount;          // uint256 avoids truncation vs maxMembers
        mapping(address => bool) hasPaidThisRound;
        mapping(address => uint256) payoutPosition; // 1-indexed join order
    }

    // ─── Storage ─────────────────────────────────────────────────────────────
    mapping(uint256 => Circle) public circles;
    uint256 public circleCount;
    mapping(uint256 => bool) private _circleIdUsed;
    mapping(address => uint256[]) private _userCircles;

    // ─── Events ──────────────────────────────────────────────────────────────
    event CircleCreated(uint256 indexed circleId, address indexed creator, string name);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event CircleActivated(uint256 indexed circleId);
    event ContributionMade(
        uint256 indexed circleId,
        address indexed member,
        uint256 usdcAmount,
        uint256 round
    );
    event PayoutReleased(
        uint256 indexed circleId,
        address indexed recipient,
        uint256 amount,
        uint256 round
    );
    event CircleCompleted(uint256 indexed circleId);

    // ─── Constructor ─────────────────────────────────────────────────────────
    constructor(address _usdc, address _router, address _weth) {
        require(_usdc != address(0) && _router != address(0), "Zero address");
        USDC = _usdc;
        UNISWAP_ROUTER = _router;
        WETH = _weth;
        owner = msg.sender;
    }

    // ─── External: Create ────────────────────────────────────────────────────

    /// @notice Create a new circle. Creator automatically joins as position 1.
    function createCircle(
        string memory name,
        uint256 maxMembers,
        uint256 contributionAmountUSDC,
        uint256 frequencyInSeconds
    ) external returns (uint256 circleId) {
        require(bytes(name).length > 0, "Empty name");
        require(maxMembers >= 2 && maxMembers <= 50, "Members: 2-50");
        require(contributionAmountUSDC > 0, "Zero contribution");
        require(frequencyInSeconds > 0, "Zero frequency");

        circleId = _generateCircleId();
        Circle storage c = circles[circleId];
        c.name = name;
        c.maxMembers = maxMembers;
        c.contributionAmount = contributionAmountUSDC;
        c.totalRounds = maxMembers;
        c.frequency = frequencyInSeconds;
        c.status = CircleStatus.Recruiting;

        c.members.push(msg.sender);
        c.payoutPosition[msg.sender] = 1;
        _userCircles[msg.sender].push(circleId);

        emit CircleCreated(circleId, msg.sender, name);
        emit MemberJoined(circleId, msg.sender);
    }

    // ─── External: Join ──────────────────────────────────────────────────────

    /// @notice Join a recruiting circle.
    function joinCircle(uint256 circleId) external {
        Circle storage c = circles[circleId];
        require(c.members.length < c.maxMembers, "Circle is full");
        require(c.status == CircleStatus.Recruiting, "Not recruiting");
        require(c.payoutPosition[msg.sender] == 0, "Already a member");

        c.members.push(msg.sender);
        c.payoutPosition[msg.sender] = c.members.length; // 1-indexed
        _userCircles[msg.sender].push(circleId);

        emit MemberJoined(circleId, msg.sender);

        if (c.members.length == c.maxMembers) {
            c.status = CircleStatus.Active;
            c.nextPayoutTimestamp = block.timestamp + c.frequency;
            emit CircleActivated(circleId);
        }
    }

    // ─── External: Contribute ────────────────────────────────────────────────

    /// @notice Contribute to the current round.
    ///         Accepts any EVM token (or native ETH when tokenIn == address(0)).
    ///         Token is swapped to USDC atomically via Uniswap V3.
    ///         Any excess USDC above contributionAmount is returned to sender.
    function contribute(
        uint256 circleId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external payable nonReentrant {
        // Reject accidental ETH on non-native paths
        if (tokenIn != address(0)) {
            require(msg.value == 0, "ETH not accepted for ERC20 path");
        }

        Circle storage c = circles[circleId];
        require(c.status == CircleStatus.Active, "Circle not active");
        require(!c.payoutPending, "Awaiting payout claim");
        require(c.payoutPosition[msg.sender] > 0, "Not a member");
        require(!c.hasPaidThisRound[msg.sender], "Already contributed this round");

        uint256 usdcReceived = _pullAndSwapToUSDC(tokenIn, amountIn, amountOutMinimum, poolFee);
        require(usdcReceived >= c.contributionAmount, "Insufficient USDC after swap");

        // Return dust above contributionAmount
        uint256 excess = usdcReceived - c.contributionAmount;
        if (excess > 0) _safeTransfer(USDC, msg.sender, excess);

        // Effects
        c.hasPaidThisRound[msg.sender] = true;
        c.paidCount++;
        c.poolBalance += c.contributionAmount;

        emit ContributionMade(circleId, msg.sender, c.contributionAmount, c.currentRound);

        if (c.paidCount == c.maxMembers) {
            _triggerPayout(circleId);
        }
    }

    // ─── External: Claim Payout ──────────────────────────────────────────────

    /// @notice Current round's recipient claims the pot.
    ///         tokenOut == USDC returns USDC directly; any other address swaps to that token.
    function claimPayout(
        uint256 circleId,
        address tokenOut,
        uint256 amountOutMinimum,
        uint24 poolFee
    ) external nonReentrant {
        Circle storage c = circles[circleId];
        require(c.payoutPending, "No payout pending");

        // currentRound has already been incremented by _triggerPayout;
        // the recipient is the member at index (currentRound - 1).
        uint256 roundIdx = c.currentRound - 1;
        address recipient = c.members[roundIdx];
        require(msg.sender == recipient, "Not current recipient");

        uint256 payout = c.poolBalance;

        // Effects before interactions
        c.poolBalance = 0;
        c.payoutPending = false;

        emit PayoutReleased(circleId, recipient, payout, roundIdx);

        // Send payout
        _swapUSDCAndSend(tokenOut, payout, amountOutMinimum, poolFee, recipient);

        // If all rounds complete, close the circle
        if (c.currentRound == c.totalRounds) {
            c.status = CircleStatus.Completed;
            emit CircleCompleted(circleId);
        }
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    function getCircleInfo(uint256 circleId)
        external
        view
        returns (
            string memory name,
            uint256 maxMembers,
            uint256 contributionAmount,
            uint256 currentRound,
            uint256 totalRounds,
            uint256 poolBalance,
            uint256 nextPayoutTimestamp,
            uint256 frequency,
            CircleStatus status,
            bool payoutPending,
            uint256 paidCount
        )
    {
        Circle storage c = circles[circleId];
        return (
            c.name,
            c.maxMembers,
            c.contributionAmount,
            c.currentRound,
            c.totalRounds,
            c.poolBalance,
            c.nextPayoutTimestamp,
            c.frequency,
            c.status,
            c.payoutPending,
            c.paidCount
        );
    }

    function getMembers(uint256 circleId) external view returns (address[] memory) {
        return circles[circleId].members;
    }

    function hasPaid(uint256 circleId, address member) external view returns (bool) {
        return circles[circleId].hasPaidThisRound[member];
    }

    /// @notice Returns the address of the current payout recipient, or address(0) if none pending.
    function getCurrentRecipient(uint256 circleId) external view returns (address) {
        Circle storage c = circles[circleId];
        if (!c.payoutPending || c.currentRound == 0) return address(0);
        uint256 roundIdx = c.currentRound - 1;
        if (roundIdx >= c.members.length) return address(0);
        return c.members[roundIdx];
    }

    function getMemberPosition(uint256 circleId, address member) external view returns (uint256) {
        return circles[circleId].payoutPosition[member];
    }

    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return circles[circleId].members.length;
    }

    function getUserCircles(address user) external view returns (uint256[] memory) {
        return _userCircles[user];
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

    function _triggerPayout(uint256 circleId) internal {
        Circle storage c = circles[circleId];
        c.payoutPending = true;
        c.currentRound++;
        c.paidCount = 0;
        c.nextPayoutTimestamp = block.timestamp + c.frequency;

        // Reset payment flags for all members
        for (uint256 i = 0; i < c.members.length; i++) {
            c.hasPaidThisRound[c.members[i]] = false;
        }
    }

    /// @dev Pulls tokenIn from msg.sender and returns the USDC amount received.
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

    // ─── ID Generation ───────────────────────────────────────────────────────

    /// @dev Generates a unique 6-digit circle ID (100000–999999).
    function _generateCircleId() internal returns (uint256 id) {
        id = (uint256(keccak256(abi.encodePacked(block.prevrandao, msg.sender, circleCount++))) % 900000) + 100000;
        // Collision resolution (statistically near-impossible at scale)
        while (_circleIdUsed[id]) {
            id = (id % 999999) + 100000;
        }
        _circleIdUsed[id] = true;
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
