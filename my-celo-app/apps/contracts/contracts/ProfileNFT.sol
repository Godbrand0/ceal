// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ProfileNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    mapping(address => uint256) public profileOf;
    mapping(uint256 => string)  public metadataURI;
    mapping(address => bool)    public isVerified;
    mapping(address => string)  public talentProfile;

    address public selfProtocolVerifier;

    event ProfileMinted(address indexed user, uint256 tokenId, string ipfsURI);
    event ProfileUpdated(address indexed user, string newURI);
    event ProfileVerified(address indexed user);
    event TalentLinked(address indexed user, string profileId);

    constructor(address _selfVerifier) ERC721("CEALProfile", "CPROF") Ownable(msg.sender) {
        selfProtocolVerifier = _selfVerifier;
    }

    function mint(string calldata ipfsURI) external {
        require(profileOf[msg.sender] == 0, "Profile already exists");
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        profileOf[msg.sender] = tokenId;
        metadataURI[tokenId] = ipfsURI;
        _safeMint(msg.sender, tokenId);
        emit ProfileMinted(msg.sender, tokenId, ipfsURI);
    }

    function updateMetadata(string calldata newURI) external {
        uint256 tokenId = profileOf[msg.sender];
        require(tokenId != 0, "No profile");
        metadataURI[tokenId] = newURI;
        emit ProfileUpdated(msg.sender, newURI);
    }

    function setVerified(address user) external {
        require(msg.sender == selfProtocolVerifier || msg.sender == owner(), "Unauthorized");
        isVerified[user] = true;
        emit ProfileVerified(user);
    }

    function setSelfVerifier(address _verifier) external onlyOwner {
        selfProtocolVerifier = _verifier;
    }

    function linkTalentProtocol(string calldata profileId) external {
        require(profileOf[msg.sender] != 0, "No profile");
        talentProfile[msg.sender] = profileId;
        emit TalentLinked(msg.sender, profileId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return metadataURI[tokenId];
    }

    // Soulbound: non-transferable
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
