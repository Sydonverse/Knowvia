import { getInitials, formatDisplayName } from '../utils/avatar.utils';

describe('Knowvia Centralized User Avatar Initials Engine', () => {
  describe('Single-word names', () => {
    it('generates N for NASCOM', () => {
      expect(getInitials('NASCOM')).toBe('N');
      expect(getInitials('NASCOM', '')).toBe('N');
    });

    it('generates J for John', () => {
      expect(getInitials('John')).toBe('J');
      expect(getInitials('john')).toBe('J');
    });

    it('handles lowercase single names correctly', () => {
      expect(getInitials('alex')).toBe('A');
    });
  });

  describe('Two-word names', () => {
    it('generates JD for John Doe', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('generates JS for Jane Smith', () => {
      expect(getInitials('Jane Smith')).toBe('JS');
      expect(getInitials('Jane', 'Smith')).toBe('JS');
    });
  });

  describe('Three or more word names', () => {
    it('generates JD for John Michael Doe (first and last name initials)', () => {
      expect(getInitials('John Michael Doe')).toBe('JD');
      expect(getInitials('John Michael', 'Doe')).toBe('JD');
    });

    it('generates MW for Mary Jane Williams (first and last name initials)', () => {
      expect(getInitials('Mary Jane Williams')).toBe('MW');
      expect(getInitials('Mary Jane', 'Williams')).toBe('MW');
    });

    it('generates FL for Four Part Name Long', () => {
      expect(getInitials('Four Part Name Long')).toBe('FL');
    });
  });

  describe('Whitespace and formatting edge cases', () => {
    it('handles leading, trailing, and multiple internal spaces: "  John   Doe  " -> JD', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('handles whitespace when first and last are passed separately', () => {
      expect(getInitials('   John  ', '  Doe   ')).toBe('JD');
    });
  });

  describe('Empty, null, and missing fallback handling', () => {
    it('returns U fallback when name is empty string', () => {
      expect(getInitials('')).toBe('U');
      expect(getInitials('', '')).toBe('U');
    });

    it('returns U fallback when whitespace-only', () => {
      expect(getInitials('    ')).toBe('U');
    });

    it('returns U fallback when null or undefined', () => {
      expect(getInitials(null)).toBe('U');
      expect(getInitials(undefined)).toBe('U');
      expect(getInitials(null, null)).toBe('U');
      expect(getInitials(undefined, undefined)).toBe('U');
    });

    it('never returns undefined, null, or NaN string representation', () => {
      const results = [
        getInitials(null),
        getInitials(undefined),
        getInitials(''),
        getInitials('NaN'),
        getInitials(null, undefined),
      ];

      for (const res of results) {
        expect(res).not.toBe('undefined');
        expect(res).not.toBe('null');
        expect(typeof res).toBe('string');
        expect(res.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('formatDisplayName helper', () => {
    it('formats single-name NASCOM without trailing space', () => {
      expect(formatDisplayName('NASCOM', '')).toBe('NASCOM');
      expect(formatDisplayName('NASCOM', null)).toBe('NASCOM');
    });

    it('formats two-name users with single clean space', () => {
      expect(formatDisplayName('John', 'Doe')).toBe('John Doe');
    });

    it('handles whitespace in first and last name parts', () => {
      expect(formatDisplayName('  John  ', '  Doe  ')).toBe('John Doe');
    });

    it('falls back gracefully when both are empty', () => {
      expect(formatDisplayName('', '')).toBe('Knowvia User');
      expect(formatDisplayName(null, null)).toBe('Knowvia User');
    });
  });
});
