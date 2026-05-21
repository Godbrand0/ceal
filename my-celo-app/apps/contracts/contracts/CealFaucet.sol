// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title CealFaucet
 * @notice Drips 0.005 CELO to users every 24 hours.
 *
 *         Two claim paths:
 *         - claim()        : user calls directly (needs gas — for advanced users)
 *         - claimFor(addr) : relayer calls on behalf of a user (relayer pays gas,
 *                            user receives CELO with zero wallet interaction).
 *                            This is the gasless path wired up to /api/faucet/claim.
 *
 *         MiniPay users pay gas in USDm (CIP-64 feeCurrency) and can skip this
 *         faucet entirely. It's mainly for MetaMask users arriving with 0 CELO.
 */
contract CealFaucet {
    uint256 public constant COOLDOWN = 24 hours;

    address public owner;
    address public relayer;         // the backend wallet that submits claimFor()
    uint256 public claimAmount = 0.005 ether;
    bool    public paused;

    mapping(address => uint256) public lastClaimed;

    event Claimed(address indexed recipient, address indexed paidBy, uint256 amount);
    event Funded(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event ClaimAmountUpdated(uint256 newAmount);
    event RelayerUpdated(address newRelayer);
    event Paused(bool isPaused);

    error NotOwner();
    error NotRelayerOrOwner();
    error FaucetPaused();
    error CooldownActive(uint256 unlocksAt);
    error InsufficientBalance();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayerOrOwner() {
        if (msg.sender != relayer && msg.sender != owner) revert NotRelayerOrOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert FaucetPaused();
        _;
    }

    constructor(address _relayer) {
        owner   = msg.sender;
        relayer = _relayer;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    // ── Claim paths ───────────────────────────────────────────────────────────

    /**
     * @notice Gasless path — relayer backend calls this on behalf of the user.
     *         The user receives CELO without paying any gas themselves.
     *         Called by /api/faucet/claim.
     */
    function claimFor(address recipient) external onlyRelayerOrOwner whenNotPaused {
        if (recipient == address(0)) revert ZeroAddress();
        _processClaim(recipient);
    }

    /**
     * @notice Self-serve path — user calls directly (needs a tiny CELO for gas).
     *         Useful for power users / MetaMask users who already have some CELO.
     */
    function claim() external whenNotPaused {
        _processClaim(msg.sender);
    }

    function _processClaim(address recipient) internal {
        uint256 last = lastClaimed[recipient];
        if (last != 0 && block.timestamp < last + COOLDOWN) {
            revert CooldownActive(last + COOLDOWN);
        }
        if (address(this).balance < claimAmount) revert InsufficientBalance();

        lastClaimed[recipient] = block.timestamp;

        (bool ok,) = recipient.call{value: claimAmount}("");
        if (!ok) revert TransferFailed();

        emit Claimed(recipient, msg.sender, claimAmount);
    }

    // ── Owner ─────────────────────────────────────────────────────────────────

    function setRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert ZeroAddress();
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setClaimAmount(uint256 amount) external onlyOwner {
        claimAmount = amount;
        emit ClaimAmountUpdated(amount);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function resetCooldown(address user) external onlyOwner {
        lastClaimed[user] = 0;
    }

    function withdraw(uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool ok,) = owner.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(owner, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function dripsRemaining() external view returns (uint256) {
        if (claimAmount == 0) return 0;
        return address(this).balance / claimAmount;
    }

    function canClaim(address user) external view returns (bool) {
        uint256 last = lastClaimed[user];
        return last == 0 || block.timestamp >= last + COOLDOWN;
    }

    function nextClaimAt(address user) external view returns (uint256) {
        uint256 last = lastClaimed[user];
        if (last == 0) return 0;
        uint256 unlocks = last + COOLDOWN;
        return block.timestamp >= unlocks ? 0 : unlocks;
    }
}
