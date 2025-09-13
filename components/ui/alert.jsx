import React from 'react';
import { cn } from '@/lib/utils';

const Alert = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const baseClasses = 'relative w-full rounded-lg border p-4';
  const variantClasses = variant === 'destructive' 
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
    : 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200';
  
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(baseClasses, variantClasses, className)}
      {...props}
    />
  );
});

Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));

AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));

AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };