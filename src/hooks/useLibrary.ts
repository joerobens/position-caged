"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type Library } from "@/lib/songStore";

export function useLibrary(): Library {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
