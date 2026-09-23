import path from 'path';
import fs from 'fs';

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

// Standard EICAR antivirus test signature string
const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFilename: string;
}

/**
 * Sanitize a filename to prevent directory traversal and special character attacks
 */
export const sanitizeFilename = (originalName: string): string => {
  // Strip null bytes and control chars
  let cleaned = originalName.replace(/\0/g, '');
  // Extract basename to prevent path traversal
  cleaned = path.basename(cleaned);
  // Replace unsafe characters with underscore, keeping alphanumeric, dots, dashes, and underscores
  cleaned = cleaned.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Truncate to reasonable length
  if (cleaned.length > 120) {
    const ext = path.extname(cleaned);
    const base = path.basename(cleaned, ext).slice(0, 120 - ext.length);
    cleaned = `${base}${ext}`;
  }
  return cleaned || 'upload.bin';
};

/**
 * Native zero-dependency ZIP archive inspector.
 * Parses ZIP Central Directory records (PK\x01\x02) to verify no dangerous executables or scripts are nested inside.
 */
export const scanZipForBlockedFiles = (
  filePath: string | null,
  fileBuffer: Buffer | null
): { containsBlocked: boolean; blockedEntry?: string } => {
  try {
    let buf = fileBuffer;
    if (!buf && filePath && fs.existsSync(filePath)) {
      buf = fs.readFileSync(filePath);
    }
    if (!buf || buf.length < 4) return { containsBlocked: false };

    // Verify ZIP magic bytes (PK\x03\x04 or PK\x05\x06)
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
      return { containsBlocked: false };
    }

    let offset = 0;
    while (offset <= buf.length - 46) {
      const idx = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), offset);
      if (idx === -1 || idx + 46 > buf.length) break;

      const filenameLen = buf.readUInt16LE(idx + 28);
      const extraLen = buf.readUInt16LE(idx + 30);
      const commentLen = buf.readUInt16LE(idx + 32);

      if (idx + 46 + filenameLen <= buf.length) {
        const entryName = buf.toString('utf-8', idx + 46, idx + 46 + filenameLen);
        const entryExt = path.extname(entryName).toLowerCase();
        if (BLOCKED_EXTENSIONS.has(entryExt)) {
          return { containsBlocked: true, blockedEntry: entryName };
        }
      }

      offset = idx + 46 + filenameLen + extraLen + commentLen;
    }
  } catch {
    // Non-fatal if parsing fails on non-standard archives
  }
  return { containsBlocked: false };
};

/**
 * Validates file safety based on size, extension, magic bytes, double extensions, and malware heuristics
 */
