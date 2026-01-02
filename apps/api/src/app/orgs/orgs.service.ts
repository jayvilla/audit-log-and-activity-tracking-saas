import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../../entities/organization.entity';

@Injectable()
export class OrgsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
  ) {}

  async getOrganizationById(orgId: string): Promise<OrganizationEntity> {
    const org = await this.orgRepository.findOne({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }
}

