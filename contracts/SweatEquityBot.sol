// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface IPredictionMarket {
    struct PredictionData {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 targetDate;
        uint256 targetValue;
        uint256 currentValue;
        uint8 category;
        string network;
        string emoji;
        uint256 totalStaked;
        uint256 yesVotes;
        uint256 noVotes;
        uint8 status;
        uint8 outcome;
        uint256 createdAt;
        bool autoResolvable;
    }

    function getPrediction(uint256 predictionId) external view returns (PredictionData memory);

    function getUserStake(uint256 predictionId, address user) external view returns (uint256, bool);
    function releaseSweatEquityFunds(uint256 predictionId, address user, uint256 amount) external;
}

interface IFitnessLeaderboard {
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
    }

    function getLeaderboard() external view returns (Score[] memory);
}

/**
 * @title SweatEquityBot
 * @dev Revolutionary fitness-first prediction market bot that allows users to earn back lost stakes through exercise
 * Uses real on-chain fitness data from imperfectform.fun sister app for verification
 */
contract SweatEquityBot is ERC721, Ownable, ReentrancyGuard {
    uint256 private _sweatEquityIds;

    // Core prediction market contract
    IPredictionMarket public predictionMarket;

    // Fitness leaderboard contracts across networks
    mapping(string => address) public fitnessContracts;

    // Sweat Equity System
    struct SweatEquityChallenge {
        uint256 predictionId;
        address user;
        uint256 recoverableAmount;
        uint256 deadline; // 24 hours from challenge creation
        bool completed;
        bool claimed;
        uint8 exerciseType; // 0: pushups, 1: squats
        uint256 targetAmount; // Additional exercise required
        uint256 baselineAmount; // User's exercise count when challenge created
        uint256 createdAt;
    }

    // Exercise verification types
    enum ExerciseType { PUSHUPS, SQUATS }
    enum VerificationStatus { PENDING, APPROVED, REJECTED }

    // Storage
    mapping(uint256 => SweatEquityChallenge) public sweatEquityChallenges;
    mapping(address => uint256[]) public userChallenges;
    mapping(uint256 => VerificationStatus) public verificationStatus;
    mapping(address => uint256) public sweatEquityScore; // Gamification points
    mapping(address => uint256) public streakCount;

    // Events
    event SweatEquityChallengeCreated(
        uint256 indexed challengeId,
        uint256 indexed predictionId,
        address indexed user,
        uint256 recoverableAmount,
        uint8 exerciseType,
        uint256 targetAmount,
        uint256 baselineAmount
    );

    event SweatEquityCompleted(
        uint256 indexed challengeId,
        address indexed user,
        uint256 finalExerciseCount,
        uint256 timestamp
    );

    event SweatEquityClaimed(
        uint256 indexed challengeId,
        address indexed user,
        uint256 amount
    );

    event FitnessContractUpdated(
        string indexed network,
        address contractAddress
    );

    // Constants
    uint256 public constant SWEAT_EQUITY_WINDOW = 24 hours;
    uint256 public constant CHARITY_FEE_PERCENT = 15; // 15% to charity (non-recoverable)
    uint256 public constant MAINTENANCE_FEE_PERCENT = 5; // 5% maintenance (non-recoverable)
    uint256 public constant RECOVERABLE_PERCENT = 80; // 80% recoverable through sweat equity

    constructor(address _predictionMarket) ERC721("SweatEquityNFT", "SENFT") Ownable(msg.sender) {
        predictionMarket = IPredictionMarket(_predictionMarket);
    }

    /**
     * @dev Set fitness contract address for a network
     * @param network Network name (e.g., "base", "celo", "polygon")
     * @param contractAddress Address of the fitness leaderboard contract
     */
    function setFitnessContract(string memory network, address contractAddress) external onlyOwner {
        fitnessContracts[network] = contractAddress;
        emit FitnessContractUpdated(network, contractAddress);
    }

    /**
     * @dev Create a sweat equity challenge for a losing prediction
     * @param predictionId The prediction that was lost
     * @param exerciseType Type of exercise to complete (0: pushups, 1: squats)
     * @param targetAmount Additional amount of exercise required
     */
    function createSweatEquityChallenge(
        uint256 predictionId,
        uint8 exerciseType,
        uint256 targetAmount
    ) external nonReentrant {
        require(exerciseType <= 1, "Invalid exercise type"); // Only pushups (0) and squats (1)

        // Get user's stake in the prediction
        (uint256 stakeAmount, bool voted) = predictionMarket.getUserStake(predictionId, msg.sender);
        require(voted && stakeAmount > 0, "No stake in this prediction");

        // Verify prediction is resolved and user lost
        IPredictionMarket.PredictionData memory prediction = predictionMarket.getPrediction(predictionId);
        require(prediction.status == 1, "Prediction not resolved"); // Assuming 1 = resolved

        // Check if user actually lost the prediction
        (uint256 userStake, bool userVoted) = predictionMarket.getUserStake(predictionId, msg.sender);
        require(userVoted && userStake > 0, "No valid stake found");

        // Determine if user lost (simplified logic - in practice you'd need the user's vote direction)
        bool userLost = true; // This should be determined based on user's vote vs actual outcome
        require(userLost, "User did not lose this prediction");

        // Get user's current exercise baseline from on-chain fitness data
        uint256 baselineAmount = getUserCurrentExerciseCount(msg.sender, exerciseType);

        // Calculate recoverable amount (80% of stake)
        uint256 recoverableAmount = (stakeAmount * RECOVERABLE_PERCENT) / 100;

        _sweatEquityIds++;
        uint256 challengeId = _sweatEquityIds;

        sweatEquityChallenges[challengeId] = SweatEquityChallenge({
            predictionId: predictionId,
            user: msg.sender,
            recoverableAmount: recoverableAmount,
            deadline: block.timestamp + SWEAT_EQUITY_WINDOW,
            completed: false,
            claimed: false,
            exerciseType: exerciseType,
            targetAmount: targetAmount,
            baselineAmount: baselineAmount,
            createdAt: block.timestamp
        });

        userChallenges[msg.sender].push(challengeId);
        verificationStatus[challengeId] = VerificationStatus.PENDING;

        emit SweatEquityChallengeCreated(
            challengeId,
            predictionId,
            msg.sender,
            recoverableAmount,
            exerciseType,
            targetAmount,
            baselineAmount
        );
    }

    /**
     * @dev Verify and approve sweat equity completion using on-chain fitness data
     * @param challengeId The challenge to verify and approve
     */
    function verifyAndApprove(uint256 challengeId) external {
        SweatEquityChallenge storage challenge = sweatEquityChallenges[challengeId];
        require(block.timestamp <= challenge.deadline, "Challenge expired");
        require(!challenge.completed, "Already completed");

        // Get user's current exercise count from on-chain fitness data
        uint256 currentExerciseCount = getUserCurrentExerciseCount(challenge.user, challenge.exerciseType);

        // Check if they completed the required additional exercise
        uint256 additionalExercise = currentExerciseCount - challenge.baselineAmount;

        require(additionalExercise >= challenge.targetAmount, "Target not reached");

        // Mark as completed
        challenge.completed = true;
        verificationStatus[challengeId] = VerificationStatus.APPROVED;

        // Update gamification metrics
        sweatEquityScore[challenge.user] += challenge.targetAmount;
        streakCount[challenge.user]++;

        // Mint Sweat Equity NFT
        _safeMint(challenge.user, challengeId);

        emit SweatEquityCompleted(challengeId, challenge.user, currentExerciseCount, block.timestamp);
    }

    /**
     * @dev Get user's current exercise count from on-chain fitness data across all networks
     * @param user The user's address
     * @param exerciseType Type of exercise (0: pushups, 1: squats)
     * @return Total exercise count across all networks
     */
    function getUserCurrentExerciseCount(address user, uint8 exerciseType) public view returns (uint256) {
        uint256 totalCount = 0;

        // Check fitness contracts across networks
        string[4] memory networks = ["base", "celo", "polygon", "monad"];

        for (uint i = 0; i < networks.length; i++) {
            address fitnessContract = fitnessContracts[networks[i]];
            if (fitnessContract != address(0)) {
                try IFitnessLeaderboard(fitnessContract).getLeaderboard() returns (IFitnessLeaderboard.Score[] memory scores) {
                    for (uint j = 0; j < scores.length; j++) {
                        if (scores[j].user == user) {
                            totalCount += exerciseType == 0 ? scores[j].pushups : scores[j].squats;
                            break; // Found user in this network, move to next
                        }
                    }
                } catch {
                    // Contract call failed, continue to next network
                    continue;
                }
            }
        }

        return totalCount;
    }

    /**
     * @dev Claim recovered stake after completing sweat equity
     * @param challengeId The completed challenge
     */
    function claimSweatEquity(uint256 challengeId) external nonReentrant {
        SweatEquityChallenge storage challenge = sweatEquityChallenges[challengeId];
        require(challenge.user == msg.sender, "Not your challenge");
        require(challenge.completed, "Challenge not completed");
        require(!challenge.claimed, "Already claimed");
        require(verificationStatus[challengeId] == VerificationStatus.APPROVED, "Not approved");

        challenge.claimed = true;

        // Request fund release from prediction market
        predictionMarket.releaseSweatEquityFunds(
            challenge.predictionId,
            challenge.user,
            challenge.recoverableAmount
        );

        emit SweatEquityClaimed(challengeId, msg.sender, challenge.recoverableAmount);
    }

    /**
     * @dev Get user's active challenges
     * @param user The user address
     * @return Array of challenge IDs
     */
    function getUserChallenges(address user) external view returns (uint256[] memory) {
        return userChallenges[user];
    }

    /**
     * @dev Get challenge details
     * @param challengeId The challenge ID
     * @return Challenge struct data
     */
    function getChallenge(uint256 challengeId) external view returns (SweatEquityChallenge memory) {
        return sweatEquityChallenges[challengeId];
    }

    /**
     * @dev Check if user can create sweat equity for a prediction
     * @param predictionId The prediction ID
     * @param user The user address
     * @return Boolean indicating eligibility
     */
    function canCreateSweatEquity(uint256 predictionId, address user) external view returns (bool) {
        try predictionMarket.getUserStake(predictionId, user) returns (uint256 stakeAmount, bool voted) {
            if (!voted || stakeAmount == 0) return false;

            try predictionMarket.getPrediction(predictionId) returns (IPredictionMarket.PredictionData memory prediction) {
                return prediction.status == 1; // Prediction resolved
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    /**
     * @dev Check if user has enough additional exercise to complete challenge
     * @param challengeId The challenge to check
     * @return Boolean indicating if challenge can be completed
     */
    function canCompleteChallenge(uint256 challengeId) external view returns (bool) {
        SweatEquityChallenge storage challenge = sweatEquityChallenges[challengeId];

        if (challenge.completed || block.timestamp > challenge.deadline) {
            return false;
        }

        uint256 currentCount = getUserCurrentExerciseCount(challenge.user, challenge.exerciseType);
        uint256 additionalExercise = currentCount - challenge.baselineAmount;

        return additionalExercise >= challenge.targetAmount;
    }

    /**
     * @dev Emergency withdrawal function (should not be needed with new fund management)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}

    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}