export const validateFileSafety = (
  fileBuffer: Buffer | null,
  filePath: string | null,
  originalFilename: string,
  fileSizeBytes: number
): ValidationResult => {
  const sanitized = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitized).toLowerCase();

  // 1. Check size limit (25MB)
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds the 25MB efficiency limit (File is ${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB)`,
      sanitizedFilename: sanitized,
    };
  }

  // 2. Check extension blocklist
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: `Security Alert: Executable or script files (${ext}) are strictly blocked to protect the platform.`,
      sanitizedFilename: sanitized,
    };
  }

  // 3. Check for double extension evasion attacks (e.g. "report.exe.pdf" or "document.pdf.vbs")
  const nameParts = originalFilename.split('.').filter(Boolean);
  if (nameParts.length > 2) {
    for (let i = 1; i < nameParts.length; i++) {
      const subExt = '.' + nameParts[i].toLowerCase();
      if (BLOCKED_EXTENSIONS.has(subExt)) {
        return {
          isValid: false,
          error: `Security Alert: Dangerous double-extension pattern detected (${subExt}). Upload rejected.`,
          sanitizedFilename: sanitized,
        };
      }
    }
  }

  // 4. Inspect file content sample for magic bytes and heuristics
  let sampleBuf: Buffer | null = fileBuffer;
  if (!sampleBuf && filePath && fs.existsSync(filePath)) {
    try {
      const fd = fs.openSync(filePath, 'r');
      const readLen = Math.min(fileSizeBytes, 32768);
      const buf = Buffer.alloc(readLen);
      const bytesRead = fs.readSync(fd, buf, 0, readLen, 0);
      fs.closeSync(fd);
      sampleBuf = buf.subarray(0, bytesRead);
    } catch {
      // Ignore read error if file can't be opened
    }
  }

  if (sampleBuf && sampleBuf.length >= 4) {
    // Windows PE / DOS executable: "MZ" (0x4D 0x5A)
    if (sampleBuf[0] === 0x4d && sampleBuf[1] === 0x5a) {
      return {
        isValid: false,
        error: 'Security Alert: File signature matches a Windows executable (MZ header). Upload rejected.',
        sanitizedFilename: sanitized,
      };
    }

    // Linux / Unix ELF binary: 0x7F 'E' 'L' 'F' (0x7F 0x45 0x4C 0x46)
    if (
      sampleBuf[0] === 0x7f &&
      sampleBuf[1] === 0x45 &&
      sampleBuf[2] === 0x4c &&
      sampleBuf[3] === 0x46
    ) {
      return {
        isValid: false,
        error: 'Security Alert: File signature matches a Unix/Linux executable binary (ELF header). Upload rejected.',
        sanitizedFilename: sanitized,
      };
    }

    // Mach-O binary (macOS): 0xCA 0xFE 0xBA 0xBE or 0xCE 0xFA 0xED 0xFE or 0xCF 0xFA 0xED 0xFE
    if (
      (sampleBuf[0] === 0xca && sampleBuf[1] === 0xfe && sampleBuf[2] === 0xba && sampleBuf[3] === 0xbe) ||
      (sampleBuf[0] === 0xcf && sampleBuf[1] === 0xfa && sampleBuf[2] === 0xed && sampleBuf[3] === 0xfe) ||
      (sampleBuf[0] === 0xce && sampleBuf[1] === 0xfa && sampleBuf[2] === 0xed && sampleBuf[3] === 0xfe)
    ) {
      return {
        isValid: false,
        error: 'Security Alert: File signature matches a Mach-O executable binary. Upload rejected.',
        sanitizedFilename: sanitized,
      };
    }

    // 5. EICAR Antivirus Test Signature Check
    const sampleString = sampleBuf.toString('utf-8', 0, Math.min(sampleBuf.length, 1024));
    if (sampleString.includes(EICAR_SIGNATURE)) {
      return {
        isValid: false,
        error: 'Security Alert: EICAR standard antivirus test signature detected. File rejected.',
        sanitizedFilename: sanitized,
      };
    }

    // 6. Web-shell / Script Heuristic Inspection (PHP tags, shell shebangs, eval decoder)
    if (
      sampleString.includes('<?php') ||
      sampleString.includes('<?=') ||
      sampleString.includes('eval(base64_decode') ||
      sampleString.includes('eval(gzinflate') ||
      sampleString.startsWith('#!/bin/sh') ||
      sampleString.startsWith('#!/bin/bash')
    ) {
      return {
        isValid: false,
        error: 'Security Alert: Embedded executable script or web-shell signature detected. Upload rejected.',
        sanitizedFilename: sanitized,
      };
    }

    // 7. ZIP Archive Inspection for Nested Executables
    if (sampleBuf[0] === 0x50 && sampleBuf[1] === 0x4b) {
      const zipScan = scanZipForBlockedFiles(filePath, fileBuffer);
      if (zipScan.containsBlocked) {
        return {
          isValid: false,
          error: `Security Alert: Compressed archive contains dangerous executable or script: "${zipScan.blockedEntry}". Upload rejected.`,
          sanitizedFilename: sanitized,
        };
      }
    }
  }

  return {
    isValid: true,
    sanitizedFilename: sanitized,
  };
};
