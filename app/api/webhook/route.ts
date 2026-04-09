import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' as any });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder' 
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const carId = parseInt(session.metadata!.carId);
    const imageUrl = session.metadata!.imageUrl;
    const amountPaid = session.amount_total! / 100;

    // Calculate new price (1.2x markup)
    const newPrice = Number((amountPaid + 1.00).toFixed(2));

    // Update Supabase (Triggers Realtime)
    await supabase
      .from('train_cars')
      .update({ image_url: imageUrl, price: newPrice })
      .eq('id', carId);
  }

  return new NextResponse('Success', { status: 200 });
}