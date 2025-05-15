import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combine multiple class names with clsx and merge tailwind classes with twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date to a readable string.
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  return new Date(date).toLocaleDateString('en-US', options)
}

/**
 * Formats a time to a readable string.
 * @param time - The time to format (as Date or string)
 * @returns Formatted time string (e.g., "9:00 AM")
 */
export function formatTime(time: Date | string): string {
  if (typeof time === 'string' && !time.includes(':')) {
    // Handle time format like "0900" -> "09:00"
    time = time.padStart(4, '0')
    time = `${time.slice(0, 2)}:${time.slice(2, 4)}`
  }
  
  const date = typeof time === 'string' ? new Date(`1970-01-01T${time}`) : time
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Truncates a string to a specified length and adds ellipsis if needed.
 * @param str - The string to truncate
 * @param length - Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, length: number): string {
  if (!str) return ''
  return str.length > length ? `${str.substring(0, length)}...` : str
}

/**
 * Delays execution for a specified time.
 * @param ms - Milliseconds to wait
 * @returns A promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Creates a debounced function that delays invoking the provided function.
 * @param fn - The function to debounce
 * @param ms - The delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
} 