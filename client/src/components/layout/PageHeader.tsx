import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
}) => {
  return (
    <div className="flex items-center justify-between py-6 border-b border-[#1e3a3f]">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm md:text-base text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export default PageHeader;