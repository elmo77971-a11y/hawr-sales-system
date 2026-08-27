export {};

declare global {
  interface Window {
    hawrDesktop?: {
      isDesktop?: boolean;
      appName?: string;
      completeSetup?: (values: { galleryName: string; backupReminder: boolean }) => Promise<unknown>;
      getUpdateStatus?: () => Promise<{ status: string; version?: string | null; percent?: number; downloaded?: boolean; error?: string | null }>;
      installUpdate?: () => Promise<{ success: boolean }>;
      onUpdateStatus?: (callback: (status: { status: string; version?: string | null; percent?: number; downloaded?: boolean; error?: string | null }) => void) => () => void;
      getNetworkInfo?: () => Promise<{ host: string; port: number | null; addresses: string[]; url: string | null }>;
      showPairing?: () => Promise<{ success: boolean; url?: string }>;
    };
  }
}
