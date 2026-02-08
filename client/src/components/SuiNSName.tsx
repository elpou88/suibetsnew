import { useSuiNSName, formatAddress } from '@/hooks/useSuiNSName';

interface SuiNSNameProps {
  address: string;
  className?: string;
  showTooltip?: boolean;
}

export default function SuiNSName({ address, className = '', showTooltip = true }: SuiNSNameProps) {
  const suinsName = useSuiNSName(address);

  if (!address) return <span className={className}>Anonymous</span>;

  const display = suinsName || formatAddress(address);

  if (showTooltip && suinsName) {
    return (
      <span className={className} title={address}>
        {display}
      </span>
    );
  }

  return (
    <span className={className} title={suinsName ? address : undefined}>
      {display}
    </span>
  );
}
