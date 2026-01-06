import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedViewEntity } from '../../entities/saved-view.entity';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';

@Injectable()
export class SavedViewsService {
  constructor(
    @InjectRepository(SavedViewEntity)
    private readonly savedViewRepository: Repository<SavedViewEntity>,
  ) {}

  /**
   * Create a saved view
   */
  async createSavedView(orgId: string, createDto: CreateSavedViewDto): Promise<SavedViewEntity> {
    const savedView = this.savedViewRepository.create({
      orgId,
      name: createDto.name,
      description: createDto.description || null,
      filters: createDto.filters,
      useCount: 0,
      lastUsedAt: null,
    });

    return await this.savedViewRepository.save(savedView);
  }

  /**
   * List all saved views for an organization
   */
  async listSavedViews(orgId: string): Promise<SavedViewEntity[]> {
    return await this.savedViewRepository.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a saved view by ID
   */
  async getSavedView(orgId: string, savedViewId: string): Promise<SavedViewEntity> {
    const savedView = await this.savedViewRepository.findOne({
      where: { id: savedViewId, orgId },
    });

    if (!savedView) {
      throw new NotFoundException('Saved view not found');
    }

    return savedView;
  }

  /**
   * Update a saved view
   */
  async updateSavedView(
    orgId: string,
    savedViewId: string,
    updateDto: UpdateSavedViewDto,
  ): Promise<SavedViewEntity> {
    const savedView = await this.getSavedView(orgId, savedViewId);

    if (updateDto.name !== undefined) {
      savedView.name = updateDto.name;
    }
    if (updateDto.description !== undefined) {
      savedView.description = updateDto.description || null;
    }
    if (updateDto.filters !== undefined) {
      savedView.filters = updateDto.filters;
    }

    return await this.savedViewRepository.save(savedView);
  }

  /**
   * Delete a saved view
   */
  async deleteSavedView(orgId: string, savedViewId: string): Promise<void> {
    const savedView = await this.getSavedView(orgId, savedViewId);
    await this.savedViewRepository.remove(savedView);
  }

  /**
   * Record that a saved view was used (increment use count and update last used)
   */
  async recordUsage(orgId: string, savedViewId: string): Promise<SavedViewEntity> {
    const savedView = await this.getSavedView(orgId, savedViewId);
    savedView.useCount += 1;
    savedView.lastUsedAt = new Date();
    return await this.savedViewRepository.save(savedView);
  }
}

