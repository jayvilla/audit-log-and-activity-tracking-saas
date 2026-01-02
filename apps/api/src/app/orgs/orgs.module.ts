import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';
import { OrganizationEntity } from '../../entities/organization.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity]), AuthModule],
  controllers: [OrgsController],
  providers: [OrgsService],
  exports: [OrgsService],
})
export class OrgsModule {}

