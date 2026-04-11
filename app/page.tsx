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
  const [taggingCarId, setTaggingCarId] = useState<string | number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const cartFileInputRef = useRef<HTMLInputElement>(null);
  const tagFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Generate Steam Particles
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

  // 2. Fetch User Carts from Supabase
  useEffect(() => {
    const fetchCars = async () => {
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
        fetchCars();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. Handle $5 Cart Purchase
  const handleBuyCart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processCheckout(e, cars.length + 4, 5.00); 
    if (cartFileInputRef.current) cartFileInputRef.current.value = "";
  };

  // 4. Handle $1 Tag Purchase
  const handleTagClick = (carId: string | number) => {
    if (uploading) return;
    setTaggingCarId(carId);
    tagFileInputRef.current?.click();
  };

  const handleTagUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!taggingCarId) return;
    await processCheckout(e, taggingCarId, 1.00);
    if (tagFileInputRef.current) tagFileInputRef.current.value = "";
    setTaggingCarId(null);
  };

  // Universal Checkout Logic
  const processCheckout = async (e: React.ChangeEvent<HTMLInputElement>, carId: string | number, price: number) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('train-images').upload(fileName, file);
      if (uploadError) throw new Error('Upload failed');

      const { data: publicUrlData } = supabase.storage.from('train-images').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, imageUrl, price }),
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

  const validCars = cars.filter(car => car.image_url && car.image_url.trim() !== '');

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
        @keyframes glimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }

        .animate-chugga { animation: chugga 0.4s infinite ease-in-out; }
        .animate-wheel { animation: wheelSpin 0.6s infinite linear; }
        .animate-track { animation: trackMove 0.4s infinite linear; }
        .steam-particle { animation: steamFloat 2s forwards ease-out; }
        
        .glimmer-effect {
          animation: glimmer 2.5s infinite;
        }

        .realistic-wheel {
          border-radius: 50%;
          border: 5px solid #1f2937;
          background: repeating-conic-gradient(from 0deg, #9ca3af 0deg 30deg, #6b7280 30deg 60deg);
          box-shadow: inset 0 0 8px rgba(0,0,0,0.8);
          position: relative;
        }
        .realistic-wheel::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 8px; height: 8px;
          background: #374151;
          border-radius: 50%;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* --- HEADER & CONTROLS --- */}
      <div className="absolute top-0 left-0 w-full h-32 z-50 pointer-events-none">
        
        <div className="absolute top-6 left-6">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter drop-shadow-md">TagTheTrain</h1>
          <p className="font-bold text-gray-700 bg-white/50 block w-max px-2 py-1 rounded mt-1 shadow-sm">
            {validCars.length + 3} / 100 Carts Hooked
          </p>
        </div>
        
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <input type="file" accept="image/png, image/jpeg" className="hidden" ref={cartFileInputRef} onChange={handleBuyCart} />
          <input type="file" accept="image/png, image/jpeg" className="hidden" ref={tagFileInputRef} onChange={handleTagUpload} />
          
          <button 
            onClick={() => cartFileInputRef.current?.click()}
            disabled={uploading || validCars.length >= 97}
            className="relative overflow-hidden bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-xl font-black text-lg hover:scale-110 active:scale-95 transition-all shadow-[0_0_25px_rgba(34,197,94,0.7)] disabled:bg-gray-400 flex items-center gap-2 group"
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/40 glimmer-effect z-10 pointer-events-none"></div>
            <span className="relative z-20">{uploading ? 'Uploading...' : 'Buy New Cart - $5'}</span>
          </button>
          <p className="text-xs font-bold text-gray-700 mt-2 bg-white/40 px-3 py-1 rounded shadow-sm text-center">
            Or click any cart to Tag it for $1
          </p>
        </div>
      </div>

      {/* --- MAIN TRAIN AREA --- */}
      <div ref={scrollRef} className="flex-grow flex items-end pb-24 relative overflow-x-auto no-scrollbar pointer-events-auto">
        <div className="flex items-end pl-[20vw] pr-[50vw]">

          {/* 1. MAPPED DB CARTS */}
          {validCars.map((car, index) => (
            <div key={car.id} className="relative flex items-end shrink-0 animate-chugga group cursor-pointer" style={{ animationDelay: `${(index + 1) * 0.05}s` }} onClick={() => handleTagClick(car.id)}>
              <div className="w-6 h-2 bg-gray-800 mb-4 shrink-0"></div>
              
              <div className="w-40 h-24 bg-gray-200 rounded-md relative shadow-md flex items-center justify-center border-b-4 border-gray-800 overflow-hidden group-hover:brightness-110 transition-all">
                <img src={car.image_url} alt={`Cart ${car.id}`} className="w-full h-full object-cover" />
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                  <span className="text-white font-black text-sm drop-shadow-md">Tag Cart - $1</span>
                </div>

                <div className="absolute -bottom-3 flex justify-between w-full px-4 z-10">
                  <div className="w-8 h-8 realistic-wheel animate-wheel"></div>
                  <div className="w-8 h-8 realistic-wheel animate-wheel"></div>
                </div>
              </div>
            </div>
          ))}

          {/* 2. STARTER CARTS */}
          {[
            { id: 'starter-3', content: null, color: 'bg-gradient-to-br from-purple-500 to-purple-800' },
            { id: 'starter-2', content: null, color: 'bg-gradient-to-br from-blue-500 to-blue-800' },
            { 
              id: 'starter-1', 
              content: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80', // Pineapple Pizza
              color: 'bg-gray-200' 
            },
          ].map((starter) => (
            <div key={starter.id} className="relative flex items-end shrink-0 animate-chugga group cursor-pointer" style={{ animationDelay: '0.1s' }} onClick={() => handleTagClick(starter.id)}>
              {/* Connector */}
              <div className="w-6 h-2 bg-gray-800 mb-4 shrink-0"></div>
              
              <div className={`w-40 h-24 ${starter.color} rounded-md relative shadow-md flex items-center justify-center border-b-4 border-gray-900 border-t border-white/20 overflow-hidden group-hover:brightness-125 transition-all`}>
                
                {/* The image or the Faint $1 Tag Text */}
                {starter.content ? (
                  <img src={starter.content} alt="Controversial Cart" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/20 font-black text-3xl uppercase tracking-widest rotate-[-10deg] pointer-events-none drop-shadow-sm">$1 TAG</span>
                )}

                {/* Hover overlay for Tagging */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                  <span className="text-white font-black text-sm drop-shadow-md">Tag Cart - $1</span>
                </div>

                <div className="absolute -bottom-3 flex justify-between w-full px-4 z-10">
                  <div className="w-8 h-8 realistic-wheel animate-wheel"></div>
                  <div className="w-8 h-8 realistic-wheel animate-wheel"></div>
                </div>
              </div>
            </div>
          ))}

          {/* 3. THE GOLD ENGINE */}
          <div id="engine" className="relative animate-chugga z-20 flex flex-col items-end shrink-0 ml-2">
            
            {/* Extended spacing connector directly behind the engine */}
            <div className="w-6 h-2 bg-gray-800 absolute left-[-20px] bottom-4 shrink-0 z-0"></div>
            
            {/* Steam Particles */}
            <div className="absolute -top-4 right-10 w-4 h-4 pointer-events-none z-0">
              {steamParticles.map((steam) => (
                <div key={steam.id} className="steam-particle absolute bg-white/70 rounded-full blur-sm"
                  style={{ width: steam.size, height: steam.size, left: -steam.size / 2 }} />
              ))}
            </div>

            <div className="w-6 h-12 bg-gray-800 mr-8 rounded-t-sm z-10"></div>
            
            {/* Gold Body */}
            <div className="w-32 h-24 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-tl-3xl rounded-tr-xl flex flex-col justify-end p-2 relative shadow-lg border-b-4 border-yellow-800 border-t border-white/60">
              
              <div className="w-12 h-10 bg-sky-200/80 absolute right-2 top-2 rounded-sm border-4 border-yellow-800 z-30 shadow-inner"></div>
              <div className="w-full h-2 bg-gray-900 absolute bottom-6 left-0 z-20 shadow-sm"></div>
              
              <div className="absolute -bottom-4 flex justify-between w-full px-2 z-10">
                <div className="w-10 h-10 realistic-wheel animate-wheel"></div>
                <div className="w-10 h-10 realistic-wheel animate-wheel"></div>
              </div>
            </div>
            
            {/* Gold Cowcatcher */}
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 border-r-2 border-b-2 border-yellow-700 absolute -right-6 bottom-0 rotate-45 transform translate-y-2 -z-10 shadow-lg"></div>
          </div>

        </div>
      </div>

      {/* --- THE GROUND & MOVING TRACK --- */}
      <div className="h-24 w-full bg-green-600 absolute bottom-0 z-10 border-t-4 border-green-800 pointer-events-none shadow-inner">
        <div 
          className="w-full h-5 absolute top-0 left-0 animate-track"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, #4b5563 0px, #4b5563 15px, transparent 15px, transparent 40px)',
            borderTop: '6px solid #1f2937'
          }}
        ></div>
        <p className="text-green-900 font-black text-center mt-8 opacity-40 uppercase tracking-widest text-sm drop-shadow-sm">Drag to view the train</p>
      </div>

    </main>
  );
}
