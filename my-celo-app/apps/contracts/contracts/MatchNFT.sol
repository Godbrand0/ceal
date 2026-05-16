// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MatchNFT is ERC721, Ownable {
    uint256 private _matchIdCounter;
    uint256 private _tokenIdCounter;

    struct MatchData {
        address user1;
        address user2;
        uint256 matchedAt;
        uint256 giftsExchanged;
        uint256 totalGiftValue;
        bool    dateCompleted;
        bool    burned;
        uint256 user1TokenId;
        uint256 user2TokenId;
    }

    mapping(uint256 => MatchData) public matches;
    mapping(address => uint256[]) private _userMatches;
    mapping(bytes32 => uint256)   public pairToMatchId;
    mapping(uint256 => uint256)   public tokenToMatchId;

    address public matchOracle;
    address public giftRouter;
    address public datePledge;

    event Matched(uint256 indexed matchId, address user1, address user2, uint256 timestamp);
    event MatchBurned(uint256 indexed matchId, address burnedBy);
    event DateCompleted(uint256 indexed matchId);
    event GiftRecorded(uint256 indexed matchId, uint256 giftsExchanged, uint256 totalValue);

    modifier onlyOracle() {
        require(msg.sender == matchOracle, "Not oracle");
        _;
    }

    modifier onlyGiftRouter() {
        require(msg.sender == giftRouter, "Not gift router");
        _;
    }

    modifier onlyDatePledge() {
        require(msg.sender == datePledge, "Not date pledge");
        _;
    }

    constructor(address _oracle) ERC721("CEALMatch", "CMATCH") Ownable(msg.sender) {
        matchOracle = _oracle;
    }

    function setRouters(address _giftRouter, address _datePledge) external onlyOwner {
        giftRouter = _giftRouter;
        datePledge = _datePledge;
    }

    function setOracle(address _oracle) external onlyOwner {
        matchOracle = _oracle;
    }

    function mint(address user1, address user2) external onlyOracle returns (uint256 matchId) {
        require(user1 != user2, "Cannot match self");
        bytes32 pairKey = _pairKey(user1, user2);
        require(pairToMatchId[pairKey] == 0, "Already matched");

        _matchIdCounter++;
        matchId = _matchIdCounter;

        _tokenIdCounter++;
        uint256 token1 = _tokenIdCounter;
        _tokenIdCounter++;
        uint256 token2 = _tokenIdCounter;

        matches[matchId] = MatchData({
            user1: user1,
            user2: user2,
            matchedAt: block.timestamp,
            giftsExchanged: 0,
            totalGiftValue: 0,
            dateCompleted: false,
            burned: false,
            user1TokenId: token1,
            user2TokenId: token2
        });

        _userMatches[user1].push(matchId);
        _userMatches[user2].push(matchId);
        pairToMatchId[pairKey] = matchId;
        tokenToMatchId[token1] = matchId;
        tokenToMatchId[token2] = matchId;

        _safeMint(user1, token1);
        _safeMint(user2, token2);

        emit Matched(matchId, user1, user2, block.timestamp);
    }

    function recordGift(uint256 matchId, uint256 amount) external onlyGiftRouter {
        MatchData storage m = matches[matchId];
        require(!m.burned, "Match burned");
        m.giftsExchanged++;
        m.totalGiftValue += amount;
        emit GiftRecorded(matchId, m.giftsExchanged, m.totalGiftValue);
    }

    function recordDateCompleted(uint256 matchId) external onlyDatePledge {
        MatchData storage m = matches[matchId];
        require(!m.burned, "Match burned");
        m.dateCompleted = true;
        emit DateCompleted(matchId);
    }

    function burn(uint256 matchId) external {
        MatchData storage m = matches[matchId];
        require(msg.sender == m.user1 || msg.sender == m.user2, "Not party to match");
        require(!m.burned, "Already burned");
        m.burned = true;
        _burn(m.user1TokenId);
        _burn(m.user2TokenId);
        emit MatchBurned(matchId, msg.sender);
    }

    function getMatch(uint256 matchId) external view returns (MatchData memory) {
        return matches[matchId];
    }

    function getUserMatches(address user) external view returns (uint256[] memory) {
        return _userMatches[user];
    }

    function _pairKey(address a, address b) internal pure returns (bytes32) {
        return a < b
            ? keccak256(abi.encodePacked(a, b))
            : keccak256(abi.encodePacked(b, a));
    }
}
