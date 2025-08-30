import { getInventoryByIdAction } from '@/lib/inventory-actions';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getCurrentUserServer } from '@/lib/auth-actions';
import CustomIdSettingsClient from '@/components/CustomIdSettingsClient';

export default async function CustomIdSettingsPage({ params }) {
  const { id } = await params;
  
  // Get current user session
  const { user } = await getCurrentUserServer();
  
  const result = await getInventoryByIdAction(id);
  
  if (!result.success) {
    notFound();
  }
  
  const inventory = result.inventory;
  
  // Check if user is admin
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data: userRecord } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    isAdmin = userRecord?.role === 'ADMIN';
  }
  
  // Check if current user can edit this inventory (owner, admin, or authenticated user with public inventory)
  const canEdit = user && (inventory.ownerId === user.id || isAdmin || inventory.isPublic);
  
  if (!canEdit) {
    notFound();
  }

  return (
    <CustomIdSettingsClient 
      inventory={inventory}
      canEdit={canEdit}
      isAdmin={isAdmin}
    />
  );
}