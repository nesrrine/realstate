import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  UnauthorizedException,
} from "@nestjs/common";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "./login-throttle";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // Pas d'inscription publique : les comptes sont créés par le gérant (POST /agents)

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login and get JWT token" })
  @ApiResponse({ status: 200, description: "Login successful, returns JWT" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 429, description: "Too many failed attempts" })
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    assertLoginAllowed(dto.email, ip);
    try {
      const result = await this.authService.login(dto);
      clearLoginFailures(dto.email);
      return result;
    } catch (e) {
      if (e instanceof UnauthorizedException) recordLoginFailure(dto.email, ip);
      throw e;
    }
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiResponse({ status: 200, description: "Current user data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  getMe(@CurrentUser("id") userId: string) {
    return this.authService.getMe(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Update current user profile" })
  @ApiResponse({ status: 200, description: "Updated user data" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 409, description: "Email already in use" })
  updateProfile(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Patch("me/password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT")
  @ApiOperation({ summary: "Change current user password" })
  @ApiResponse({ status: 200, description: "Password changed" })
  @ApiResponse({ status: 401, description: "Unauthorized or wrong current password" })
  changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Post("users/admins")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth("JWT")
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: "Create admin account (MANAGER only)" })
  @ApiResponse({ status: 201, description: "Admin created successfully" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  createAdmin(
    @Body() dto: CreateAdminDto,
    @CurrentUser("id") requesterUserId: string,
  ) {
    return this.authService.createAdmin(dto, requesterUserId);
  }
}