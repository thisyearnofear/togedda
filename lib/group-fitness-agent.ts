/**
 * Group Fitness Agent for XMTP
 * Facilitates group fitness challenges and competitions in chat
 * Aligns with Base Batches Messaging Buildathon focus areas
 */

import { enhancedMessageStore, StoredMessage } from './enhanced-message-store';

export interface GroupChallenge {
  id: string;
  name: string;
  description: string;
  type: 'pushups' | 'squats' | 'custom';
  target: number;
  duration: number; // days
  participants: string[];
  stakes: { [address: string]: number }; // ETH staked per participant
  startDate: number;
  endDate: number;
  status: 'pending' | 'active' | 'completed';
  leaderboard: { address: string; score: number; lastUpdate: number }[];
  rewards: {
    winner: number; // percentage of total stakes
    participation: number; // percentage for completing challenge
  };
}

export interface GroupFitnessCommands {
  '/challenge': 'Create a new group fitness challenge';
  '/join': 'Join an active challenge';
  '/progress': 'Update your progress in a challenge';
  '/leaderboard': 'View current challenge standings';
  '/stake': 'Add ETH stake to increase motivation';
  '/motivate': 'Send motivational message to group';
}

/**
 * Process group fitness commands in XMTP chat - supports both slash commands and natural language
 */
export async function processGroupFitnessCommand(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();

  // Natural language challenge creation
  if (lowerMessage.includes('start') && (lowerMessage.includes('challenge') || lowerMessage.includes('group'))) {
    return await handleNaturalChallenge(message, senderAddress, conversationId);
  }

  // Natural language leaderboard request
  if ((lowerMessage.includes('show') || lowerMessage.includes('view')) && lowerMessage.includes('leaderboard')) {
    return await handleLeaderboard(conversationId);
  }

  // Natural language motivation request
  if (lowerMessage.includes('motivat') || lowerMessage.includes('stay hard') || lowerMessage.includes('carry the boats')) {
    return await handleMotivation(senderAddress, conversationId);
  }

  // Legacy slash commands (for backward compatibility)
  if (lowerMessage.startsWith('/challenge')) {
    return await handleCreateChallenge(message, senderAddress, conversationId);
  }

  if (lowerMessage.startsWith('/join')) {
    return await handleJoinChallenge(message, senderAddress, conversationId);
  }

  if (lowerMessage.startsWith('/progress')) {
    return await handleProgressUpdate(message, senderAddress, conversationId);
  }

  if (lowerMessage.startsWith('/leaderboard')) {
    return await handleLeaderboard(conversationId);
  }

  if (lowerMessage.startsWith('/stake')) {
    return await handleStakeAdd(message, senderAddress, conversationId);
  }

  if (lowerMessage.startsWith('/motivate')) {
    return await handleMotivation(senderAddress, conversationId);
  }

  // Help command
  if (lowerMessage.includes('help') || lowerMessage.includes('commands')) {
    return getHelpMessage();
  }

  return '';
}

/**
 * Handle natural language challenge creation
 */
async function handleNaturalChallenge(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  // Extract exercise type from message
  const lowerMessage = message.toLowerCase();
  let exerciseType = 'pushups'; // default

  if (lowerMessage.includes('squat')) exerciseType = 'squats';
  else if (lowerMessage.includes('pushup') || lowerMessage.includes('push-up')) exerciseType = 'pushups';
  else if (lowerMessage.includes('pullup') || lowerMessage.includes('pull-up')) exerciseType = 'pullups';

  // Suggest a reasonable challenge
  const suggestions = {
    pushups: { target: 1000, days: 7 },
    squats: { target: 500, days: 5 },
    pullups: { target: 200, days: 7 }
  };

  const suggestion = suggestions[exerciseType as keyof typeof suggestions] || suggestions.pushups;

  return `🏋️ **Let's Start a ${exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)} Challenge!**

🎯 **Suggested Challenge:**
• **Goal:** ${suggestion.target} ${exerciseType} in ${suggestion.days} days
• **Daily Target:** ~${Math.ceil(suggestion.target / suggestion.days)} ${exerciseType}/day
• **Difficulty:** Intermediate

💪 **Ready to commit?** Reply with:
• "Yes, let's do it!" - Join the suggested challenge
• "Make it easier" - Get a beginner-friendly version
• "Make it harder" - Get an advanced challenge
• Or tell me your custom goal!

🔥 **STAY HARD!** Who else wants to join this challenge?`;
}

/**
 * Create new group challenge (legacy slash command)
 */
