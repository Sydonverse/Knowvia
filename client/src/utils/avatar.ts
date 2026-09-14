/**
 * Centralized initials generator for all Knowvia users.
 * 
 * Rules:
 * - Single name: "NASCOM" -> "N", "John" -> "J"
 * - Two names: "John Doe" -> "JD"
 * - More than two names: "John Michael Doe" -> "JD", "Mary Jane Williams" -> "MW"
 *   (Uses the first letter of the first name and the first letter of the last name)
 * - Leading/trailing and multiple consecutive spaces: "  John   Doe  " -> "JD"
 * - Empty, null, or undefined: Returns safe fallback "U"
 * 
 * Guarantees:
 * - Never returns undefined, null, NaN, or broken initials.
 */
export function getInitials(nameOrFirst?: string | null, lastName?: string | null): string {
  let combined = '';

  if (nameOrFirst && lastName) {
    combined = `${nameOrFirst} ${lastName}`;
  } else if (nameOrFirst) {
    combined = nameOrFirst;
  } else if (lastName) {
    combined = lastName;
  }

  // Trim and split by any whitespace sequence
  const parts = combined.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'U';
  }

  if (parts.length === 1) {
    // Single name: first letter uppercase
    return parts[0].charAt(0).toUpperCase();
  }

  // Two or more names: first letter of first name + first letter of last name
  const firstLetter = parts[0].charAt(0).toUpperCase();
  const lastLetter = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstLetter}${lastLetter}`;
}

/**
 * Formats a user's full display name cleanly, avoiding trailing or double spaces
 * when single-name users (like 'NASCOM') have an empty last name.
 */
export function formatDisplayName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Knowvia User';
}
