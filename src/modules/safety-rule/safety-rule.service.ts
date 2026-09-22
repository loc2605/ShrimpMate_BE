import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SafetyRule } from '../../database/entities/safety-rule.entity';
import { CreateSafetyRuleDto } from './dto/create-safety-rule.dto';
import { UpdateSafetyRuleDto } from './dto/update-safety-rule.dto';

@Injectable()
export class SafetyRuleService {
  constructor(
    @InjectRepository(SafetyRule)
    private readonly ruleRepository: Repository<SafetyRule>,
  ) {}

  async findAll() {
    return this.ruleRepository.find({
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Không tìm thấy quy tắc an toàn với id ${id}`);
    }
    return rule;
  }

  async create(dto: CreateSafetyRuleDto) {
    const existing = await this.ruleRepository.findOne({ where: { code: dto.code.trim() } });
    if (existing) {
      throw new BadRequestException(`Mã quy tắc an toàn ${dto.code} đã tồn tại`);
    }

    const rule = this.ruleRepository.create({
      code: dto.code.trim(),
      name: dto.name.trim(),
      priority: dto.priority ?? 100,
      isEnabled: dto.isEnabled ?? true,
      condition: dto.condition,
      action: dto.action,
    });

    return this.ruleRepository.save(rule);
  }

  async update(id: string, dto: UpdateSafetyRuleDto) {
    const rule = await this.findOne(id);

    Object.assign(rule, {
      name: dto.name?.trim() ?? rule.name,
      priority: dto.priority !== undefined ? dto.priority : rule.priority,
      isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : rule.isEnabled,
      condition: dto.condition ?? rule.condition,
      action: dto.action ?? rule.action,
    });

    return this.ruleRepository.save(rule);
  }

  async remove(id: string) {
    const rule = await this.findOne(id);
    await this.ruleRepository.remove(rule);
    return { message: `Đã xoá quy tắc an toàn ${rule.name}` };
  }
}
