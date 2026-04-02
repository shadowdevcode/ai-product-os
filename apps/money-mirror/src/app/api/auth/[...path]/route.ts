import { authApiHandler } from '@neondatabase/auth/next/server';

function getHandler() {
  return authApiHandler();
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandler().GET(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandler().POST(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandler().PUT(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandler().PATCH(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return getHandler().DELETE(request, context);
}
