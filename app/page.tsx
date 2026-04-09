'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Fallbacks to prevent crash if env variables are missing locally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TrainPage() {
  const[cars, setCars] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchCars = async () => {
      const { data, error } = await supabase.from('train_cars').select('*').order('id', { ascending: true });
      if (error) console.error("DB Error:", error);
      if (data) setCars(data);
    };
    fetchCars();

    const channel = supabase
      .channel('train_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'train_cars' }, (payload) => {
        setCars((current) =>
          current.map((car) => (car.id === payload.new.id ? payload.new : car))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },[]);

  const handleImageUploadAndCheckout = async (e: React.ChangeEvent<HTMLInputElement>, carId: number, currentPrice: number) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('train-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert('Failed to upload image. Did you run the Supabase SQL setup?');
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('train-images').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, imageUrl, price: currentPrice }),
      });

      if (!response.ok) {
         throw new Error("Checkout API error.");
      }

      const { url } = await response.json();
      window.location.href = url;

    } catch (error) {
      alert('Error connecting to checkout. Check console.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white font-mono flex flex-col items-center justify-center">
      <div className="text-center mb-8 pt-10">
        <h1 className="text-5xl font-bold mb-2 text-yellow-500 tracking-tighter">THE HYPE TRAIN</h1>
        <p className="text-gray-400">Cars start at $5. The Engine is $20. Tagging over someone costs +$1.</p>
      </div>

      <div className="w-full overflow-x-auto flex items-end gap-2 px-10 pb-10" style={{ scrollSnapType: 'x mandatory' }}>
        {cars.length === 0 ? (
           <p className="text-gray-500 animate-pulse">Loading the train... (If this doesn't go away, check your .env.local keys!)</p>
        ) : (
          cars.map((car) => (
            <div key={car.id} className="flex-shrink-0 flex flex-col items-center" style={{ scrollSnapAlign: 'center' }}>
              
              <div className={`w-64 h-40 border-4 relative overflow-hidden flex items-center justify-center
                ${car.is_engine ? 'border-yellow-500 bg-yellow-900 rounded-r-3xl' : 'border-gray-500 bg-gray-800'}`}>
                
                {car.image_url ? (
                  <img src={car.image_url} alt={`Car ${car.id}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 font-bold">{car.is_engine ? "ENGINE" : "EMPTY"}</span>
                )}

                <div className="absolute inset-0 bg-black/80 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                  <p className="mb-2 text-xl font-bold text-green-400">${Number(car.price).toFixed(2)}</p>
                  <label className="bg-green-500 text-white px-4 py-2 cursor-pointer hover:bg-green-600 rounded font-bold">
                    {uploading ? 'Uploading...' : 'Tag This Car'}
                    <input type="file" accept="image/png, image/jpeg" className="hidden" 
                           onChange={(e) => handleImageUploadAndCheckout(e, car.id, car.price)} 
                           disabled={uploading} />
                  </label>
                </div>
              </div>

              <div className="flex gap-16 mt-2">
                <div className="w-8 h-8 bg-gray-400 rounded-full border-4 border-gray-600"></div>
                <div className="w-8 h-8 bg-gray-400 rounded-full border-4 border-gray-600"></div>
              </div>
              <div className="mt-2 text-xs text-gray-500 font-bold">#{car.id}</div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}