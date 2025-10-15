import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from 'src/supabase/supabase.types';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient<Database>;
  constructor(private readonly configService: ConfigService) {
    this.client = createClient<Database>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_KEY')!,
    );
  }
}
