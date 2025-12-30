import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      return null;
    }

    // Check password - handle both bcrypt and SHA256 (for existing seeded data)
    const isPasswordValid =
      (await this.checkBcryptPassword(password, user.passwordHash)) ||
      (await this.checkSha256Password(password, user.passwordHash));

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private async checkBcryptPassword(
    plainPassword: string,
    hash: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hash);
    } catch {
      return false;
    }
  }

  private async checkSha256Password(
    plainPassword: string,
    hash: string,
  ): Promise<boolean> {
    const crypto = await import('crypto');
    const computedHash = crypto
      .createHash('sha256')
      .update(plainPassword)
      .digest('hex');
    return computedHash === hash;
  }
}

