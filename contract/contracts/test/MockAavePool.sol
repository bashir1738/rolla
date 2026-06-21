// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockAToken.sol";

interface IERC20Mintable {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

/// @dev Mock Aave V3 Pool for testing RollaVault.
///      Tracks scaled balances (in ray) and simulates yield via setNormalizedIncome().
contract MockAavePool {
    uint256 public constant RAY = 1e27;

    address public usdt;
    MockAToken public aToken;
    uint256 public normalizedIncome = RAY; // starts at 1.0 (no yield)

    // per-depositor scaled balance (same as aToken internal, but kept here for withdraw auth)
    mapping(address => uint256) public scaledDeposits;

    constructor(address _usdt, address _aToken) {
        usdt = _usdt;
        aToken = MockAToken(_aToken);
    }

    /// @notice Supply USDT, receive aToken shares proportional to normalizedIncome
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        require(asset == usdt, "MockPool: only USDT");
        IERC20Mintable(asset).transferFrom(msg.sender, address(this), amount);
        // scaledAmount = amount * RAY / normalizedIncome
        uint256 scaled = (amount * RAY) / normalizedIncome;
        scaledDeposits[onBehalfOf] += scaled;
        aToken.mint(onBehalfOf, scaled);
    }

    /// @notice Withdraw USDT by burning proportional aToken shares
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(asset == usdt, "MockPool: only USDT");
        // scaled = amount * RAY / normalizedIncome
        uint256 scaled = (amount * RAY) / normalizedIncome;
        scaledDeposits[msg.sender] -= scaled;
        aToken.burn(msg.sender, scaled);
        // Mint USDT to `to` (simulate pool holding funds)
        IERC20Mintable(asset).mint(to, amount);
        return amount;
    }

    /// @notice Returns the normalized income — grows over time as yield accrues
    function getReserveNormalizedIncome(address) external view returns (uint256) {
        return normalizedIncome;
    }

    /// @dev Test helper: simulate interest by increasing normalizedIncome.
    ///      E.g. setNormalizedIncome(1.1e27) = 10% yield.
    function setNormalizedIncome(uint256 newIncome) external {
        require(newIncome >= RAY, "Income below 1.0");
        normalizedIncome = newIncome;
    }
}
