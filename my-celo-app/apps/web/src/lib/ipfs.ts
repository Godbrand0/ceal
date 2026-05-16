const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT ?? "";
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

export async function uploadFileToPinata(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) throw new Error("IPFS upload failed");
  const { IpfsHash } = await res.json();
  return `ipfs://${IpfsHash}`;
}

export async function uploadJsonToPinata(json: object): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pinataContent: json }),
  });

  if (!res.ok) throw new Error("IPFS JSON upload failed");
  const { IpfsHash } = await res.json();
  return `ipfs://${IpfsHash}`;
}

export function ipfsToHttp(uri: string): string {
  if (!uri) return "/placeholder.jpg";
  if (uri.startsWith("ipfs://")) {
    return `${PINATA_GATEWAY}/${uri.slice(7)}`;
  }
  return uri;
}
