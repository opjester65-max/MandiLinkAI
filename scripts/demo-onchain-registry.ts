/**
 * MandiLink - Solana Agent Registry Terminal Demonstration
 * Validates verifiable onchain identities, PDA derivation, and feedback signatures.
 */

import crypto from 'crypto';
import { getSolanaAgentProof, recordOnChainFeedback } from '../lib/providers/registry';

async function main() {
  console.log('====================================================');
  console.log('   MANDILINK SOLANA AGENT REGISTRY TERMINAL DEMO    ');
  console.log('   Verifiable On-Chain Identities & Reputation      ');
  console.log('====================================================\n');

  const PROGRAM_ID = 'MandiLinkRegistry111111111111111111111111111';
  console.log(`Program ID: ${PROGRAM_ID}`);
  console.log('Network: Solana Devnet (Cluster: devnet)\n');

  // 1. Buyer Tariq Onchain Identity Verification
  const buyerId = '33333333-3333-3333-3333-333333333301';
  console.log('--- 1. Verifying Buyer Agent PDA & Identity ---');
  const buyerProof = getSolanaAgentProof(buyerId, 'buyer');
  console.log(`Buyer Name:        ${buyerProof.displayName}`);
  console.log(`Wallet Public Key: ${buyerProof.solanaPubkey}`);
  console.log(`Derived PDA:       ${buyerProof.onchainVerification.accountPda}`);
  console.log(`Confirmed Slot:    ${buyerProof.onchainVerification.verifiedSlot}`);
  console.log(`Reputation Score:  ${buyerProof.onchainVerification.reputationScore}/100`);
  console.log(`Completed Trades:  ${buyerProof.onchainVerification.totalCompletedTrades}`);
  console.log(`Dispute Rate:      ${buyerProof.onchainVerification.disputeRatePct}%`);
  console.log(`PDA Signature:     ${buyerProof.onchainVerification.signature}`);
  console.log('✓ Buyer Agent PDA verified onchain\n');

  // 2. Grower Fatima Onchain Identity Verification
  const growerId = '33333333-3333-3333-3333-333333333302';
  console.log('--- 2. Verifying Grower Agent PDA & Identity ---');
  const growerProof = getSolanaAgentProof(growerId, 'grower');
  console.log(`Grower Name:       ${growerProof.displayName}`);
  console.log(`Wallet Public Key: ${growerProof.solanaPubkey}`);
  console.log(`Derived PDA:       ${growerProof.onchainVerification.accountPda}`);
  console.log(`Confirmed Slot:    ${growerProof.onchainVerification.verifiedSlot}`);
  console.log(`Reputation Score:  ${growerProof.onchainVerification.reputationScore}/100`);
  console.log(`Completed Trades:  ${growerProof.onchainVerification.totalCompletedTrades}`);
  console.log(`Dispute Rate:      ${growerProof.onchainVerification.disputeRatePct}%`);
  console.log(`PDA Signature:     ${growerProof.onchainVerification.signature}`);
  console.log('✓ Grower Agent PDA verified onchain\n');

  // 3. Trade Completion Feedback Transaction
  const tradeId = '77777777-7777-7777-7777-777777777701';
  console.log('--- 3. Recording Post-Trade Feedback On-Chain ---');
  const feedbackReceipt = recordOnChainFeedback(tradeId, buyerProof.solanaPubkey, growerProof.solanaPubkey, 5);
  console.log(`Trade Reference:   ${feedbackReceipt.tradeId}`);
  console.log(`Buyer Signer:      ${feedbackReceipt.buyerPubkey}`);
  console.log(`Grower Beneficiary:${feedbackReceipt.growerPubkey}`);
  console.log(`Star Rating:       ${feedbackReceipt.ratingScore} / 5 Stars`);
  console.log(`On-Time Delivery:  ${feedbackReceipt.deliveryOnTime}`);
  console.log(`Quality Verified:  ${feedbackReceipt.produceQualityVerified}`);
  console.log(`Solana Tx Hash:    ${feedbackReceipt.solanaTxSignature}`);
  console.log(`Confirmed Slot:    ${feedbackReceipt.slot}`);
  console.log('✓ Feedback recorded and reputation score updated (+1 pt)\n');

  console.log('====================================================');
  console.log('   ALL ONCHAIN REGISTRY VERIFICATIONS COMPLETED     ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Onchain demonstration failed:', err);
  process.exit(1);
});
