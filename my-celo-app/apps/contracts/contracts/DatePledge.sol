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
    enum PledgeStatus { PROPOSED, ACCEPTED, LOCKED, COMPLETED, GHOSTED, CANCELLED }

    struct Pledge {
        uint256      matchId;
        address      proposer;
        address      acceptor;
        uint256      amountEach;       // gross cUSD per party
        uint256      scheduledAt;      // unix timestamp of planned date
        uint256      acceptedAt;
        bool         proposerLocked;
        bool         acceptorLocked;
        bool         proposerConfirmed;
        bool         acceptorConfirmed;
        PledgeStatus status;
    }

    uint256 public constant PROTOCOL_FEE_BPS = 500;   // 5%
    uint256 public constant GHOST_WINDOW      = 48 hours;
    uint256 public constant LOCK_DEADLINE     = 24 hours;
    uint256 public constant MIN_PLEDGE        = 0.5e18; // 0.5 cUSD each

    IERC20              public immutable cUSD;
    address             public treasury;
    IMatchNFTForPledge  public matchNFT;

    mapping(uint256 => Pledge) public pledges;
    uint256 public pledgeCount;

    // net escrow balance per pledge (gross - fee for each locked party)
    mapping(uint256 => uint256) private _netEscrow;

    event PledgeProposed(uint256 indexed pledgeId, uint256 indexed matchId, address proposer, uint256 amountEach);
    event PledgeAccepted(uint256 indexed pledgeId, address acceptor);
    event PledgeLocked(uint256 indexed pledgeId, address locker);
    event PledgeFullyLocked(uint256 indexed pledgeId);
    event DateConfirmed(uint256 indexed pledgeId, address confirmer);
    event PledgeCompleted(uint256 indexed pledgeId);
    event GhostClaimed(uint256 indexed pledgeId, address claimant, uint256 amount);
    event PledgeCancelled(uint256 indexed pledgeId, address cancelledBy);

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
            matchId:          matchId,
            proposer:         msg.sender,
            acceptor:         acceptor,
            amountEach:       amountEach,
            scheduledAt:      scheduledAt,
            acceptedAt:       0,
            proposerLocked:   false,
            acceptorLocked:   false,
            proposerConfirmed: false,
            acceptorConfirmed: false,
            status:           PledgeStatus.PROPOSED
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

        uint256 fee = (p.amountEach * PROTOCOL_FEE_BPS) / 10_000;
        uint256 net = p.amountEach - fee;

        cUSD.transferFrom(msg.sender, treasury, fee);
        cUSD.transferFrom(msg.sender, address(this), net);
        _netEscrow[pledgeId] += net;

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

    function confirm(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");

        bool isProposer = msg.sender == p.proposer;
        require(
            isProposer ? !p.proposerConfirmed : !p.acceptorConfirmed,
            "Already confirmed"
        );

        if (isProposer) {
            p.proposerConfirmed = true;
        } else {
            p.acceptorConfirmed = true;
        }

        emit DateConfirmed(pledgeId, msg.sender);

        if (p.proposerConfirmed && p.acceptorConfirmed) {
            p.status = PledgeStatus.COMPLETED;
            uint256 eachNet = _netEscrow[pledgeId] / 2;
            _netEscrow[pledgeId] = 0;
            cUSD.transfer(p.proposer, eachNet);
            cUSD.transfer(p.acceptor, eachNet);
            matchNFT.recordDateCompleted(p.matchId);
            emit PledgeCompleted(pledgeId);
        }
    }

    function claimGhost(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.LOCKED, "Not fully locked");
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");
        require(
            block.timestamp > p.scheduledAt + GHOST_WINDOW,
            "Ghost window not elapsed"
        );

        bool isProposer = msg.sender == p.proposer;
        // Claimant must have confirmed; the other party must NOT have confirmed
        require(
            isProposer ? p.proposerConfirmed && !p.acceptorConfirmed
                       : p.acceptorConfirmed && !p.proposerConfirmed,
            "Not a valid ghost claim"
        );

        p.status = PledgeStatus.GHOSTED;
        uint256 payout = _netEscrow[pledgeId];
        _netEscrow[pledgeId] = 0;
        cUSD.transfer(msg.sender, payout);

        emit GhostClaimed(pledgeId, msg.sender, payout);
    }

    function cancel(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(
            p.status == PledgeStatus.PROPOSED || p.status == PledgeStatus.ACCEPTED,
            "Cannot cancel"
        );
        require(msg.sender == p.proposer || msg.sender == p.acceptor, "Not a party");

        p.status = PledgeStatus.CANCELLED;

        // Refund anyone who already locked (can only happen in ACCEPTED state)
        if (p.proposerLocked) {
            uint256 eachNet = _netEscrow[pledgeId];
            _netEscrow[pledgeId] = 0;
            cUSD.transfer(p.proposer, eachNet);
        }
        if (p.acceptorLocked) {
            uint256 eachNet = _netEscrow[pledgeId];
            _netEscrow[pledgeId] = 0;
            cUSD.transfer(p.acceptor, eachNet);
        }

        emit PledgeCancelled(pledgeId, msg.sender);
    }

    // Rescue if lock deadline passed and funds are stuck
    function cancelExpired(uint256 pledgeId) external {
        Pledge storage p = pledges[pledgeId];
        require(p.status == PledgeStatus.ACCEPTED, "Not in ACCEPTED state");
        require(block.timestamp > p.acceptedAt + LOCK_DEADLINE, "Lock deadline not passed");

        p.status = PledgeStatus.CANCELLED;

        uint256 escrow = _netEscrow[pledgeId];
        if (escrow > 0) {
            _netEscrow[pledgeId] = 0;
            // Return funds to whoever locked
            if (p.proposerLocked) cUSD.transfer(p.proposer, escrow);
            else if (p.acceptorLocked) cUSD.transfer(p.acceptor, escrow);
        }

        emit PledgeCancelled(pledgeId, msg.sender);
    }

    function getPledge(uint256 pledgeId) external view returns (Pledge memory) {
        return pledges[pledgeId];
    }

    function getEscrow(uint256 pledgeId) external view returns (uint256) {
        return _netEscrow[pledgeId];
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
