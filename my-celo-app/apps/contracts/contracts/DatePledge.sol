// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMatchNFTForPledge {
    function recordDateCompleted(uint256 matchId) external;
    function getMatch(uint256 matchId) external view returns (
        address user1, address user2, uint256 matchedAt,
        uint256 giftsExchanged, uint256 totalGiftValue,
        bool dateCompleted, bool burned,
        uint256 user1TokenId, uint256 user2TokenId
    );
}

contract DatePledge is Ownable {
    enum PledgeStatus { PROPOSED, ACCEPTED, LOCKED, COMPLETED, CANCELLED }

    struct Pledge {
        uint256      matchId;
        address      proposer;
        address      acceptor;
        uint256      amountEach;
        uint256      scheduledAt;
        uint256      acceptedAt;
        bool         proposerLocked;
        bool         acceptorLocked;
        bool         proposerConfirmed;
        bool         acceptorConfirmed;
        bool         proposerCancelSigned;
        bool         acceptorCancelSigned;
        uint256      cancelSignedAt;
        PledgeStatus status;
    }

    uint256 public constant CANCEL_FEE_BPS = 2000;   // 20% penalty after date
    uint256 public constant CANCEL_TIMEOUT  = 7 days;
    uint256 public constant LOCK_DEADLINE   = 24 hours;
    uint256 public constant MIN_PLEDGE      = 0.5e18;

    IERC20             public immutable cUSD;
    address            public treasury;
    IMatchNFTForPledge public matchNFT;

    mapping(uint256 => Pledge)  public pledges;
    mapping(uint256 => uint256) private _escrow;
    uint256 public pledgeCount;

    event PledgeProposed(uint256 indexed pledgeId, uint256 indexed matchId, address proposer, uint256 amountEach);
    event PledgeAccepted(uint256 indexed pledgeId, address acceptor);
    event PledgeLocked(uint256 indexed pledgeId, address locker);
    event PledgeFullyLocked(uint256 indexed pledgeId);
    event DateConfirmed(uint256 indexed pledgeId, address confirmer);
    event PledgeCompleted(uint256 indexed pledgeId);
    event CancelSigned(uint256 indexed pledgeId, address signer);
    event Unstaked(uint256 indexed pledgeId, address initiator, uint256 eachRefund);
    event PledgeCancelled(uint256 indexed pledgeId, uint256 feeToTreasury, uint256 eachRefund);

    constructor(address _cUSD, address _treasury, address _matchNFT) Ownable(msg.sender) {
        cUSD     = IERC20(_cUSD);
        treasury = _treasury;
        matchNFT = IMatchNFTForPledge(_matchNFT);
    }

    function propose(
        uint256 matchId,
        uint256 amountEach,
        uint256 scheduledAt
    ) external returns (uint256 pledgeId) {
        require(amountEach >= MIN_PLEDGE, "Pledge below minimum");
        require(scheduledAt > block.timestamp, "Date must be in the future");

        (address user1, address user2,,,,, bool burned,,) = matchNFT.getMatch(matchId);
        require(!burned, "Match burned");
        require(msg.sender == user1 || msg.sender == user2, "Not match party");

        address acceptor = msg.sender == user1 ? user2 : user1;

        pledgeCount++;
        pledgeId = pledgeCount;

        pledges[pledgeId] = Pledge({
            matchId:               matchId,
            proposer:              msg.sender,
            acceptor:              acceptor,
            amountEach:            amountEach,
            scheduledAt:           scheduledAt,
            acceptedAt:            0,
            proposerLocked:        false,
            acceptorLocked:        false,
            proposerConfirmed:     false,
            acceptorConfirmed:     false,
            proposerCancelSigned:  false,
            acceptorCancelSigned:  false,
            cancelSignedAt:        0,
            status:                PledgeStatus.PROPOSED
        });

        emit PledgeProposed(pledgeId, matchId, msg.sender, amountEach);
    }

    function accept(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.PROPOSED, "Not in PROPOSED state");
        require(msg.sender == p.acceptor, "Not the acceptor");

        p.status     = PledgeStatus.ACCEPTED;
        p.acceptedAt = block.timestamp;

        emit PledgeAccepted(pledgeId, msg.sender);
    }

    function lock(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.ACCEPTED, "Not in ACCEPTED state");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");
        require(block.timestamp <= p.acceptedAt + LOCK_DEADLINE, "Lock deadline passed");

        bool isProposer = msg.sender == p.proposer;
        require(
            isProposer ? !p.proposerLocked : !p.acceptorLocked,
            "Already locked"
        );

        // Full amount in escrow — fee only on post-date cancel
        cUSD.transferFrom(msg.sender, address(this), p.amountEach);
        _escrow[pledgeId] += p.amountEach;

        if (isProposer) {
            p.proposerLocked = true;
        } else {
            p.acceptorLocked = true;
        }

        emit PledgeLocked(pledgeId, msg.sender);

        if (p.proposerLocked && p.acceptorLocked) {
            p.status = PledgeStatus.LOCKED;
            emit PledgeFullyLocked(pledgeId);
        }
    }

    /// @notice Either party unstakes before the date — 100% refund, no penalty.
    function unstake(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");
        require(block.timestamp < p.scheduledAt, "Date already passed, use signMutualCancel");

        p.status = PledgeStatus.CANCELLED;
        uint256 total = _escrow[pledgeId];
        uint256 eachReturn = total / 2;
        _escrow[pledgeId] = 0;

        cUSD.transfer(p.proposer, eachReturn);
        cUSD.transfer(p.acceptor, eachReturn);

        emit Unstaked(pledgeId, msg.sender, eachReturn);
    }

    /// @notice Both parties confirm the date happened (AI verification enforced off-chain).
    /// 100% returned — platform takes nothing on a completed date.
    function confirm(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");

        bool isProposer = msg.sender == p.proposer;
        require(
            isProposer ? !p.proposerConfirmed : !p.acceptorConfirmed,
            "Already confirmed"
        );

        if (isProposer) p.proposerConfirmed = true;
        else p.acceptorConfirmed = true;

        emit DateConfirmed(pledgeId, msg.sender);

        if (p.proposerConfirmed && p.acceptorConfirmed) {
            p.status = PledgeStatus.COMPLETED;
            uint256 eachReturn = _escrow[pledgeId] / 2;
            _escrow[pledgeId] = 0;
            cUSD.transfer(p.proposer, eachReturn);
            cUSD.transfer(p.acceptor, eachReturn);
            try matchNFT.recordDateCompleted(p.matchId) {} catch {}
            emit PledgeCompleted(pledgeId);
        }
    }

    /// @notice Mutual cancel after the date — 20% platform fee, 80% back to each.
    /// Both parties must call. First caller initiates; second executes.
    function signMutualCancel(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");
        require(block.timestamp >= p.scheduledAt, "Date not yet passed, use unstake for full refund");

        bool isProposer = msg.sender == p.proposer;
        require(
            isProposer ? !p.proposerCancelSigned : !p.acceptorCancelSigned,
            "Already signed cancel"
        );

        if (isProposer) p.proposerCancelSigned = true;
        else p.acceptorCancelSigned = true;

        if (p.cancelSignedAt == 0) p.cancelSignedAt = block.timestamp;

        emit CancelSigned(pledgeId, msg.sender);

        if (p.proposerCancelSigned && p.acceptorCancelSigned) {
            _executeMutualCancel(pledgeId, p);
        }
    }

    /// @notice If one party signs cancel and the other ghosts for 7 days, anyone can resolve.
    function resolveTimeout(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(p.cancelSignedAt != 0, "No cancel initiated");
        require(block.timestamp >= p.cancelSignedAt + CANCEL_TIMEOUT, "Timeout not reached");

        _executeMutualCancel(pledgeId, p);
    }

    /// @notice Cancel before funds are locked (PROPOSED or ACCEPTED) — no penalty.
    function cancel(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(
            p.status == PledgeStatus.PROPOSED || p.status == PledgeStatus.ACCEPTED,
            "Cannot cancel at this stage"
        );
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");

        p.status = PledgeStatus.CANCELLED;

        uint256 escrow = _escrow[pledgeId];
        if (escrow > 0) {
            _escrow[pledgeId] = 0;
            if (p.proposerLocked) cUSD.transfer(p.proposer, escrow);
            else if (p.acceptorLocked) cUSD.transfer(p.acceptor, escrow);
        }

        emit PledgeCancelled(pledgeId, 0, escrow);
    }

    /// @notice Cancel if lock deadline passed and pledge is stuck in ACCEPTED.
    function cancelExpired(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.ACCEPTED, "Not in ACCEPTED state");
        require(block.timestamp > p.acceptedAt + LOCK_DEADLINE, "Lock deadline not passed");

        p.status = PledgeStatus.CANCELLED;

        uint256 escrow = _escrow[pledgeId];
        if (escrow > 0) {
            _escrow[pledgeId] = 0;
            if (p.proposerLocked) cUSD.transfer(p.proposer, escrow);
            else if (p.acceptorLocked) cUSD.transfer(p.acceptor, escrow);
        }

        emit PledgeCancelled(pledgeId, 0, escrow);
    }

    function getPledge(uint256 pledgeId) external view returns (Pledge memory) {
        return pledges[pledgeId];
    }

    function getEscrow(uint256 pledgeId) external view returns (uint256) {
        return _escrow[pledgeId];
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function _executeMutualCancel(uint256 pledgeId, Pledge storage p) internal {
        p.status = PledgeStatus.CANCELLED;
        uint256 total = _escrow[pledgeId];
        uint256 fee   = (total * CANCEL_FEE_BPS) / 10_000;
        uint256 eachReturn = (total - fee) / 2;
        _escrow[pledgeId] = 0;

        if (fee > 0) cUSD.transfer(treasury, fee);
        cUSD.transfer(p.proposer, eachReturn);
        cUSD.transfer(p.acceptor, eachReturn);

        emit PledgeCancelled(pledgeId, fee, eachReturn);
    }
}
