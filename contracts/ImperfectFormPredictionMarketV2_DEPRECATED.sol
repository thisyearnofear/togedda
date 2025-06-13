// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title ImperfectFormPredictionMarketV2
 * @author [Your Name/Organization]
 * @notice An upgraded prediction market contract allowing users to create predictions,
 * vote by staking ETH, and claim rewards. Features charitable donations,
 * maintenance fees, prediction cancellation, and configurable fees.
 */
contract ImperfectFormPredictionMarketV2 {
    // --- Enums ---

    /**
     * @dev Categories for predictions.
     */
    enum Category { FITNESS, CHAIN, COMMUNITY, CUSTOM }

    /**
     * @dev Status of a prediction.
     * ACTIVE: Open for voting.
     * RESOLVED: Outcome determined, rewards can be claimed.
     * CANCELLED: Prediction cancelled, stakes can be refunded.
     */
    enum Status { ACTIVE, RESOLVED, CANCELLED }

    /**
     * @dev Possible outcomes of a prediction.
     * UNRESOLVED: Outcome not yet determined.
     * YES: Prediction resolved affirmatively.
     * NO: Prediction resolved negatively.
     */
    enum Outcome { UNRESOLVED, YES, NO }

    // --- Structs ---

    /**
     * @dev Represents a prediction market.
     * @param id Unique identifier for the prediction.
     * @param creator Address of the user who created the prediction.
     * @param title Title of the prediction.
     * @param description Detailed description of the prediction.
     * @param targetDate Unix timestamp by which the prediction is expected to resolve.
     * @param targetValue Target value for certain types of predictions (e.g., fitness goals).
     * @param currentValue Current value related to the target (e.g., progress in a fitness goal).
     * @param category The category of the prediction.
     * @param network Associated blockchain network, if applicable.
     * @param emoji An emoji to visually represent the prediction.
     * @param totalStaked Total ETH staked on this prediction.
     * @param yesVotes Total ETH staked on the "YES" outcome.
     * @param noVotes Total ETH staked on the "NO" outcome.
     * @param status Current status of the prediction (ACTIVE, RESOLVED, CANCELLED).
     * @param outcome The resolved outcome of the prediction.
     * @param createdAt Unix timestamp when the prediction was created.
     * @param autoResolvable Flag indicating if the prediction can be auto-resolved after targetDate.
     */
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
        bool autoResolvable;
    }

    /**
     * @dev Represents a user's vote on a prediction.
     * @param isYes True if the vote is for "YES", false for "NO".
     * @param amount Amount of ETH staked by the user for this vote.
     * @param claimed True if the user has claimed their reward or refund for this prediction.
     */
    struct Vote {
        bool isYes;
        uint256 amount;
        bool claimed;
    }

    // --- Constants and State Variables ---

    uint256 public constant PERCENTAGE_BASE = 100;
    uint256 public constant MAX_FEE_PERCENTAGE = 50; // Max combined charity and maintenance fee (e.g., 50%)

    address public owner;
    address public charityAddress;
    address public maintenanceAddress;

    uint256 public charityFeePercentage;
    uint256 public maintenanceFeePercentage;

    uint256 private nextPredictionId;

    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => address[]) public participants;
    mapping(uint256 => mapping(address => bool)) private isParticipant;

    // --- Events ---

    event PredictionCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 targetDate,
        Category category,
        string network,
        bool autoResolvable
    );

    event VoteCast(
        uint256 indexed predictionId,
        address indexed voter,
        bool isYes,
        uint256 amountStakedNow,
        uint256 totalUserStake
    );

    event PredictionResolved(
        uint256 indexed predictionId,
        Outcome outcome
    );

    event PredictionCancelled(uint256 indexed predictionId);

    event PredictionUpdated(
        uint256 indexed predictionId,
        uint256 currentValue
    );

    event RewardClaimed(
        uint256 indexed predictionId,
        address indexed user,
        uint256 amount
    );

    event RefundClaimed(
        uint256 indexed predictionId,
        address indexed user,
        uint256 amount
    );

    event CharityDonation(
        uint256 indexed predictionId,
        address indexed charityAddress,
        uint256 amount
    );

    event MaintenanceFee(
        uint256 indexed predictionId,
        address indexed maintenanceAddress,
        uint256 amount
    );

    event FeesUpdated(
        uint256 newCharityFeePercentage,
        uint256 newMaintenanceFeePercentage
    );

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


    // --- Modifiers ---

    modifier onlyOwner() {
        require(msg.sender == owner, "ImperfectForm: Caller is not the owner");
        _;
    }

    modifier predictionExists(uint256 _predictionId) {
        require(_predictionId < nextPredictionId && _predictionId > 0, "ImperfectForm: Prediction does not exist");
        _;
    }

    modifier predictionActive(uint256 _predictionId) {
        require(predictions[_predictionId].status == Status.ACTIVE, "ImperfectForm: Prediction is not active");
        _;
    }

    modifier predictionResolved(uint256 _predictionId) {
        require(predictions[_predictionId].status == Status.RESOLVED, "ImperfectForm: Prediction is not resolved");
        _;
    }

     modifier predictionCancelled(uint256 _predictionId) {
        require(predictions[_predictionId].status == Status.CANCELLED, "ImperfectForm: Prediction is not cancelled");
        _;
    }

    modifier notExpired(uint256 _predictionId) {
        require(block.timestamp < predictions[_predictionId].targetDate, "ImperfectForm: Prediction has expired for voting");
        _;
    }

    // --- Constructor ---

    /**
     * @dev Initializes the contract, setting the owner, charity, and maintenance addresses, and initial fee percentages.
     * @param _charityAddress The address to receive charity donations.
     * @param _maintenanceAddress The address to receive maintenance fees.
     * @param _initialCharityFee The initial charity fee percentage (e.g., 15 for 15%).
     * @param _initialMaintenanceFee The initial maintenance fee percentage (e.g., 5 for 5%).
     */
    constructor(
        address _charityAddress,
        address _maintenanceAddress,
        uint256 _initialCharityFee,
        uint256 _initialMaintenanceFee
    ) {
        owner = msg.sender;
        nextPredictionId = 1; // Start IDs from 1

        require(_charityAddress != address(0), "ImperfectForm: Charity address cannot be zero");
        require(_maintenanceAddress != address(0), "ImperfectForm: Maintenance address cannot be zero");
        charityAddress = _charityAddress;
        maintenanceAddress = _maintenanceAddress;

        require(_initialCharityFee + _initialMaintenanceFee <= MAX_FEE_PERCENTAGE, "ImperfectForm: Initial total fees exceed max limit");
        require(_initialCharityFee + _initialMaintenanceFee < PERCENTAGE_BASE, "ImperfectForm: Initial total fees cannot be 100% or more");
        charityFeePercentage = _initialCharityFee;
        maintenanceFeePercentage = _initialMaintenanceFee;

        emit OwnershipTransferred(address(0), msg.sender);
    }

    // --- Owner Functions ---

    /**
     * @dev Allows the owner to transfer ownership of the contract.
     * @param _newOwner The address of the new owner.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "ImperfectForm: New owner cannot be zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @dev Allows the owner to update the charity address.
     * @param _newCharityAddress The new charity address.
     */
    function updateCharityAddress(address _newCharityAddress) external onlyOwner {
        require(_newCharityAddress != address(0), "ImperfectForm: Charity address cannot be zero");
        charityAddress = _newCharityAddress;
    }

    /**
     * @dev Allows the owner to update the maintenance address.
     * @param _newMaintenanceAddress The new maintenance address.
     */
    function updateMaintenanceAddress(address _newMaintenanceAddress) external onlyOwner {
        require(_newMaintenanceAddress != address(0), "ImperfectForm: Maintenance address cannot be zero");
        maintenanceAddress = _newMaintenanceAddress;
    }

    /**
     * @dev Allows the owner to update the fee percentages for charity and maintenance.
     * @param _newCharityFeePercentage The new charity fee percentage.
     * @param _newMaintenanceFeePercentage The new maintenance fee percentage.
     */
    function updateFeePercentages(uint256 _newCharityFeePercentage, uint256 _newMaintenanceFeePercentage) external onlyOwner {
        require(_newCharityFeePercentage + _newMaintenanceFeePercentage <= MAX_FEE_PERCENTAGE, "ImperfectForm: Total fees exceed max limit");
        require(_newCharityFeePercentage + _newMaintenanceFeePercentage < PERCENTAGE_BASE, "ImperfectForm: Total fees cannot be 100% or more");

        charityFeePercentage = _newCharityFeePercentage;
        maintenanceFeePercentage = _newMaintenanceFeePercentage;

        emit FeesUpdated(_newCharityFeePercentage, _newMaintenanceFeePercentage);
    }

    /**
     * @dev Allows the owner to update the current value for a prediction (e.g., for fitness goals).
     * @param _predictionId ID of the prediction.
     * @param _currentValue New current value.
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
     * @dev Allows the owner to resolve a prediction manually.
     * @param _predictionId ID of the prediction.
     * @param _outcome The determined outcome of the prediction (YES or NO).
     */
    function resolvePrediction(uint256 _predictionId, Outcome _outcome)
        external
        onlyOwner
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        require(_outcome != Outcome.UNRESOLVED, "ImperfectForm: Cannot resolve to UNRESOLVED");

        Prediction storage prediction = predictions[_predictionId];
        prediction.status = Status.RESOLVED;
        prediction.outcome = _outcome;
        emit PredictionResolved(_predictionId, _outcome);
    }

    /**
     * @dev Allows the owner to cancel an active prediction.
     * Stakes can then be refunded to users.
     * @param _predictionId ID of the prediction to cancel.
     */
    function cancelPrediction(uint256 _predictionId)
        external
        onlyOwner
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];
        prediction.status = Status.CANCELLED;
        emit PredictionCancelled(_predictionId);
    }

    // --- Public User Functions ---

    /**
     * @dev Creates a new prediction market.
     * @param _title Title of the prediction.
     * @param _description Detailed description.
     * @param _targetDate Unix timestamp for resolution.
     * @param _targetValue Target value (e.g., for fitness goals).
     * @param _category Category of the prediction.
     * @param _network Associated blockchain network (e.g., "Ethereum Mainnet").
     * @param _emoji Emoji for the prediction.
     * @param _autoResolvable Whether this prediction can be auto-resolved after its target date.
     * @return id The ID of the newly created prediction.
     */
    function createPrediction(
        string memory _title,
        string memory _description,
        uint256 _targetDate,
        uint256 _targetValue,
        Category _category,
        string memory _network,
        string memory _emoji,
        bool _autoResolvable
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "ImperfectForm: Title cannot be empty");
        require(_targetDate > block.timestamp, "ImperfectForm: Target date must be in the future");

        uint256 predictionId = nextPredictionId++;

        Prediction storage newPrediction = predictions[predictionId];
        newPrediction.id = predictionId;
        newPrediction.creator = msg.sender;
        newPrediction.title = _title;
        newPrediction.description = _description;
        newPrediction.targetDate = _targetDate;
        newPrediction.targetValue = _targetValue;
        // newPrediction.currentValue = 0; // Default is 0
        newPrediction.category = _category;
        newPrediction.network = _network;
        newPrediction.emoji = _emoji;
        newPrediction.status = Status.ACTIVE;
        // newPrediction.outcome = Outcome.UNRESOLVED; // Default is 0 (UNRESOLVED)
        newPrediction.createdAt = block.timestamp;
        newPrediction.autoResolvable = _autoResolvable;

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
            _network,
            _autoResolvable
        );
        return predictionId;
    }

    /**
     * @dev Allows a user to vote on an active prediction by staking ETH.
     * If the user has voted before, their new stake is added, and their vote direction can be changed.
     * @param _predictionId ID of the prediction to vote on.
     * @param _isYes True to vote "YES", false to vote "NO".
     */
    function vote(uint256 _predictionId, bool _isYes)
        external
        payable
        predictionExists(_predictionId)
        predictionActive(_predictionId)
        notExpired(_predictionId)
    {
        require(msg.value > 0, "ImperfectForm: Must stake some amount to vote");

        Prediction storage prediction = predictions[_predictionId];
        Vote storage userVote = votes[_predictionId][msg.sender];
        uint256 previousUserAmount = userVote.amount;

        // Add new stake to overall prediction totals
        prediction.totalStaked += msg.value;
        if (_isYes) {
            prediction.yesVotes += msg.value;
        } else {
            prediction.noVotes += msg.value;
        }

        // If user had a previous vote and is changing direction
        if (previousUserAmount > 0 && userVote.isYes != _isYes) {
            if (userVote.isYes) { // Old vote was YES, new vote is NO
                require(prediction.yesVotes >= previousUserAmount, "ImperfectForm: Insufficient YES pool for vote change");
                prediction.yesVotes -= previousUserAmount; // Remove old stake from YES pool
                prediction.noVotes += previousUserAmount;  // Add old stake to NO pool
            } else { // Old vote was NO, new vote is YES
                require(prediction.noVotes >= previousUserAmount, "ImperfectForm: Insufficient NO pool for vote change");
                prediction.noVotes -= previousUserAmount; // Remove old stake from NO pool
                prediction.yesVotes += previousUserAmount;  // Add old stake to YES pool
            }
        }

        // Update user's vote details
        userVote.isYes = _isYes;
        userVote.amount += msg.value; // Accumulate total stake by this user
        userVote.claimed = false;     // Reset claimed status if re-voting

        if (!isParticipant[_predictionId][msg.sender]) {
            participants[_predictionId].push(msg.sender);
            isParticipant[_predictionId][msg.sender] = true;
        }

        emit VoteCast(_predictionId, msg.sender, _isYes, msg.value, userVote.amount);
    }

    /**
     * @dev Allows a user to claim their rewards if they voted correctly on a resolved prediction.
     * Fees are deducted and sent to charity and maintenance addresses.
     * @param _predictionId ID of the resolved prediction.
     */
    function claimReward(uint256 _predictionId)
        external
        predictionExists(_predictionId)
        predictionResolved(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];
        Vote storage userVote = votes[_predictionId][msg.sender];

        require(userVote.amount > 0, "ImperfectForm: No vote found for this user");
        require(!userVote.claimed, "ImperfectForm: Reward already claimed or refund processed");

        bool userVotedCorrectly = (prediction.outcome == Outcome.YES && userVote.isYes) ||
                                 (prediction.outcome == Outcome.NO && !userVote.isYes);

        userVote.claimed = true; // Mark as claimed early to prevent reentrancy

        if (!userVotedCorrectly) {
            emit RewardClaimed(_predictionId, msg.sender, 0);
            return;
        }

        uint256 totalCorrectlyStakedAmount = (prediction.outcome == Outcome.YES) ?
                                           prediction.yesVotes :
                                           prediction.noVotes;

        require(totalCorrectlyStakedAmount > 0, "ImperfectForm: No winning stakes pool (should not happen if user claims correctly)");

        uint256 userShareBeforeFees = (userVote.amount * prediction.totalStaked) / totalCorrectlyStakedAmount;

        uint256 currentCharityFee = (userShareBeforeFees * charityFeePercentage) / PERCENTAGE_BASE;
        uint256 currentMaintenanceFee = (userShareBeforeFees * maintenanceFeePercentage) / PERCENTAGE_BASE;
        uint256 totalFees = currentCharityFee + currentMaintenanceFee;

        require(userShareBeforeFees >= totalFees, "ImperfectForm: Fees exceed calculated share");
        uint256 payoutAmount = userShareBeforeFees - totalFees;

        if (currentCharityFee > 0) {
            payable(charityAddress).transfer(currentCharityFee);
            emit CharityDonation(_predictionId, charityAddress, currentCharityFee);
        }

        if (currentMaintenanceFee > 0) {
            payable(maintenanceAddress).transfer(currentMaintenanceFee);
            emit MaintenanceFee(_predictionId, maintenanceAddress, currentMaintenanceFee);
        }

        if (payoutAmount > 0) {
            payable(msg.sender).transfer(payoutAmount);
        }
        emit RewardClaimed(_predictionId, msg.sender, payoutAmount);
    }

    /**
     * @dev Allows a user to claim a refund of their staked amount if a prediction was cancelled.
     * @param _predictionId ID of the cancelled prediction.
     */
    function claimRefund(uint256 _predictionId)
        external
        predictionExists(_predictionId)
        predictionCancelled(_predictionId) // Modifier ensures status is CANCELLED
    {
        Prediction storage prediction = predictions[_predictionId]; // Not strictly needed due to modifier, but good for clarity
        Vote storage userVote = votes[_predictionId][msg.sender];

        require(userVote.amount > 0, "ImperfectForm: No vote found for this user to refund");
        require(!userVote.claimed, "ImperfectForm: Refund already claimed or reward processed");

        uint256 refundAmount = userVote.amount;
        userVote.claimed = true; // Mark as claimed to prevent re-claiming

        // Optional: Adjust prediction.totalStaked, prediction.yesVotes/noVotes if desired,
        // but for simple refund, just returning the user's stake is primary.
        // If these totals are critical for post-cancellation stats, they'd need adjustment.

        if (refundAmount > 0) {
            payable(msg.sender).transfer(refundAmount);
        }
        emit RefundClaimed(_predictionId, msg.sender, refundAmount);
    }


    /**
     * @dev Allows anyone to trigger auto-resolution for a prediction if its target date has passed
     * and it's marked as auto-resolvable.
     * @param _predictionId ID of the prediction to auto-resolve.
     */
    function autoResolvePrediction(uint256 _predictionId)
        external
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];

        require(prediction.autoResolvable, "ImperfectForm: Prediction is not auto-resolvable");
        require(block.timestamp > prediction.targetDate, "ImperfectForm: Target date has not passed yet");

        Outcome autoOutcome = Outcome.NO; // Default outcome if not otherwise determined

        if (prediction.category == Category.FITNESS && prediction.targetValue > 0) {
            if (prediction.currentValue >= prediction.targetValue) {
                autoOutcome = Outcome.YES;
            } else {
                autoOutcome = Outcome.NO;
            }
        }
        // For other categories, the default is NO.
        // More complex logic could be added here for other auto-resolvable categories.

        prediction.status = Status.RESOLVED;
        prediction.outcome = autoOutcome;
        emit PredictionResolved(_predictionId, autoOutcome);
    }

    // --- View Functions ---

    /**
     * @dev Retrieves details of a specific prediction.
     * @param _predictionId ID of the prediction.
     * @return Prediction struct containing all details.
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
     * @dev Retrieves a user's vote details for a specific prediction.
     * @param _predictionId ID of the prediction.
     * @param _user Address of the user.
     * @return Vote struct containing the user's vote details.
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
     * @dev Retrieves the list of participants for a prediction.
     * @notice For predictions with many participants, this can be gas-intensive.
     * Consider off-chain aggregation or paginated retrieval for UI.
     * @param _predictionId ID of the prediction.
     * @return Array of participant addresses.
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
     * @dev Gets the total number of predictions created.
     * @return Total count of predictions.
     */
    function getTotalPredictions() external view returns (uint256) {
        return nextPredictionId > 0 ? nextPredictionId - 1 : 0;
    }

    /**
     * @dev Gets the current combined total fee percentage (charity + maintenance).
     * @return The total fee percentage.
     */
    function getTotalFeePercentage() public view returns (uint256) {
        return charityFeePercentage + maintenanceFeePercentage;
    }
}