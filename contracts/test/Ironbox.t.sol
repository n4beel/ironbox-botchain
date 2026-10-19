// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Ironbox} from "../src/Ironbox.sol";

contract IronboxTest is Test {
  Ironbox internal ironbox;

  address internal alice = address(0xA11CE);
  address internal bob = address(0xB0B);
  address internal charlie = address(0xCC);

  event Locked(
    uint256 indexed id,
    address indexed sender,
    address indexed beneficiary,
    uint64 unlockAt,
    uint256 amount
  );
  event Withdrawn(uint256 indexed id, address indexed beneficiary, uint256 amount);

  function setUp() public {
    ironbox = new Ironbox();
    // Block timestamp is 1 in a fresh VM. Use a realistic epoch timestamp.
    vm.warp(1_760_000_000);
  }

  // --- the happy path ---------------------------------------------------------------------------

  function test_RecordsLock() public {
    uint64 unlockAt = uint64(block.timestamp + 7 days);
    vm.deal(alice, 1 ether);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: 1 ether}(bob, unlockAt);

    assertEq(id, 1);
    Ironbox.Lock memory item = ironbox.lockOf(id);
    assertEq(item.beneficiary, bob);
    assertEq(item.unlockAt, unlockAt);
    assertFalse(item.withdrawn);
    assertEq(item.amount, 1 ether);
  }

  function test_EmitsLocked() public {
    uint64 unlockAt = uint64(block.timestamp + 7 days);
    vm.deal(alice, 1 ether);

    vm.expectEmit(true, true, true, true, address(ironbox));
    emit Locked(1, alice, bob, unlockAt, 1 ether);

    vm.prank(alice);
    ironbox.lock{value: 1 ether}(bob, unlockAt);
  }

  function test_AllowsWithdrawAfterUnlock() public {
    uint64 unlockAt = uint64(block.timestamp + 1 days);
    vm.deal(alice, 2 ether);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: 2 ether}(bob, unlockAt);

    vm.warp(unlockAt + 1);

    uint256 bobBefore = bob.balance;
    vm.expectEmit(true, true, false, true, address(ironbox));
    emit Withdrawn(id, bob, 2 ether);

    vm.prank(bob);
    ironbox.withdraw(id);

    assertEq(bob.balance - bobBefore, 2 ether);
    Ironbox.Lock memory item = ironbox.lockOf(id);
    assertTrue(item.withdrawn);
  }

  function test_ReadsUnknownLockReturnsEmpty() public view {
    Ironbox.Lock memory item = ironbox.lockOf(999);
    assertEq(item.beneficiary, address(0));
    assertEq(item.unlockAt, 0);
    assertFalse(item.withdrawn);
    assertEq(item.amount, 0);
  }

  // --- guards ----------------------------------------------------------------------------------

  function test_RevertsZeroValue() public {
    vm.expectRevert(Ironbox.ZeroValue.selector);
    vm.prank(alice);
    ironbox.lock{value: 0}(bob, uint64(block.timestamp + 1 days));
  }

  function test_RevertsZeroAddress() public {
    vm.deal(alice, 1 ether);
    vm.expectRevert(Ironbox.ZeroAddress.selector);
    vm.prank(alice);
    ironbox.lock{value: 1 ether}(address(0), uint64(block.timestamp + 1 days));
  }

  function test_RevertsUnlockInPast() public {
    vm.deal(alice, 1 ether);
    vm.expectRevert(Ironbox.UnlockInPast.selector);
    vm.prank(alice);
    ironbox.lock{value: 1 ether}(bob, uint64(block.timestamp));
  }

  function test_RevertsNotBeneficiary() public {
    uint64 unlockAt = uint64(block.timestamp + 1 days);
    vm.deal(alice, 1 ether);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: 1 ether}(bob, unlockAt);

    vm.warp(unlockAt + 1);

    vm.expectRevert(abi.encodeWithSelector(Ironbox.NotBeneficiary.selector, id));
    vm.prank(charlie);
    ironbox.withdraw(id);
  }

  function test_RevertsStillLocked() public {
    uint64 unlockAt = uint64(block.timestamp + 1 days);
    vm.deal(alice, 1 ether);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: 1 ether}(bob, unlockAt);

    vm.expectRevert(abi.encodeWithSelector(Ironbox.StillLocked.selector, id, unlockAt));
    vm.prank(bob);
    ironbox.withdraw(id);
  }

  function test_RevertsAlreadyWithdrawn() public {
    uint64 unlockAt = uint64(block.timestamp + 1 days);
    vm.deal(alice, 1 ether);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: 1 ether}(bob, unlockAt);

    vm.warp(unlockAt);
    vm.prank(bob);
    ironbox.withdraw(id);

    vm.expectRevert(abi.encodeWithSelector(Ironbox.AlreadyWithdrawn.selector, id));
    vm.prank(bob);
    ironbox.withdraw(id);
  }

  // --- gas -------------------------------------------------------------------------------------

  function test_GasCeiling() public {
    vm.deal(alice, 10 ether);
    // Steady state: counter already initialized (>0) and contract address already warm
    vm.prank(alice);
    ironbox.lock{value: 1 ether}(bob, uint64(block.timestamp + 1 days));

    vm.prank(alice);
    uint256 before = gasleft();
    ironbox.lock{value: 1 ether}(bob, uint64(block.timestamp + 2 days));
    uint256 used = before - gasleft();

    emit log_named_uint("lock() gas", used);
    assertLt(used, 90_000, "lock() exceeded 90k gas ceiling");
  }

  // --- properties ------------------------------------------------------------------------------

  function testFuzz_ExactAmountTransferred(uint128 amount) public {
    vm.assume(amount > 0);
    vm.deal(alice, amount);
    uint64 unlockAt = uint64(block.timestamp + 3600);

    vm.prank(alice);
    uint256 id = ironbox.lock{value: amount}(bob, unlockAt);

    vm.warp(unlockAt);
    uint256 bobBefore = bob.balance;

    vm.prank(bob);
    ironbox.withdraw(id);

    assertEq(bob.balance - bobBefore, amount, "beneficiary did not receive exact amount");
  }

  function testFuzz_WithdrawOnlyAfterUnlock(uint32 advance) public {
    vm.assume(advance > 0);
    uint64 start = uint64(block.timestamp);
    uint64 unlockAt = start + 3600;

    vm.deal(alice, 1 ether);
    vm.prank(alice);
    uint256 id = ironbox.lock{value: 1 ether}(bob, unlockAt);

    vm.warp(start + advance);

    if (advance >= 3600) {
      uint256 bobBefore = bob.balance;
      vm.prank(bob);
      ironbox.withdraw(id);
      assertEq(bob.balance - bobBefore, 1 ether);
      assertTrue(ironbox.lockOf(id).withdrawn);
    } else {
      vm.expectRevert(abi.encodeWithSelector(Ironbox.StillLocked.selector, id, unlockAt));
      vm.prank(bob);
      ironbox.withdraw(id);
    }
  }
}
