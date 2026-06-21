// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal Aave V3 IPool interface — only the functions used by Rolla
interface IPool {
    /// @notice Supplies an asset into the Aave pool and mints aTokens to onBehalfOf
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /// @notice Withdraws an asset from the Aave pool, burning corresponding aTokens
    /// @return The actual amount withdrawn
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /// @notice Returns the ongoing normalized income for the reserve
    /// @dev Expressed in ray (1e27). Grows over time as yield accrues.
    function getReserveNormalizedIncome(address asset) external view returns (uint256);
}
