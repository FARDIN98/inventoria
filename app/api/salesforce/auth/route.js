import { NextResponse } from 'next/server';
import { getSalesforceAuthUrl, generateOAuthState } from '@/lib/salesforce-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Initiate Salesforce OAuth flow
 * GET /api/salesforce/auth
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

    // Get Salesforce credentials from environment
    const clientId = process.env.CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error('Missing Salesforce credentials in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Generate secure state parameter
    const state = generateOAuthState();

    // Store state in user session for validation (optional security measure)
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        salesforce_oauth_state: state
      }
    });

    if (updateError) {
      console.error('Failed to store OAuth state:', updateError);
    }

    // Generate Salesforce authorization URL
    const authUrl = getSalesforceAuthUrl(clientId, redirectUri, state);

    // Redirect to Salesforce authorization page
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('Salesforce auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Salesforce authentication' },
      { status: 500 }
    );
  }
}

/**
 * Get Salesforce connection status
 * POST /api/salesforce/auth
 */
export async function POST(request) {
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

    // Check if user has Salesforce tokens
    const salesforceData = {
      isConnected: !!(user.user_metadata?.salesforce_access_token),
      connectedAt: user.user_metadata?.salesforce_connected_at || null,
      instanceUrl: user.user_metadata?.salesforce_instance_url || null
    };

    return NextResponse.json(salesforceData);

  } catch (error) {
    console.error('Salesforce status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check Salesforce connection status' },
      { status: 500 }
    );
  }
}