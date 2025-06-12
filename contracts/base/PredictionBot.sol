// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../interfaces/IImperfectFormPredictionMarketV2.sol";

/**
 * @title PredictionBot
 * @dev This contract acts as an AI-powered bot for creating predictions on the ImperfectFormPredictionMarketV2.
 * It allows an authorized bot operator to propose predictions based on user interactions via XMTP messaging.
 */
contract PredictionBot {
    // Reference to the ImperfectFormPredictionMarketV2 contract
    IImperfectFormPredictionMarketV2 public predictionMarket;
    
    // Address of the bot operator who can propose predictions (e.g., the AI bot backend)
    address public botOperator;
    
    // Fee for proposing a prediction, payable to the bot operator (in wei)
    uint256 public proposalFee;
    
    // Owner of the contract, allowed to update settings
    address public owner;
    
    // Events
    event PredictionProposed(
        uint256 indexed predictionId,
        address indexed proposer,
        string title,
        uint256 targetDate
    );
    
    event BotOperatorUpdated(address indexed oldOperator, address indexed newOperator);
    event ProposalFeeUpdated(uint256 oldFee, uint256 newFee);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "PredictionBot: Caller is not the owner");
        _;
    }
    
    modifier onlyBotOperator() {
        require(msg.sender == botOperator, "PredictionBot: Caller is not the bot operator");
        _;
    }
    
    /**
     * @dev Constructor to initialize the PredictionBot contract.
     * @param _predictionMarketAddress Address of the deployed ImperfectFormPredictionMarketV2 contract.
     * @param _initialFee Initial fee for proposing predictions (in wei).
     */
    constructor(address _predictionMarketAddress, uint256 _initialFee) {
        require(_predictionMarketAddress != address(0), "PredictionBot: Market address cannot be zero");
        predictionMarket = IImperfectFormPredictionMarketV2(_predictionMarketAddress);
        botOperator = msg.sender;
        owner = msg.sender;
        proposalFee = _initialFee;
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @dev Allows the bot operator to propose a new prediction based on user chat input via XMTP.
     * The proposal fee is collected from the caller (could be the bot backend or a user).
     * @param _title Title of the prediction.
     * @param _description Detailed description of the prediction.
     * @param _targetDate Unix timestamp by which the prediction is expected to resolve.
     * @param _targetValue Target value for certain types of predictions (e.g., fitness goals).
     * @param _category Category of the prediction (e.g., FITNESS, CHAIN, COMMUNITY, CUSTOM).
     * @param _network Associated blockchain network, if applicable.
     * @param _emoji An emoji to visually represent the prediction.
     * @param _autoResolvable Whether the prediction can be auto-resolved after the target date.
     * @return predictionId The ID of the newly created prediction in the market contract.
     */
    function proposePrediction(
        string memory _title,
        string memory _description,
        uint256 _targetDate,
        uint256 _targetValue,
        IImperfectFormPredictionMarketV2.Category _category,
        string memory _network,
        string memory _emoji,
        bool _autoResolvable
    ) external payable onlyBotOperator returns (uint256 predictionId) {
        require(msg.value >= proposalFee, "PredictionBot: Insufficient proposal fee");
        
        // Transfer the proposal fee to the bot operator
        if (msg.value > 0) {
            payable(botOperator).transfer(msg.value);
        }
        
        // Create the PredictionParams struct
        IImperfectFormPredictionMarketV2.PredictionParams memory params = IImperfectFormPredictionMarketV2.PredictionParams({
            title: _title,
            description: _description,
            targetDate: _targetDate,
            targetValue: _targetValue,
            category: _category,
            network: _network,
            emoji: _emoji,
            autoResolvable: _autoResolvable
        });
        
        // Call the prediction market contract to create the prediction
        // Note: The bot operator is set as the creator, but in a real implementation,
        // this could be modified to attribute creation to the original user if needed.
        predictionId = predictionMarket.createPrediction(params);
        
        emit PredictionProposed(predictionId, msg.sender, _title, _targetDate);
        return predictionId;
    }
    
    /**
     * @dev Allows the owner to update the bot operator address (e.g., to change the AI backend).
     * @param _newOperator Address of the new bot operator.
     */
    function updateBotOperator(address _newOperator) external onlyOwner {
        require(_newOperator != address(0), "PredictionBot: New operator cannot be zero address");
        emit BotOperatorUpdated(botOperator, _newOperator);
        botOperator = _newOperator;
    }
    
    /**
     * @dev Allows the owner to update the proposal fee.
     * @param _newFee New proposal fee in wei.
     */
    function updateProposalFee(uint256 _newFee) external onlyOwner {
        emit ProposalFeeUpdated(proposalFee, _newFee);
        proposalFee = _newFee;
    }
    
    /**
     * @dev Allows the owner to transfer ownership of the contract.
     * @param _newOwner Address of the new owner.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "PredictionBot: New owner cannot be zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }
    
    /**
     * @dev Fallback function to accept ETH (if needed for future extensions).
     */
    receive() external payable {}
}