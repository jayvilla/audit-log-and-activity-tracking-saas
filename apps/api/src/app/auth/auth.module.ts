import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { CsrfGuard } from './csrf.guard';
import { RolesGuard } from './roles.guard';
import { UserEntity } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [AuthService, CsrfService, CsrfGuard, RolesGuard],
  exports: [AuthService, CsrfService, CsrfGuard, RolesGuard],
})
export class AuthModule {}

