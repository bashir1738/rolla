// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Aave V3 aToken interface — only what RollaVault needs
interface IAToken {
    /// @notice Returns the scaled balance of a user (not including yield)
    /// @dev scaledBalance = balance / normalizedIncome
    function scaledBalanceOf(address user) external view returns (uint256);

    /// @notice Returns the current balance of a user, including accrued yield
    function balanceOf(address user) external view returns (uint256);

    /// @notice Returns the total supply of scaled balances
    function scaledTotalSupply() external view returns (uint256);
}
