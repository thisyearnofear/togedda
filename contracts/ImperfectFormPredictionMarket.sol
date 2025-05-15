// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title ImperfectFormPredictionMarket
 * @dev A prediction market contract for the Imperfect Form Farcaster mini app
 * Allows users to create predictions, vote, and stake tokens on outcomes
 */
contract ImperfectFormPredictionMarket {
    // Enum for prediction categories
    enum Category { FITNESS, CHAIN, COMMUNITY, CUSTOM }
    
    // Enum for prediction status
    enum Status { ACTIVE, RESOLVED, CANCELLED }
    
    // Enum for outcome
    enum Outcome { UNRESOLVED, YES, NO }
    
    // Struct for prediction
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
    
    // Struct for user vote
    struct Vote {
        bool isYes;
        uint256 amount;
        bool claimed;
    }
    
    // Contract owner
    address public owner;
    
    // Counter for prediction IDs
    uint256 private nextPredictionId;
    
    // Mapping from prediction ID to Prediction
    mapping(uint256 => Prediction) public predictions;
    
    // Mapping from prediction ID to user address to Vote
    mapping(uint256 => mapping(address => Vote)) public votes;
    
    // Mapping from prediction ID to participants
    mapping(uint256 => address[]) public participants;
    
    // Mapping to check if an address is already in participants
    mapping(uint256 => mapping(address => bool)) private isParticipant;
    
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
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier predictionExists(uint256 _predictionId) {
        require(_predictionId < nextPredictionId, "Prediction does not exist");
        _;
    }
    
    modifier predictionActive(uint256 _predictionId) {
        require(predictions[_predictionId].status == Status.ACTIVE, "Prediction is not active");
        _;
    }
    
    modifier predictionResolved(uint256 _predictionId) {
        require(predictions[_predictionId].status == Status.RESOLVED, "Prediction is not resolved");
        _;
    }
    
    modifier notExpired(uint256 _predictionId) {
        require(block.timestamp < predictions[_predictionId].targetDate, "Prediction has expired");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        nextPredictionId = 1;
    }
    
    /**
     * @dev Create a new prediction
     * @param _title Title of the prediction
     * @param _description Description of the prediction
     * @param _targetDate Target date for the prediction (unix timestamp)
     * @param _targetValue Target value for the prediction (for fitness goals)
     * @param _category Category of the prediction
     * @param _network Associated blockchain network
     * @param _emoji Emoji representing the prediction
     * @return id of the created prediction
     */
    function createPrediction(
        string memory _title,
        string memory _description,
        uint256 _targetDate,
        uint256 _targetValue,
        Category _category,
        string memory _network,
        string memory _emoji
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_targetDate > block.timestamp, "Target date must be in the future");
        
        uint256 predictionId = nextPredictionId++;
        
        Prediction storage newPrediction = predictions[predictionId];
        newPrediction.id = predictionId;
        newPrediction.creator = msg.sender;
        newPrediction.title = _title;
        newPrediction.description = _description;
        newPrediction.targetDate = _targetDate;
        newPrediction.targetValue = _targetValue;
        newPrediction.currentValue = 0;
        newPrediction.category = _category;
        newPrediction.network = _network;
        newPrediction.emoji = _emoji;
        newPrediction.status = Status.ACTIVE;
        newPrediction.outcome = Outcome.UNRESOLVED;
        newPrediction.createdAt = block.timestamp;
        
        // Add creator to participants
        if (!isParticipant[predictionId][msg.sender]) {
            participants[predictionId].push(msg.sender);
            isParticipant[predictionId][msg.sender] = true;
        }
        
        emit PredictionCreated(
            predictionId,
            msg.sender,
            _title,
            _targetDate,
            _category,
            _network
        );
        
        return predictionId;
    }
    
    /**
     * @dev Vote on a prediction with staked amount
     * @param _predictionId ID of the prediction
     * @param _isYes Whether the vote is for "yes"
     */
    function vote(uint256 _predictionId, bool _isYes) 
        external 
        payable
        predictionExists(_predictionId)
        predictionActive(_predictionId)
        notExpired(_predictionId)
    {
        require(msg.value > 0, "Must stake some amount to vote");
        
        Prediction storage prediction = predictions[_predictionId];
        
        // Update vote count
        if (_isYes) {
            prediction.yesVotes += msg.value;
        } else {
            prediction.noVotes += msg.value;
        }
        
        // Update total staked
        prediction.totalStaked += msg.value;
        
        // Record the vote
        Vote storage userVote = votes[_predictionId][msg.sender];
        
        // If user has already voted, update their vote
        if (userVote.amount > 0) {
            // If changing vote direction, update the vote counts
            if (userVote.isYes != _isYes) {
                if (_isYes) {
                    prediction.noVotes -= userVote.amount;
                    prediction.yesVotes += userVote.amount;
                } else {
                    prediction.yesVotes -= userVote.amount;
                    prediction.noVotes += userVote.amount;
                }
            }
            
            // Update the user's vote
            userVote.isYes = _isYes;
            userVote.amount += msg.value;
        } else {
            // First time voting
            userVote.isYes = _isYes;
            userVote.amount = msg.value;
            userVote.claimed = false;
        }
        
        // Add voter to participants if not already
        if (!isParticipant[_predictionId][msg.sender]) {
            participants[_predictionId].push(msg.sender);
            isParticipant[_predictionId][msg.sender] = true;
        }
        
        emit VoteCast(_predictionId, msg.sender, _isYes, msg.value);
    }
    
    /**
     * @dev Update the current value for a prediction (for fitness goals)
     * @param _predictionId ID of the prediction
     * @param _currentValue New current value
     */
    function updatePredictionValue(uint256 _predictionId, uint256 _currentValue)
        external
        onlyOwner
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];
        prediction.currentValue = _currentValue;
        
        emit PredictionUpdated(_predictionId, _currentValue);
    }
    
    /**
     * @dev Resolve a prediction
     * @param _predictionId ID of the prediction
     * @param _outcome Outcome of the prediction
     */
    function resolvePrediction(uint256 _predictionId, Outcome _outcome)
        external
        onlyOwner
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        require(_outcome != Outcome.UNRESOLVED, "Cannot resolve to UNRESOLVED");
        
        Prediction storage prediction = predictions[_predictionId];
        prediction.status = Status.RESOLVED;
        prediction.outcome = _outcome;
        
        emit PredictionResolved(_predictionId, _outcome);
    }
    
    /**
     * @dev Claim rewards for a resolved prediction
     * @param _predictionId ID of the prediction
     */
    function claimReward(uint256 _predictionId)
        external
        predictionExists(_predictionId)
        predictionResolved(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];
        Vote storage userVote = votes[_predictionId][msg.sender];
        
        require(userVote.amount > 0, "No vote found");
        require(!userVote.claimed, "Reward already claimed");
        
        bool userVotedCorrectly = (prediction.outcome == Outcome.YES && userVote.isYes) ||
                                 (prediction.outcome == Outcome.NO && !userVote.isYes);
        
        if (!userVotedCorrectly) {
            userVote.claimed = true;
            emit RewardClaimed(_predictionId, msg.sender, 0);
            return;
        }
        
        // Calculate reward
        uint256 totalCorrectVotes = prediction.outcome == Outcome.YES ? 
                                   prediction.yesVotes : 
                                   prediction.noVotes;
        
        uint256 reward = (userVote.amount * prediction.totalStaked) / totalCorrectVotes;
        
        // Mark as claimed
        userVote.claimed = true;
        
        // Transfer reward
        payable(msg.sender).transfer(reward);
        
        emit RewardClaimed(_predictionId, msg.sender, reward);
    }
    
    /**
     * @dev Get prediction details
     * @param _predictionId ID of the prediction
     */
    function getPrediction(uint256 _predictionId)
        external
        view
        predictionExists(_predictionId)
        returns (Prediction memory)
    {
        return predictions[_predictionId];
    }
    
    /**
     * @dev Get user vote for a prediction
     * @param _predictionId ID of the prediction
     * @param _user Address of the user
     */
    function getUserVote(uint256 _predictionId, address _user)
        external
        view
        predictionExists(_predictionId)
        returns (Vote memory)
    {
        return votes[_predictionId][_user];
    }
    
    /**
     * @dev Get participants for a prediction
     * @param _predictionId ID of the prediction
     */
    function getParticipants(uint256 _predictionId)
        external
        view
        predictionExists(_predictionId)
        returns (address[] memory)
    {
        return participants[_predictionId];
    }
    
    /**
     * @dev Get total number of predictions
     */
    function getTotalPredictions() external view returns (uint256) {
        return nextPredictionId - 1;
    }
}
