export {};

declare global {
  interface Window {
    guitarTabs?: {
      readFile(filePath: string): Promise<ArrayBuffer>;
    };
  }
}
