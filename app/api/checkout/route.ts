import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Fallback to prevent crash if key is missing locally
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' as any });

export async function POST(req: Request) {
  try {
    const { carId, imageUrl, price } = await req.json();

    // Convert decimal price to cents for Stripe
    const unitAmount = Math.round(price * 100);
    
    // Fallback URL if running locally vs Vercel
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:[
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: carId === 1 ? 'Tag The Engine' : `Tag Train Car #${carId}`,
              images: [imageUrl], // Shows the user their image at checkout
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}?success=true`,
      cancel_url: `${siteUrl}?canceled=true`,
      metadata: {
        carId: carId.toString(),
        imageUrl: imageUrl, 
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}