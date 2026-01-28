import { supabase } from "./supabase";

export type NotificationType = 'info' | 'warning' | 'success' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationCategory = 'customer' | 'admin' | 'kds' | 'billing' | 'system';

export interface CreateNotificationParams {
  title: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  user_id?: string;
  reference_id?: string;
  reference_type?: string;
  deep_link?: string;
  metadata?: any;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        priority: params.priority || 'normal',
        category: params.category || 'admin',
        user_id: params.user_id,
        reference_id: params.reference_id,
        reference_type: params.reference_type,
        deep_link: params.deep_link,
        metadata: params.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function markAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}
