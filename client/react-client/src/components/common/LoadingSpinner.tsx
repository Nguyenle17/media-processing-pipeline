interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export default function LoadingSpinner({ size = 32, color = '#6366f1' }: LoadingSpinnerProps) {
  return (
    <div
      className="vs-spinner"
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size, borderColor: `${color}33`, borderTopColor: color }}
    />
  );
}
