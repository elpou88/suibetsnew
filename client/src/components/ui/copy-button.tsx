import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value: string;
  onCopy?: () => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  truncateText?: boolean;
  truncateLength?: number;
  children?: React.ReactNode;
}

export function CopyButton({
  value,
  onCopy,
  className,
  size = 'sm',
  variant = 'ghost',
  truncateText = false,
  truncateLength = 10,
  children,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const displayText = truncateText 
    ? value.length > truncateLength * 2 
      ? `${value.substring(0, truncateLength)}...${value.substring(value.length - truncateLength)}` 
      : value
    : value;

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      onCopy?.();

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("flex items-center gap-1", className)}
    >
      {children || displayText}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

export default CopyButton;