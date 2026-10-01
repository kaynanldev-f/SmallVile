import { useCallback, useEffect, useMemo, useState } from "react";

interface UsePixTimerProps {
  initialTime?: number;
  onExpire?: () => void;
}

export function usePixTimer({
  initialTime = 600,
  onExpire,
}: UsePixTimerProps = {}) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onExpire]);

  const reset = useCallback(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  const stop = useCallback(() => {
    setTimeLeft(0);
  }, []);

  const minutes = useMemo(() => Math.floor(timeLeft / 60), [timeLeft]);

  const seconds = useMemo(() => timeLeft % 60, [timeLeft]);

  const formattedTime = useMemo(
    () =>
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    [minutes, seconds],
  );

  return {
    timeLeft,
    minutes,
    seconds,
    formattedTime,
    expired: timeLeft <= 0,
    reset,
    stop,
  };
}
