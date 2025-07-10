import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxbclipddmmgkazkhinv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4YmNsaXBkZG1tZ2themtoaW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODQ3ODEsImV4cCI6MjA2Nzc2MDc4MX0.z4d8Iv8NC3xtC09GvNb6UAz-sK7OpwO9cB8cK4-Ygbc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
