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
    // In test environment, log the query for debugging
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      console.log(`[AuthService] Looking up user with email: ${email}`);
      // Check if repository is using the correct DataSource
      const repoDataSource = (this.userRepository as any).manager.connection;
      console.log(`[AuthService] Repository DataSource database: ${repoDataSource.options.database}`);
    }
    
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
        console.log(`[AuthService] User not found with email: ${email}`);
        // Try a direct query to see if user exists
        const directQuery = await this.userRepository
          .createQueryBuilder('user')
          .where('user.email = :email', { email })
          .getRawOne();
        console.log(`[AuthService] Direct query result:`, directQuery);
      }
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

