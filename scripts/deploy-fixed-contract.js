/**
 * Deploy the fixed prediction market contract to Base Sepolia
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Configuration
const RPC_URL = 'https://sepolia.base.org';
const CHAIN_ID = 84532;

// Contract constructor parameters
const CHARITY_ADDRESS = '0x44770D93e1a426DDAf5923a738eaCe3D2FB65BC1'; // Greenpill Kenya
const MAINTENANCE_ADDRESS = '0x55A5705453Ee82c742274154136Fce8149597058'; // Your address
const CHARITY_FEE = 15; // 15%
const MAINTENANCE_FEE = 5; // 5%

async function deployContract() {
  try {
    console.log('🚀 Deploying Fixed Prediction Market Contract to Base Sepolia');
    console.log('⛓️ Chain ID:', CHAIN_ID);
    console.log('🌐 RPC URL:', RPC_URL);
    console.log('');

    // Check for private key
    const privateKey = process.env.PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Private key not found in environment variables');
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('👤 Deployer address:', wallet.address);
    
    // Check network
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId.toString());
    
    if (network.chainId.toString() !== CHAIN_ID.toString()) {
      throw new Error(`Wrong network! Expected ${CHAIN_ID}, got ${network.chainId}`);
    }

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Deployer balance:', ethers.formatEther(balance), 'ETH');
    
    if (balance === 0n) {
      throw new Error('Deployer has no ETH for gas fees');
    }

    // Read contract source
    const contractSource = fs.readFileSync('contracts/ImperfectFormPredictionMarketV2Fixed.sol', 'utf8');
    
    console.log('\n📋 Contract Parameters:');
    console.log('🏥 Charity Address:', CHARITY_ADDRESS);
    console.log('🔧 Maintenance Address:', MAINTENANCE_ADDRESS);
    console.log('💰 Charity Fee:', CHARITY_FEE + '%');
    console.log('🔧 Maintenance Fee:', MAINTENANCE_FEE + '%');
    console.log('📊 Total Fee:', (CHARITY_FEE + MAINTENANCE_FEE) + '%');

    // Compile contract (simplified - in production use proper compiler)
    console.log('\n⚙️ Compiling contract...');
    
    // For this script, we'll use a pre-compiled bytecode
    // In production, you'd use Hardhat, Foundry, or solc directly
    const contractBytecode = await compileContract(contractSource);
    
    if (!contractBytecode) {
      throw new Error('Failed to compile contract');
    }

    console.log('✅ Contract compiled successfully');

    // Deploy contract
    console.log('\n🚀 Deploying contract...');
    
    const factory = new ethers.ContractFactory(
      [], // ABI will be generated
      contractBytecode,
      wallet
    );

    // Estimate gas for deployment
    const deployTx = factory.getDeployTransaction(
      CHARITY_ADDRESS,
      MAINTENANCE_ADDRESS,
      CHARITY_FEE,
      MAINTENANCE_FEE
    );

    const gasEstimate = await provider.estimateGas(deployTx);
    console.log('⛽ Estimated gas:', gasEstimate.toString());

    // Deploy with explicit gas settings
    const contract = await factory.deploy(
      CHARITY_ADDRESS,
      MAINTENANCE_ADDRESS,
      CHARITY_FEE,
      MAINTENANCE_FEE,
      {
        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
      }
    );

    console.log('📤 Deployment transaction sent:', contract.deploymentTransaction().hash);
    console.log('⏳ Waiting for confirmation...');

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log('\n🎉 Contract deployed successfully!');
    console.log('📍 Contract Address:', contractAddress);
    console.log('🔗 View on BaseScan:', `https://sepolia.basescan.org/address/${contractAddress}`);

    // Verify deployment by calling a read function
    console.log('\n🔍 Verifying deployment...');
    try {
      const owner = await contract.owner();
      const totalPredictions = await contract.getTotalPredictions();
      const charityAddr = await contract.charityAddress();
      const maintenanceAddr = await contract.maintenanceAddress();
      
      console.log('✅ Owner:', owner);
      console.log('✅ Total Predictions:', totalPredictions.toString());
      console.log('✅ Charity Address:', charityAddr);
      console.log('✅ Maintenance Address:', maintenanceAddr);
      
      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log('✅ Ownership verified');
      } else {
        console.log('❌ Ownership mismatch');
      }
      
    } catch (error) {
      console.log('⚠️ Verification failed:', error.message);
    }

    // Update constants file
    console.log('\n📝 Updating constants file...');
    await updateConstants(contractAddress);

    console.log('\n🎉 Deployment completed successfully!');
    console.log('📋 Summary:');
    console.log('  Contract Address:', contractAddress);
    console.log('  Network: Base Sepolia');
    console.log('  Chain ID:', CHAIN_ID);
    console.log('  Deployer:', wallet.address);
    console.log('  Gas Used: ~' + gasEstimate.toString());

    return contractAddress;

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function compileContract(source) {
  // This is a simplified compilation
  // In production, use proper Solidity compiler
  console.log('⚠️ Using simplified compilation - use Hardhat/Foundry for production');
  
  // For now, return null to indicate we need proper compilation
  // You would integrate with solc here
  return null;
}

async function updateConstants(contractAddress) {
  try {
    const constantsPath = 'lib/constants.ts';
    let constants = fs.readFileSync(constantsPath, 'utf8');
    
    // Update the Base Sepolia contract address
    constants = constants.replace(
      /PREDICTION_MARKET_ADDRESS = "0x[a-fA-F0-9]{40}"/,
      `PREDICTION_MARKET_ADDRESS = "${contractAddress}"`
    );
    
    // Also update the dual-chain-service if needed
    constants = constants.replace(
      /contractAddress: "0x9B4Be1030eDC90205C10aEE54920192A13c12Cba"/,
      `contractAddress: "${contractAddress}"`
    );
    
    fs.writeFileSync(constantsPath, constants);
    console.log('✅ Constants file updated');
    
  } catch (error) {
    console.log('⚠️ Failed to update constants:', error.message);
  }
}

// Run deployment
if (require.main === module) {
  deployContract()
    .then((address) => {
      console.log('\n✅ Deployment script completed');
      console.log('📍 New contract address:', address);
    })
    .catch((error) => {
      console.error('❌ Deployment script failed:', error);
      process.exit(1);
    });
}

module.exports = { deployContract };
