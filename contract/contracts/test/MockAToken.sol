// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Mock Aave aToken. Pool calls mint/burn; vault calls scaledBalanceOf.
contract MockAToken {
    address public pool;
    mapping(address => uint256) private _scaled; // scaled (ray) balances

    constructor(address _pool) {
        pool = _pool;
    }

    /// @dev Called once after deployment to wire up the pool when there's a circular dependency
    function setPool(address _pool) external {
        require(pool == address(0), "Pool already set");
        pool = _pool;
    }

    modifier onlyPool() {
        require(msg.sender == pool, "Only pool");
        _;
    }

    function mint(address to, uint256 scaledAmount) external onlyPool {
        _scaled[to] += scaledAmount;
    }

    function burn(address from, uint256 scaledAmount) external onlyPool {
        _scaled[from] -= scaledAmount;
    }

    function scaledBalanceOf(address user) external view returns (uint256) {
        return _scaled[user];
    }

    // balanceOf is not used by vault but included for completeness
    function balanceOf(address user) external view returns (uint256) {
        return _scaled[user]; // simplified 1:1
    }

    function scaledTotalSupply() external pure returns (uint256) {
        return 0;
    }
}
