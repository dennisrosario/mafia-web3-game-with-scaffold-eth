// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Treasury.sol";

contract MafiaGame {
    enum Role { Assassin, Police, Citizen }
    enum GameState { Waiting, Night, Day, Finished }

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
    uint public nightDuration = 30 seconds;
    uint public dayDuration = 60 seconds;
    address public lastKilled;
    Treasury public treasury;

    // Events
    event GameStarted();
    event RoleAssigned(address indexed player, Role role);
    event PlayerKilled(address indexed player);
    event GameEnded(address winner);
    event AssassinAction(address indexed assassin, address indexed target);
    event PlayerVoted(address indexed voter, address indexed target);

    modifier onlyAlive() {
        require(players[msg.sender].isAlive, "You are dead!");
        _;
    }

    modifier onlyInState(GameState state) {
        require(currentState == state, "Invalid game state!");
        _;
    }

    modifier onlyAssassin() {
        require(players[msg.sender].role == Role.Assassin, "You are not an assassin!");
        _;
    }

    constructor(address _treasuryAddress) {
        treasury = Treasury(_treasuryAddress);
        currentState = GameState.Waiting;
    }

    function joinGame() external payable onlyInState(GameState.Waiting) {
        require(msg.value == 0.1 ether, "Must pay 0.1 ETH to join");
        require(playerAddresses.length < 4, "Game is full");

        players[msg.sender] = Player(msg.sender, Role.Citizen, true, false);
        playerAddresses.push(msg.sender);
        treasury.deposit{value: msg.value}();

        if (playerAddresses.length == 4) {
            assignRoles();
            startTime = block.timestamp;
            currentState = GameState.Night;
            emit GameStarted();
        }
    }

    function assignRoles() private {
        // Simple random assignment for demonstration; replace with a secure method in production
        players[playerAddresses[0]].role = Role.Assassin;
        players[playerAddresses[1]].role = Role.Assassin;
        players[playerAddresses[2]].role = Role.Police;
        players[playerAddresses[3]].role = Role.Citizen;

        for (uint i = 0; i < playerAddresses.length; i++) {
            emit RoleAssigned(playerAddresses[i], players[playerAddresses[i]].role);
        }
    }

    function assassinKill(address target) external onlyAssassin onlyInState(GameState.Night) onlyAlive {
        require(players[target].isAlive, "Target is already dead!");
        require(target != msg.sender, "Assassin cannot kill themselves!");

        // Kill the target
        players[target].isAlive = false;
        lastKilled = target; // Store last killed address
        emit PlayerKilled(target);
        emit AssassinAction(msg.sender, target);
        
        // Check for game end conditions
        checkForGameEnd();
    }

    function endNight() external onlyInState(GameState.Night) {
        // Logic to transition from night to day phase
        currentState = GameState.Day;
        // Additional logic can be added here to handle end of night actions
    }

    function voteToKill(address target) external onlyAlive onlyInState(GameState.Day) {
        require(!players[target].hasVoted, "Player has already voted!");
        players[target].hasVoted = true;
        emit PlayerVoted(msg.sender, target);
        
        // Logic to tally votes and handle the killing of the target player can be implemented here
        // For example, once a majority is reached, call a kill function or a game end check
    }

    function checkForGameEnd() private {
        uint aliveCount = 0;
        uint assassinCount = 0;

        for (uint i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].isAlive) {
                aliveCount++;
                if (players[playerAddresses[i]].role == Role.Assassin) {
                    assassinCount++;
                }
            }
        }

        // Check if all players are dead
        if (aliveCount == 0) {
            endGame(); // All players dead, end the game
            return;
        }

        // Check if assassins have won
        if (assassinCount == aliveCount) {
            endGame(); // Assassins win
            return;
        }

        // Check if the town has won
        if (aliveCount == 2 && assassinCount == 1) {
            endGame(); // Town wins
            return;
        }
    }

    function endGame() public {
        address winner = determineWinner();
        currentState = GameState.Finished;
        emit GameEnded(winner);
    }

    function determineWinner() private view returns (address) {
        // Logic to determine the winner based on the remaining players
        for (uint i = 0; i < playerAddresses.length; i++) {
            if (players[playerAddresses[i]].isAlive) {
                return players[playerAddresses[i]].playerAddress; // Return the last alive player's address
            }
        }
        revert("No winner found");
    }

    function withdrawPrize() external onlyInState(GameState.Finished) {
        // Logic to withdraw the prize
        treasury.withdraw(payable(msg.sender));
    }
}
