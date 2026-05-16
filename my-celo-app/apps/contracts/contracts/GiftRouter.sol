// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMatchNFTForGift {
    function recordGift(uint256 matchId, uint256 amount) external;
    function getMatch(uint256 matchId) external view returns (
        address user1, address user2, uint256 matchedAt,
        uint256 giftsExchanged, uint256 totalGiftValue,
        bool dateCompleted, bool burned,
        uint256 user1TokenId, uint256 user2TokenId
    );
}

contract GiftRouter is Ownable {
    uint256 public constant FEE_BPS = 1000; // 10%
    uint256 public constant MIN_GIFT = 0.3e18; // 0.3 cUSD

    IERC20           public immutable cUSD;
    address          public treasury;
    IMatchNFTForGift public matchNFT;

    event GiftSent(
        uint256 indexed matchId,
        address indexed sender,
        address indexed recipient,
        uint8   giftType,
        uint256 amount,
        uint256 netAmount,
        string  message
    );

    constructor(address _cUSD, address _treasury, address _matchNFT) Ownable(msg.sender) {
        cUSD     = IERC20(_cUSD);
        treasury = _treasury;
        matchNFT = IMatchNFTForGift(_matchNFT);
    }

    function sendGift(
        uint256 matchId,
        address recipient,
        uint256 amount,
        uint8   giftType,
        string calldata message
    ) external {
        require(amount >= MIN_GIFT, "Minimum gift is 0.3 cUSD");

        (address user1, address user2,,,,, bool burned,,) = matchNFT.getMatch(matchId);
        require(!burned, "Match burned");
        require(
            (msg.sender == user1 && recipient == user2) ||
            (msg.sender == user2 && recipient == user1),
            "Not match parties"
        );

        uint256 fee = (amount * FEE_BPS) / 10_000;
        uint256 net = amount - fee;

        cUSD.transferFrom(msg.sender, treasury, fee);
        cUSD.transferFrom(msg.sender, recipient, net);

        matchNFT.recordGift(matchId, amount);

        emit GiftSent(matchId, msg.sender, recipient, giftType, amount, net, message);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
