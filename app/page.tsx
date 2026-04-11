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

  // 2. Fetch User-Bought Carts from Supabase
  useEffect(() => {
    const fetchCars = async () => {
      // Order descending: Newest carts load on the far left
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'train_cars' }, () => {
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

      // Pass the new car ID to checkout
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
        /* Machine Gun Animations */
        @keyframes recoil {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-3px); }
        }
        @keyframes shoot {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes bullet1 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(150px, 10px); opacity: 0; }
        }
        @keyframes bullet2 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(150px, -5px); opacity: 0; }
        }
        @keyframes bullet3 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(150px, 5px); opacity: 0; }
        }

        .animate-chugga { animation: chugga 0.4s infinite ease-in-out; }
        .animate-wheel { animation: wheelSpin 0.8s infinite linear; }
        .animate-track { animation: trackMove 0.4s infinite linear; }
        .steam-particle { animation: steamFloat 2s forwards ease-out; }
        
        .animate-recoil { animation: recoil 0.08s infinite; }
        .animate-shoot { animation: shoot 0.08s infinite; }
        .animate-bullet1 { animation: bullet1 0.2s infinite linear 0s; }
        .animate-bullet2 { animation: bullet2 0.2s infinite linear 0.05s; }
        .animate-bullet3 { animation: bullet3 0.2s infinite linear 0.1s; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* --- HEADER & CONTROLS --- */}
      <div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter drop-shadow-md">TagTheTrain</h1>
          <p className="font-bold text-gray-700 bg-white/50 inline-block px-2 py-1 rounded mt-1 shadow-sm">
            {cars.length + 2} / 100 Carts Hooked
          </p>
        </div>
        
        <div className="flex flex-col items-end pointer-events-auto">
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleBuyCart} 
            disabled={uploading || cars.length >= 98} 
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || cars.length >= 98}
            className="bg-black text-white px-6 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl disabled:bg-gray-400 flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : cars.length >= 98 ? "Train Full!" : "Buy Cart - $5.00"}
          </button>
          <p className="text-xs font-bold text-gray-600 mt-2">Upload your image to buy a cart</p>
        </div>
      </div>

      {/* --- MAIN TRAIN AREA --- */}
      <div ref={scrollRef} className="flex-grow flex items-end pb-24 relative overflow-x-auto no-scrollbar pointer-events-auto">
        <div className="flex items-end pl-[20vw] pr-[50vw]">

          {/* 1. MAPPED DB CARTS (Newest on the far left) */}
          {cars.map((car, index) => (
            <div key={car.id} className="relative flex items-end shrink-0 animate-chugga" style={{ animationDelay: `${(index + 1) * 0.05}s` }}>
              <div className="w-4 h-2 bg-gray-800 mb-4 shrink-0"></div>
              <div className="w-40 h-24 bg-white rounded-md relative shadow-md flex items-center justify-center border-b-4 border-gray-800 overflow-hidden">
                <img src={car.image_url} alt={`Cart ${car.id}`} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                  #{car.id + 2}
                </div>
                <div className="absolute -bottom-3 flex justify-between w-full px-4 z-10">
                  <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                  <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                </div>
              </div>
            </div>
          ))}

          {/* 2. STARTER CART #2 (Static) */}
          <div className="relative flex items-end shrink-0 animate-chugga" style={{ animationDelay: '0.1s' }}>
            {cars.length > 0 && <div className="w-4 h-2 bg-gray-800 mb-4 shrink-0"></div>}
            <div className="w-40 h-24 bg-gray-700 rounded-md relative shadow-md flex items-center justify-center border-b-4 border-gray-900">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Cart #2</span>
              <div className="absolute -bottom-3 flex justify-between w-full px-4 z-10">
                <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
              </div>
            </div>
          </div>

          {/* 3. STARTER CART #1 (Static Coal Cart) */}
          <div className="relative flex items-end shrink-0 animate-chugga" style={{ animationDelay: '0.05s' }}>
            <div className="w-4 h-2 bg-gray-800 mb-4 shrink-0"></div>
            <div className="w-32 h-16 bg-gray-800 rounded-md relative shadow-md flex items-end justify-center border-b-4 border-black">
              {/* Fake coal pile */}
              <div className="absolute top-[-10px] w-24 h-12 bg-gray-900 rounded-t-full"></div>
              <div className="absolute -bottom-3 flex justify-between w-full px-2 z-10">
                <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                <div className="w-8 h-8 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
              </div>
            </div>
          </div>

          {/* 4. THE ENGINE (Always at the far right front) */}
          <div id="engine" className="relative animate-chugga z-20 flex flex-col items-end shrink-0">
            <div className="w-4 h-2 bg-gray-800 absolute left-[-16px] bottom-4 shrink-0"></div>
            
            {/* Steam Particles */}
            <div className="absolute -top-4 right-10 w-4 h-4 pointer-events-none z-0">
              {steamParticles.map((steam) => (
                <div key={steam.id} className="steam-particle absolute bg-white/70 rounded-full blur-sm"
                  style={{ width: steam.size, height: steam.size, left: -steam.size / 2 }} />
              ))}
            </div>

            <div className="w-6 h-12 bg-gray-800 mr-8 rounded-t-sm z-10"></div>
            
            <div className="w-32 h-24 bg-gray-900 rounded-tl-3xl rounded-tr-xl flex flex-col justify-end p-2 relative shadow-lg border-b-4 border-black">
              
              {/* WINDOW WITH MACHINE GUN GUY */}
              <div className="w-12 h-12 bg-sky-200 absolute right-2 top-2 rounded-sm border-2 border-gray-700 overflow-visible z-30">
                
                {/* The Stickman Guy (Recoil Animation) */}
                <div className="absolute bottom-0 right-2 w-full h-full animate-recoil">
                  {/* Head */}
                  <div className="w-4 h-4 bg-gray-900 rounded-full absolute bottom-5 left-1"></div>
                  {/* Body */}
                  <div className="w-5 h-6 bg-gray-900 rounded-t-md absolute bottom-0 left-0.5"></div>
                  
                  {/* The Gun */}
                  <div className="w-10 h-1.5 bg-black absolute bottom-4 left-4 z-40">
                    {/* Muzzle Flash */}
                    <div className="absolute -right-3 -top-1.5 w-4 h-4 bg-yellow-400 rounded-full animate-shoot blur-[1px]"></div>
                  </div>
                </div>

                {/* Flying Bullets */}
                <div className="absolute bottom-4 left-10 w-2 h-1 bg-yellow-500 animate-bullet1 opacity-0 z-50 shadow-sm"></div>
                <div className="absolute bottom-4 left-10 w-2 h-1 bg-yellow-500 animate-bullet2 opacity-0 z-50 shadow-sm"></div>
                <div className="absolute bottom-4 left-10 w-2 h-1 bg-yellow-500 animate-bullet3 opacity-0 z-50 shadow-sm"></div>
              </div>

              <div className="w-full h-2 bg-yellow-500 absolute bottom-6 left-0 z-20"></div>
              
              <div className="absolute -bottom-4 flex justify-between w-full px-2 z-10">
                <div className="w-10 h-10 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
                <div className="w-10 h-10 rounded-full border-4 border-gray-400 bg-gray-800 animate-wheel border-dashed"></div>
              </div>
            </div>
            <div className="w-10 h-10 bg-gray-700 absolute -right-6 bottom-0 rotate-45 transform translate-y-2 -z-10"></div>
          </div>

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
