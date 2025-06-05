/**
 * Utility functions for file operations
 */

/**
 * Converts a local file path to a URL that can be used in the browser
 * Note: This approach has limitations due to browser security restrictions
 * For a production app, consider using Electron or a backend server
 */
export const getLocalImageUrl = (path: string): string => {
  // For Windows paths, convert backslashes to forward slashes and add file:/// prefix
  if (path.includes('\\')) {
    return `file:///${path.replace(/\\/g, '/')}`;
  }
  
  // For Unix paths, just add file:// prefix
  return `file://${path}`;
};

/**
 * Checks if a file exists at the given path
 * Note: This function is limited by browser security restrictions
 * and may not work in all environments
 */
export const checkFileExists = async (path: string): Promise<boolean> => {
  try {
    const response = await fetch(getLocalImageUrl(path), { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
};
