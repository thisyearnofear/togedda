// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ImperfectFormPredictionMarketV2.sol";

/**
 * @title ImperfectFormPredictionMarketFactoryV2
 * @dev Factory contract for creating ImperfectFormPredictionMarketV2 instances
 */
contract ImperfectFormPredictionMarketFactoryV2 {
    // Contract owner
    address public owner;
    
    // Array of created prediction markets
    address[] public predictionMarkets;
    
    // Mapping to check if a market was created by this factory
    mapping(address => bool) public isMarketFromFactory;
    
    // Default charity address
    address public defaultCharityAddress;
    
    // Default maintenance address
    address public defaultMaintenanceAddress;
    
    // Events
    event PredictionMarketCreated(
        address indexed marketAddress,
        address indexed creator
    );
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Constructor
    constructor(address _defaultCharityAddress, address _defaultMaintenanceAddress) {
        owner = msg.sender;
        
        require(_defaultCharityAddress != address(0), "Charity address cannot be zero");
        require(_defaultMaintenanceAddress != address(0), "Maintenance address cannot be zero");
        
        defaultCharityAddress = _defaultCharityAddress;
        defaultMaintenanceAddress = _defaultMaintenanceAddress;
    }
    
    /**
     * @dev Update default charity address
     * @param _newCharityAddress New default charity address
     */
    function updateDefaultCharityAddress(address _newCharityAddress) external onlyOwner {
        require(_newCharityAddress != address(0), "Charity address cannot be zero");
        defaultCharityAddress = _newCharityAddress;
    }
    
    /**
     * @dev Update default maintenance address
     * @param _newMaintenanceAddress New default maintenance address
     */
    function updateDefaultMaintenanceAddress(address _newMaintenanceAddress) external onlyOwner {
        require(_newMaintenanceAddress != address(0), "Maintenance address cannot be zero");
        defaultMaintenanceAddress = _newMaintenanceAddress;
    }
    
    /**
     * @dev Create a new prediction market
     * @param _charityAddress Custom charity address (optional, use address(0) for default)
     * @param _maintenanceAddress Custom maintenance address (optional, use address(0) for default)
     * @return Address of the newly created prediction market
     */
    function createPredictionMarket(
        address _charityAddress,
        address _maintenanceAddress
    ) external onlyOwner returns (address) {
        // Use default addresses if not specified
        address charityAddress = _charityAddress == address(0) ? defaultCharityAddress : _charityAddress;
        address maintenanceAddress = _maintenanceAddress == address(0) ? defaultMaintenanceAddress : _maintenanceAddress;
        
        ImperfectFormPredictionMarketV2 newMarket = new ImperfectFormPredictionMarketV2(
            charityAddress,
            maintenanceAddress
        );
        
        address marketAddress = address(newMarket);
        predictionMarkets.push(marketAddress);
        isMarketFromFactory[marketAddress] = true;
        
        emit PredictionMarketCreated(marketAddress, msg.sender);
        
        return marketAddress;
    }
    
    /**
     * @dev Get all prediction markets created by this factory
     * @return Array of prediction market addresses
     */
    function getAllPredictionMarkets() external view returns (address[] memory) {
        return predictionMarkets;
    }
    
    /**
     * @dev Get the number of prediction markets created by this factory
     * @return Number of prediction markets
     */
    function getPredictionMarketsCount() external view returns (uint256) {
        return predictionMarkets.length;
    }
}
