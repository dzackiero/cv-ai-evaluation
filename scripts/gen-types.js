const { execSync } = require('child_process');
require('dotenv').config();

const projectId = process.env.SUPABASE_PROJECT_ID;
if (!projectId) {
  console.error('❌ PROJECT_ID is not set in .env');
  process.exit(1);
}

try {
  execSync(
    `supabase gen types typescript --project-id ${projectId} > src/supabase/supabase.types.ts`,
    { stdio: 'inherit', shell: true },
  );
} catch (err) {
  console.error('❌ Type generation failed:', err.message);
  process.exit(1);
}
