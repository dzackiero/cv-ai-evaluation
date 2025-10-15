import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './services/supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class CommonModule {}
