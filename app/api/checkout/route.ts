// app/api/checkout/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { carId, imageUrl, price } = body;

    // TODO: Initialize Stripe and create a checkout session here
    
    // For now, return a dummy URL to test if the 404 goes away
    return NextResponse.json({ url: 'https://checkout.stripe.com/test' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}