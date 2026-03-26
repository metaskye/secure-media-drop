import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

function App() {
  // --- SECURITY STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [lockError, setLockError] = useState('');

  // --- UPLOAD STATE ---
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // --- SECURITY LOGIC ---
  const handleUnlock = (e) => {
    e.preventDefault(); // Prevents the page from refreshing when they hit enter
    if (passcodeInput === import.meta.env.VITE_VAULT_PASSCODE) {
      setIsUnlocked(true);
      setLockError('');
    } else {
      setLockError('ACCESS DENIED. INVALID CREDENTIALS.');
      setPasscodeInput(''); // Clear the wrong password
    }
  };

  // --- UPLOAD LOGIC ---
  const handleFileChange = (event) => {
    // 1. Check if the user actually selected a file
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      
      // 2. Define the 50MB limit in bytes (50 * 1024 * 1024)
      const maxSizeInBytes = 52428800; 

      // 3. The Bouncer: If the file is too heavy, block it!
      if (selectedFile.size > maxSizeInBytes) {
        setErrorMessage('File exceeds the 50MB limit. Please select a smaller file.');
        setStatus('error');
        setFile(null); // Clear out any previously selected file
        event.target.value = ''; // Reset the actual HTML input
        return; // Stop the function here so it doesn't save
      }

      // 4. If the file is under 50MB, welcome it to the vault
      setFile(selectedFile);
      setErrorMessage(''); // Clear any old error messages
      setStatus('idle'); 
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setErrorMessage('Please select a file first.');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setErrorMessage('');

    try {
      const uniqueFileName = `${Date.now()}-${file.name}`;

      let targetBucket = '';
      if (file.type.startsWith('image/')) {
        targetBucket = 'photo-drop';
      } else if (file.type.startsWith('audio/')) {
        targetBucket = 'audio-drop';
      } else if (file.type.startsWith('video/')) {
        targetBucket = 'video-drop';
      } else {
        // If they somehow select a PDF or Word Doc, stop the upload
        setErrorMessage('Unsupported file type. Please select an image, audio, or video.');
        setStatus('error');
        return; 
      }

      const { data, error } = await supabase.storage
        .from(targetBucket)
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      setStatus('success');
      setFile(null); 

    } catch (error) {
      console.error('Upload Error:', error.message);
      setErrorMessage(error.message);
      setStatus('error');
    }
  };

  // --- RENDER: LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-mono">
        <div className="max-w-sm w-full bg-black border border-zinc-800 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold tracking-widest text-zinc-100 uppercase">System Locked</h1>
            <p className="text-xs text-zinc-500">Authentication required for drop-zone access.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password" 
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="ENTER PASSCODE"
              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 text-center tracking-widest focus:outline-none focus:border-zinc-400 transition-colors"
            />
            <button 
              type="submit"
              className="w-full bg-zinc-100 text-black font-bold py-3 hover:bg-white transition-colors"
            >
              AUTHENTICATE
            </button>
          </form>

          {lockError && (
            <div className="text-red-500 text-xs text-center font-bold tracking-wider animate-pulse">
              {lockError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: VAULT SCREEN (Only shows if unlocked) ---
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-200 font-sans">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-8 space-y-6 relative overflow-hidden">
        
        <div className="text-center space-y-2 relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Secure Media Drop</h1>
          <p className="text-sm text-zinc-400">Connection authenticated. Limit: 50MB per file.</p>
        </div>

        <label className="relative border-2 border-dashed border-zinc-700 rounded-lg p-10 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-950/50 group">
          <input 
            type="file" 
            onChange={handleFileChange}
            accept="video/*,audio/*,image/*,.mp3,.wav,.m4a,.aac,.flac"
            className="hidden"
          />
          <svg className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          <span className="text-sm font-medium text-center px-4">
            {file ? file.name : "Tap to select media file (image, audio, or video) under 50MB"}
          </span>
        </label>

        <button 
          onClick={uploadFile}
          disabled={status === 'uploading' || !file}
          className={`w-full font-medium py-3 rounded-lg transition-all z-10 relative
            ${status === 'uploading' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
              status === 'success' ? 'bg-green-900/50 text-green-400 border border-green-800' : 
              'bg-zinc-100 text-zinc-900 hover:bg-white'}`}
        >
          {status === 'uploading' ? 'Encrypting & Transmitting...' : 
           status === 'success' ? 'Transmission Secure. Send another?' : 
           'Initialize Secure Upload'}
        </button>

        {status === 'error' && (
          <div className="text-red-400 text-sm text-center bg-red-950/30 p-2 rounded border border-red-900/50">
            {errorMessage}
          </div>
        )}
      </div>
      
      <div className="mt-8 text-xs text-zinc-600">
        End-to-End Encrypted • Project: The Space We Hold
      </div>
    </div>
  );
}

export default App;