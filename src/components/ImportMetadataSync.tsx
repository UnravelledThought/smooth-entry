import { useEffect } from "react";
import { hydrateImportedEntries } from "@/lib/import-metadata";

export function ImportMetadataSync() {
  useEffect(() => { void hydrateImportedEntries().catch(() => undefined); }, []);
  return null;
}