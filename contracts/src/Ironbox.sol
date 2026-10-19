// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/// @title Ironbox
/// @notice Lock BOT until a future timestamp. No early withdrawal, for anyone.
///
/// @dev What this contract deliberately CANNOT do:
/// - No owner: nobody controls this contract after deployment. There are no admin keys, no roles,
///   and no special privileges.
/// - No cancel: the sender cannot retrieve funds once locked, before or after unlockAt.
/// - No early withdrawal: there is no backdoor, recovery hatch, or emergency brake, not even for
///   the contract deployer.
/// - No address change: the beneficiary is set at lock time and is immutable.
/// - No pause / upgrade: code is final and executes without intervention as long as BOT Chain runs.
///
/// Funds are held until `block.timestamp >= unlockAt`. Payments are pull-only: only the beneficiary
/// may withdraw, and effects (marking withdrawn = true) occur strictly before the transfer. Any
/// reentrant call finds withdrawn == true and reverts.
contract Ironbox {
  /// @notice A locked deposit.
  /// @param beneficiary The address permitted to withdraw after unlockAt.
  /// @param unlockAt Unix timestamp (seconds) at/after which funds can be claimed.
  /// @param withdrawn True once the beneficiary has successfully withdrawn.
  /// @param amount Quantity of BOT locked (in wei).
  /// @dev Slot 0 packs beneficiary (20B) + unlockAt (8B) + withdrawn (1B) = 29 bytes.
  /// Slot 1 stores amount (32B).
  struct Lock {
    address beneficiary;
    uint64 unlockAt;
    bool withdrawn;
    uint256 amount;
  }

  /// @dev Monotonically increasing lock counter. First ID is 1.
  uint256 private _nextId;

  /// @dev Private mapping with an explicit getter `lockOf(id)`.
  mapping(uint256 id => Lock) private _locks;

  /// @notice Emitted when BOT is locked.
  event Locked(
    uint256 indexed id,
    address indexed sender,
    address indexed beneficiary,
    uint64 unlockAt,
    uint256 amount
  );

  /// @notice Emitted when a beneficiary withdraws unlocked BOT.
  event Withdrawn(uint256 indexed id, address indexed beneficiary, uint256 amount);

  error ZeroValue();
  error ZeroAddress();
  error UnlockInPast();
  error NotBeneficiary(uint256 id);
  error StillLocked(uint256 id, uint64 unlockAt);
  error AlreadyWithdrawn(uint256 id);
  error TransferFailed(uint256 id, address beneficiary, uint256 amount);

  /// @notice Lock BOT for a beneficiary until a future date.
  /// @param beneficiary The address that will be able to withdraw the locked funds.
  /// @param unlockAt Unix timestamp (seconds) when the lock expires. Must be in the future.
  /// @return id The sequential identifier for this lock (starting at 1).
  function lock(address beneficiary, uint64 unlockAt) external payable returns (uint256 id) {
    if (msg.value == 0) revert ZeroValue();
    if (beneficiary == address(0)) revert ZeroAddress();
    if (unlockAt <= block.timestamp) revert UnlockInPast();

    id = ++_nextId;
    _locks[id] = Lock({
      beneficiary: beneficiary,
      unlockAt: unlockAt,
      withdrawn: false,
      amount: msg.value
    });

    emit Locked(id, msg.sender, beneficiary, unlockAt, msg.value);
  }

  /// @notice Withdraw unlocked BOT. Beneficiary only, once unlockAt has passed, once only.
  /// @param id The identifier of the lock to withdraw.
  function withdraw(uint256 id) external {
    Lock storage item = _locks[id];

    if (msg.sender != item.beneficiary) revert NotBeneficiary(id);
    if (item.withdrawn) revert AlreadyWithdrawn(id);
    if (block.timestamp < item.unlockAt) revert StillLocked(id, item.unlockAt);

    // Effects before interactions
    item.withdrawn = true;
    uint256 amount = item.amount;

    emit Withdrawn(id, msg.sender, amount);

    (bool ok, ) = msg.sender.call{value: amount}("");
    if (!ok) revert TransferFailed(id, msg.sender, amount);
  }

  /// @notice The record for a lock, or zeroed fields if the lock does not exist.
  /// @dev Returns empty struct for unknown IDs rather than reverting.
  function lockOf(uint256 id) external view returns (Lock memory) {
    return _locks[id];
  }
}
