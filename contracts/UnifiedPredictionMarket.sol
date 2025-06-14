// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UnifiedPredictionMarket
 * @dev A unified prediction market contract for CELO and BASE networks
 * @author Imperfect Form Team
 */
contract UnifiedPredictionMarket {
    // Events
    event PredictionCreated(
        uint256 indexed predictionId,
        address indexed creator,
        string title,
        uint256 targetDate,
        uint256 targetValue
    );

    event VoteCast(
        uint256 indexed predictionId,
        address indexed voter,
        bool isYes,
        uint256 amount
    );

    event PredictionResolved(
        uint256 indexed predictionId,
        bool outcome,
        uint256 totalPool,
        uint256 winningPool
    );

    event RewardClaimed(
        uint256 indexed predictionId,
        address indexed claimer,
        uint256 amount
    );

    event SweatEquityFundsReleased(
        uint256 indexed predictionId,
        address indexed user,
        uint256 amount
    );

    // Structs
    struct Prediction {
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
        uint8 status; // 0: Active, 1: Resolved, 2: Cancelled
        uint8 outcome; // 0: Unresolved, 1: Yes, 2: No
        uint256 createdAt;
        bool autoResolvable;
    }

    struct Vote {
        bool isYes;
        uint256 amount;
        bool claimed;
        uint256 timestamp;
    }

    // State variables
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => Vote)) public userVotes;
    mapping(address => uint256[]) public userPredictions;

    uint256 public nextPredictionId = 1;
    uint256 public totalPredictions = 0;

    // Fee structure
    uint256 public charityFeePercentage = 15; // 15%
    uint256 public maintenanceFeePercentage = 5; // 5%
    uint256 public totalFeePercentage = 20; // 20% total

    address public charityAddress;
    address public maintenanceAddress;
    address public owner;
    address public sweatEquityBot;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validPrediction(uint256 predictionId) {
        require(predictionId > 0 && predictionId < nextPredictionId, "Invalid prediction ID");
        _;
    }

    modifier activePrediction(uint256 predictionId) {
        require(predictions[predictionId].status == 0, "Prediction is not active");
        require(block.timestamp < predictions[predictionId].targetDate, "Prediction has expired");
        _;
    }

    modifier onlySweatEquityBot() {
        require(msg.sender == sweatEquityBot, "Only SweatEquityBot can call this function");
        _;
    }

    // Constructor
    constructor(
        address _charityAddress,
        address _maintenanceAddress
    ) {
        owner = msg.sender;
        charityAddress = _charityAddress;
        maintenanceAddress = _maintenanceAddress;
    }

    /**
     * @dev Create a new prediction
     */
    function createPrediction(
        string memory _title,
        string memory _description,
        uint256 _targetDate,
        uint256 _targetValue,
        uint8 _category,
        string memory _network,
        string memory _emoji,
        bool _autoResolvable
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_targetDate > block.timestamp, "Target date must be in the future");

        uint256 predictionId = nextPredictionId++;

        predictions[predictionId] = Prediction({
            id: predictionId,
            creator: msg.sender,
            title: _title,
            description: _description,
            targetDate: _targetDate,
            targetValue: _targetValue,
            currentValue: 0,
            category: _category,
            network: _network,
            emoji: _emoji,
            totalStaked: 0,
            yesVotes: 0,
            noVotes: 0,
            status: 0, // Active
            outcome: 0, // Unresolved
            createdAt: block.timestamp,
            autoResolvable: _autoResolvable
        });

        userPredictions[msg.sender].push(predictionId);
        totalPredictions++;

        emit PredictionCreated(predictionId, msg.sender, _title, _targetDate, _targetValue);

        return predictionId;
    }

    /**
     * @dev Vote on a prediction
     */
    function vote(uint256 predictionId, bool isYes)
        external
        payable
        validPrediction(predictionId)
        activePrediction(predictionId)
    {
        require(msg.value > 0, "Vote amount must be greater than 0");

        Prediction storage prediction = predictions[predictionId];
        Vote storage userVote = userVotes[predictionId][msg.sender];

        // Update user vote (allow multiple votes, they accumulate)
        if (userVote.amount == 0) {
            userVote.isYes = isYes;
            userVote.timestamp = block.timestamp;
        } else {
            // If user is changing their vote direction, require they claim first
            require(userVote.isYes == isYes, "Cannot change vote direction. Claim existing vote first.");
        }

        userVote.amount += msg.value;

        // Update prediction totals
        prediction.totalStaked += msg.value;

        if (isYes) {
            prediction.yesVotes += msg.value;
        } else {
            prediction.noVotes += msg.value;
        }

        emit VoteCast(predictionId, msg.sender, isYes, msg.value);
    }

    /**
     * @dev Resolve a prediction (only owner or creator)
     */
    function resolvePrediction(uint256 predictionId, bool outcome)
        external
        validPrediction(predictionId)
    {
        Prediction storage prediction = predictions[predictionId];
        require(
            msg.sender == owner || msg.sender == prediction.creator,
            "Only owner or creator can resolve"
        );
        require(prediction.status == 0, "Prediction already resolved");
        require(block.timestamp >= prediction.targetDate, "Cannot resolve before target date");

        prediction.status = 1; // Resolved
        prediction.outcome = outcome ? 1 : 2; // 1 = Yes, 2 = No

        // Calculate and distribute fees
        uint256 totalPool = prediction.totalStaked;
        uint256 totalFees = (totalPool * totalFeePercentage) / 100;
        uint256 charityFee = (totalPool * charityFeePercentage) / 100;
        uint256 maintenanceFee = (totalPool * maintenanceFeePercentage) / 100;

        // Transfer fees
        if (charityFee > 0) {
            payable(charityAddress).transfer(charityFee);
        }
        if (maintenanceFee > 0) {
            payable(maintenanceAddress).transfer(maintenanceFee);
        }

        uint256 winningPool = outcome ? prediction.yesVotes : prediction.noVotes;

        emit PredictionResolved(predictionId, outcome, totalPool, winningPool);
    }

    /**
     * @dev Claim rewards for a resolved prediction
     */
    function claimReward(uint256 predictionId)
        external
        validPrediction(predictionId)
    {
        Prediction storage prediction = predictions[predictionId];
        Vote storage userVote = userVotes[predictionId][msg.sender];

        require(prediction.status == 1, "Prediction not resolved yet");
        require(userVote.amount > 0, "No vote found");
        require(!userVote.claimed, "Reward already claimed");

        bool userWon = (prediction.outcome == 1 && userVote.isYes) ||
                       (prediction.outcome == 2 && !userVote.isYes);

        if (!userWon) {
            userVote.claimed = true;
            return; // User lost, no reward
        }

        // Calculate reward
        uint256 totalPool = prediction.totalStaked;
        uint256 totalFees = (totalPool * totalFeePercentage) / 100;
        uint256 rewardPool = totalPool - totalFees;
        uint256 winningPool = prediction.outcome == 1 ? prediction.yesVotes : prediction.noVotes;

        uint256 userReward = (userVote.amount * rewardPool) / winningPool;

        userVote.claimed = true;

        payable(msg.sender).transfer(userReward);

        emit RewardClaimed(predictionId, msg.sender, userReward);
    }

    // View functions
    function getPrediction(uint256 predictionId)
        external
        view
        validPrediction(predictionId)
        returns (Prediction memory)
    {
        return predictions[predictionId];
    }

    /**
     * @dev Get prediction details in SweatEquityBot format (expanded return values)
     */
    function getPredictionDetails(uint256 predictionId)
        external
        view
        validPrediction(predictionId)
        returns (
            uint256 id,
            address creator,
            string memory title,
            string memory description,
            uint256 targetDate,
            uint256 targetValue,
            uint256 currentValue,
            uint8 category,
            string memory network,
            string memory emoji,
            uint256 totalStaked,
            uint256 yesVotes,
            uint256 noVotes,
            uint8 status,
            bool outcome,
            uint256 createdAt,
            bool autoResolvable
        )
    {
        Prediction memory pred = predictions[predictionId];
        return (
            pred.id,
            pred.creator,
            pred.title,
            pred.description,
            pred.targetDate,
            pred.targetValue,
            pred.currentValue,
            pred.category,
            pred.network,
            pred.emoji,
            pred.totalStaked,
            pred.yesVotes,
            pred.noVotes,
            pred.status,
            pred.outcome == 1, // Convert to boolean
            pred.createdAt,
            pred.autoResolvable
        );
    }

    function getUserVote(uint256 predictionId, address user)
        external
        view
        returns (Vote memory)
    {
        return userVotes[predictionId][user];
    }

    function getTotalPredictions() external view returns (uint256) {
        return totalPredictions;
    }

    function getTotalFeePercentage() external view returns (uint256) {
        return totalFeePercentage;
    }

    function getUserPredictions(address user) external view returns (uint256[] memory) {
        return userPredictions[user];
    }

    /**
     * @dev Get user's stake in a prediction - required by SweatEquityBot
     */
    function getUserStake(uint256 predictionId, address user)
        external
        view
        validPrediction(predictionId)
        returns (uint256, bool)
    {
        Vote memory userVote = userVotes[predictionId][user];
        return (userVote.amount, userVote.amount > 0);
    }



    /**
     * @dev Release sweat equity funds - called by SweatEquityBot
     */
    function releaseSweatEquityFunds(
        uint256 predictionId,
        address user,
        uint256 amount
    ) external onlySweatEquityBot validPrediction(predictionId) {
        require(predictions[predictionId].status == 1, "Prediction not resolved");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer funds to user
        payable(user).transfer(amount);

        emit SweatEquityFundsReleased(predictionId, user, amount);
    }

    // Admin functions
    function updateFees(
        uint256 _charityFeePercentage,
        uint256 _maintenanceFeePercentage
    ) external onlyOwner {
        require(_charityFeePercentage + _maintenanceFeePercentage <= 30, "Total fees cannot exceed 30%");
        charityFeePercentage = _charityFeePercentage;
        maintenanceFeePercentage = _maintenanceFeePercentage;
        totalFeePercentage = _charityFeePercentage + _maintenanceFeePercentage;
    }

    function updateAddresses(
        address _charityAddress,
        address _maintenanceAddress
    ) external onlyOwner {
        charityAddress = _charityAddress;
        maintenanceAddress = _maintenanceAddress;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    function setSweatEquityBot(address _sweatEquityBot) external onlyOwner {
        require(_sweatEquityBot != address(0), "SweatEquityBot cannot be zero address");
        sweatEquityBot = _sweatEquityBot;
    }
}
