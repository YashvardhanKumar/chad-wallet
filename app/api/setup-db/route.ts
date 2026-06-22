import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({
      status: 'missing_key',
      message: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (find it in Supabase Dashboard > Project Settings > API)',
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const sqlPath = path.join(process.cwd(), 'supabase/migrations/20240622000001_create_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  try {
    const { error } = await adminClient.rpc('pg_query', { query: sql });
    if (error) {
      try {
        const res = await fetch(`${supabaseUrl}/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        const result = await res.json();
        return NextResponse.json({ status: res.ok ? 'done' : 'error', result });
      } catch (e2: any) {
        return NextResponse.json({
          status: 'manual',
          message: 'Could not auto-create tables. Run the SQL in supabase/migrations/20240622000001_create_tables.sql via the Supabase Dashboard SQL editor.',
          sql,
        });
      }
    }
    return NextResponse.json({ status: 'done', message: 'Tables created successfully' });
  } catch (e: any) {
    return NextResponse.json({
      status: 'manual',
      message: 'Could not auto-create tables. Run the SQL in supabase/migrations/20240622000001_create_tables.sql via the Supabase Dashboard SQL editor.',
      sql,
    });
  }
}
