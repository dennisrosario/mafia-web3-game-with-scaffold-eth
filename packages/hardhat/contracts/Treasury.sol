// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Treasury {
	mapping(address => uint) public balances;

	// Deposit funds into the treasury
	function deposit(address player) external payable {
		balances[player] += msg.value;
	}

	// Withdraw funds from the treasury
	function withdraw(address payable to) external {
		uint amount = balances[to];
		require(amount > 0, "No funds to withdraw");

		balances[to] = 0; // Reset balance before transfer to prevent reentrancy
		to.transfer(amount);
	}
}
