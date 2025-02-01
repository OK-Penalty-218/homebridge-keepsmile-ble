// src/noble.d.ts or types/noble.d.ts
declare module 'noble' {
  export function on(event: string, callback: (...args: any[]) => void): void;
  export function startScanningAsync(filters: any[], allowDuplicates: boolean): Promise<void>;
  export function stopScanning(): void;
  export function disconnectAsync(): Promise<void>;
  export const state: string;
  export const advertisement: any;
  export const uuid: string;
}
