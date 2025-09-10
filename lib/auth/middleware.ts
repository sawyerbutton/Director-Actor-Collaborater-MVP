import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/api/errors";
import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export async function authenticateRequest(request?: NextRequest): Promise<AuthUser> {
  const session = await auth();
  
  if (!session?.user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  return {
    id: session.user.id as string,
    email: session.user.email as string,
    name: session.user.name as string | null,
  };
}

export async function getOptionalAuth(): Promise<AuthUser | null> {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }
  
  return {
    id: session.user.id as string,
    email: session.user.email as string,
    name: session.user.name as string | null,
  };
}