async function handleCreateChallenge(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  // Parse challenge parameters
  const parts = message.split(' ');
  if (parts.length < 4) {
    return `🏋️ **Create Challenge Format:**
\`/challenge [type] [target] [days]\`

**Examples:**
• \`/challenge pushups 1000 7\` - 1000 push-ups in 7 days
• \`/challenge squats 500 5\` - 500 squats in 5 days

**Challenge Types:** pushups, squats, custom

💡 **Tip:** Try natural language instead: "Start a pushup challenge with jesse.base.eth"`;
  }

  const type = parts[1] as 'pushups' | 'squats' | 'custom';
  const target = parseInt(parts[2]);
  const days = parseInt(parts[3]);

  if (isNaN(target) || isNaN(days) || target <= 0 || days <= 0) {
    return '❌ Invalid target or duration. Use positive numbers only.';
  }

  const challenge: GroupChallenge = {
    id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} Challenge`,
    description: `Complete ${target} ${type} in ${days} days`,
    type,
    target,
    duration: days,
    participants: [senderAddress],
    stakes: {},
    startDate: Date.now(),
    endDate: Date.now() + (days * 24 * 60 * 60 * 1000),
    status: 'pending',
    leaderboard: [{ address: senderAddress, score: 0, lastUpdate: Date.now() }],
    rewards: {
      winner: 70, // 70% to winner
      participation: 30 // 30% split among participants who complete
    }
  };

  // Store challenge (in production, use proper database)
  await storeChallengeData(conversationId, challenge);

  return `🎯 **Challenge Created!**

**${challenge.name}**
${challenge.description}

**Duration:** ${days} days
**Creator:** ${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)}

**To join:** \`/join ${challenge.id}\`
**To add stakes:** \`/stake 0.01\` (ETH amount)

Challenge starts when first person joins! 💪`;
}

/**
 * Join existing challenge
 */
async function handleJoinChallenge(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  const parts = message.split(' ');
  if (parts.length < 2) {
    return '❌ Please specify challenge ID: `/join [challenge_id]`';
  }

  const challengeId = parts[1];
  const challenge = await getChallengeData(conversationId, challengeId);

  if (!challenge) {
    return '❌ Challenge not found. Use `/leaderboard` to see active challenges.';
  }

  if (challenge.participants.includes(senderAddress)) {
    return '✅ You\'re already in this challenge! Use `/progress [number]` to update your score.';
  }

  // Add participant
  challenge.participants.push(senderAddress);
  challenge.leaderboard.push({ address: senderAddress, score: 0, lastUpdate: Date.now() });
  
  if (challenge.status === 'pending') {
    challenge.status = 'active';
  }

  await storeChallengeData(conversationId, challenge);

  return `🎉 **Joined Challenge!**

**${challenge.name}**
${challenge.description}

**Participants:** ${challenge.participants.length}
**Your current score:** 0 / ${challenge.target}

**Commands:**
• \`/progress [number]\` - Update your progress
• \`/leaderboard\` - View standings
• \`/stake [amount]\` - Add ETH stake

Let's get moving! 🚀`;
}

/**
 * Update progress
 */
async function handleProgressUpdate(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  const parts = message.split(' ');
  if (parts.length < 2) {
    return '❌ Please specify your progress: `/progress [number]`\nExample: `/progress 50` (completed 50 reps)';
  }

  const progress = parseInt(parts[1]);
  if (isNaN(progress) || progress < 0) {
    return '❌ Invalid progress number. Use positive numbers only.';
  }

  // Find active challenge for this user
  const challenges = await getActiveChallenges(conversationId);
  const userChallenge = challenges.find(c => c.participants.includes(senderAddress));

  if (!userChallenge) {
    return '❌ You\'re not in any active challenges. Use `/join [challenge_id]` to join one!';
  }

  // Update leaderboard
  const userEntry = userChallenge.leaderboard.find(entry => entry.address === senderAddress);
  if (userEntry) {
    userEntry.score = progress;
    userEntry.lastUpdate = Date.now();
  }

  await storeChallengeData(conversationId, userChallenge);

  const percentage = Math.min(100, (progress / userChallenge.target) * 100);
  const isComplete = progress >= userChallenge.target;

  let response = `📊 **Progress Updated!**

**${userChallenge.name}**
Your score: ${progress} / ${userChallenge.target} (${percentage.toFixed(1)}%)

${getProgressBar(percentage)}`;

  if (isComplete) {
    response += `\n\n🎉 **CHALLENGE COMPLETED!** 
You've reached the target! Amazing work! 💪`;
  }

  // Add leaderboard position
  const sortedLeaderboard = userChallenge.leaderboard.sort((a, b) => b.score - a.score);
  const position = sortedLeaderboard.findIndex(entry => entry.address === senderAddress) + 1;
  
  response += `\n\n🏆 **Current Position:** #${position} of ${userChallenge.participants.length}`;

  return response;
}

/**
 * View leaderboard
 */
