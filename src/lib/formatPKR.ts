/**
 * Format a USD price to PKR display string.
 * Uses approximate 1 USD = 280 PKR conversion.
 * Displays in Crore / Lakh format as used in Pakistan.
 */
export function formatPKR(usdPrice: number): string {
  const pkr = usdPrice * 280;

  if (pkr >= 10000000) {
    const crore = pkr / 10000000;
    return `PKR ${crore.toFixed(1)} Crore`;
  }
  if (pkr >= 100000) {
    const lakh = pkr / 100000;
    return `PKR ${lakh.toFixed(1)} Lakh`;
  }
  return `PKR ${pkr.toLocaleString()}`;
}

export function getAvailabilityLabel(type: string): string {
  switch (type) {
    case 'in_showroom': return 'In Showroom';
    case 'available_on_import': return 'Available on Import';
    case 'sold_out': return 'Sold Out';
    default: return 'In Showroom';
  }
}

export function getAvailabilityColor(type: string): string {
  switch (type) {
    case 'in_showroom': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'available_on_import': return 'bg-primary/20 text-primary border-primary/30';
    case 'sold_out': return 'bg-destructive/20 text-red-400 border-destructive/30';
    default: return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
}
