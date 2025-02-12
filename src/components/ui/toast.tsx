import * as React from "react"
import { cn } from "../../lib/utils"

interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  variant?: "default" | "success" | "error";
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, message, variant = "default", onClose, ...props }, ref) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onClose?.();
      }, 3000);

      return () => clearTimeout(timer);
    }, [onClose]);

    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-4 right-4 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg",
          variant === "success" && "bg-green-100 text-green-800 border border-green-200",
          variant === "error" && "bg-red-100 text-red-800 border border-red-200",
          variant === "default" && "bg-white text-gray-800 border border-gray-200",
          className
        )}
        {...props}
      >
        {message}
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }
