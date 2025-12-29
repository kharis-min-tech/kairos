import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { DepartmentsDemoService } from './departments-demo.service';
// import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  // imports: [PrismaModule],
  controllers: [DepartmentsController],
  providers: [
    {
      provide: DepartmentsService,
      useClass: DepartmentsDemoService, // Use demo service for now
    },
  ],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
