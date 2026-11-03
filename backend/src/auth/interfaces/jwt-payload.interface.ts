import { Role } from "../../common/enums/role.enum";

export interface JwtPayload {
  sub: string;    // userId
  email: string;
  role: Role;
  agentId?: string;
  iat?: number;
  exp?: number;
}
