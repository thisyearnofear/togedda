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
        
        // Mark as claimed first to prevent reentrancy
        userVote.claimed = true;
        
        if (!userVotedCorrectly) {
            emit RewardClaimed(_predictionId, msg.sender, 0);
            return;
        }
        
        // Calculate reward
        uint256 totalCorrectVotes = prediction.outcome == Outcome.YES ? 
                                   prediction.yesVotes : 
                                   prediction.noVotes;
        
        // Calculate user's share of the total pot (after fees)
        uint256 totalPot = prediction.totalStaked;
        uint256 userShare = (userVote.amount * totalPot) / totalCorrectVotes;
        
        // Calculate fees
        uint256 charityFee = (userShare * CHARITY_FEE_PERCENTAGE) / PERCENTAGE_BASE;
        uint256 maintenanceFee = (userShare * MAINTENANCE_FEE_PERCENTAGE) / PERCENTAGE_BASE;
        uint256 totalFees = charityFee + maintenanceFee;
        
        // Calculate final reward after fees
        uint256 reward = userShare - totalFees;
        
        // Transfer fees to charity and maintenance addresses
        if (charityFee > 0) {
            payable(charityAddress).transfer(charityFee);
            emit CharityDonation(_predictionId, charityAddress, charityFee);
        }
        
        if (maintenanceFee > 0) {
            payable(maintenanceAddress).transfer(maintenanceFee);
            emit MaintenanceFee(_predictionId, maintenanceAddress, maintenanceFee);
        }
        
        // Transfer reward to user
        if (reward > 0) {
            payable(msg.sender).transfer(reward);
        }
        
        emit RewardClaimed(_predictionId, msg.sender, reward);
    }
