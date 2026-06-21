// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title UsernameRegistry
 * @notice Unique, on-chain display names for Rolla wallets on Sepolia.
 *         - 1–32 characters: a-z, A-Z, 0-9, hyphen, underscore.
 *         - Stored and compared lowercase (case-insensitive uniqueness).
 *         - Free to claim — pay gas only.
 *         - Each address can hold one name; claiming a new one releases the old.
 */
contract UsernameRegistry {

    mapping(address => string)  public nameOf;
    mapping(bytes32 => address) private _ownerOf;   // hash(lower) => owner

    event Claimed(address indexed owner, string name);
    event Released(address indexed owner, string name);

    error NameTaken();
    error InvalidName();
    error NoName();

    // ── helpers ───────────────────────────────────────────────────────────────

    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) b[i] = bytes1(uint8(b[i]) + 32);
        }
        return string(b);
    }

    function _hash(string memory s) internal pure returns (bytes32) {
        return keccak256(bytes(_lower(s)));
    }

    function _valid(string memory s) internal pure returns (bool) {
        bytes memory b = bytes(s);
        if (b.length == 0 || b.length > 32) return false;
        for (uint256 i; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7A)  // a-z
                   || (c >= 0x41 && c <= 0x5A)  // A-Z
                   || (c >= 0x30 && c <= 0x39)  // 0-9
                   || c == 0x2D                  // -
                   || c == 0x5F;                 // _
            if (!ok) return false;
        }
        return true;
    }

    // ── views ─────────────────────────────────────────────────────────────────

    function ownerOf(string calldata name) external view returns (address) {
        return _ownerOf[_hash(name)];
    }

    function available(string calldata name) external view returns (bool) {
        return _valid(name) && _ownerOf[_hash(name)] == address(0);
    }

    // ── writes ────────────────────────────────────────────────────────────────

    function claim(string calldata name) external {
        if (!_valid(name)) revert InvalidName();
        bytes32 h = _hash(name);
        if (_ownerOf[h] != address(0)) revert NameTaken();

        // Release the caller's previous name (if any)
        string memory prev = nameOf[msg.sender];
        if (bytes(prev).length > 0) {
            _ownerOf[_hash(prev)] = address(0);
            emit Released(msg.sender, prev);
        }

        string memory lower = _lower(name);
        nameOf[msg.sender] = lower;
        _ownerOf[h] = msg.sender;
        emit Claimed(msg.sender, lower);
    }

    function release() external {
        string memory name = nameOf[msg.sender];
        if (bytes(name).length == 0) revert NoName();
        _ownerOf[_hash(name)] = address(0);
        delete nameOf[msg.sender];
        emit Released(msg.sender, name);
    }
}
