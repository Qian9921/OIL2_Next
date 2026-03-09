import { toast } from '@/hooks/use-toast';

interface FetchOptions extends RequestInit {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface FetchResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  headers: Headers;
}

/**
 * Utility function for making fetch requests with standardized error handling
 * @param url - URL to fetch
 * @param options - Fetch options including custom toast options
 * @returns Response data, error, status and headers
 */
export async function fetchData<T = any>(
  url: string,
  options?: FetchOptions
): Promise<FetchResponse<T>> {
  const { 
    showSuccessToast = false, 
    showErrorToast = true, 
    successMessage, 
    errorMessage,
    ...fetchOptions
  } = options || {};

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    
    let data: T | null = null;
    
    // Parse response based on content type
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else if (contentType.includes('text/')) {
      data = await response.text() as unknown as T;
    } else {
      // For non-text responses like blobs, arraybuffers, etc.
      data = null;
    }
    
    if (!response.ok) {
      // Handle error responses (4xx, 5xx)
      const errorMsg = typeof data === 'object' && data !== null && 'message' in data 
        ? (data as any).message
        : errorMessage || 'An error occurred';
        
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
      
      return {
        data: null,
        error: errorMsg,
        status: response.status,
        headers: response.headers
      };
    }
    
    // Handle successful responses
    if (showSuccessToast && successMessage) {
      toast({
        title: 'Success',
        description: successMessage,
        variant: 'default',
      });
    }
    
    return {
      data,
      error: null,
      status: response.status,
      headers: response.headers
    };
    
  } catch (error) {
    // Handle network errors or exceptions
    const errorMsg = error instanceof Error ? error.message : 'Network error';
    
    if (showErrorToast) {
      toast({
        title: 'Error',
        description: errorMessage || errorMsg,
        variant: 'destructive',
      });
    }
    
    return {
      data: null,
      error: errorMsg,
      status: 0, // 0 indicates network error
      headers: new Headers()
    };
  }
}

/**
 * Utility function for submitting form data with standardized error handling
 * @param url - URL to submit to
 * @param data - Data to submit
 * @param options - Fetch options including custom toast options
 * @returns Response data, error, status and headers
 */
export async function submitFormData<T = any, D = any>(
  url: string,
  data: D,
  options?: Omit<FetchOptions, 'body'>
): Promise<FetchResponse<T>> {
  return fetchData<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Utility function for updating data with standardized error handling
 * @param url - URL to update
 * @param data - Data to update
 * @param options - Fetch options including custom toast options
 * @returns Response data, error, status and headers
 */
export async function updateData<T = any, D = any>(
  url: string,
  data: D,
  options?: Omit<FetchOptions, 'body' | 'method'>
): Promise<FetchResponse<T>> {
  return fetchData<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Utility function for deleting data with standardized error handling
 * @param url - URL to delete
 * @param options - Fetch options including custom toast options
 * @returns Response data, error, status and headers
 */
export async function deleteData<T = any>(
  url: string,
  options?: Omit<FetchOptions, 'method'>
): Promise<FetchResponse<T>> {
  return fetchData<T>(url, {
    method: 'DELETE',
    ...options,
  });
} 