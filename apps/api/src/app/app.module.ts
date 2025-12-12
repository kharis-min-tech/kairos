import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MembersModule } from '../modules/members/members.module';
import { DepartmentsModule } from '../modules/departments/departments.module';
import { FellowshipsModule } from '../modules/fellowships/fellowships.module';
import { EventsModule } from '../modules/events/events.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { FormsModule } from '../modules/forms/forms.module';
import { CommunicationsModule } from '../modules/communications/communications.module';
import { SecurityModule } from '../modules/security/security.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { OutreachModule } from '../modules/outreach/outreach.module';

@Module({
  imports: [
    MembersModule,
    DepartmentsModule,
    FellowshipsModule,
    EventsModule,
    FinanceModule,
    FormsModule,
    CommunicationsModule,
    SecurityModule,
    SettingsModule,
    OutreachModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
