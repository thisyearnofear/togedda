// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ImperfectFormPredictionMarket.sol";

/**
 * @title ImperfectFormPredictionMarketFactory
 * @dev Factory contract to deploy new prediction markets
 */
contract ImperfectFormPredictionMarketFactory {
    // Array to store all deployed prediction markets
    address[] public predictionMarkets;
    
    // Mapping from prediction market address to boolean indicating if it was created by this factory
    mapping(address => bool) public isMarketFromFactory;
    
    // Contract owner
    address public owner;
    
    // Events
    event PredictionMarketCreated(address indexed marketAddress, address indexed creator);
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    /**
     * @dev Create a new prediction market
     * @return Address of the newly created prediction market
     */
    function createPredictionMarket() external onlyOwner returns (address) {
        ImperfectFormPredictionMarket newMarket = new ImperfectFormPredictionMarket();
        
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
    function getMarketCount() external view returns (uint256) {
        return predictionMarkets.length;
    }
    
    /**
     * @dev Transfer ownership of the factory
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be the zero address");
        owner = _newOwner;
    }
}
