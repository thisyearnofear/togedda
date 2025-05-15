/**
 * Format a number with commas as thousands separators
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Truncate an Ethereum address
 */
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a timestamp to a readable date
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

/**
 * Get network display name
 */
export function getNetworkName(networkId: string): string {
  const networks: Record<string, string> = {
    polygon: "Polygon",
    celo: "Celo",
    monad: "Monad",
    base: "Base",
  };
  
  return networks[networkId] || networkId;
}
