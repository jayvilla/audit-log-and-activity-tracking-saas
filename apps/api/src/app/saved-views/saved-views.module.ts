import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedViewsController } from './saved-views.controller';
import { SavedViewsService } from './saved-views.service';
import { SavedViewEntity } from '../../entities/saved-view.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedViewEntity]),
    AuthModule,
  ],
  controllers: [SavedViewsController],
  providers: [SavedViewsService],
  exports: [SavedViewsService],
})
export class SavedViewsModule {}

