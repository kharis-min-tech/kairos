import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MembersDemoService } from './members-demo.service';
// import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  // imports: [PrismaModule],
  controllers: [MembersController],
  providers: [
    {
      provide: MembersService,
      useClass: MembersDemoService, // Use demo service for now
    },
  ],
  exports: [MembersService],
})
export class MembersModule {}
