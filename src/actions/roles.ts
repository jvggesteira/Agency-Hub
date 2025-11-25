'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 

export async function getRolePresets() {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  
  const { data, error } = await supabase
    .from('role_presets')
    .select('*')
    .order('name');

  if (error) {
    console.error('Erro ao buscar cargos:', error);
    return [];
  }
  return data;
}

export async function saveRolePreset(name: string, permissions: any) {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('role_presets')
    .insert({ name, permissions })
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, data };
}

export async function deleteRolePreset(id: string) {
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    
    const { error } = await supabase.from('role_presets').delete().eq('id', id);
    
    if (error) return { success: false, message: error.message };
    return { success: true };
}