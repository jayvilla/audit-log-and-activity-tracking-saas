import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../../entities/user.entity';
import { OrganizationEntity } from '../../entities/organization.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
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
      // Only check bcrypt if hash starts with bcrypt identifier
      if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
        return false;
      }
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

  /**
   * Register a new user and create their organization
   */
  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<{ user: UserEntity; organization: OrganizationEntity }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists (globally, across all organizations)
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Generate organization slug from user's name
    const orgSlug = this.generateSlug(name || normalizedEmail.split('@')[0]);

    // Check if slug already exists, append number if needed
    let finalSlug = orgSlug;
    let counter = 1;
    while (await this.organizationRepository.findOne({ where: { slug: finalSlug } })) {
      finalSlug = `${orgSlug}-${counter}`;
      counter++;
    }

    // Create organization
    const organization = this.organizationRepository.create({
      name: name ? `${name}'s Organization` : `${normalizedEmail.split('@')[0]}'s Organization`,
      slug: finalSlug,
    });
    const savedOrganization = await this.organizationRepository.save(organization);

    // Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with admin role (first user in organization)
    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      name: name || null,
      orgId: savedOrganization.id,
      role: UserRole.ADMIN, // First user is admin
      organization: savedOrganization,
    });
    const savedUser = await this.userRepository.save(user);

    return {
      user: savedUser,
      organization: savedOrganization,
    };
  }

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}

