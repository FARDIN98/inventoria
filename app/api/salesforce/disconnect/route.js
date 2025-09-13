import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Disconnect from Salesforce
 * DELETE /api/salesforce/disconnect
 */
export async function DELETE(request) {
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

    // Remove Salesforce tokens from user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        salesforce_access_token: null,
        salesforce_refresh_token: null,
        salesforce_instance_url: null,
        salesforce_connected_at: null,
        salesforce_oauth_state: null
      }
    });

    if (updateError) {
      console.error('Failed to disconnect from Salesforce:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect from Salesforce' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from Salesforce'
    });

  } catch (error) {
    console.error('Salesforce disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect from Salesforce' },
      { status: 500 }
    );
  }
}