async function handleLeaderboard(conversationId: string): Promise<string> {
  const challenges = await getActiveChallenges(conversationId);

  if (challenges.length === 0) {
    return `📊 **No Active Challenges**

Start a new challenge:
\`/challenge pushups 1000 7\`
\`/challenge squats 500 5\`

Get the group moving! 💪`;
  }

  let response = '🏆 **Group Fitness Leaderboard**\n\n';

  for (const challenge of challenges) {
    const sortedLeaderboard = challenge.leaderboard.sort((a, b) => b.score - a.score);
    const daysLeft = Math.ceil((challenge.endDate - Date.now()) / (24 * 60 * 60 * 1000));

    response += `**${challenge.name}**\n`;
    response += `Target: ${challenge.target} | Days left: ${daysLeft}\n\n`;

    sortedLeaderboard.slice(0, 5).forEach((entry, index) => {
      const percentage = (entry.score / challenge.target) * 100;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏃';
      response += `${medal} ${entry.address.slice(0, 6)}...${entry.address.slice(-4)}: ${entry.score} (${percentage.toFixed(1)}%)\n`;
    });

    response += '\n';
  }

  return response;
}

/**
 * Add stake to challenge
 */
async function handleStakeAdd(
  message: string,
  senderAddress: string,
  conversationId: string
): Promise<string> {
  return `💰 **Staking Feature**

To add stakes to challenges, use the prediction market:

1. Create a prediction about your fitness goal
2. Stake ETH on your success
3. Complete the challenge to win!

**Example:**
"I predict I'll complete 1000 pushups by [date]"

This creates financial motivation for your fitness goals! 🎯`;
}

/**
 * Send motivation
 */
async function handleMotivation(senderAddress: string, conversationId: string): Promise<string> {
  const motivationalMessages = [
    "🔥 **CARRY THE BOATS!** 🚣🌊 No excuses, just results!",
    "💪 **STAY HARD!** Your only competition is who you were yesterday!",
    "🎯 **EMBRACE THE SUCK!** Growth happens outside your comfort zone!",
    "⚡ **TAKE SOULS!** Show this workout who's boss!",
    "🚀 **GOGGINS MODE ACTIVATED!** 40% rule - you're just getting started!",
    "🔥 **WHO'S GONNA CARRY THE BOATS?** Be the person who doesn't quit!",
    "💀 **DEATH BY PUSHUPS!** Make your muscles scream for mercy!",
    "🌊 **DROWN IN THE WORK!** Let the reps wash over you!",
    "⚔️ **WARRIOR MINDSET!** Attack this challenge like your life depends on it!",
    "🎪 **CIRCUS TIME!** Time to perform when it matters most!"
  ];

  const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  
  return `${randomMessage}

Sent by ${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)} 

Keep pushing, team! 💪`;
}

/**
 * Get help message
 */
function getHelpMessage(): string {
  return `🤖 **Group Fitness Agent - Just Talk Naturally!**

💬 **Natural Language Commands:**
• "Start a pushup challenge with jesse.base.eth"
• "Show me the fitness leaderboard"
• "Give me some motivation to stay hard"
• "I completed 150 pushups today"
• "Who wants to join a squat challenge?"

🏋️ **What I Can Help With:**
• **Group Challenges** - Create and manage fitness competitions
• **Progress Tracking** - Log your daily achievements
• **Leaderboards** - See who's crushing their goals
• **Motivation** - Get Goggins-style encouragement
• **Stakes** - Add financial motivation to challenges

🔥 **Legacy Commands** (still work):
• \`/challenge pushups 1000 7\` - Create structured challenge
• \`/leaderboard\` - Quick leaderboard view
• \`/motivate\` - Instant motivation

💪 **CARRY THE BOATS!** Just tell me what you want to do!`;
}

/**
 * Helper functions for data storage (simplified for demo)
 */
async function storeChallengeData(conversationId: string, challenge: GroupChallenge): Promise<void> {
  // In production, store in database
  // For now, store in enhanced message store as metadata
  const message: StoredMessage = {
    id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    senderAddress: 'system',
    content: `Challenge ${challenge.status}: ${challenge.name}`,
    timestamp: Date.now(),
    messageType: 'system',
    metadata: {
      actionType: 'general',
      xmtpMessageId: `challenge_${challenge.id}`,
    }
  };

  await enhancedMessageStore.addMessage(message);
}

async function getChallengeData(conversationId: string, challengeId: string): Promise<GroupChallenge | null> {
  // In production, query database
  // For demo, return mock data
  return null;
}

async function getActiveChallenges(conversationId: string): Promise<GroupChallenge[]> {
  // In production, query database for active challenges
  // For demo, return empty array
  return [];
}

function getProgressBar(percentage: number): string {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage.toFixed(1)}%`;
}
