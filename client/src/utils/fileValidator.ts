// Maximum allowed file size: 25MB (26,214,400 bytes)
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Dangerous executable and script extensions that pose security risks
export const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.vbs',
  '.dll',
  '.scr',
  '.msi',
  '.com',
  '.pif',
  '.hta',
  '.cpl',
  '.inf',
  '.reg',
  '.ws',
  '.wsf',
  '.jar',
  '.jsp',
  '.php',
  '.cgi',
  '.pl',
]);

export interface ClientFileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFilename: string;
}

/**
 * Extracts the file extension (in lowercase, including dot, e.g. ".exe")
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
};

/**
 * Validates file safety on the client side before uploading to prevent
 * transmission of blocked executables or oversized files.
 */
export const validateFileBeforeUpload = (file: File): ClientFileValidationResult => {
  const ext = getFileExtension(file.name);

  // 1. Check size limit (25MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size exceeds the 25MB efficiency limit (Selected file is ${sizeMb}MB).`,
      sanitizedFilename: file.name,
    };
  }

  // 2. Check blocked extensions (instant 0ms feedback for executables/scripts)
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Security Alert: Executable or script files (${ext || 'binary'}) are strictly blocked to protect the platform.`,
      sanitizedFilename: file.name,
    };
  }

  return {
    isValid: true,
    sanitizedFilename: file.name,
  };
};
