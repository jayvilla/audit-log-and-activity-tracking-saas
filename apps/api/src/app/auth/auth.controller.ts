import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './auth.guard';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  @Get('csrf')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiOkResponse({ description: 'CSRF token returned and cookie set' })
  getCsrfToken(@Req() req: Request, @Res() res: Response) {
    // Generate or reuse CSRF secret (store in session for persistence)
    let csrfSecret = req.session.csrfSecret;
    if (!csrfSecret) {
      csrfSecret = this.csrfService.createSecret();
      req.session.csrfSecret = csrfSecret;
    }

    // Generate CSRF token
    const token = this.csrfService.generateToken(csrfSecret);

    // Set non-httpOnly cookie with CSRF secret
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('csrf-secret', csrfSecret, {
      httpOnly: false, // Must be accessible to JavaScript
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    return res.json({ token });
  }

  @Post('register')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  @ApiOkResponse({ description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 403, description: 'Invalid CSRF token' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const { user, organization } = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );

    // Store session data
    req.session.userId = user.id;
    req.session.orgId = user.orgId;
    req.session.role = user.role;

    // Return user data (without password hash)
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      sessionToken: 'session-set-via-cookie', // Session is set via cookie, this is just for API contract
    };
  }

  @Post('login')
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Invalid CSRF token' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Store session data
    req.session.userId = user.id;
    req.session.orgId = user.orgId;
    req.session.role = user.role;

    // Return user data (without password hash)
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard, CsrfGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@Req() req: Request) {
    return new Promise<{ message: string }>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ message: 'Logged out successfully' });
        }
      });
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiOkResponse({ description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Req() req: Request) {
    const userId = req.session.userId;
    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}

