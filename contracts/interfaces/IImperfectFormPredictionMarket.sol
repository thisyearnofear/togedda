// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IImperfectFormPredictionMarket
 * @dev Interface for the ImperfectFormPredictionMarket contract
 */
interface IImperfectFormPredictionMarket {
    // Enums
    enum Category { FITNESS, CHAIN, COMMUNITY, CUSTOM }
    enum Status { ACTIVE, RESOLVED, CANCELLED }
    enum Outcome { UNRESOLVED, YES, NO }
    
    // Structs
    struct Prediction {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 targetDate;
        uint256 targetValue;
        uint256 currentValue;
        Category category;
        string network;
        string emoji;
        uint256 totalStaked;
        uint256 yesVotes;
        uint256 noVotes;
        Status status;
        Outcome outcome;
        uint256 createdAt;
    }
    
    struct Vote {
        bool isYes;
        uint256 amount;
        bool claimed;
    }
    
    // Events
    event PredictionCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 targetDate,
        Category category,
        string network
    );
    
    event VoteCast(
        uint256 indexed predictionId,
        address indexed voter,
        bool isYes,
        uint256 amount
    );
    
    event PredictionResolved(
        uint256 indexed predictionId,
        Outcome outcome
    );
    
    event PredictionUpdated(
        uint256 indexed predictionId,
        uint256 currentValue
    );
    
    event RewardClaimed(
        uint256 indexed predictionId,
        address indexed user,
        uint256 amount
    );
    
    // Functions
    function createPrediction(
        string memory _title,
        string memory _description,
        uint256 _targetDate,
        uint256 _targetValue,
        Category _category,
        string memory _network,
        string memory _emoji
    ) external returns (uint256);
    
    function vote(uint256 _predictionId, bool _isYes) external payable;
    
    function updatePredictionValue(uint256 _predictionId, uint256 _currentValue) external;
    
    function resolvePrediction(uint256 _predictionId, Outcome _outcome) external;
    
    function claimReward(uint256 _predictionId) external;
    
    function getPrediction(uint256 _predictionId) external view returns (Prediction memory);
    
    function getUserVote(uint256 _predictionId, address _user) external view returns (Vote memory);
    
    function getParticipants(uint256 _predictionId) external view returns (address[] memory);
    
    function getTotalPredictions() external view returns (uint256);
}
