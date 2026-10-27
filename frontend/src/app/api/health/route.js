import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'frontend',
    framework: 'Next.js 16',
    timestamp: new Date().toISOString(),
    phase: 'Phase 1 - Project Initialization & Architecture Setup',
  });
}
