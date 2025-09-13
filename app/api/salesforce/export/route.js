import { NextResponse } from 'next/server';
import { createAccountWithContact, refreshAccessToken, validateSalesforceToken } from '@/lib/salesforce-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Export user data to Salesforce
 * POST /api/salesforce/export
 */
export async function POST(request) {
  try {
    // Parse request body
    const userData = await request.json();

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get Salesforce tokens from user metadata
    let accessToken = user.user_metadata?.salesforce_access_token;
    let refreshToken = user.user_metadata?.salesforce_refresh_token;
    const instanceUrl = user.user_metadata?.salesforce_instance_url;

    if (!accessToken || !instanceUrl) {
      return NextResponse.json(
        { error: 'Salesforce not connected. Please connect your Salesforce account first.' },
        { status: 400 }
      );
    }

    // Validate current access token
    try {
      await validateSalesforceToken(accessToken, instanceUrl);
    } catch (tokenError) {
      console.log('Access token expired, attempting refresh...');
      
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'Salesforce connection expired. Please reconnect your account.' },
          { status: 401 }
        );
      }

      // Attempt to refresh the token
      try {
        const clientId = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error('Missing Salesforce credentials');
        }

        const tokenResponse = await refreshAccessToken(refreshToken, clientId, clientSecret);
        accessToken = tokenResponse.access_token;

        // Update user metadata with new token
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            salesforce_access_token: accessToken,
            salesforce_refresh_token: tokenResponse.refresh_token || refreshToken
          }
        });

        if (updateError) {
          console.error('Failed to update refreshed token:', updateError);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json(
          { error: 'Salesforce connection expired. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    // Create Account and Contact in Salesforce
    try {
      const salesforceResult = await createAccountWithContact(userData, accessToken, instanceUrl);
      
      return NextResponse.json({
        success: true,
        message: 'Successfully exported to Salesforce',
        data: {
          account: salesforceResult.account,
          contact: salesforceResult.contact
        }
      });
    } catch (salesforceError) {
      console.error('Salesforce export error:', salesforceError);
      return NextResponse.json(
        { error: `Failed to export to Salesforce: ${salesforceError.message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get export history or status
 * GET /api/salesforce/export
 */
export async function GET(request) {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check Salesforce connection status
    const isConnected = !!(user.user_metadata?.salesforce_access_token);
    const connectedAt = user.user_metadata?.salesforce_connected_at;

    return NextResponse.json({
      isConnected,
      connectedAt,
      canExport: isConnected
    });

  } catch (error) {
    console.error('Export status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check export status' },
      { status: 500 }
    );
  }
}