/**
 * Salesforce Integration Utilities
 * Handles OAuth authentication and API operations with Salesforce
 */

// Salesforce OAuth and API endpoints
const SALESFORCE_LOGIN_URL = 'https://login.salesforce.com';
const SALESFORCE_API_VERSION = 'v59.0';

/**
 * Get Salesforce OAuth authorization URL
 * @param {string} clientId - Salesforce connected app client ID
 * @param {string} redirectUri - OAuth callback URL
 * @param {string} state - Optional state parameter for security
 * @returns {string} Authorization URL
 */
export function getSalesforceAuthUrl(clientId, redirectUri, state = '') {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token',
    state: state
  });
  
  return `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from callback
 * @param {string} clientId - Salesforce client ID
 * @param {string} clientSecret - Salesforce client secret
 * @param {string} redirectUri - OAuth callback URL
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
  const tokenUrl = `${SALESFORCE_LOGIN_URL}/services/oauth2/token`;
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

/**
 * Refresh Salesforce access token
 * @param {string} refreshToken - Refresh token
 * @param {string} clientId - Salesforce client ID
 * @param {string} clientSecret - Salesforce client secret
 * @returns {Promise<Object>} New token response
 */
export async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const tokenUrl = `${SALESFORCE_LOGIN_URL}/services/oauth2/token`;
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

/**
 * Make authenticated API call to Salesforce
 * @param {string} endpoint - API endpoint (relative to instance URL)
 * @param {string} accessToken - Valid access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} API response
 */
export async function salesforceApiCall(endpoint, accessToken, instanceUrl, options = {}) {
  const url = `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/${endpoint}`;
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Salesforce API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        errorData
      });
      throw new Error(`Salesforce API call failed: ${errorData.message || errorData[0]?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Salesforce API call error:', error);
    throw error;
  }
}

/**
 * Create Account in Salesforce
 * @param {Object} accountData - Account data
 * @param {string} accessToken - Valid access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @returns {Promise<Object>} Created account response
 */
export async function createSalesforceAccount(accountData, accessToken, instanceUrl) {
  const endpoint = 'sobjects/Account';
  
  return await salesforceApiCall(endpoint, accessToken, instanceUrl, {
    method: 'POST',
    body: JSON.stringify(accountData)
  });
}

/**
 * Create Contact in Salesforce
 * @param {Object} contactData - Contact data
 * @param {string} accessToken - Valid access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @returns {Promise<Object>} Created contact response
 */
export async function createSalesforceContact(contactData, accessToken, instanceUrl) {
  const endpoint = 'sobjects/Contact';
  
  return await salesforceApiCall(endpoint, accessToken, instanceUrl, {
    method: 'POST',
    body: JSON.stringify(contactData)
  });
}

/**
 * Search for existing Account in Salesforce by name
 * @param {string} accountName - Account name to search for
 * @param {string} accessToken - Valid access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @returns {Promise<Object|null>} Existing account or null
 */
