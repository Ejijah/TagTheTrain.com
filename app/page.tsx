'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TrainPage() {
  const [cars, setCars] = useState<any[]>([]);
  const[uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCars = async () => {
      // ORDER SET TO FALSE: Car 100 is on the left, Car 1 (Engine) is on the right!
      const { data, error } = await supabase.from('train_cars').select('*').order('id', { ascending: false });
      if (error) console.error("DB Error:", error);
      if (data) {
        setCars(data);
        // Scroll to the engine (Car 1) after loading
        setTimeout(() => {
          document.getElementById('car-1')?.scrollIntoView({ behavior: 'smooth', inline: 'end' });
        }, 500);
      }
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
        alert('Failed to upload image.');
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('train-images').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, imageUrl, price: currentPrice }),
      });

      if (!response.ok) throw new Error("Checkout API error.");

      const { url } = await response.json();
      window.location.href = url;

    } catch (error) {
      alert('Error connecting to checkout.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white font-mono flex flex-col items-center justify-center overflow-hidden">
      
      {/* CSS Animations Injected directly into the page */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .bob-0 { animation: bob 1.5s infinite ease-in-out; }
        .bob-1 { animation: bob 1.5s infinite ease-in-out 0.75s; }
        
        @keyframes track-move {
          0% { background-position: 0px 0; }
          100% { background-position: -40px 0; }
        }
        .track-moving {
          background-image: repeating-linear-gradient(90deg, #4b5563 0px, #4b5563 15px, transparent 15px, transparent 40px);
          animation: track-move 0.6s linear infinite;
        }
        
        /* Hide scrollbar for a cleaner look but keep functionality */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* Header */}
      <div className="text-center mb-16 pt-10 absolute top-0 z-10 w-full bg-gradient-to-b from-gray-900 to-transparent pb-10 pointer-events-none">
        <h1 className="text-5xl font-bold mb-2 text-yellow-500 tracking-tighter drop-shadow-lg">THE HYPE TRAIN</h1>
        <p className="text-gray-300 drop-shadow">Cars start at $5. The Engine is $20. Tagging over someone costs +$1.</p>
      </div>

      {/* HORIZONTAL SCROLLING CONTAINER */}
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto hide-scrollbar flex items-end px-[50vw] pb-20 pt-40" 
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {cars.length === 0 ? (
           <p className="text-gray-500 animate-pulse text-center w-full">Loading the train...</p>
        ) : (
          <div className="flex items-end gap-3 relative">
            
            {/* Moving Track underneath the train */}
            <div className="absolute bottom-[14px] left-[-50vw] right-[-50vw] h-2 track-moving z-0"></div>

            {cars.map((car) => (
              <div 
                key={car.id} 
                id={`car-${car.id}`}
                className={`flex-shrink-0 flex flex-col items-center z-10 bob-${car.id % 2}`} 
                style={{ scrollSnapAlign: 'center' }}
              >
                
                {/* Connector between cars (except the last one) */}
                {!car.is_engine && (
                  <div className="absolute right-[-14px] bottom-10 w-4 h-2 bg-gray-600 z-0"></div>
                )}

                {/* The Train Car */}
                <div className={`w-64 h-40 border-4 relative overflow-hidden flex items-center justify-center shadow-2xl
                  ${car.is_engine ? 'border-yellow-500 bg-yellow-900 rounded-r-full' : 'border-gray-500 bg-gray-800 rounded-sm'}`}>
                  
                  {car.image_url ? (
                    <img src={car.image_url} alt={`Car ${car.id}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-bold tracking-widest">{car.is_engine ? "ENGINE" : "EMPTY"}</span>
                  )}

                  <div className="absolute inset-0 bg-black/80 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                    <p className="mb-2 text-xl font-bold text-green-400">${Number(car.price).toFixed(2)}</p>
                    <label className="bg-green-500 text-white px-4 py-2 cursor-pointer hover:bg-green-600 rounded font-bold shadow-lg">
                      {uploading ? 'Uploading...' : 'Tag This Car'}
                      <input type="file" accept="image/png, image/jpeg" className="hidden" 
                             onChange={(e) => handleImageUploadAndCheckout(e, car.id, car.price)} 
                             disabled={uploading} />
                    </label>
                  </div>
                </div>

                {/* Spinning Wheels */}
                <div className="flex gap-16 mt-1">
                  {/* By making the border dashed, the animate-spin actually looks like a wheel turning! */}
                  <div className="w-10 h-10 bg-gray-300 rounded-full border-4 border-dashed border-gray-800 animate-spin shadow-lg"></div>
                  <div className="w-10 h-10 bg-gray-300 rounded-full border-4 border-dashed border-gray-800 animate-spin shadow-lg"></div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500 font-bold bg-gray-800 px-2 py-1 rounded">#{car.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}