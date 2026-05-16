// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PremiumFeatures is Ownable {
    IERC20  public immutable cUSD;
    address public treasury;

    uint256 public boostPrice       = 0.5e18;  // 0.5 cUSD
    uint256 public superLikePrice   = 0.3e18;  // 0.3 cUSD
    uint256 public swipeUnlockPrice = 0.2e18;  // 0.2 cUSD

    uint256 public constant BOOST_DURATION  = 24 hours;
    uint256 public constant SWIPE_PACK_SIZE = 20;

    mapping(address => uint256) public boostExpiresAt;

    event ProfileBoosted(address indexed user, uint256 expiresAt);
    event SuperLikeSent(address indexed from, address indexed to);
    event SwipesUnlocked(address indexed user, uint256 packSize);

    constructor(address _cUSD, address _treasury) Ownable(msg.sender) {
        cUSD     = IERC20(_cUSD);
        treasury = _treasury;
    }

    function boostProfile() external {
        cUSD.transferFrom(msg.sender, treasury, boostPrice);
        // Stacks with existing boost if still active
        uint256 base = block.timestamp > boostExpiresAt[msg.sender]
            ? block.timestamp
            : boostExpiresAt[msg.sender];
        boostExpiresAt[msg.sender] = base + BOOST_DURATION;
        emit ProfileBoosted(msg.sender, boostExpiresAt[msg.sender]);
    }

    function superLike(address target) external {
        require(target != msg.sender, "Cannot super like yourself");
        cUSD.transferFrom(msg.sender, treasury, superLikePrice);
        emit SuperLikeSent(msg.sender, target);
    }

    function unlockSwipes() external {
        cUSD.transferFrom(msg.sender, treasury, swipeUnlockPrice);
        emit SwipesUnlocked(msg.sender, SWIPE_PACK_SIZE);
    }

    function isBoosted(address user) external view returns (bool) {
        return block.timestamp < boostExpiresAt[user];
    }

    function setPrices(uint256 boost, uint256 superLike_, uint256 swipe) external onlyOwner {
        boostPrice       = boost;
        superLikePrice   = superLike_;
        swipeUnlockPrice = swipe;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
