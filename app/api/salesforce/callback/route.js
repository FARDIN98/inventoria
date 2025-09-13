import { NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/salesforce-utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Handle Salesforce OAuth callback
 * GET /api/salesforce/callback
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Salesforce OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard?salesforce_error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?salesforce_error=Missing authorization code', request.url)
      );
    }

    // Get Salesforce credentials from environment
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing Salesforce credentials in environment variables');
      return NextResponse.redirect(
        new URL('/dashboard?salesforce_error=Server configuration error', request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);

    // Get current user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Failed to get current user:', userError);
      return NextResponse.redirect(
        new URL('/dashboard?salesforce_error=Authentication required', request.url)
      );
    }

    // Store Salesforce tokens in user's session/database
    // For security, we'll store tokens in Supabase user metadata or a separate table
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        salesforce_access_token: tokenResponse.access_token,
        salesforce_refresh_token: tokenResponse.refresh_token,
        salesforce_instance_url: tokenResponse.instance_url,
        salesforce_connected_at: new Date().toISOString()
      }
    });

    if (updateError) {
      console.error('Failed to store Salesforce tokens:', updateError);
      return NextResponse.redirect(
        new URL('/dashboard?salesforce_error=Failed to save connection', request.url)
      );
    }

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?salesforce_success=Connected successfully', request.url)
    );

  } catch (error) {
    console.error('Salesforce callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?salesforce_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}