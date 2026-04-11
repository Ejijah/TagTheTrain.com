'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function TrainPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [steamParticles, setSteamParticles] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Generate Steam Particles for the Engine
  useEffect(() => {
    const interval = setInterval(() => {
      setSteamParticles((prev) => [
        ...prev,
        { id: Date.now(), size: Math.random() * 20 + 20 },
      ]);
      setTimeout(() => {
        setSteamParticles((prev) => prev.slice(1));
      }, 2000);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch data from Supabase
  useEffect(() => {
    const fetchCars = async () => {
      // Order descending: Newest carts on the left, Engine on the right
      const { data, error } = await supabase.from('train_cars').select('*').order('id', { ascending: false });
      if (error) console.error("DB Error:", error);
      if (data) {
        setCars(data);
        setTimeout(() => {
          document.getElementById('engine')?.scrollIntoView({ behavior: 'smooth', inline: 'end' });
        }, 500);
      }
    };
    fetchCars();

    const channel = supabase
      .channel('train_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'train_cars' }, (payload) => {
        fetchCars(); // Refresh the whole train on any update
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. Handle the "Buy Cart" Upload & Checkout
  const handleBuyCart = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Pass the new car ID and fixed $5 price to your existing checkout API
      const newCarId = cars.length + 1;
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: newCarId, imageUrl, price: 5.00 }),
      });

      if (!response.ok) throw new Error("Checkout API error.");

      const { url } = await response.json();
      window.location.href = url; // Send them to Stripe!

    } catch (error) {
      alert('Error connecting to checkout.');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };

  return (
    <main className="min-h-screen bg-sky-200 overflow-hidden relative flex flex-col font-sans selection:bg-yellow-400">
      
      {/* --- CUSTOM CSS ANIMATIONS --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes chugga {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes wheelSpin {
          100% { transform: rotate(-360deg); }
        }
        @keyframes trackMove {
          0% { background-position: 0 0; }
          100% { background-position: -40px 0; }
        }
        @keyframes steamFloat {
          0% { opacity: 0.8; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50px, -100px) scale(3); }
        }
        .animate-chugga { animation: chugga 0.4s infinite ease-in-out; }
        .animate-wheel { animation: wheelSpin 0.8s infinite linear; }
        .animate-track { animation: trackMove 0.4s infinite linear; }
        .steam-particle { animation: steamFloat 2s forwards ease-out; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* --- HEADER & CONTROLS --- */}
      <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter drop-shadow-md">TagTheTrain</h1>
          <p className="font-bold text-gray-700 bg-white/50 inline-block px-2 py-1 rounded mt-1 shadow-sm">
            {cars.length} / 100 Carts Hooked
          </p>
        </div>
        
        <div className="flex flex-col items-end pointer-events-auto">
          {/* Hidden File Input */}
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleBuyCart} 
            disabled={uploading || cars.length >= 100} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || cars.length >= 100}
            className="bg-black text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl disabled:bg-gray-400 disabled:scale-100 flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : cars.length >= 100 ? "Train Full!" : "Buy Cart - $5.00"}
          </button>
          <p className="text-xs font-bold text-gray-600 mt-2">Upload your image to buy a cart</p>
        </div>
      </div>

      {/* --- MAIN TRAIN AREA --- */}
      <div 
        ref={scrollRef}
        className="flex-grow flex items-end pb-24 relative overflow-x-auto no-scrollbar pointer-events-auto"
      >
        <div className="flex items-end pl-[20vw] pr-[50vw]">

          {/* Render the carts from Supabase (Newest on the left) */}
          {cars.map((car, index) => {
            // If it's the engine (id 1 or is_engine), render the Engine visuals
            if (car.is_engine || car.id === 1) {
              return (
                <div key={car.id} id="engine" className="relative animate-chugga z-20 flex flex-col items-end shrink-0">
                  {/* Steam Particles */}
                  <div className="absolute -top-4 right-10 w-4 h-4 pointer-events-none z-0">
                    {steamParticles.map((steam) => (
                      <div key={steam.id} className="steam-particle absolute bg-white/70 rounded-full blur-sm"
                        style={{ width: steam.size, height: steam.size, left: -steam.size / 2 }} />
                    ))}
                  </div>

                  {/* Smokestack */}
                  <div className="w-6 h-12 bg-gray-800 mr-8 rounded-t-sm z-10"></div>
                  
                  {/* Engine Body */}
                  <div className="w-32 h-24 bg-gray-900 rounded-tl-3xl rounded-tr-xl flex flex-col justify-end p-2 relative shadow-lg border-b-4 border-black">
                    <div className="w-8 h-10 bg-sky-200 absolute right-2 top-2 rounded-sm border-2 border-gray-700"></div>
                    <div className="w-full h-2 bg-yellow-500 absolute bottom-6 left-0"></div>
                    
                    {/* Engine Wheels */}
                    <div className="absolute -bottom-4 flex justify-between w-full px-2">
                      <div className="w-10 h-10 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                      <div className="w-10 h-10 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                    </div>
                  </div>
                  {/* Cowcatcher */}
                  <div className="w-10 h-10 bg-gray-700 absolute -right-6 bottom-0 rotate-45 transform translate-y-2 -z-10"></div>
                </div>
              );
            }

            // Otherwise, render a standard cart
            return (
              <div key={car.id} id={`car-${car.id}`} className="relative flex items-end shrink-0 animate-chugga" style={{ animationDelay: `${(index + 1) * 0.05}s` }}>
                
                {/* Connector */}
                <div className="w-4 h-2 bg-gray-800 mb-4 shrink-0"></div>
                
                {/* Cart Body */}
                <div className="w-40 h-24 bg-white rounded-md relative shadow-md flex items-center justify-center border-b-4 border-gray-800 overflow-hidden">
                  
                  {car.image_url ? (
                    <img src={car.image_url} alt={`Cart ${car.id}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-300 font-bold uppercase">Empty</span>
                  )}

                  {/* Cart Number Badge */}
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                    #{car.id}
                  </div>

                  {/* Cart Wheels */}
                  <div className="absolute -bottom-3 flex justify-between w-full px-4 z-10">
                    <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                    <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* --- THE GROUND & MOVING TRACK --- */}
      <div className="h-24 w-full bg-green-600 absolute bottom-0 z-10 border-t-4 border-green-800 pointer-events-none">
        <div 
          className="w-full h-4 absolute top-0 left-0 animate-track"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, #4b5563 0px, #4b5563 10px, transparent 10px, transparent 40px)',
            borderTop: '4px solid #1f2937'
          }}
        ></div>
        <p className="text-green-800 font-bold text-center mt-8 opacity-50 uppercase tracking-widest text-sm">Drag left/right to view the whole train</p>
      </div>

    </main>
  );
}