export async function findExistingAccount(accountName, accessToken, instanceUrl) {
  try {
    const encodedName = encodeURIComponent(accountName);
    const endpoint = `query/?q=SELECT+Id,Name,Phone,Website+FROM+Account+WHERE+Name='${encodedName}'+LIMIT+1`;
    
    const response = await salesforceApiCall(endpoint, accessToken, instanceUrl);
    
    if (response.records && response.records.length > 0) {
      return response.records[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for existing account:', error);
    return null;
  }
}

/**
 * Create Account with linked Contact in Salesforce
 * @param {Object} userData - User data from form
 * @param {string} accessToken - Valid access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @returns {Promise<Object>} Created account and contact response
 */
// Helper function to validate and map state/province values for Salesforce
function validateStateForSalesforce(state, country) {
  if (!state) return null;
  
  // For US states, only use 2-letter codes as Salesforce is very strict
  if (country === 'United States' || country === 'US' || country === 'USA') {
    const usStates = {
      'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA',
      'CO': 'CO', 'CT': 'CT', 'DE': 'DE', 'FL': 'FL', 'GA': 'GA',
      'HI': 'HI', 'ID': 'ID', 'IL': 'IL', 'IN': 'IN', 'IA': 'IA',
      'KS': 'KS', 'KY': 'KY', 'LA': 'LA', 'ME': 'ME', 'MD': 'MD',
      'MA': 'MA', 'MI': 'MI', 'MN': 'MN', 'MS': 'MS', 'MO': 'MO',
      'MT': 'MT', 'NE': 'NE', 'NV': 'NV', 'NH': 'NH', 'NJ': 'NJ',
      'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH',
      'OK': 'OK', 'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC',
      'SD': 'SD', 'TN': 'TN', 'TX': 'TX', 'UT': 'UT', 'VT': 'VT',
      'VA': 'VA', 'WA': 'WA', 'WV': 'WV', 'WI': 'WI', 'WY': 'WY',
      'DC': 'DC'
    };
    
    // Convert full state names to 2-letter codes
    const stateNameToCode = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
      'District of Columbia': 'DC'
    };
    
    // If it's already a 2-letter code, return it
    if (usStates[state.toUpperCase()]) {
      return state.toUpperCase();
    }
    
    // If it's a full name, convert to 2-letter code
    if (stateNameToCode[state]) {
      return stateNameToCode[state];
    }
    
    // If not found, return null to avoid the error
    console.warn(`Invalid US state: ${state}. Skipping state field.`);
    return null;
  }
  
  // For other countries, return as-is but limit length
  return state.length > 80 ? state.substring(0, 80) : state;
}

export async function createAccountWithContact(userData, accessToken, instanceUrl) {
  try {
    console.log('Creating Account and Contact with data:', userData);

    // Validate state/province for Salesforce compatibility
    console.log('Original state data:', { state: userData.state, country: userData.country });
    const validatedState = validateStateForSalesforce(userData.state, userData.country);
    console.log('Validated state:', validatedState);
    
    // Temporarily skip state field to avoid Salesforce validation issues
    const skipState = true;

    // Prepare account data
    const accountName = userData.companyName || `${userData.firstName} ${userData.lastName} Account`;
    
    // Prepare account data structure (used for both existing and new accounts)
    const accountData = {
      Name: accountName,
      Type: 'Customer',
      Industry: userData.industry || 'Technology',
      Description: `Account created from Inventoria integration for user: ${userData.email}`
    };
    
    // Add optional fields only if they have values
    if (userData.phone) accountData.Phone = userData.phone;
    if (userData.website) accountData.Website = userData.website;
    if (userData.address) accountData.BillingStreet = userData.address;
    if (userData.city) accountData.BillingCity = userData.city;
    if (validatedState && !skipState) accountData.BillingState = validatedState;
    if (userData.postalCode) accountData.BillingPostalCode = userData.postalCode;
    if (userData.country) accountData.BillingCountry = userData.country;
    
    // Check if account already exists
    console.log('Checking for existing account:', accountName);
    const existingAccount = await findExistingAccount(accountName, accessToken, instanceUrl);
    
    let accountResponse;
    
    if (existingAccount) {
      console.log('Found existing account:', existingAccount);
      accountResponse = existingAccount;
    } else {
      // Create new account if it doesn't exist
      console.log('Account data being sent to Salesforce:', accountData);
      accountResponse = await createSalesforceAccount(accountData, accessToken, instanceUrl);
    }
    
    if (!accountResponse.id) {
      throw new Error('Failed to create Account in Salesforce');
    }

    // Then create the Contact linked to the Account - filter out null/undefined values
    const contactData = {
      FirstName: userData.firstName,
      LastName: userData.lastName,
      Email: userData.email,
      AccountId: accountResponse.id,
      Description: `Contact created from Inventoria integration`
    };
    
    // Add optional fields only if they have values
    if (userData.phone) contactData.Phone = userData.phone;
    if (userData.jobTitle) contactData.Title = userData.jobTitle;
    if (userData.department) contactData.Department = userData.department;
    if (userData.address) contactData.MailingStreet = userData.address;
    if (userData.city) contactData.MailingCity = userData.city;
    if (validatedState && !skipState) contactData.MailingState = validatedState;
    if (userData.postalCode) contactData.MailingPostalCode = userData.postalCode;
    if (userData.country) contactData.MailingCountry = userData.country;

    const contactResponse = await createSalesforceContact(contactData, accessToken, instanceUrl);
    
    if (!contactResponse.id) {
      throw new Error('Failed to create Contact in Salesforce');
    }

    return {
      success: true,
      account: {
        id: accountResponse.id,
        name: accountData.Name
      },
      contact: {
        id: contactResponse.id,
        name: `${userData.firstName} ${userData.lastName}`
      }
    };
  } catch (error) {
    console.error('Error creating Account with Contact:', error);
    throw error;
  }
}

/**
 * Validate Salesforce credentials
 * @param {string} accessToken - Access token to validate
 * @param {string} instanceUrl - Salesforce instance URL
 * @returns {Promise<Object>} User info if valid
 */
export async function validateSalesforceToken(accessToken, instanceUrl) {
  try {
    // Use a simpler query to validate the token
    const userInfo = await salesforceApiCall('query/?q=SELECT+Id,Name,Email+FROM+User+LIMIT+1', accessToken, instanceUrl);
    return userInfo;
  } catch (error) {
    console.error('Token validation failed:', error);
    throw error;
  }
}

/**
 * Generate a secure state parameter for OAuth
 * @returns {string} Random state string
 */
export function generateOAuthState() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}