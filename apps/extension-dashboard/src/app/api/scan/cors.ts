import { NextResponse } from "next/server";

const allowedOrigin = process.env.EXTENSION_ORIGIN ?? "*";

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function jsonWithCors(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

export function corsPreflight() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
