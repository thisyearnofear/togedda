// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PredictionBot
 * @dev Intermediary contract for XMTP AI bot to interact with UnifiedPredictionMarket contracts
 * @notice This contract provides additional features like fee collection, access control, and rate limiting
 *
 * Architecture:
 * User → XMTP AI Bot → PredictionBot Contract → UnifiedPredictionMarket Contract
 *
 * Features:
 * - Fee collection for AI prediction services
 * - Access control and rate limiting
 * - Multi-chain support (CELO + Base)
 * - Bot management and governance
 */

interface IUnifiedPredictionMarket {
    function createPrediction(
        string memory title,
        string memory description,
        uint256 targetDate,
        uint256 targetValue,
        uint8 category,
        string memory network,
        string memory emoji,
        bool autoResolvable
    ) external returns (uint256 predictionId);

    function getPrediction(uint256 predictionId) external view returns (
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
        uint8 outcome,
        uint256 createdAt,
        bool autoResolvable
    );
}

contract PredictionBot {
    // State variables
    address public owner;
    address public predictionMarketContract;
    uint256 public proposalFee;
    bool public paused;

    // Bot management
    mapping(address => bool) public authorizedBots;
    mapping(address => uint256) public userLastProposal;
    mapping(address => uint256) public userProposalCount;

    // Rate limiting
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_PROPOSALS_PER_HOUR = 5;

    // Fee collection
    uint256 public totalFeesCollected;
    address public feeRecipient;

    // Events
    event PredictionProposed(
        uint256 indexed predictionId,
        address indexed proposer,
        address indexed bot,
        string title,
        uint256 fee
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event BotAuthorized(address indexed bot, bool authorized);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event ContractPaused(bool paused);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyAuthorizedBot() {
        require(authorizedBots[msg.sender], "Not an authorized bot");
        _;
    }

    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier rateLimited(address user) {
        require(
            block.timestamp >= userLastProposal[user] + RATE_LIMIT_WINDOW ||
            userProposalCount[user] < MAX_PROPOSALS_PER_HOUR,
            "Rate limit exceeded"
        );
        _;
    }

    constructor(
        address _predictionMarketContract,
        uint256 _proposalFee
    ) {
        owner = msg.sender;
        predictionMarketContract = _predictionMarketContract;
        proposalFee = _proposalFee;
        feeRecipient = msg.sender;

        // Authorize the deployer as the first bot
        authorizedBots[msg.sender] = true;

        emit BotAuthorized(msg.sender, true);
    }

    /**
     * @dev Propose a prediction through the AI bot
     * @param title The prediction title
     * @param description The prediction description
     * @param targetDate The target date for the prediction
     * @param targetValue The target value (if applicable)
     * @param category The prediction category (0: FITNESS, 1: CHAIN, 2: COMMUNITY, 3: CUSTOM)
     * @param network The network identifier
     * @param emoji The emoji for the prediction
     * @param autoResolvable Whether the prediction can be auto-resolved
     * @param proposer The address of the user proposing the prediction
     */
    function proposePrediction(
        string memory title,
        string memory description,
        uint256 targetDate,
        uint256 targetValue,
        uint8 category,
        string memory network,
        string memory emoji,
        bool autoResolvable,
        address proposer
    ) external payable onlyAuthorizedBot notPaused rateLimited(proposer) returns (uint256) {
        require(msg.value >= proposalFee, "Insufficient fee");
        require(targetDate > block.timestamp, "Target date must be in the future");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(proposer != address(0), "Invalid proposer address");

        // Update rate limiting
        if (block.timestamp >= userLastProposal[proposer] + RATE_LIMIT_WINDOW) {
            userProposalCount[proposer] = 1;
            userLastProposal[proposer] = block.timestamp;
        } else {
            userProposalCount[proposer]++;
        }

        // Collect fees
        totalFeesCollected += msg.value;

        // Create prediction on the main contract
        uint256 predictionId = IUnifiedPredictionMarket(predictionMarketContract).createPrediction(
            title,
            description,
            targetDate,
            targetValue,
            category,
            network,
            emoji,
            autoResolvable
        );

        emit PredictionProposed(predictionId, proposer, msg.sender, title, msg.value);

        return predictionId;
    }

    /**
     * @dev Simplified prediction proposal with text parsing (for XMTP integration)
     * @param predictionText The raw prediction text from user
     * @param proposer The address of the user proposing the prediction
     */
    function proposePredictionFromText(
        string memory predictionText,
        address proposer
    ) external payable onlyAuthorizedBot notPaused rateLimited(proposer) returns (uint256) {
        require(msg.value >= proposalFee, "Insufficient fee");
        require(bytes(predictionText).length > 0, "Prediction text cannot be empty");
        require(proposer != address(0), "Invalid proposer address");

        // Update rate limiting
        if (block.timestamp >= userLastProposal[proposer] + RATE_LIMIT_WINDOW) {
            userProposalCount[proposer] = 1;
            userLastProposal[proposer] = block.timestamp;
        } else {
            userProposalCount[proposer]++;
        }

        // Collect fees
        totalFeesCollected += msg.value;

        // Create prediction with default values (AI bot should parse and call the detailed function)
        uint256 predictionId = IUnifiedPredictionMarket(predictionMarketContract).createPrediction(
            predictionText, // Use raw text as title for now
            predictionText, // Use raw text as description
            block.timestamp + 30 days, // Default to 30 days
            0, // No target value
            3, // CUSTOM category
            "base", // Default to Base network
            unicode"🤖", // Bot emoji
            false // Not auto-resolvable by default
        );

        emit PredictionProposed(predictionId, proposer, msg.sender, predictionText, msg.value);

        return predictionId;
    }

    // Admin functions
    function setProposalFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = proposalFee;
        proposalFee = _newFee;
        emit FeeUpdated(oldFee, _newFee);
    }

    function authorizeBots(address[] memory bots, bool authorized) external onlyOwner {
        for (uint i = 0; i < bots.length; i++) {
            authorizedBots[bots[i]] = authorized;
            emit BotAuthorized(bots[i], authorized);
        }
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit ContractPaused(_paused);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, "No fees to withdraw");

        (bool success, ) = feeRecipient.call{value: amount}("");
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(feeRecipient, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }

    // View functions
    function getPredictionMarketContract() external view returns (address) {
        return predictionMarketContract;
    }

    function getUserRateLimit(address user) external view returns (uint256 lastProposal, uint256 proposalCount) {
        return (userLastProposal[user], userProposalCount[user]);
    }

    function canUserPropose(address user) external view returns (bool) {
        return block.timestamp >= userLastProposal[user] + RATE_LIMIT_WINDOW ||
               userProposalCount[user] < MAX_PROPOSALS_PER_HOUR;
    }

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }

    receive() external payable {
        // Allow contract to receive ETH
    }
}
