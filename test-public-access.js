// Test script to verify public inventory access
// This script tests if authenticated users can access public inventory items

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhlrxpcpksvqowxurmgm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRobHJ4cGNwa3N2cW93eHVybWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTEwMjQsImV4cCI6MjA3MDkyNzAyNH0.mPLQCt_dMjHaAcHaw2kM4ne1XTuSQJHq-J_kv7yCLMo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPublicInventoryAccess() {
  console.log('🧪 Testing Public Inventory Access...');
  
  try {
    // Test 1: Check if we can read public inventories
    console.log('\n1. Testing public inventory read access...');
    const { data: publicInventories, error: inventoryError } = await supabase
      .from('inventories')
      .select('*')
      .eq('isPublic', true)
      .limit(5);
    
    if (inventoryError) {
      console.error('❌ Error reading public inventories:', inventoryError);
    } else {
      console.log('✅ Public inventories found:', publicInventories?.length || 0);
      if (publicInventories && publicInventories.length > 0) {
        console.log('📋 Sample inventory:', publicInventories[0]);
      }
    }
    
    // Test 2: Check if we can read items from public inventories
    if (publicInventories && publicInventories.length > 0) {
      console.log('\n2. Testing public inventory items read access...');
      const inventoryId = publicInventories[0].id;
      
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('inventoryId', inventoryId)
        .limit(5);
      
      if (itemsError) {
        console.error('❌ Error reading items from public inventory:', itemsError);
      } else {
        console.log('✅ Items found in public inventory:', items?.length || 0);
        if (items && items.length > 0) {
          console.log('📦 Sample item:', items[0]);
        }
      }
    }
    
    // Test 3: Check RLS policies
    console.log('\n3. Testing RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .rpc('get_policies', { table_name: 'items' })
      .select('*');
    
    if (policyError) {
      console.log('ℹ️  Could not fetch policies (expected for anon user):', policyError.message);
    } else {
      console.log('✅ Policies found:', policies?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPublicInventoryAccess();