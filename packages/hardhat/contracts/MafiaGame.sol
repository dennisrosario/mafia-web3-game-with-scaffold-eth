// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Treasury.sol";

contract MafiaGame {
	enum Role {
		Assassin,
		Police,
		Citizen
	}
	enum GameState {
		Waiting,
		AssigningRoles,
		Night,
		Day,
		Finished
	}

	struct Player {
		address playerAddress;
		Role role;
		bool isAlive;
		bool hasVoted;
	}

	mapping(address => Player) public players;
	address[] public playerAddresses;
	GameState public currentState;
	uint public startTime;
	uint public stageDuration;
	address public lastKilled;
	Treasury public treasury;

	// Voting variables
	mapping(address => uint) public votes; // Track votes for each player
	uint public totalVotes;

	// Events
	event GameStarted();
	event RoleAssigned(address indexed player, Role role);
	event PlayerKilled(address indexed player);
	event GameEnded(address[] winners);
	event AssassinAction(address indexed assassin, address indexed target);
	event PlayerVoted(address indexed voter, address indexed target);
	event NightNarration(address indexed killer, address indexed victim);
	event DayNarration(address indexed victim);

	modifier onlyAlive() {
		require(players[msg.sender].isAlive, "You are dead!");
		_;
	}

	modifier onlyInState(GameState state) {
		require(currentState == state, "Invalid game state!");
		_;
	}

	modifier onlyAssassin() {
		require(
			players[msg.sender].role == Role.Assassin,
			"You are not an assassin!"
		);
		_;
	}

	constructor(address _treasuryAddress) {
		treasury = Treasury(_treasuryAddress);
		currentState = GameState.Waiting;
	}

	function joinGame() external payable onlyInState(GameState.Waiting) {
		require(msg.value == 0.1 ether, "Must pay 0.1 ETH to join");
		require(playerAddresses.length < 4, "Game is full");
		require(
			players[msg.sender].playerAddress == address(0),
			"Player has already joined"
		);

		players[msg.sender] = Player(msg.sender, Role.Citizen, true, false);
		playerAddresses.push(msg.sender);
		treasury.deposit{ value: msg.value }(msg.sender);

		if (playerAddresses.length == 4) {
			startGame();
		}
	}

	function startGame() private {
		currentState = GameState.AssigningRoles;
		startTime = block.timestamp;
		emit GameStarted();
		assignRoles();
	}

	function assignRoles() private {
		// Simple random assignment for demonstration; replace with a secure method in production
		players[playerAddresses[0]].role = Role.Assassin;
		players[playerAddresses[1]].role = Role.Assassin;
		players[playerAddresses[2]].role = Role.Police;
		players[playerAddresses[3]].role = Role.Citizen;

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			emit RoleAssigned(
				playerAddresses[i],
				players[playerAddresses[i]].role
			);
		}

		// Move to the night phase after role assignment
		currentState = GameState.Night;
		startTime = block.timestamp; // Reset start time for the night phase
	}

	function assassinKill(
		address target
	) external onlyAssassin onlyInState(GameState.Night) onlyAlive {
		require(players[target].isAlive, "Target is already dead!");
		require(target != msg.sender, "Assassin cannot kill themselves!");

		// Kill the target
		players[target].isAlive = false;
		lastKilled = target; // Store last killed address
		emit PlayerKilled(target);
		emit AssassinAction(msg.sender, target);
		emit NightNarration(msg.sender, target);

		// Move to day phase
		endNight();
	}

	function endNight() private {
		currentState = GameState.Day;
		startTime = block.timestamp; // Reset start time for the day phase
		emit DayNarration(lastKilled);
	}

	function voteToKill(
		address target
	) external onlyAlive onlyInState(GameState.Day) {
		require(!players[target].hasVoted, "Player has already voted!");
		players[target].hasVoted = true;
		votes[target]++;
		totalVotes++;
		emit PlayerVoted(msg.sender, target);

		// Check if voting is over
		if (totalVotes >= 3) {
			// Majority required to kill (3 votes in a 4-player game)
			executeVote(target);
		}
	}

	function executeVote(address target) private {
		require(players[target].isAlive, "Target is already dead!");

		// Kill the target
		players[target].isAlive = false;
		emit PlayerKilled(target);
		emit DayNarration(target);

		// Check for winners
		checkForGameEnd();

		// Reset voting for the next day
		resetVoting();
	}

	function resetVoting() private {
		for (uint256 i = 0; i < playerAddresses.length; i++) {
			players[playerAddresses[i]].hasVoted = false; // Reset voting status for the next day
		}
		totalVotes = 0; // Reset total votes
	}

	function checkForGameEnd() private {
		uint256 aliveCount = 0;
		uint256 assassinCount = 0;
		uint256 townCount = 0; // Track number of Town members (Police + Citizen)

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			if (players[playerAddresses[i]].isAlive) {
				aliveCount++;
				if (players[playerAddresses[i]].role == Role.Assassin) {
					assassinCount++;
				} else {
					townCount++;
				}
			}
		}

		// Check if all players are dead
		if (aliveCount == 0) {
			endGame(); // All players dead, end the game
			return;
		}

		// Check if only Assassins remain
		if (assassinCount == aliveCount) {
			endGame(); // Assassins win
			return;
		}

		// Check if Police Officer and Citizen remain
		if (assassinCount == 0 && townCount == 2) {
			endGame(); // Town wins
			return;
		}

		// Check if 1 Assassin and 1 Town member remain
		if (assassinCount == 1 && townCount == 1) {
			endGame(); // Assassin wins
			return;
		}
	}

	function endGame() private {
		address[] memory winners = determineWinner();
		currentState = GameState.Finished;
		emit GameEnded(winners); // Emit event with the winners
	}

	function determineWinner() private view returns (address[] memory) {
		uint256 aliveCount = 0;
		address[] memory winners;

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			if (players[playerAddresses[i]].isAlive) {
				winners[aliveCount] = players[playerAddresses[i]].playerAddress; // Store the player's address in the winners array
				aliveCount++;

				// Break the loop if we have found two winners
				if (aliveCount == 2) {
					break;
				}
			}
		}

		// If no winners are found
		if (aliveCount == 0) {
			revert("No winner found");
		}

		// Resize the array if only one winner is found
		if (aliveCount < 2) {
			return winners; // Return only the single winner
		}

		// Return the winners (up to 2)
		return winners;
	}

	function withdrawPrize() external onlyInState(GameState.Finished) {
		// Logic to withdraw the prize
		treasury.withdraw(payable(msg.sender));
	}

	// Function to check the current stage duration
	function currentStageDuration() public view returns (uint) {
		if (currentState == GameState.AssigningRoles) {
			return 30 seconds;
		} else if (currentState == GameState.Night) {
			return 30 seconds;
		} else if (currentState == GameState.Day) {
			return 60 seconds;
		} else {
			return 0; // No active stage
		}
	}

	// Function to check if the current stage has ended
	function hasStageEnded() public view returns (bool) {
		return (block.timestamp >= startTime + currentStageDuration());
	}

	// Function to get the count of joined players
	function getPlayerCount() public view returns (uint256) {
		return playerAddresses.length;
	}

	// Function to get all joined players and player addresses
	function getAllPlayers() public view returns (Player[] memory) {
		Player[] memory allPlayers = new Player[](playerAddresses.length);

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			allPlayers[i] = players[playerAddresses[i]];
		}

		return allPlayers;
	}
}
