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
	address public lastKilled;
	Treasury public treasury;

	mapping(address => uint) public votes;
	uint public totalVotes;

	event GameStarted();
	event RoleAssigned(address indexed player, Role role);
	event PlayerKilled(address indexed killedPlayer);
	event GameEnded(address[] winners);
	event AssassinAction(address indexed assassin, address indexed target);
	event PlayerVoted(address indexed voter, address indexed target);
	event NightNarration(address indexed killer, address indexed victim);
	event DayNarration(address indexed victim);
	event VotingRestarted();
	event VotingResult(
		address indexed mostVoted,
		uint highestVotes,
		bool isTie,
		uint[] voteCounts
	);

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

		currentState = GameState.Night;
		startTime = block.timestamp;
	}

	function assassinKill(
		address target
	) external onlyAssassin onlyInState(GameState.Night) onlyAlive {
		require(players[target].isAlive, "Target is already dead!");
		require(target != msg.sender, "Assassin cannot kill themselves!");

		players[target].isAlive = false;
		lastKilled = target;
		emit PlayerKilled(target);
		emit AssassinAction(msg.sender, target);
		emit NightNarration(msg.sender, target);
	}

	function progressGame() external {
		require(hasStageEnded(), "Current stage time has not yet ended");

		if (currentState == GameState.Night) {
			endNight();
		} else if (currentState == GameState.Day) {
			checkVoteResult();
		}
	}

	function endNight() private {
		currentState = GameState.Day;
		startTime = block.timestamp;
		emit DayNarration(lastKilled);
	}

	function voteToKill(
		address target
	) external onlyAlive onlyInState(GameState.Day) {
		require(!players[msg.sender].hasVoted, "You have already voted!");
		require(players[target].isAlive, "Target is already dead!");

		players[msg.sender].hasVoted = true;
		votes[target]++;
		totalVotes++;
		emit PlayerVoted(msg.sender, target);
	}

	function checkVoteResult() private {
		address mostVoted = address(0);
		uint highestVotes = 0;
		bool isTie = false;
		uint[] memory voteCounts = new uint[](playerAddresses.length - 1);

		for (uint i = 0; i < playerAddresses.length; i++) {
			address player = playerAddresses[i];
			if (players[player].isAlive) {
				voteCounts[i] = votes[player];
				if (votes[player] > highestVotes) {
					highestVotes = votes[player];
					mostVoted = player;
					isTie = false;
				} else if (votes[player] == highestVotes && highestVotes > 0) {
					isTie = true;
				}
			}
		}

		if (!isTie && mostVoted != address(0)) {
			players[mostVoted].isAlive = false;
			emit PlayerKilled(mostVoted);
			emit DayNarration(mostVoted);
			finalizeGame();
		} else {
			emit VotingRestarted();
		}

		resetVoting();
		emit VotingResult(mostVoted, highestVotes, isTie, voteCounts);
	}

	function resetVoting() private {
		for (uint256 i = 0; i < playerAddresses.length; i++) {
			players[playerAddresses[i]].hasVoted = false;
			votes[playerAddresses[i]] = 0;
		}
		totalVotes = 0;
		startTime = block.timestamp;
	}

	function finalizeGame() private {
		uint256 aliveAssassins = 0;
		bool policeAlive = false;
		bool citizenAlive = false;

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			if (players[playerAddresses[i]].isAlive) {
				if (players[playerAddresses[i]].role == Role.Assassin) {
					aliveAssassins++;
				} else if (players[playerAddresses[i]].role == Role.Police) {
					policeAlive = true;
				} else if (players[playerAddresses[i]].role == Role.Citizen) {
					citizenAlive = true;
				}
			}
		}

		Role[] memory winningRoles = new Role[](2);
		if (aliveAssassins == 0) {
			winningRoles[0] = Role.Police;
			winningRoles[1] = Role.Citizen;
		} else {
			winningRoles[0] = Role.Assassin;
		}

		endGame(winningRoles);
	}

	function endGame(Role[] memory winningRoles) private {
		address[] memory winners = getWinnersByRoles(winningRoles);
		uint totalPrize = treasury.getBalance();
		uint prizePerWinner = totalPrize / winners.length;

		for (uint i = 0; i < winners.length; i++) {
			treasury.distributePrize(winners[i], prizePerWinner);
		}
		currentState = GameState.Finished;
		emit GameEnded(winners);
	}

	function getWinnersByRoles(
		Role[] memory roles
	) private view returns (address[] memory) {
		uint winnerCount = 0;
		for (uint i = 0; i < playerAddresses.length; i++) {
			for (uint j = 0; j < roles.length; j++) {
				if (
					players[playerAddresses[i]].isAlive &&
					players[playerAddresses[i]].role == roles[j]
				) {
					winnerCount++;
					break;
				}
			}
		}

		address[] memory winners = new address[](winnerCount);
		uint index = 0;
		for (uint i = 0; i < playerAddresses.length; i++) {
			for (uint j = 0; j < roles.length; j++) {
				if (
					players[playerAddresses[i]].isAlive &&
					players[playerAddresses[i]].role == roles[j]
				) {
					winners[index] = playerAddresses[i];
					index++;
					break;
				}
			}
		}
		return winners;
	}

	function hasStageEnded() public view returns (bool) {
		return (block.timestamp >= startTime + currentStageDuration());
	}

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

	function getAllPlayers() public view returns (Player[] memory) {
		Player[] memory allPlayers = new Player[](playerAddresses.length);
		for (uint256 i = 0; i < playerAddresses.length; i++) {
			allPlayers[i] = players[playerAddresses[i]];
		}
		return allPlayers;
	}
}
