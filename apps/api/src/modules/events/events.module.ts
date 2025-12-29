import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsDemoService } from './events-demo.service';
// import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  // imports: [PrismaModule],
  controllers: [EventsController],
  providers: [
    {
      provide: EventsService,
      useClass: EventsDemoService, // Use demo service for now
    },
  ],
  exports: [EventsService],
})
export class EventsModule {}
