'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TrainPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // 1. Fetch initial cars
    const fetchCars = async () => {
      const { data } = await supabase.from('train_cars').select('*').order('id', { ascending: true });
      if (data) setCars(data);
    };
    fetchCars();

    // 2. Listen for Realtime updates
    const channel = supabase
      .channel('train_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'train_cars' }, (payload) => {
        setCars((current) =>
          current.map((car) => (car.id === payload.new.id ? payload.new : car))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleImageUploadAndCheckout = async (e: React.ChangeEvent<HTMLInputElement>, carId: number, currentPrice: number) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('train-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('train-images').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      // 2. Send to Stripe Checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, imageUrl, price: currentPrice }),
      });

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe

    } catch (error) {
      alert('Error uploading image.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white font-mono flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">The Infinite Train</h1>
        <p className="text-gray-400">Tag a car for $1. If someone tags over you, the price increases 1.2x.</p>
      </div>

      {/* HORIZONTAL SCROLLING TRAIN */}
      <div className="w-full overflow-x-auto flex items-end gap-2 px-10 pb-10" style={{ scrollSnapType: 'x mandatory' }}>
        {cars.map((car) => (
          <div key={car.id} className="flex-shrink-0 flex flex-col items-center" style={{ scrollSnapAlign: 'center' }}>
            
            {/* The Train Car */}
            <div className={`w-64 h-40 border-4 relative overflow-hidden flex items-center justify-center
              ${car.is_engine ? 'border-yellow-500 bg-yellow-900 rounded-r-3xl' : 'border-gray-500 bg-gray-800'}`}>
              
              {car.image_url ? (
                <img src={car.image_url} alt={`Car ${car.id}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-500">Empty</span>
              )}

              {/* Tag Hover State */}
              <div className="absolute inset-0 bg-black/80 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <p className="mb-2">${car.price}</p>
                <label className="bg-green-500 text-white px-4 py-2 cursor-pointer hover:bg-green-600 rounded">
                  {uploading ? 'Uploading...' : 'Tag this car'}
                  <input type="file" accept="image/png, image/jpeg" className="hidden" 
                         onChange={(e) => handleImageUploadAndCheckout(e, car.id, car.price)} 
                         disabled={uploading} />
                </label>
              </div>
            </div>

            {/* Wheels */}
            <div className="flex gap-16 mt-2">
              <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-gray-600"></div>
              <div className="w-8 h-8 bg-gray-400 rounded-full border-2 border-gray-600"></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">#{car.id}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
