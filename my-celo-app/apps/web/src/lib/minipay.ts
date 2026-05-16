export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.ethereum as any)?.isMiniPay;
}

export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}
