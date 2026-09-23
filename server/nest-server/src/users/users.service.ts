import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { hash } from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

type UserId = string | Types.ObjectId;

const SALT_ROUNDS = 10;
const SAFE_FIELDS = '-password -refreshToken';
const MONGO_DUPLICATE_KEY_CODE = 11000;
const SUPPORTED_MODELS = new Set(['tiny', 'base', 'small', 'medium', 'large']);

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private assertValidId(id: UserId): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }
  }

  private assertFound(doc: UserDocument | null, id: UserId): UserDocument {
    if (!doc) throw new NotFoundException(`User ${String(id)} not found`);
    return doc;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === MONGO_DUPLICATE_KEY_CODE
    );
  }

  async create(userData: CreateUserDto): Promise<UserDocument> {
    const hashPassword = hash as unknown as (
      password: string,
      saltRounds: number,
    ) => Promise<string>;
    const hashedPassword = await hashPassword(userData.password, SALT_ROUNDS);

    try {
      return await new this.userModel({
        ...userData,
        password: hashedPassword,
      }).save();
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  findById(id: UserId): Promise<UserDocument | null> {
    this.assertValidId(id);
    return this.userModel.findById(id).exec();
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select(SAFE_FIELDS).exec();
  }

  private async updateById(
    id: UserId,
    update: {
      refreshToken?: string | null;
      selectedModel?: User['selectedModel'];
      role?: User['role'];
      isActivate?: User['isActivate'];
    },
  ): Promise<UserDocument> {
    this.assertValidId(id);
    const updated = await this.userModel
      .findByIdAndUpdate(id, update, { new: true })
      .select(SAFE_FIELDS)
      .exec();
    return this.assertFound(updated, id);
  }

  updateRefreshToken(id: UserId, token: string | null): Promise<UserDocument> {
    return this.updateById(id, { refreshToken: token });
  }

  updateSettings(id: UserId, model: string): Promise<UserDocument> {
    if (!SUPPORTED_MODELS.has(model)) {
      throw new BadRequestException('Unsupported transcription model');
    }
    return this.updateById(id, { selectedModel: model });
  }

  updateRole(id: UserId, role: User['role']): Promise<UserDocument> {
    return this.updateById(id, { role });
  }

  updateStatus(id: UserId, isActive: boolean): Promise<UserDocument> {
    return this.updateById(id, { isActivate: isActive });
  }

  async deleteUserById(id: UserId): Promise<UserDocument> {
    this.assertValidId(id);
    const deleted = await this.userModel
      .findByIdAndDelete(id)
      .select(SAFE_FIELDS)
      .exec();
    return this.assertFound(deleted, id);
  }
}
