export interface MatchData {
  user1:          string;
  user2:          string;
  matchedAt:      bigint;
  giftsExchanged: bigint;
  totalGiftValue: bigint;
  dateCompleted:  boolean;
  burned:         boolean;
  user1TokenId:   bigint;
  user2TokenId:   bigint;
}

export interface PledgeData {
  matchId:               bigint;
  proposer:              string;
  acceptor:              string;
  amountEach:            bigint;
  scheduledAt:           bigint;
  acceptedAt:            bigint;
  proposerLocked:        boolean;
  acceptorLocked:        boolean;
  proposerConfirmed:     boolean;
  acceptorConfirmed:     boolean;
  proposerCancelSigned:  boolean;
  acceptorCancelSigned:  boolean;
  cancelSignedAt:        bigint;
  status:                number;
}
