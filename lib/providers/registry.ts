export interface AgentRegistryRecord {
  agentId: string;
  role: 'buyer' | 'grower';
  displayName: string;
  solanaPubkey: string;
  onchainVerification: {
    programId: string;
    accountPda: string;
    verifiedSlot: number;
    reputationScore: number; // 0-100
    totalCompletedTrades: number;
    disputeRatePct: number;
    receiptStatus: 'Live' | 'Fixture';
    signature: string;
  };
}

export function getSolanaAgentProof(
  agentId: string,
  role: 'buyer' | 'grower',
  pubkey?: string | null
): AgentRegistryRecord {
  const verifiedPubkey =
    pubkey ||
    (role === 'buyer'
      ? 'B1uY3r7ariqGu1gashtMultanSo1anaPubk3y1111'
      : 'Gr0w3rFatimaCh3nabMultanSo1anaPubk3y2222');

  return {
    agentId,
    role,
    displayName: role === 'buyer' ? 'Tariq Mehmood' : 'Bibi Fatima',
    solanaPubkey: verifiedPubkey,
    onchainVerification: {
      programId: 'MandiLinkRegistry111111111111111111111111111',
      accountPda: `pda_${verifiedPubkey.substring(0, 10)}_multan`,
      verifiedSlot: 284192042,
      reputationScore: role === 'buyer' ? 94 : 98,
      totalCompletedTrades: role === 'buyer' ? 47 : 62,
      disputeRatePct: 0.4,
      receiptStatus: 'Fixture',
      signature: `5J8w...solana_tx_${agentId.substring(0, 6)}...verified_pda`,
    },
  };
}

export interface FeedbackOnChainReceipt {
  tradeId: string;
  buyerPubkey: string;
  growerPubkey: string;
  ratingScore: number;
  deliveryOnTime: boolean;
  produceQualityVerified: boolean;
  solanaTxSignature: string;
  receiptStatus: 'Live' | 'Fixture';
  slot: number;
}

export function recordOnChainFeedback(
  tradeId: string,
  buyerPubkey: string,
  growerPubkey: string,
  rating: number = 5
): FeedbackOnChainReceipt {
  return {
    tradeId,
    buyerPubkey,
    growerPubkey,
    ratingScore: rating,
    deliveryOnTime: true,
    produceQualityVerified: true,
    solanaTxSignature: `4xL8...tx_${Date.now().toString(16)}...mandi_reputation`,
    receiptStatus: 'Fixture',
    slot: 284192110,
  };
}
