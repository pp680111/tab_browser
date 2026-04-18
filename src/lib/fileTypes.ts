export const SUPPORTED_EXTENSIONS = ['gp3', 'gp4', 'gp5', 'gtp', 'xml', 'musicxml'] as const;

export function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : '';
}

export function isSupportedScoreFile(fileName: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(getFileExtension(fileName) as (typeof SUPPORTED_EXTENSIONS)[number]);
}

