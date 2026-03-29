"use client";

import { useEffect, useState } from "react";

/** true только в браузере после монтирования — убирает hydration mismatch у Recharts и др. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
