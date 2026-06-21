// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ISwapRouter.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Test swap router. Burns tokenIn and mints a configured amount of tokenOut.
///      Call setRate() to configure exchange rates before tests.
contract MockSwapRouter {
    // tokenIn => tokenOut => USDT units per 1e18 of tokenIn
    mapping(address => mapping(address => uint256)) public rates;
    // Fallback: tokenIn => fixed output amount (ignores amountIn)
    mapping(address => uint256) public fixedOutput;

    // When true, pull from sender; when false, just mint output (simpler)
    bool public pullInput = true;

    function setRate(address tokenIn, address tokenOut, uint256 rateOut) external {
        rates[tokenIn][tokenOut] = rateOut;
    }

    function setFixedOutput(address tokenIn, uint256 amount) external {
        fixedOutput[tokenIn] = amount;
    }

    function setPullInput(bool _pull) external {
        pullInput = _pull;
    }

    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        // Consume input
        if (pullInput) {
            if (msg.value > 0) {
                // native ETH — nothing to pull, just accept
            } else {
                IMintable(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
            }
        }

        // Compute output
        uint256 fixed_ = fixedOutput[params.tokenIn];
        if (fixed_ > 0) {
            amountOut = fixed_;
        } else {
            uint256 rate = rates[params.tokenIn][params.tokenOut];
            require(rate > 0, "MockRouter: no rate set");
            // rate is tokenOut per 1e18 of tokenIn
            amountOut = (params.amountIn * rate) / 1e18;
        }

        require(amountOut >= params.amountOutMinimum, "MockRouter: slippage");

        // Deliver output
        IMintable(params.tokenOut).mint(params.recipient, amountOut);
    }

    function exactOutputSingle(ISwapRouter.ExactOutputSingleParams calldata params)
        external
        payable
        returns (uint256 amountIn)
    {
        amountIn = params.amountOut; // 1:1 for tests
        if (pullInput && msg.value == 0) {
            IMintable(params.tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }
        IMintable(params.tokenOut).mint(params.recipient, params.amountOut);
    }

    receive() external payable {}
}
