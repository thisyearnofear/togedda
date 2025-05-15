const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ImperfectFormPredictionMarket", function () {
  let predictionMarket;
  let owner;
  let user1;
  let user2;
  
  // Enum values
  const Category = {
    FITNESS: 0,
    CHAIN: 1,
    COMMUNITY: 2,
    CUSTOM: 3
  };
  
  const Outcome = {
    UNRESOLVED: 0,
    YES: 1,
    NO: 2
  };
  
  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy the contract
    const PredictionMarket = await ethers.getContractFactory("ImperfectFormPredictionMarket");
    predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.deployed();
  });
  
  describe("Prediction Creation", function () {
    it("Should create a new prediction", async function () {
      const title = "Test Prediction";
      const description = "Will this test pass?";
      const targetDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
      const targetValue = 1000;
      const category = Category.FITNESS;
      const network = "celo";
      const emoji = "🏋️";
      
      await expect(
        predictionMarket.createPrediction(
          title,
          description,
          targetDate,
          targetValue,
          category,
          network,
          emoji
        )
      )
        .to.emit(predictionMarket, "PredictionCreated")
        .withArgs(1, owner.address, title, targetDate, category, network);
      
      const prediction = await predictionMarket.getPrediction(1);
      expect(prediction.title).to.equal(title);
      expect(prediction.description).to.equal(description);
      expect(prediction.targetDate).to.equal(targetDate);
      expect(prediction.targetValue).to.equal(targetValue);
      expect(prediction.category).to.equal(category);
      expect(prediction.network).to.equal(network);
      expect(prediction.emoji).to.equal(emoji);
      expect(prediction.creator).to.equal(owner.address);
    });
    
    it("Should fail if target date is in the past", async function () {
      const pastDate = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      await expect(
        predictionMarket.createPrediction(
          "Test",
          "Description",
          pastDate,
          1000,
          Category.FITNESS,
          "celo",
          "🏋️"
        )
      ).to.be.revertedWith("Target date must be in the future");
    });
  });
  
  describe("Voting", function () {
    beforeEach(async function () {
      // Create a prediction for testing
      await predictionMarket.createPrediction(
        "Test Prediction",
        "Will this test pass?",
        Math.floor(Date.now() / 1000) + 86400,
        1000,
        Category.FITNESS,
        "celo",
        "🏋️"
      );
    });
    
    it("Should allow users to vote with stake", async function () {
      const predictionId = 1;
      const voteAmount = ethers.utils.parseEther("1.0");
      
      await expect(
        predictionMarket.connect(user1).vote(predictionId, true, { value: voteAmount })
      )
        .to.emit(predictionMarket, "VoteCast")
        .withArgs(predictionId, user1.address, true, voteAmount);
      
      const prediction = await predictionMarket.getPrediction(predictionId);
      expect(prediction.yesVotes).to.equal(voteAmount);
      expect(prediction.totalStaked).to.equal(voteAmount);
      
      const userVote = await predictionMarket.getUserVote(predictionId, user1.address);
      expect(userVote.isYes).to.be.true;
      expect(userVote.amount).to.equal(voteAmount);
      expect(userVote.claimed).to.be.false;
    });
    
    it("Should update vote counts when changing vote", async function () {
      const predictionId = 1;
      const voteAmount = ethers.utils.parseEther("1.0");
      
      // First vote YES
      await predictionMarket.connect(user1).vote(predictionId, true, { value: voteAmount });
      
      // Then vote NO with additional stake
      const additionalAmount = ethers.utils.parseEther("0.5");
      await predictionMarket.connect(user1).vote(predictionId, false, { value: additionalAmount });
      
      const prediction = await predictionMarket.getPrediction(predictionId);
      expect(prediction.yesVotes).to.equal(0);
      expect(prediction.noVotes).to.equal(voteAmount.add(additionalAmount));
      expect(prediction.totalStaked).to.equal(voteAmount.add(additionalAmount));
      
      const userVote = await predictionMarket.getUserVote(predictionId, user1.address);
      expect(userVote.isYes).to.be.false;
      expect(userVote.amount).to.equal(voteAmount.add(additionalAmount));
    });
  });
  
  describe("Resolving Predictions", function () {
    beforeEach(async function () {
      // Create a prediction for testing
      await predictionMarket.createPrediction(
        "Test Prediction",
        "Will this test pass?",
        Math.floor(Date.now() / 1000) + 86400,
        1000,
        Category.FITNESS,
        "celo",
        "🏋️"
      );
      
      // Users vote on the prediction
      await predictionMarket.connect(user1).vote(1, true, { value: ethers.utils.parseEther("1.0") });
      await predictionMarket.connect(user2).vote(1, false, { value: ethers.utils.parseEther("2.0") });
    });
    
    it("Should allow owner to resolve a prediction", async function () {
      const predictionId = 1;
      
      await expect(
        predictionMarket.resolvePrediction(predictionId, Outcome.YES)
      )
        .to.emit(predictionMarket, "PredictionResolved")
        .withArgs(predictionId, Outcome.YES);
      
      const prediction = await predictionMarket.getPrediction(predictionId);
      expect(prediction.outcome).to.equal(Outcome.YES);
      expect(prediction.status).to.equal(1); // RESOLVED
    });
    
    it("Should not allow non-owners to resolve predictions", async function () {
      await expect(
        predictionMarket.connect(user1).resolvePrediction(1, Outcome.YES)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });
  
  describe("Claiming Rewards", function () {
    beforeEach(async function () {
      // Create a prediction for testing
      await predictionMarket.createPrediction(
        "Test Prediction",
        "Will this test pass?",
        Math.floor(Date.now() / 1000) + 86400,
        1000,
        Category.FITNESS,
        "celo",
        "🏋️"
      );
      
      // Users vote on the prediction
      await predictionMarket.connect(user1).vote(1, true, { value: ethers.utils.parseEther("1.0") });
      await predictionMarket.connect(user2).vote(1, false, { value: ethers.utils.parseEther("2.0") });
      
      // Resolve the prediction
      await predictionMarket.resolvePrediction(1, Outcome.YES);
    });
    
    it("Should allow winners to claim rewards", async function () {
      const predictionId = 1;
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      await expect(
        predictionMarket.connect(user1).claimReward(predictionId)
      )
        .to.emit(predictionMarket, "RewardClaimed")
        .withArgs(predictionId, user1.address, ethers.utils.parseEther("3.0"));
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      // Account for gas costs by checking the balance increased
      expect(finalBalance.gt(initialBalance)).to.be.true;
      
      const userVote = await predictionMarket.getUserVote(predictionId, user1.address);
      expect(userVote.claimed).to.be.true;
    });
    
    it("Should not allow losers to claim rewards", async function () {
      const predictionId = 1;
      
      await expect(
        predictionMarket.connect(user2).claimReward(predictionId)
      )
        .to.emit(predictionMarket, "RewardClaimed")
        .withArgs(predictionId, user2.address, 0);
      
      const userVote = await predictionMarket.getUserVote(predictionId, user2.address);
      expect(userVote.claimed).to.be.true;
    });
    
    it("Should not allow double claiming", async function () {
      const predictionId = 1;
      
      // First claim
      await predictionMarket.connect(user1).claimReward(predictionId);
      
      // Second attempt
      await expect(
        predictionMarket.connect(user1).claimReward(predictionId)
      ).to.be.revertedWith("Reward already claimed");
    });
  });
});
