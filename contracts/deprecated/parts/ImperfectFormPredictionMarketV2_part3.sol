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
    
    /**
     * @dev Auto-resolve prediction based on target date
     * Can be called by anyone after the target date has passed
     * @param _predictionId ID of the prediction
     */
    function autoResolvePrediction(uint256 _predictionId)
        external
        predictionExists(_predictionId)
        predictionActive(_predictionId)
    {
        Prediction storage prediction = predictions[_predictionId];
        
        // Check if target date has passed
        require(block.timestamp > prediction.targetDate, "Target date has not passed yet");
        
        // For fitness goals, compare current value with target value
        if (prediction.category == Category.FITNESS && prediction.targetValue > 0) {
            if (prediction.currentValue >= prediction.targetValue) {
                prediction.outcome = Outcome.YES;
            } else {
                prediction.outcome = Outcome.NO;
            }
        } else {
            // For other categories, default to NO if not resolved by target date
            prediction.outcome = Outcome.NO;
        }
        
        prediction.status = Status.RESOLVED;
        
        emit PredictionResolved(_predictionId, prediction.outcome);
    }
}
