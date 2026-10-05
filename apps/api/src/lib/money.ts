/** "KES 2,500" — for SMS and API error text, where there's no browser to format it. */
export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
